#!/usr/bin/env node
/**
 * GC Number-Aware Manual Extraction
 * Run daily: node gc-extract.js
 * Results: ~/Desktop/gc-extraction-results/
 */

import { createRequire } from 'module';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import os from 'os';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });

const require = createRequire(import.meta.url);
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');

const OPENAI_KEYS = [
  process.env.OPENAI_API_KEY,
  process.env.OPENAI_API_KEY_2,
  process.env.OPENAI_API_KEY_3
].filter(Boolean);

if (OPENAI_KEYS.length === 0) {
  console.error('❌ No OPENAI_API_KEY found. Add it to .env or server/.env');
  process.exit(1);
}
console.log(`🔑 ${OPENAI_KEYS.length} OpenAI API keys loaded`);
let currentKeyIndex = 0;

const CONFIG = {
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://hfyfidpbtoqnqhdywdzw.supabase.co',
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY,
  RATE_LIMIT_DELAY: 500,  // Faster with paid account
  MAX_MANUALS: 2000,      // Process all priority manufacturers
  // Priority: manufacturers with 0 fault codes extracted
  PRIORITY_MANUFACTURERS: ['Vaillant', 'Worcester', 'Ideal', 'Glow-worm', 'Glowworm'],
  DESKTOP_PATH: path.join(os.homedir(), 'Desktop', 'gc-extraction-results')
};

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

// Ensure desktop results folder exists
if (!fs.existsSync(CONFIG.DESKTOP_PATH)) {
  fs.mkdirSync(CONFIG.DESKTOP_PATH, { recursive: true });
}

// Track processed manuals to avoid duplicates
const PROCESSED_FILE = path.join(CONFIG.DESKTOP_PATH, 'processed-manuals.json');
let processedManuals = [];
if (fs.existsSync(PROCESSED_FILE)) {
  processedManuals = JSON.parse(fs.readFileSync(PROCESSED_FILE, 'utf8'));
}

const stats = {
  date: new Date().toISOString().split('T')[0],
  startTime: Date.now(),
  manualsProcessed: 0,
  gcNumbersFound: 0,
  faultCodesExtracted: 0,
  proceduresExtracted: 0,
  sectionsExtracted: 0,
  apiCalls: 0,
  errors: [],
  // Token tracking for cost estimation
  inputTokens: 0,
  outputTokens: 0
};

// API Pricing (per 1M tokens)
const PRICING = {
  'gpt-4o-mini': { input: 0.15, output: 0.60 }
};
const CURRENT_MODEL = 'gpt-4o-mini';

// GC Number validation regex - must match XX-XXX-XX or XX XXX XX format
const GC_REGEX = /^\d{2}[-\s]?\d{3}[-\s]?\d{2}$/;

function isValidGCNumber(gc) {
  if (!gc) return false;
  const normalized = gc.replace(/\s+/g, '-').replace(/^GC/i, '');
  return GC_REGEX.test(normalized);
}

function normalizeGCNumber(gc) {
  if (!gc) return null;
  // Remove GC prefix if present, normalize to XX-XXX-XX format
  let normalized = gc.replace(/^GC/i, '').trim();
  normalized = normalized.replace(/\s+/g, '-');
  // If it's just digits, format as XX-XXX-XX
  if (/^\d{7}$/.test(normalized)) {
    normalized = `${normalized.slice(0,2)}-${normalized.slice(2,5)}-${normalized.slice(5,7)}`;
  }
  return normalized;
}

const PROMPTS = {
  extractGCAndMetadata: `Analyze this boiler manual and extract information. Return ONLY valid JSON.

IMPORTANT: GC numbers (Gas Council numbers) follow these formats:
- "47 075 06" or "47-075-06" (with spaces or dashes)
- "GC4707506" or "GC 47 075 06" (with GC prefix)
- Found near phrases like "G.C. No", "GC Number", "Gas Council No"

DO NOT use filename or model name as GC number. Only extract REAL GC numbers from the document text.
If no valid GC number is found, return empty array for gc_numbers.

{
  "gc_numbers": ["ONLY real GC numbers in format XX-XXX-XX"],
  "manufacturer": "manufacturer name",
  "model_name": "model name",
  "model_variants": ["variants covered"],
  "boiler_type": "combi|system|regular|heat-only",
  "fuel_type": "natural_gas|lpg|oil",
  "output_kw": "output in kW",
  "table_of_contents": [{"title": "section", "page": 1, "level": 1}]
}

Text:
`,

  extractFaultCodes: `Extract ALL fault codes from this boiler manual. Return ONLY valid JSON array.

Look for:
- Digital display codes (F1, F22, E119, EA, etc.)
- LED indicator faults (neon lights, warning lights)
- Error messages and their meanings

[{
  "fault_code": "exact code shown on display",
  "display_code": "how it appears (e.g., 'F.22' or 'E 119')",
  "description": "what the fault means",
  "cause": "likely cause of the fault",
  "remedy": "steps to fix",
  "page_reference": 1,
  "severity": "critical|warning|info"
}]

Text:
`,

  extractProcedures: `Extract service procedures. Return ONLY valid JSON array:

[{
  "procedure_name": "name",
  "category": "installation|maintenance|repair|commissioning|fault-finding",
  "steps": ["step 1", "step 2"],
  "page_reference": 1,
  "time_estimate": "time",
  "difficulty": "easy|medium|hard",
  "warnings": ["warnings"],
  "tools_required": ["tools"],
  "parts_required": ["parts"]
}]

Text:
`
};

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function downloadPDF(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function extractPDFText(pdfBuffer) {
  // Convert Buffer to Uint8Array for pdfjs
  const uint8Array = new Uint8Array(pdfBuffer);
  const doc = await pdfjs.getDocument({ data: uint8Array }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map(item => item.str).join(' ');
    pages.push({ pageNum: i, text });
  }
  return pages;
}

async function callLLM(prompt, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const key = OPENAI_KEYS[currentKeyIndex % OPENAI_KEYS.length];
    try {
      stats.apiCalls++;
      const inputTokenEstimate = Math.ceil(prompt.length / 4);
      stats.inputTokens += inputTokenEstimate;
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 4000
        })
      });
      
      if (!response.ok) {
        const errBody = await response.text();
        if (response.status === 429) {
          console.log(`   ⏳ Rate limited on key #${currentKeyIndex + 1}, rotating...`);
          currentKeyIndex++;
          if (currentKeyIndex >= OPENAI_KEYS.length * 2) {
            console.log('\n🛑 ALL KEYS RATE LIMITED - waiting 60s...');
            await delay(60000);
            currentKeyIndex = 0;
          }
          await delay(2000);
          continue;
        }
        throw new Error(`OpenAI ${response.status}: ${errBody.slice(0, 200)}`);
      }
      
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '';
      
      const outputTokenEstimate = Math.ceil(text.length / 4);
      stats.outputTokens += outputTokenEstimate;
      
      const jsonMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return null;
    } catch (error) {
      if (error.message.includes('429')) {
        currentKeyIndex++;
        await delay(5000);
        continue;
      }
      console.log(`   ⚠️ LLM error: ${error.message.slice(0, 100)}`);
      if (attempt === maxRetries - 1) return null;
      await delay(3000);
    }
  }
  return null;
}

async function processManual(manual) {
  const { name, url, manufacturer } = manual;
  
  if (processedManuals.includes(name)) {
    console.log(`   ⏭️ Already processed: ${name}`);
    return null;
  }

  console.log(`\n📋 Processing: ${name}`);
  console.log(`   Manufacturer: ${manufacturer}`);

  try {
    console.log('   📥 Downloading...');
    const pdfBuffer = await downloadPDF(url);
    const sizeMB = (pdfBuffer.length / 1024 / 1024).toFixed(2);
    console.log(`   ✅ Downloaded: ${sizeMB} MB`);

    if (pdfBuffer.length < 50000 || pdfBuffer.length > 50000000) {
      console.log('   ⏭️ Skipping (size out of range)');
      return null;
    }

    console.log('   📄 Extracting text...');
    const pages = await extractPDFText(pdfBuffer);
    const totalChars = pages.reduce((sum, p) => sum + p.text.length, 0);
    console.log(`   ✅ Extracted: ${pages.length} pages, ${totalChars} chars`);

    if (totalChars < 1000) {
      console.log('   ⏭️ Skipping (insufficient text)');
      return null;
    }

    const firstPagesText = pages.slice(0, 10).map(p => p.text).join('\n').slice(0, 15000);
    
    console.log('   🔍 Extracting GC numbers...');
    await delay(CONFIG.RATE_LIMIT_DELAY);
    const metadata = await callLLM(PROMPTS.extractGCAndMetadata + firstPagesText);
    
    if (!metadata) {
      console.log('   ⚠️ Failed to extract metadata');
      return null;
    }

    // Validate and normalize GC numbers
    let validGCs = [];
    if (metadata.gc_numbers && metadata.gc_numbers.length > 0) {
      for (const gc of metadata.gc_numbers) {
        const normalized = normalizeGCNumber(gc);
        if (isValidGCNumber(normalized)) {
          validGCs.push(normalized);
        }
      }
    }
    
    if (validGCs.length === 0) {
      console.log('   ⚠️ No valid GC numbers found - skipping model save');
      // Still extract fault codes and procedures but link to filename-based ID
      validGCs = [`PENDING-${name.slice(0, 30)}`];
    } else {
      console.log(`   ✅ Valid GC numbers: ${validGCs.join(', ')}`);
    }
    
    metadata.gc_numbers = validGCs;
    stats.gcNumbersFound += validGCs.filter(gc => !gc.startsWith('PENDING')).length;

    for (const gc of metadata.gc_numbers) {
      if (gc.startsWith('PENDING')) continue; // Don't save pending entries to boiler_models
      await supabase.from('boiler_models').upsert({
        gc_number: gc,
        manufacturer: metadata.manufacturer || manufacturer,
        model_name: metadata.model_name || name,
        model_variant: metadata.model_variants?.[0],
        boiler_type: metadata.boiler_type,
        fuel_type: metadata.fuel_type || 'natural_gas',
        output_kw: metadata.output_kw ? parseFloat(metadata.output_kw) : null,
        manual_url: url,
        manual_filename: name
      }, { onConflict: 'gc_number,manufacturer', ignoreDuplicates: true });
    }

    const fullText = pages.map(p => `[Page ${p.pageNum}]\n${p.text}`).join('\n\n').slice(0, 50000);

    console.log('   🔍 Extracting fault codes...');
    await delay(CONFIG.RATE_LIMIT_DELAY);
    const faultCodes = await callLLM(PROMPTS.extractFaultCodes + fullText);
    
    if (faultCodes && Array.isArray(faultCodes) && faultCodes.length > 0) {
      console.log(`   ✅ Found ${faultCodes.length} fault codes`);
      stats.faultCodesExtracted += faultCodes.length;
      
      for (const fc of faultCodes) {
        for (const gc of metadata.gc_numbers) {
          await supabase.from('gc_fault_codes').insert({
            gc_number: gc,
            manufacturer: metadata.manufacturer || manufacturer,
            model_name: metadata.model_name || name,
            fault_code: fc.fault_code,
            display_code: fc.display_code,
            description: fc.description,
            cause: fc.cause,
            remedy: fc.remedy,
            page_reference: fc.page_reference ? parseInt(fc.page_reference) : null,
            severity: fc.severity
          });
        }
      }
    } else {
      console.log('   ℹ️ No fault codes found');
    }

    console.log('   🔧 Extracting procedures...');
    await delay(CONFIG.RATE_LIMIT_DELAY);
    const procedures = await callLLM(PROMPTS.extractProcedures + fullText);
    
    if (procedures && Array.isArray(procedures) && procedures.length > 0) {
      console.log(`   ✅ Found ${procedures.length} procedures`);
      stats.proceduresExtracted += procedures.length;
      
      for (const proc of procedures) {
        for (const gc of metadata.gc_numbers) {
          await supabase.from('gc_procedures').insert({
            gc_number: gc,
            manufacturer: metadata.manufacturer || manufacturer,
            model_name: metadata.model_name || name,
            procedure_name: proc.procedure_name,
            category: proc.category,
            steps: proc.steps,
            page_reference: proc.page_reference ? parseInt(proc.page_reference) : null,
            time_estimate: proc.time_estimate,
            difficulty: proc.difficulty,
            warnings: proc.warnings,
            tools_required: proc.tools_required,
            parts_required: proc.parts_required
          });
        }
      }
    } else {
      console.log('   ℹ️ No procedures found');
    }

    if (metadata.table_of_contents && metadata.table_of_contents.length > 0) {
      console.log(`   📑 Saving ${metadata.table_of_contents.length} sections...`);
      stats.sectionsExtracted += metadata.table_of_contents.length;
      
      for (let i = 0; i < Math.min(metadata.table_of_contents.length, 20); i++) {
        const section = metadata.table_of_contents[i];
        const startPage = parseInt(section.page) || 1;
        const endPage = metadata.table_of_contents[i + 1]?.page 
          ? parseInt(metadata.table_of_contents[i + 1].page) - 1 
          : Math.min(startPage + 5, pages.length);
        
        const sectionPages = pages.filter(p => p.pageNum >= startPage && p.pageNum <= endPage);
        const sectionText = sectionPages.map(p => p.text).join('\n');
        
        if (sectionText.length > 100) {
          for (const gc of metadata.gc_numbers) {
            await supabase.from('manual_sections').insert({
              gc_number: gc,
              manufacturer: metadata.manufacturer || manufacturer,
              model_name: metadata.model_name || name,
              section_title: section.title,
              section_level: section.level || 1,
              section_order: i,
              start_page: startPage,
              end_page: endPage,
              content: sectionText.slice(0, 30000)
            });
          }
        }
      }
    }

    processedManuals.push(name);
    fs.writeFileSync(PROCESSED_FILE, JSON.stringify(processedManuals, null, 2));
    
    stats.manualsProcessed++;
    console.log('   ✅ Complete!');
    
    return { gc_numbers: metadata.gc_numbers, manufacturer: metadata.manufacturer };

  } catch (error) {
    if (error.message === 'QUOTA_EXHAUSTED') throw error;
    console.log(`   ❌ Error: ${error.message}`);
    stats.errors.push({ manual: name, error: error.message });
    return null;
  }
}

function saveStats() {
  const runtime = ((Date.now() - stats.startTime) / 1000 / 60).toFixed(1);
  stats.runtime = `${runtime} minutes`;
  
  // Calculate costs
  const pricing = PRICING[CURRENT_MODEL];
  const inputCost = (stats.inputTokens / 1000000) * pricing.input;
  const outputCost = (stats.outputTokens / 1000000) * pricing.output;
  const totalCost = inputCost + outputCost;
  
  // Estimate total project cost
  const TOTAL_MANUALS = 2925; // From database query
  const avgInputTokensPerManual = stats.manualsProcessed > 0 ? stats.inputTokens / stats.manualsProcessed : 30000;
  const avgOutputTokensPerManual = stats.manualsProcessed > 0 ? stats.outputTokens / stats.manualsProcessed : 2000;
  const remainingManuals = TOTAL_MANUALS - processedManuals.length;
  const projectedInputTokens = remainingManuals * avgInputTokensPerManual;
  const projectedOutputTokens = remainingManuals * avgOutputTokensPerManual;
  const projectedCost = ((projectedInputTokens / 1000000) * pricing.input) + ((projectedOutputTokens / 1000000) * pricing.output);
  
  stats.costEstimate = {
    model: CURRENT_MODEL,
    inputTokens: stats.inputTokens,
    outputTokens: stats.outputTokens,
    sessionCost: `$${totalCost.toFixed(4)}`,
    projectedTotalCost: `$${projectedCost.toFixed(2)}`,
    remainingManuals: remainingManuals
  };
  
  const filename = `extraction-${stats.date}.json`;
  const filepath = path.join(CONFIG.DESKTOP_PATH, filename);
  fs.writeFileSync(filepath, JSON.stringify(stats, null, 2));
  
  const summary = `
================================================================================
📊 GC EXTRACTION RESULTS - ${stats.date}
================================================================================
⏱️  Runtime: ${runtime} minutes
📋 Manuals processed: ${stats.manualsProcessed}
🔢 GC numbers found: ${stats.gcNumbersFound}
❌ Fault codes extracted: ${stats.faultCodesExtracted}
🔧 Procedures extracted: ${stats.proceduresExtracted}
📑 Sections extracted: ${stats.sectionsExtracted}
🔄 API calls made: ${stats.apiCalls}
⚠️  Errors: ${stats.errors.length}
================================================================================
💰 COST ANALYSIS (${CURRENT_MODEL})
================================================================================
📊 This session:
   Input tokens: ${stats.inputTokens.toLocaleString()}
   Output tokens: ${stats.outputTokens.toLocaleString()}
   Session cost: $${totalCost.toFixed(4)}
   
📈 Full project estimate:
   Remaining manuals: ${remainingManuals.toLocaleString()}
   Projected cost: $${projectedCost.toFixed(2)}
   
================================================================================
📁 Results saved to: ${CONFIG.DESKTOP_PATH}
================================================================================
`;
  
  console.log(summary);
  fs.writeFileSync(path.join(CONFIG.DESKTOP_PATH, `summary-${stats.date}.txt`), summary);
}

async function main() {
  console.log('🚀 Starting GC-Aware Manual Extraction');
  console.log(`📍 Priority: ${CONFIG.PRIORITY_MANUFACTURERS.join(', ')}`);
  console.log(`📁 Results: ${CONFIG.DESKTOP_PATH}`);
  console.log(`📋 Previously processed: ${processedManuals.length} manuals\n`);

  // Get manuals ONLY for priority manufacturers
  let allManuals = [];
  for (const mfg of CONFIG.PRIORITY_MANUFACTURERS) {
    const { data, error } = await supabase
      .from('boiler_manuals')
      .select('name, url, manufacturer')
      .ilike('manufacturer', `%${mfg}%`)
      .order('name')
      .limit(500);
    if (error) {
      console.error(`Failed to get ${mfg} manuals:`, error);
      continue;
    }
    if (data && data.length > 0) {
      console.log(`📚 ${mfg}: ${data.length} manuals found`);
      allManuals = allManuals.concat(data);
    }
  }

  if (allManuals.length === 0) {
    console.error('No manuals found for priority manufacturers');
    return;
  }

  const manuals = allManuals;
  console.log(`📚 Total: ${manuals.length} manuals from priority manufacturers`);

  // Sort: installation/service manuals first (most useful)
  const sortedManuals = manuals.sort((a, b) => {
    const aScore = /install|service|fault|diagnos/i.test(a.name) ? 0 : 1;
    const bScore = /install|service|fault|diagnos/i.test(b.name) ? 0 : 1;
    return aScore - bScore;
  });

  // Filter out already processed
  const toProcess = sortedManuals.filter(m => !processedManuals.includes(m.name));
  console.log(`📋 New manuals to process: ${toProcess.length}`);

  let processedCount = 0;

  try {
    for (const manual of toProcess) {
      if (processedCount >= CONFIG.MAX_MANUALS) {
        console.log('\n📋 Manual limit reached!');
        break;
      }

      await processManual({
        name: manual.name,
        url: manual.url,
        manufacturer: manual.manufacturer || 'Unknown'
      });

      processedCount++;
      
      if (processedCount % 10 === 0) {
        saveStats();
      }

      await delay(CONFIG.RATE_LIMIT_DELAY);
    }
  } catch (error) {
    if (error.message === 'QUOTA_EXHAUSTED') {
      console.log('\n🛑 Quota exhausted - run again tomorrow!');
    } else {
      throw error;
    }
  }

  saveStats();
  console.log('\n✅ GC EXTRACTION COMPLETE');
  console.log(`📁 Check results at: ${CONFIG.DESKTOP_PATH}`);
}

main().catch(console.error);
