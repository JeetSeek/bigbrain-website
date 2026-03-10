#!/usr/bin/env node
/**
 * Priority Manufacturer Extraction
 * Targets ONLY: Worcester, Vaillant, Ideal, Potterton, Glow-worm
 * These have 600+ manuals but ZERO fault codes in gc_fault_codes
 */

import { createRequire } from 'module';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import os from 'os';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });

const require = createRequire(import.meta.url);
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');

if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in environment. Add it to .env or server/.env');
  process.exit(1);
}

const CONFIG = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  SUPABASE_URL: 'https://hfyfidpbtoqnqhdywdzw.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmeWZpZHBidG9xbnFoZHl3ZHp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0OTQ4OTksImV4cCI6MjA2MTA3MDg5OX0.eZrUGTGOOnHrZp2BoIbnaqSPvcmNKYfpoLXmGsa3PME',
  RATE_LIMIT_DELAY: 1000,
  MAX_MANUALS: 100,
  // ONLY these manufacturers
  TARGET_MANUFACTURERS: ['worcester', 'vaillant', 'ideal-domestic', 'ideal-commercial', 'potterton', 'glowworm', 'glow-worm'],
  RESULTS_PATH: path.join(os.homedir(), 'Desktop', 'gc-extraction-results')
};

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

if (!fs.existsSync(CONFIG.RESULTS_PATH)) {
  fs.mkdirSync(CONFIG.RESULTS_PATH, { recursive: true });
}

const PROCESSED_FILE = path.join(CONFIG.RESULTS_PATH, 'processed-priority.json');
let processedManuals = [];
if (fs.existsSync(PROCESSED_FILE)) {
  processedManuals = JSON.parse(fs.readFileSync(PROCESSED_FILE, 'utf8'));
}

const stats = {
  startTime: Date.now(),
  manualsProcessed: 0,
  manualsSkipped: 0,
  faultCodesExtracted: 0,
  proceduresExtracted: 0,
  sectionsExtracted: 0,
  errors: [],
  byManufacturer: {}
};

const GC_REGEX = /^\d{2}[-\s]?\d{3}[-\s]?\d{2}$/;

function normalizeGCNumber(gc) {
  if (!gc) return null;
  let normalized = gc.replace(/^GC/i, '').trim().replace(/\s+/g, '-');
  if (/^\d{7}$/.test(normalized)) {
    normalized = `${normalized.slice(0,2)}-${normalized.slice(2,5)}-${normalized.slice(5,7)}`;
  }
  return normalized;
}

function isValidGCNumber(gc) {
  if (!gc) return false;
  return GC_REGEX.test(gc.replace(/\s+/g, '-').replace(/^GC/i, ''));
}

const PROMPTS = {
  extractAll: `You are analyzing a boiler installation/service manual. Extract ALL of the following in one response. Return ONLY valid JSON.

IMPORTANT: 
- GC numbers follow format "47 075 06" or "47-075-06" or "GC4707506"
- Found near "G.C. No", "GC Number", "Gas Council No"
- DO NOT use filename as GC number

Return this exact JSON structure:
{
  "gc_numbers": ["XX-XXX-XX format only"],
  "manufacturer": "manufacturer name",
  "model_name": "full model name",
  "boiler_type": "combi|system|regular|heat-only",
  "fault_codes": [
    {
      "fault_code": "exact code (e.g. F.22, L2, EA)",
      "display_code": "how it appears on display",
      "description": "what this fault means",
      "cause": "detailed likely cause",
      "remedy": "detailed steps to fix/diagnose",
      "page_reference": 1,
      "severity": "critical|warning|info"
    }
  ],
  "procedures": [
    {
      "procedure_name": "name",
      "category": "installation|maintenance|repair|commissioning|fault-finding",
      "steps": ["detailed step 1", "detailed step 2"],
      "page_reference": 1,
      "difficulty": "easy|medium|hard",
      "warnings": ["safety warnings"],
      "tools_required": ["tools needed"],
      "parts_required": ["parts that may be needed"]
    }
  ],
  "sections": [
    {"title": "section name", "page": 1}
  ]
}

Manual text:
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

async function callGemini(prompt, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return null;
    } catch (error) {
      if (error.message.includes('429') || error.message.includes('quota')) {
        if (error.message.includes('quota')) {
          console.log('\n🛑 DAILY QUOTA REACHED');
          throw new Error('QUOTA_EXHAUSTED');
        }
        console.log(`   ⏳ Rate limited, waiting ${30 * (attempt + 1)}s...`);
        await delay(30000 * (attempt + 1));
      } else {
        throw error;
      }
    }
  }
  return null;
}

async function processManual(manual) {
  const { name, url, manufacturer } = manual;

  if (processedManuals.includes(name)) {
    return null;
  }

  console.log(`\n📋 ${name}`);
  console.log(`   Manufacturer: ${manufacturer}`);

  try {
    const pdfBuffer = await downloadPDF(url);
    const sizeMB = (pdfBuffer.length / 1024 / 1024).toFixed(2);

    if (pdfBuffer.length < 50000 || pdfBuffer.length > 50000000) {
      console.log(`   ⏭️ Skipping (${sizeMB}MB out of range)`);
      stats.manualsSkipped++;
      processedManuals.push(name);
      fs.writeFileSync(PROCESSED_FILE, JSON.stringify(processedManuals, null, 2));
      return null;
    }

    const pages = await extractPDFText(pdfBuffer);
    const totalChars = pages.reduce((sum, p) => sum + p.text.length, 0);

    if (totalChars < 500) {
      console.log(`   ⏭️ Skipping (only ${totalChars} chars extracted — likely scanned PDF)`);
      stats.manualsSkipped++;
      processedManuals.push(name);
      fs.writeFileSync(PROCESSED_FILE, JSON.stringify(processedManuals, null, 2));
      return null;
    }

    console.log(`   📄 ${pages.length} pages, ${totalChars} chars, ${sizeMB}MB`);

    // Single Gemini call for everything (more efficient)
    const fullText = pages.map(p => `[Page ${p.pageNum}]\n${p.text}`).join('\n\n').slice(0, 60000);
    
    await delay(CONFIG.RATE_LIMIT_DELAY);
    const extracted = await callGemini(PROMPTS.extractAll + fullText);

    if (!extracted) {
      console.log('   ⚠️ Gemini returned no data');
      processedManuals.push(name);
      fs.writeFileSync(PROCESSED_FILE, JSON.stringify(processedManuals, null, 2));
      return null;
    }

    // Validate GC numbers
    let validGCs = [];
    if (extracted.gc_numbers?.length > 0) {
      for (const gc of extracted.gc_numbers) {
        const normalized = normalizeGCNumber(gc);
        if (isValidGCNumber(normalized)) validGCs.push(normalized);
      }
    }
    if (validGCs.length === 0) validGCs = [`PENDING-${name.slice(0, 30)}`];
    else console.log(`   🔢 GC: ${validGCs.join(', ')}`);

    const mfgName = extracted.manufacturer || manufacturer;
    const modelName = extracted.model_name || name;

    // Save fault codes
    if (extracted.fault_codes?.length > 0) {
      console.log(`   ❌ ${extracted.fault_codes.length} fault codes`);
      stats.faultCodesExtracted += extracted.fault_codes.length;

      for (const fc of extracted.fault_codes) {
        for (const gc of validGCs) {
          await supabase.from('gc_fault_codes').insert({
            gc_number: gc,
            manufacturer: mfgName,
            model_name: modelName,
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
    }

    // Save procedures
    if (extracted.procedures?.length > 0) {
      console.log(`   🔧 ${extracted.procedures.length} procedures`);
      stats.proceduresExtracted += extracted.procedures.length;

      for (const proc of extracted.procedures) {
        for (const gc of validGCs) {
          await supabase.from('gc_procedures').insert({
            gc_number: gc,
            manufacturer: mfgName,
            model_name: modelName,
            procedure_name: proc.procedure_name,
            category: proc.category,
            steps: proc.steps,
            page_reference: proc.page_reference ? parseInt(proc.page_reference) : null,
            difficulty: proc.difficulty,
            warnings: proc.warnings,
            tools_required: proc.tools_required,
            parts_required: proc.parts_required
          });
        }
      }
    }

    // Save manual sections
    if (extracted.sections?.length > 0) {
      stats.sectionsExtracted += extracted.sections.length;
      for (let i = 0; i < Math.min(extracted.sections.length, 20); i++) {
        const section = extracted.sections[i];
        const startPage = parseInt(section.page) || 1;
        const endPage = extracted.sections[i + 1]?.page
          ? parseInt(extracted.sections[i + 1].page) - 1
          : Math.min(startPage + 5, pages.length);

        const sectionPages = pages.filter(p => p.pageNum >= startPage && p.pageNum <= endPage);
        const sectionText = sectionPages.map(p => p.text).join('\n');

        if (sectionText.length > 100) {
          for (const gc of validGCs) {
            await supabase.from('manual_sections').insert({
              gc_number: gc,
              manufacturer: mfgName,
              model_name: modelName,
              section_title: section.title,
              section_level: 1,
              section_order: i,
              start_page: startPage,
              end_page: endPage,
              content: sectionText.slice(0, 30000)
            });
          }
        }
      }
    }

    // Track per-manufacturer stats
    if (!stats.byManufacturer[manufacturer]) {
      stats.byManufacturer[manufacturer] = { processed: 0, faultCodes: 0, procedures: 0 };
    }
    stats.byManufacturer[manufacturer].processed++;
    stats.byManufacturer[manufacturer].faultCodes += (extracted.fault_codes?.length || 0);
    stats.byManufacturer[manufacturer].procedures += (extracted.procedures?.length || 0);

    processedManuals.push(name);
    fs.writeFileSync(PROCESSED_FILE, JSON.stringify(processedManuals, null, 2));
    stats.manualsProcessed++;
    console.log('   ✅ Done');

    return extracted;
  } catch (error) {
    if (error.message === 'QUOTA_EXHAUSTED') throw error;
    console.log(`   ❌ ${error.message}`);
    stats.errors.push({ manual: name, error: error.message });
    processedManuals.push(name);
    fs.writeFileSync(PROCESSED_FILE, JSON.stringify(processedManuals, null, 2));
    return null;
  }
}

async function main() {
  console.log('🚀 PRIORITY MANUFACTURER EXTRACTION');
  console.log(`🎯 Targets: ${CONFIG.TARGET_MANUFACTURERS.join(', ')}`);
  console.log(`📋 Previously processed: ${processedManuals.length}\n`);

  // Get ONLY priority manufacturer manuals
  const allManuals = [];
  for (const mfg of CONFIG.TARGET_MANUFACTURERS) {
    const { data, error } = await supabase
      .from('boiler_manuals')
      .select('name, url, manufacturer')
      .ilike('manufacturer', `%${mfg}%`)
      .or('name.ilike.%installation%,name.ilike.%service%')
      .limit(200);

    if (data && data.length > 0) {
      const unprocessed = data.filter(m => !processedManuals.includes(m.name));
      allManuals.push(...unprocessed);
      console.log(`📚 ${mfg}: ${data.length} total, ${unprocessed.length} new`);
    }
  }

  console.log(`\n📊 Total manuals to process: ${allManuals.length}`);
  console.log(`🔒 Max this run: ${CONFIG.MAX_MANUALS}\n`);

  let count = 0;
  try {
    for (const manual of allManuals) {
      if (count >= CONFIG.MAX_MANUALS) break;
      await processManual(manual);
      count++;

      if (count % 10 === 0) {
        const runtime = ((Date.now() - stats.startTime) / 1000 / 60).toFixed(1);
        console.log(`\n--- Progress: ${count}/${Math.min(allManuals.length, CONFIG.MAX_MANUALS)} | ${runtime}min | ${stats.faultCodesExtracted} fault codes | ${stats.proceduresExtracted} procedures ---\n`);
      }
    }
  } catch (error) {
    if (error.message === 'QUOTA_EXHAUSTED') {
      console.log('\n🛑 Quota reached — run again tomorrow');
    } else {
      throw error;
    }
  }

  // Final summary
  const runtime = ((Date.now() - stats.startTime) / 1000 / 60).toFixed(1);
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📊 EXTRACTION COMPLETE — ${runtime} minutes`);
  console.log(`${'='.repeat(70)}`);
  console.log(`📋 Processed: ${stats.manualsProcessed} | Skipped: ${stats.manualsSkipped} | Errors: ${stats.errors.length}`);
  console.log(`❌ Fault codes: ${stats.faultCodesExtracted}`);
  console.log(`🔧 Procedures: ${stats.proceduresExtracted}`);
  console.log(`📑 Sections: ${stats.sectionsExtracted}`);
  console.log('\nPer manufacturer:');
  for (const [mfg, data] of Object.entries(stats.byManufacturer)) {
    console.log(`  ${mfg}: ${data.processed} manuals, ${data.faultCodes} fault codes, ${data.procedures} procedures`);
  }
  console.log(`${'='.repeat(70)}`);

  fs.writeFileSync(
    path.join(CONFIG.RESULTS_PATH, `priority-extraction-${new Date().toISOString().split('T')[0]}.json`),
    JSON.stringify(stats, null, 2)
  );
}

main().catch(console.error);
