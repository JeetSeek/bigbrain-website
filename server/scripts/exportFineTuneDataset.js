import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { supabase } from '../supabaseClient.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function pick(v, d=null) { return v === undefined || v === null ? d : v }
function normMake(s) { return s ? String(s).trim() : null }
function normModel(s) { return s ? String(s).trim() : null }
function normSystem(s) { return s ? String(s).trim() : null }
function normCode(c) {
  if (!c) return null
  let s = String(c).trim()
  const dot = s.match(/([a-zA-Z])\.(\d{1,3})/)
  if (dot) s = `${dot[1]}${dot[2]}`
  s = s.replace(/\+$/,'')
  return s.toUpperCase()
}
function splitBullets(text) {
  if (!text) return []
  const raw = String(text)
    .replace(/\r/g,'')
    .split(/\n|\u2022|\-|\d+\./)
    .map((t) => t.trim())
    .filter(Boolean)
  const dedup = Array.from(new Set(raw))
  return dedup.slice(0, 8)
}

async function fetchAll() {
  const tables = [
    { name: 'enhanced_diagnostic_procedures', select: '*' },
    { name: 'diagnostic_fault_codes', select: '*' },
    { name: 'boiler_fault_codes', select: '*' }
  ]
  const out = {}
  for (const t of tables) {
    const { data, error } = await supabase.from(t.name).select(t.select)
    if (error) throw new Error(`${t.name} query failed: ${error.message}`)
    out[t.name] = data || []
  }
  return out
}

function buildExamples(raw) {
  const map = new Map()
  const key = (mfg, code, model) => [mfg||'', code||'', model||''].join('|')

  for (const r of raw['enhanced_diagnostic_procedures']) {
    const m = normMake(r.manufacturer || r.make)
    const code = normCode(r.fault_code)
    const model = normModel(r.model)
    const k = key(m, code, model)
    const cur = map.get(k) || { make: m, model, system: normSystem(r.system), fault_code: code, steps: [], bullets: [], cautions: [], parts: [], measurements: [], knowledge: [] }
    if (r.step_description) cur.steps.push(String(r.step_description))
    map.set(k, cur)
  }

  for (const r of raw['diagnostic_fault_codes']) {
    const m = normMake(r.manufacturer)
    const code = normCode(r.fault_code)
    const model = normModel(r.model)
    const k = key(m, code, model)
    const cur = map.get(k) || { make: m, model, system: normSystem(r.system), fault_code: code, steps: [], bullets: [], cautions: [], parts: [], measurements: [], knowledge: [] }
    const b = splitBullets(r.solutions || r.description)
    cur.bullets.push(...b)
    if (r.expected_values && typeof r.expected_values === 'object') {
      const ev = r.expected_values
      if (ev.gas_pressure && ev.gas_pressure.nominal) cur.measurements.push(`Gas Pressure: ${ev.gas_pressure.nominal}`)
      if (ev.electrical_supply && ev.electrical_supply.voltage) cur.measurements.push(`Electrical Supply: ${ev.electrical_supply.voltage}`)
    }
    map.set(k, cur)
  }

  for (const r of raw['boiler_fault_codes']) {
    const m = normMake(r.manufacturer)
    const code = normCode(r.fault_code)
    const model = normModel(r.model)
    const k = key(m, code, model)
    const cur = map.get(k) || { make: m, model, system: normSystem(r.system), fault_code: code, steps: [], bullets: [], cautions: [], parts: [], measurements: [], knowledge: [] }
    const b = splitBullets(r.description)
    cur.bullets.push(...b)
    map.set(k, cur)
  }

  const examples = []
  for (const [k, v] of map.entries()) {
    if (!v.fault_code || (!v.make && !v.model)) continue
    v.bullets = Array.from(new Set(v.bullets)).slice(0, 6)
    v.steps = Array.from(new Set(v.steps)).slice(0, 12)
    const header = { make: v.make || null, model: v.model || null, system: v.system ? (String(v.system).charAt(0).toUpperCase()+String(v.system).slice(1)) : null, faultCode: v.fault_code }
    const sources = { manuals: [], knowledge: v.knowledge }
    const structured = { header, bullets: v.bullets, steps: v.steps, cautions: v.cautions, parts: v.parts, measurements: v.measurements, sources }
    const userPrompt = [
      v.make ? `Make: ${v.make}` : null,
      v.model ? `Model: ${v.model}` : null,
      v.system ? `System: ${header.system}` : null,
      v.fault_code ? `Fault: ${v.fault_code}` : null
    ].filter(Boolean).join(' | ')
    const line = {
      messages: [
        { role: 'system', content: 'You are a boiler diagnostic assistant. Follow safety-first rules. Provide structured JSON only.' },
        { role: 'user', content: userPrompt },
        { role: 'assistant', content: JSON.stringify(structured) }
      ]
    }
    examples.push(line)
  }
  return examples
}

async function main() {
  const raw = await fetchAll()
  const examples = buildExamples(raw)
  const outDir = path.join(__dirname, '..', 'datasets')
  fs.mkdirSync(outDir, { recursive: true })
  const train = []
  const evals = []
  for (let i=0; i<examples.length; i++) {
    if (i % 10 === 0) evals.push(examples[i])
    else train.push(examples[i])
  }
  const trainPath = path.join(outDir, 'ft_train.jsonl')
  const evalPath = path.join(outDir, 'ft_eval.jsonl')
  fs.writeFileSync(trainPath, train.map((x)=>JSON.stringify(x)).join('\n'))
  fs.writeFileSync(evalPath, evals.map((x)=>JSON.stringify(x)).join('\n'))
  console.log(`train: ${train.length} examples -> ${trainPath}`)
  console.log(`eval:  ${evals.length} examples -> ${evalPath}`)
}

main().catch((e)=>{ console.error(e); process.exit(1) })
