import { supabase } from '../supabaseClient.js'
import { embedTexts } from '../utils/embeddings.js'

const BATCH_SIZE = parseInt(process.env.RAG_BATCH_SIZE || '64')

async function insertKnowledgeRows(rows) {
  if (!rows || rows.length === 0) return { count: 0 }
  const { error } = await supabase.from('knowledge_chunks').insert(rows)
  if (error) throw new Error(`Insert failed: ${error.message}`)
  return { count: rows.length }
}

function normalizeFaultCode(code) {
  if (!code) return null
  let c = String(code).trim()
  const dot = c.match(/([a-zA-Z])\.(\d{1,3})/)
  if (dot) c = `${dot[1]}${dot[2]}`
  c = c.replace(/\+$/,'')
  return c.toUpperCase()
}

async function ingestFromTable({
  table,
  select,
  toText,
  toMeta,
  where = (q) => q,
  limit = null
}) {
  let q = supabase.from(table).select(select)
  q = where(q)
  if (limit) q = q.limit(limit)
  const { data, error } = await q
  if (error) throw new Error(`Query ${table} failed: ${error.message}`)
  const items = (data || [])
  console.log(`Fetched ${items.length} rows from ${table}`)

  // Build texts
  const texts = items.map((r) => toText(r)).map((t) => String(t || '').slice(0, 6000))
  const embeddings = await embedTexts(texts)
  const rows = items.map((r, i) => {
    const meta = toMeta(r)
    const make = (meta.make || null)
    const model = (meta.model || null)
    const system = (meta.system || null)
    const fault_code = normalizeFaultCode(meta.fault_code || null)
    const source_type = meta.source_type || table
    const source_id = meta.source_id || null
    const source_url = meta.source_url || null
    return {
      content: texts[i],
      metadata: meta,
      make,
      model,
      system,
      fault_code,
      source_type,
      source_id,
      source_url,
      embedding: embeddings[i]
    }
  })

  // Insert in batches
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    await insertKnowledgeRows(batch)
    console.log(`Inserted ${Math.min(i + BATCH_SIZE, rows.length)} / ${rows.length}`)
    await new Promise(r => setTimeout(r, 250))
  }
}

async function main() {
  const limit = process.env.RAG_INGEST_LIMIT ? parseInt(process.env.RAG_INGEST_LIMIT) : null

  // 1) From enhanced_diagnostic_procedures
  await ingestFromTable({
    table: 'enhanced_diagnostic_procedures',
    select: '*',
    toText: (r) => [r.step_description, r.description, r.notes].filter(Boolean).join('\n'),
    toMeta: (r) => ({
      title: r.title || 'Enhanced diagnostic procedure',
      fault_code: r.fault_code || null,
      make: r.manufacturer || r.make || null,
      model: r.model || null,
      system: r.system || null,
      step_index: r.step_index || null,
      source_type: 'enhanced_diagnostic_procedures',
      source_id: r.id || null
    }),
    where: (q) => q,
    limit
  })

  // 2) From diagnostic_fault_codes
  await ingestFromTable({
    table: 'diagnostic_fault_codes',
    select: '*',
    toText: (r) => [r.description, r.solutions, r.expected_values && JSON.stringify(r.expected_values)].filter(Boolean).join('\n'),
    toMeta: (r) => ({
      title: r.title || 'Diagnostic fault code',
      fault_code: r.fault_code || null,
      make: r.manufacturer || null,
      model: r.model || null,
      system: r.system || null,
      source_type: 'diagnostic_fault_codes',
      source_id: r.id || null
    }),
    where: (q) => q,
    limit
  })

  // 3) From boiler_fault_codes
  await ingestFromTable({
    table: 'boiler_fault_codes',
    select: '*',
    toText: (r) => [r.description, r.details].filter(Boolean).join('\n'),
    toMeta: (r) => ({
      title: r.title || 'Boiler fault code',
      fault_code: r.fault_code || null,
      make: r.manufacturer || null,
      model: r.model || null,
      system: r.system || null,
      source_type: 'boiler_fault_codes',
      source_id: r.id || null
    }),
    where: (q) => q,
    limit
  })

  // 4) From manual_content_intelligence (already chunked)
  await ingestFromTable({
    table: 'manual_content_intelligence',
    select: '*, manual_id, content_text, page_number, fault_codes_mentioned',
    toText: (r) => r.content_text,
    toMeta: (r) => ({
      title: `Manual content p.${r.page_number}`,
      fault_code: Array.isArray(r.fault_codes_mentioned) ? (r.fault_codes_mentioned[0] || null) : null,
      make: null,
      model: null,
      system: null,
      source_type: 'manual_content_intelligence',
      source_id: r.manual_id || null
    }),
    where: (q) => q,
    limit
  })

  console.log('Ingestion complete')
}

main().catch((e) => {
  console.error('Ingestion failed:', e)
  process.exit(1)
})
