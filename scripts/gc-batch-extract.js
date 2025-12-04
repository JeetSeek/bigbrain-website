#!/usr/bin/env node
/**
 * Batch GC Number Extraction with Quality Checks
 * Processes manuals in batches, runs quality checks between batches
 */

import { createRequire } from 'module';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import os from 'os';

const require = createRequire(import.meta.url);
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');

const CONFIG = {
  GEMINI_API_KEY: 'AIzaSyAo52Eu2llZAYzYj27MLMOxFWnapZQ1KDg',
  SUPABASE_URL: 'https://hfyfidpbtoqnqhdywdzw.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmeWZpZHBidG9xbnFoZHl3ZHp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0OTQ4OTksImV4cCI6MjA2MTA3MDg5OX0.eZrUGTGOOnHrZp2BoIbnaqSPvcmNKYfpoLXmGsa3PME',
  RATE_LIMIT_DELAY: 5000,  // 5 seconds between API calls to avoid abuse detection
  BATCH_SIZE: 20,  // Process 20 manuals per batch (slower, safer)
  DESKTOP_PATH: path.join(os.homedir(), 'Desktop', 'gc-extraction-results'),
  PRIORITY_MANUFACTURERS: ['worcester', 'vaillant', 'ideal-domestic', 'potterton', 'glowworm', 'viessmann', 'ferroli', 'biasi']
};

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(CONFIG.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// Ensure desktop results folder exists
if (!fs.existsSync(CONFIG.DESKTOP_PATH)) {
  fs.mkdirSync(CONFIG.DESKTOP_PATH, { recursive: true });
}

// Track processed manuals
const PROCESSED_FILE = path.join(CONFIG.DESKTOP_PATH, 'processed-manuals.json');
let processedManuals = [];
if (fs.existsSync(PROCESSED_FILE)) {
  processedManuals = JSON.parse(fs.readFileSync(PROCESSED_FILE, 'utf8'));
}

// Batch stats
let batchStats = {
  batchNumber: 0,
  manualsProcessed: 0,
  gcNumbersFound: 0,
  faultCodesExtracted: 0,
  proceduresExtracted: 0,
  errors: [],
  inputTokens: 0,
  outputTokens: 0
};

// GC Number validation
const GC_REGEX = /^\d{2}[-\s]?\d{3}[-\s]?\d{2}$/;

function isValidGCNumber(gc) {
  if (!gc) return false;
  const normalized = gc.replace(/\s+/g, '-').replace(/^GC/i, '');
  return GC_REGEX.test(normalized);
}

function normalizeGCNumber(gc) {
  if (!gc) return null;
  let normalized = gc.replace(/^GC/i, '').trim().replace(/\s+/g, '-');
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
  "output_kw": "output in kW"
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
  "display_code": "how it appears",
  "description": "what the fault means",
  "cause": "likely cause of the fault",
  "remedy": "steps to fix",
  "severity": "critical|warning|info"
}]

Text:
`,

  extractProcedures: `Extract service procedures. Return ONLY valid JSON array:

[{
  "procedure_name": "name",
  "category": "installation|maintenance|repair|commissioning|fault-finding",
  "steps": ["step 1", "step 2"],
  "time_estimate": "time",
  "difficulty": "easy|medium|hard",
  "warnings": ["warnings"],
  "tools_required": ["tools"]
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
      const inputTokenEstimate = Math.ceil(prompt.length / 4);
      batchStats.inputTokens += inputTokenEstimate;
      
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      const outputTokenEstimate = Math.ceil(text.length / 4);
      batchStats.outputTokens += outputTokenEstimate;
      
      const jsonMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return null;
    } catch (error) {
      if (error.message.includes('429') || error.message.includes('quota')) {
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

  try {
    console.log(`   📥 Downloading...`);
    const pdfBuffer = await downloadPDF(url);
    
    if (pdfBuffer.length < 50000 || pdfBuffer.length > 50000000) {
      console.log('   ⏭️ Skipping (size out of range)');
      return null;
    }

    console.log('   📄 Extracting text...');
    const pages = await extractPDFText(pdfBuffer);
    const totalChars = pages.reduce((sum, p) => sum + p.text.length, 0);

    if (totalChars < 1000) {
      console.log('   ⏭️ Skipping (insufficient text)');
      return null;
    }

    const firstPagesText = pages.slice(0, 10).map(p => p.text).join('\n').slice(0, 15000);
    
    console.log('   🔍 Extracting GC numbers...');
    await delay(CONFIG.RATE_LIMIT_DELAY);
    const metadata = await callGemini(PROMPTS.extractGCAndMetadata + firstPagesText);
    
    if (!metadata) {
      console.log('   ⚠️ Failed to extract metadata');
      return null;
    }

    // Validate GC numbers
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
      console.log('   ⚠️ No valid GC numbers found');
      validGCs = [`PENDING-${name.slice(0, 30)}`];
    } else {
      console.log(`   ✅ GC numbers: ${validGCs.join(', ')}`);
      batchStats.gcNumbersFound += validGCs.length;
    }
    
    metadata.gc_numbers = validGCs;

    // Save to boiler_models
    for (const gc of validGCs) {
      if (gc.startsWith('PENDING')) continue;
      await supabase.from('boiler_models').upsert({
        gc_number: gc,
        manufacturer: metadata.manufacturer || manufacturer,
        model_name: metadata.model_name || name,
        boiler_type: metadata.boiler_type,
        fuel_type: metadata.fuel_type || 'natural_gas',
        manual_url: url,
        manual_filename: name
      }, { onConflict: 'gc_number,manufacturer', ignoreDuplicates: true });
    }

    const fullText = pages.map(p => `[Page ${p.pageNum}]\n${p.text}`).join('\n\n').slice(0, 50000);

    // Extract fault codes
    console.log('   🔍 Extracting fault codes...');
    await delay(CONFIG.RATE_LIMIT_DELAY);
    const faultCodes = await callGemini(PROMPTS.extractFaultCodes + fullText);
    
    if (faultCodes && Array.isArray(faultCodes) && faultCodes.length > 0) {
      console.log(`   ✅ Found ${faultCodes.length} fault codes`);
      batchStats.faultCodesExtracted += faultCodes.length;
      
      for (const fc of faultCodes) {
        for (const gc of validGCs) {
          await supabase.from('gc_fault_codes').insert({
            gc_number: gc,
            manufacturer: metadata.manufacturer || manufacturer,
            model_name: metadata.model_name || name,
            fault_code: fc.fault_code,
            display_code: fc.display_code,
            description: fc.description,
            cause: fc.cause,
            remedy: fc.remedy,
            severity: fc.severity
          });
        }
      }
    }

    // Extract procedures
    console.log('   🔧 Extracting procedures...');
    await delay(CONFIG.RATE_LIMIT_DELAY);
    const procedures = await callGemini(PROMPTS.extractProcedures + fullText);
    
    if (procedures && Array.isArray(procedures) && procedures.length > 0) {
      console.log(`   ✅ Found ${procedures.length} procedures`);
      batchStats.proceduresExtracted += procedures.length;
      
      for (const proc of procedures) {
        for (const gc of validGCs) {
          await supabase.from('gc_procedures').insert({
            gc_number: gc,
            manufacturer: metadata.manufacturer || manufacturer,
            model_name: metadata.model_name || name,
            procedure_name: proc.procedure_name,
            category: proc.category,
            steps: proc.steps,
            time_estimate: proc.time_estimate,
            difficulty: proc.difficulty,
            warnings: proc.warnings,
            tools_required: proc.tools_required
          });
        }
      }
    }

    // Mark as processed
    processedManuals.push(name);
    fs.writeFileSync(PROCESSED_FILE, JSON.stringify(processedManuals, null, 2));
    
    batchStats.manualsProcessed++;
    console.log('   ✅ Complete!');
    
    return { gc_numbers: validGCs, manufacturer: metadata.manufacturer };

  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    batchStats.errors.push({ manual: name, error: error.message });
    return null;
  }
}

async function runQualityChecks() {
  console.log('\n🔍 RUNNING QUALITY CHECKS...\n');
  
  // Check 1: GC number format validation
  const { data: invalidGCs } = await supabase
    .from('gc_fault_codes')
    .select('gc_number')
    .not('gc_number', 'like', '__-___-__')
    .not('gc_number', 'like', 'PENDING%')
    .limit(10);
  
  // Check 2: Missing remedies
  const { count: missingRemedies } = await supabase
    .from('gc_fault_codes')
    .select('*', { count: 'exact', head: true })
    .or('remedy.is.null,remedy.eq.');
  
  // Check 3: Duplicate fault codes
  const { data: recentFaults } = await supabase
    .from('gc_fault_codes')
    .select('gc_number, fault_code, manufacturer')
    .order('created_at', { ascending: false })
    .limit(20);
  
  // Check 4: Manufacturer distribution
  const { data: mfrDistribution } = await supabase
    .rpc('get_manufacturer_counts');
  
  // Check 5: Total counts
  const { count: totalFaultCodes } = await supabase
    .from('gc_fault_codes')
    .select('*', { count: 'exact', head: true });
  
  const { count: totalProcedures } = await supabase
    .from('gc_procedures')
    .select('*', { count: 'exact', head: true });
  
  const { count: totalModels } = await supabase
    .from('boiler_models')
    .select('*', { count: 'exact', head: true });

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 BATCH QUALITY CHECK REPORT');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\n📈 Database Totals:`);
  console.log(`   Boiler Models: ${totalModels}`);
  console.log(`   Fault Codes: ${totalFaultCodes}`);
  console.log(`   Procedures: ${totalProcedures}`);
  
  console.log(`\n⚠️ Data Quality Issues:`);
  console.log(`   Missing remedies: ${missingRemedies || 0}`);
  console.log(`   Invalid GC formats: ${invalidGCs?.length || 0}`);
  
  if (recentFaults && recentFaults.length > 0) {
    console.log(`\n📋 Recent Extractions (last 5):`);
    recentFaults.slice(0, 5).forEach(f => {
      console.log(`   ${f.manufacturer} | ${f.gc_number} | ${f.fault_code}`);
    });
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════\n');
  
  return {
    totalModels,
    totalFaultCodes,
    totalProcedures,
    missingRemedies,
    invalidGCs: invalidGCs?.length || 0
  };
}

function saveBatchReport(batchNum, qualityCheck) {
  const cost = ((batchStats.inputTokens / 1000000) * 0.10) + ((batchStats.outputTokens / 1000000) * 0.40);
  
  const report = {
    batchNumber: batchNum,
    timestamp: new Date().toISOString(),
    stats: { ...batchStats },
    qualityCheck,
    cost: `$${cost.toFixed(4)}`
  };
  
  const reportFile = path.join(CONFIG.DESKTOP_PATH, `batch-${batchNum}-report.json`);
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  
  console.log(`📁 Batch report saved: ${reportFile}`);
  return report;
}

async function processBatch(batchNumber, manuals) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🚀 STARTING BATCH ${batchNumber} - ${manuals.length} manuals`);
  console.log(`${'═'.repeat(70)}\n`);
  
  // Reset batch stats
  batchStats = {
    batchNumber,
    manualsProcessed: 0,
    gcNumbersFound: 0,
    faultCodesExtracted: 0,
    proceduresExtracted: 0,
    errors: [],
    inputTokens: 0,
    outputTokens: 0
  };
  
  let processed = 0;
  for (const manual of manuals) {
    processed++;
    console.log(`\n📋 [${processed}/${manuals.length}] ${manual.name}`);
    console.log(`   Manufacturer: ${manual.manufacturer}`);
    await processManual(manual);
  }
  
  // Run quality checks after batch
  const qualityCheck = await runQualityChecks();
  
  // Save batch report
  const report = saveBatchReport(batchNumber, qualityCheck);
  
  // Print batch summary
  const cost = ((batchStats.inputTokens / 1000000) * 0.10) + ((batchStats.outputTokens / 1000000) * 0.40);
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`✅ BATCH ${batchNumber} COMPLETE`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`📋 Manuals processed: ${batchStats.manualsProcessed}`);
  console.log(`🔢 GC numbers found: ${batchStats.gcNumbersFound}`);
  console.log(`❌ Fault codes: ${batchStats.faultCodesExtracted}`);
  console.log(`🔧 Procedures: ${batchStats.proceduresExtracted}`);
  console.log(`💰 Batch cost: $${cost.toFixed(4)}`);
  console.log(`⚠️ Errors: ${batchStats.errors.length}`);
  console.log(`${'═'.repeat(70)}\n`);
  
  return report;
}

async function main() {
  console.log('🚀 Batch GC Extraction Starting');
  console.log(`📍 Priority: ${CONFIG.PRIORITY_MANUFACTURERS.join(', ')}`);
  console.log(`📦 Batch size: ${CONFIG.BATCH_SIZE} manuals`);
  console.log(`📁 Results: ${CONFIG.DESKTOP_PATH}`);
  console.log(`📋 Previously processed: ${processedManuals.length} manuals\n`);

  // Get all manuals
  const { data: allManuals, error } = await supabase
    .from('boiler_manuals')
    .select('name, url, manufacturer')
    .or('name.ilike.%installation%,name.ilike.%service%')
    .order('manufacturer')
    .limit(2000);

  if (error || !allManuals) {
    console.error('Failed to fetch manuals:', error);
    return;
  }

  // Filter out already processed
  const newManuals = allManuals.filter(m => !processedManuals.includes(m.name));
  
  // Sort by priority manufacturers first
  const prioritized = newManuals.sort((a, b) => {
    const aIndex = CONFIG.PRIORITY_MANUFACTURERS.findIndex(p => 
      a.manufacturer.toLowerCase().includes(p.toLowerCase())
    );
    const bIndex = CONFIG.PRIORITY_MANUFACTURERS.findIndex(p => 
      b.manufacturer.toLowerCase().includes(p.toLowerCase())
    );
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  console.log(`📚 Total manuals: ${allManuals.length}`);
  console.log(`📋 New manuals to process: ${prioritized.length}`);
  
  // Calculate batches
  const totalBatches = Math.ceil(prioritized.length / CONFIG.BATCH_SIZE);
  console.log(`📦 Total batches: ${totalBatches}\n`);

  // Auto-continue mode - process all remaining batches
  let remaining = prioritized;
  let batchNum = Math.floor(processedManuals.length / CONFIG.BATCH_SIZE) + 1;
  
  while (remaining.length > 0) {
    const batch = remaining.slice(0, CONFIG.BATCH_SIZE);
    
    await processBatch(batchNum, batch);
    
    remaining = remaining.slice(CONFIG.BATCH_SIZE);
    batchNum++;
    
    if (remaining.length > 0) {
      console.log(`\n⏳ Waiting 30 seconds before next batch...`);
      console.log(`📊 Remaining: ${remaining.length} manuals\n`);
      await new Promise(r => setTimeout(r, 30000)); // 30 second delay between batches
    }
  }
  
  console.log('\n🎉 ALL MANUALS PROCESSED!');
  console.log(`📊 Total processed: ${processedManuals.length} manuals`);
}

main().catch(console.error);
