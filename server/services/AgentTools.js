import EnhancedFaultCodeService from './EnhancedFaultCodeService.js'
import { supabase } from '../supabaseClient.js'
import SessionManager from './SessionManager.js'
import { embedText } from '../utils/embeddings.js'

const AgentTools = {
  _modelTips(manufacturer, model, faultCode) {
    const mfg = (manufacturer || '').toLowerCase()
    const mdl = (model || '').toLowerCase()
    const code = (faultCode || '').toUpperCase()
    if (mfg.includes('ideal') && mdl.includes('logic') && code === 'L2') {
      return 'Model-specific tip: Ideal Logic ignition lockout (L2) commonly relates to the spark generator/ignition module. Inspect spark generator connections, HT lead, electrode condition and gap, and ensure a solid earth. Verify gas supply and that the condensate trap isn\'t blocked, as wet electrodes can prevent ignition.'
    }
    return null
  },
  async get_fault_info(args = {}) {
    const { manufacturer = null, fault_code = null, user_text = null } = args || {}
    try {
      if (user_text || (!manufacturer || !fault_code)) {
        const info = await EnhancedFaultCodeService.getComprehensiveFaultInfo(user_text || `${manufacturer || ''} ${fault_code || ''}`.trim())
        if (!info) return { found: false }
        const description = info?.rawData?.diagnosticInfo?.[0]?.fault_description ||
          info?.rawData?.basicInfo?.[0]?.description ||
          info?.rawData?.manufacturerSpecific?.[0]?.description || null
        const modelTips = AgentTools._modelTips(info?.manufacturer, info?.model, info?.faultCode)
        return {
          found: !!description,
          manufacturer: info.manufacturer || manufacturer || null,
          model: info.model || null,
          faultCode: (info.faultCode || fault_code || '').toUpperCase(),
          description: description || null,
          context: info.context || '',
          isSafetyCritical: !!info.isSafetyCritical,
          relatedCodes: info.relatedCodes || [],
          modelTips: modelTips || undefined
        }
      }
      const data = await EnhancedFaultCodeService.getFaultCodeData(manufacturer, fault_code)
      if (!data) return { found: false }
      const description = data?.diagnosticInfo?.[0]?.fault_description ||
        data?.basicInfo?.[0]?.description ||
        data?.manufacturerSpecific?.[0]?.description || null
      const context = EnhancedFaultCodeService.buildFaultCodeContext(data)
      const isSafetyCritical = EnhancedFaultCodeService.isSafetyCritical(data)
      const relatedCodes = await EnhancedFaultCodeService.getRelatedFaultCodes(manufacturer, fault_code)
      const modelExtracted = EnhancedFaultCodeService.extractFaultInfo(`${manufacturer || ''} ${fault_code || ''}`)?.model || null
      const modelTips = AgentTools._modelTips(manufacturer, modelExtracted, fault_code)
      return {
        found: !!description,
        manufacturer,
        model: modelExtracted || null,
        faultCode: (fault_code || '').toUpperCase(),
        description: description || null,
        context: context || '',
        isSafetyCritical: !!isSafetyCritical,
        relatedCodes: relatedCodes || [],
        modelTips: modelTips || undefined
      }
    } catch (e) {
      return { found: false, error: e?.message || 'get_fault_info failed' }
    }
  },

  async search_manuals(args = {}) {
    const { manufacturer, model = null, limit = 3 } = args || {}
    if (!manufacturer) return { items: [] }
    try {
      let query = supabase.from('boiler_manuals').select('name, url, gc_number, manufacturer')
      if (model) {
        query = query.or(`manufacturer.ilike.%${manufacturer}%,name.ilike.%${manufacturer}%`).ilike('name', `%${model}%`)
      } else {
        query = query.or(`manufacturer.ilike.%${manufacturer}%,name.ilike.%${manufacturer}%`)
      }
      const { data } = await query.limit(20)
      const itemsRaw = (data || []).map((m) => ({ name: m.name || '', url: m.url, gc_number: m.gc_number || null, manufacturer: m.manufacturer || '' }))

      const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim()
      const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const mf = norm(manufacturer)
      const mdl = norm(model)
      const variantMatch = (mdl.match(/\b(\d{2,3}[a-z]?)\b/i) || [null, null])[1]

      const scored = itemsRaw.map((it) => {
        const name = norm(it.name)
        let score = 0
        if (mf && name.includes(mf)) score += 1
        if (mdl) {
          if (new RegExp(`\\b${esc(mdl)}\\b`, 'i').test(name)) score += 6
          else if (name.includes(mdl)) score += 3
        }
        if (variantMatch && name.includes(variantMatch.toLowerCase())) score += 2
        // shorter names preferred if same score
        return { ...it, _score: score, _len: name.length }
      })
      scored.sort((a, b) => b._score - a._score || a._len - b._len)
      const limited = scored.slice(0, Math.max(1, Math.min(10, Number(limit) || 3)))
      const items = limited.map((m) => ({ name: m.name, url: m.url, gc_number: m.gc_number, manufacturer: m.manufacturer }))
      return { items }
    } catch (e) {
      return { items: [], error: e?.message || 'search_manuals failed' }
    }
  },

  async get_symptom_guidance(args = {}) {
    const { manufacturer = null, model = null, symptoms = '', limit = 5 } = args || {}
    try {
      let q = supabase.from('symptom_guidance').select('manufacturer, model, symptom, steps')
      if (manufacturer) q = q.ilike('manufacturer', `%${manufacturer}%`)
      if (model) q = q.ilike('model', `%${model}%`)
      if (symptoms) q = q.ilike('symptom', `%${String(symptoms).slice(0, 120)}%`)
      const { data, error } = await q.limit(Math.max(1, Math.min(10, Number(limit) || 5)))
      if (error) return { items: [] }
      const items = (data || []).map((r) => ({ manufacturer: r.manufacturer, model: r.model, symptom: r.symptom, steps: r.steps }))
      return { items }
    } catch (e) {
      return { items: [] }
    }
  },

  async get_verified_knowledge(args = {}) {
    const { fault_code, manufacturer = null, model = null, limit = 5 } = args || {}
    const outLimit = Math.max(1, Math.min(10, Number(limit) || 5))
    // 1) Try vector search over knowledge_chunks if enabled
    try {
      if (String(process.env.USE_RAG_VECTOR || 'false').toLowerCase() !== 'true') throw new Error('vector disabled')
      const queryParts = []
      if (fault_code) queryParts.push(`Fault code ${String(fault_code).toUpperCase()}`)
      if (manufacturer) queryParts.push(`Manufacturer ${manufacturer}`)
      if (model) queryParts.push(`Model ${model}`)
      const queryText = queryParts.join(' | ') || String(fault_code || manufacturer || model || 'boiler fault').slice(0, 200)
      const embedding = await embedText(queryText)
      // Call RPC function to match chunks
      const filter = {}
      if (manufacturer) filter.make = manufacturer
      if (model) filter.model = model
      if (fault_code) filter.fault_code = String(fault_code).toUpperCase()
      const { data: matches, error: rpcErr } = await supabase.rpc('match_knowledge_chunks', {
        query_embedding: embedding,
        match_count: outLimit,
        filter
      })
      if (!rpcErr && Array.isArray(matches) && matches.length > 0) {
        const threshold = Number(process.env.RAG_SIM_THRESHOLD || '0.78')
        const filtered = matches.filter((m) => (typeof m.similarity === 'number' ? m.similarity : 1) >= threshold)
        if (filtered.length === 0) throw new Error('no vector hits above threshold')
        const items = filtered.slice(0, outLimit).map((m) => ({
          type: 'knowledge',
          title: (m.metadata && m.metadata.title) || m.make || m.model || (fault_code ? `Fault ${fault_code}` : 'Knowledge'),
          fault_code: m.fault_code || (fault_code ? String(fault_code).toUpperCase() : null),
          manufacturer: m.make || manufacturer || null,
          model: m.model || model || null,
          content: m.content,
          source_url: m.source_url || null,
          similarity: m.similarity || null
        }))
        return { items }
      }
    } catch (e) {
      // Swallow and fall back
    }
    // 2) Fallback to verified_knowledge table if vector search has no results
    try {
      if (!fault_code) return { items: [] }
      let q = supabase.from('verified_knowledge').select('*').eq('fault_code', String(fault_code).toUpperCase())
      if (manufacturer) q = q.ilike('manufacturer', `%${manufacturer}%`)
      const { data } = await q.limit(outLimit)
      const items = (data || []).map((r) => ({
        type: 'knowledge',
        title: r.title || r.source || `Fault ${r.fault_code}`,
        fault_code: r.fault_code,
        manufacturer: r.manufacturer || null,
        model: r.model || null,
        content: r.content || null,
        source_url: r.source_url || null
      }))
      return { items }
    } catch (e) {
      return { items: [], error: e?.message || 'get_verified_knowledge failed' }
    }
  },

  async update_session(args = {}) {
    const { session_id, role = 'assistant', message_text } = args || {}
    if (!session_id || !message_text) return { ok: false }
    let session = await SessionManager.getSession(session_id)
    if (!session) {
      await SessionManager.createSession(session_id, null, [])
      session = await SessionManager.getSession(session_id)
    }
    const history = Array.isArray(session?.history) ? [...session.history] : []
    history.push({ sender: role === 'user' ? 'user' : 'assistant', text: String(message_text), timestamp: new Date().toISOString() })
    await SessionManager.updateSession(session_id, history)
    return { ok: true }
  }
}

export default AgentTools
