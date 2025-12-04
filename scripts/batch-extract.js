/**
 * Batch Manual Extraction Script
 * Processes multiple manuals automatically
 * 
 * Gemini Free Tier Limits:
 * - 15 RPM (requests per minute)
 * - 1,500 RPD (requests per day)
 * - 1,000,000 TPM (tokens per minute)
 * 
 * Run: node scripts/batch-extract.js
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

// Configuration
const GEMINI_API_KEY = 'AIzaSyAo52Eu2llZAYzYj27MLMOxFWnapZQ1KDg';
const SUPABASE_URL = 'https://hfyfidpbtoqnqhdywdzw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmeWZpZHBidG9xbnFoZHl3ZHp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0OTQ4OTksImV4cCI6MjA2MTA3MDg5OX0.eZrUGTGOOnHrZp2BoIbnaqSPvcmNKYfpoLXmGsa3PME';

// Rate limiting settings
const DELAY_BETWEEN_REQUESTS_MS = 5000; // 5 seconds between API calls
const DELAY_BETWEEN_MANUALS_MS = 10000; // 10 seconds between manuals
const MAX_MANUALS_PER_RUN = 150; // Stay under daily limit
const MAX_RUNTIME_HOURS = 2;

// Initialize clients
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Stats tracking
const stats = {
  started: new Date(),
  manualsProcessed: 0,
  faultCodesExtracted: 0,
  proceduresExtracted: 0,
  apiCalls: 0,
  errors: [],
  processedManuals: []
};

// Prompts
const PROMPTS = {
  fault_codes: (text) => `
Extract ALL fault codes from this boiler manual. Look for fault code tables.

Return ONLY valid JSON:
{
  "fault_codes": [
    {
      "code": "EA",
      "cause_codes": ["227", "229"],
      "description": "Ignition failure",
      "reset_type": "Reset button",
      "possible_causes": ["No gas", "Electrode fault"],
      "components": ["electrode", "gas valve"]
    }
  ]
}

MANUAL TEXT:
${text}
`,

  service_procedures: (text) => `
Extract service and maintenance procedures from this boiler manual.

Return ONLY valid JSON:
{
  "procedures": [
    {
      "name": "Gas Valve Removal",
      "type": "removal",
      "steps": ["Step 1", "Step 2"],
      "tools_required": ["Spanner"],
      "safety_warnings": ["Isolate gas"]
    }
  ]
}

MANUAL TEXT:
${text}
`
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getManufacturerName(folderName) {
  const mapping = {
    'worcester': 'Worcester Bosch',
    'ideal-domestic': 'Ideal',
    'ideal-commercial': 'Ideal Commercial',
    'vaillant': 'Vaillant',
    'baxi': 'Baxi',
    'glow-worm': 'Glow-worm',
    'potterton': 'Potterton',
    'main': 'Main',
    'heatline': 'Heatline',
    'ravenheat': 'Ravenheat',
    'ferroli': 'Ferroli',
    'alpha': 'Alpha',
    'biasi': 'Biasi',
    'viessmann': 'Viessmann',
    'ariston': 'Ariston',
    'remeha': 'Remeha',
    'atag': 'ATAG',
    'intergas': 'Intergas'
  };
  
  for (const [key, value] of Object.entries(mapping)) {
    if (folderName.toLowerCase().includes(key)) {
      return value;
    }
  }
  return folderName;
}

async function downloadPDF(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.buffer();
}

async function extractTextFromPDF(buffer) {
  const uint8Array = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
  const pdfDoc = await loadingTask.promise;
  
  let fullText = '';
  const maxPages = Math.min(pdfDoc.numPages, 100); // Limit to 100 pages
  
  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    try {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += `\n--- PAGE ${pageNum} ---\n${pageText}`;
    } catch (e) {
      // Skip problematic pages
    }
  }
  
  return { text: fullText, pages: pdfDoc.numPages };
}

async function extractWithGemini(text, promptType) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  stats.apiCalls++;
  
  try {
    const result = await model.generateContent(PROMPTS[promptType](text));
    const response = await result.response;
    let responseText = response.text();
    
    // Clean up response
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(responseText);
  } catch (error) {
    console.error(`    ⚠️ Extraction error: ${error.message}`);
    return null;
  }
}

async function saveToDatabase(manual, faultCodes, procedures) {
  const manufacturer = getManufacturerName(manual.manufacturer);
  const model = manual.name.replace(/_/g, ' ').replace(/installation|NG|LPG/gi, '').trim();
  
  // Save fault codes
  if (faultCodes?.fault_codes?.length > 0) {
    const faultData = faultCodes.fault_codes.map(fc => ({
      manufacturer,
      model_name: model,
      fault_code: fc.code,
      cause_codes: fc.cause_codes || [],
      description: fc.description,
      reset_type: fc.reset_type,
      possible_causes: fc.possible_causes || [],
      components: fc.components || []
    }));
    
    const { error } = await supabase.from('fault_finding_guides').insert(faultData);
    if (!error) {
      stats.faultCodesExtracted += faultData.length;
    }
  }
  
  // Save procedures
  if (procedures?.procedures?.length > 0) {
    const procData = procedures.procedures.map(proc => ({
      manufacturer,
      model_name: model,
      procedure_name: proc.name,
      procedure_type: proc.type,
      steps: proc.steps || [],
      tools_required: proc.tools_required || [],
      safety_warnings: proc.safety_warnings || []
    }));
    
    const { error } = await supabase.from('service_procedures').insert(procData);
    if (!error) {
      stats.proceduresExtracted += procData.length;
    }
  }
}

async function processManual(manual) {
  console.log(`\n📋 Processing: ${manual.name}`);
  console.log(`   Manufacturer: ${getManufacturerName(manual.manufacturer)}`);
  
  try {
    // Download PDF
    console.log('   📥 Downloading...');
    const buffer = await downloadPDF(manual.url);
    const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
    console.log(`   ✅ Downloaded: ${sizeMB} MB`);
    
    // Skip very large or very small PDFs
    if (buffer.length < 100000 || buffer.length > 50000000) {
      console.log('   ⏭️ Skipping (size out of range)');
      return false;
    }
    
    // Extract text
    console.log('   📄 Extracting text...');
    const pdfData = await extractTextFromPDF(buffer);
    console.log(`   ✅ Extracted: ${pdfData.pages} pages, ${pdfData.text.length} chars`);
    
    // Skip if too little text
    if (pdfData.text.length < 10000) {
      console.log('   ⏭️ Skipping (insufficient text)');
      return false;
    }
    
    // Extract fault codes
    console.log('   🔍 Extracting fault codes...');
    await sleep(DELAY_BETWEEN_REQUESTS_MS);
    const faultCodes = await extractWithGemini(pdfData.text, 'fault_codes');
    const fcCount = faultCodes?.fault_codes?.length || 0;
    console.log(`   ✅ Found ${fcCount} fault codes`);
    
    // Extract procedures
    console.log('   🔧 Extracting procedures...');
    await sleep(DELAY_BETWEEN_REQUESTS_MS);
    const procedures = await extractWithGemini(pdfData.text, 'service_procedures');
    const procCount = procedures?.procedures?.length || 0;
    console.log(`   ✅ Found ${procCount} procedures`);
    
    // Save to database
    console.log('   💾 Saving to database...');
    await saveToDatabase(manual, faultCodes, procedures);
    
    stats.manualsProcessed++;
    stats.processedManuals.push(manual.name);
    
    console.log(`   ✅ Complete!`);
    return true;
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    stats.errors.push({ manual: manual.name, error: error.message });
    return false;
  }
}

function printStats() {
  const runtime = ((Date.now() - stats.started) / 1000 / 60).toFixed(1);
  console.log('\n' + '='.repeat(60));
  console.log('📊 BATCH EXTRACTION STATS');
  console.log('='.repeat(60));
  console.log(`⏱️  Runtime: ${runtime} minutes`);
  console.log(`📋 Manuals processed: ${stats.manualsProcessed}`);
  console.log(`❌ Fault codes extracted: ${stats.faultCodesExtracted}`);
  console.log(`🔧 Procedures extracted: ${stats.proceduresExtracted}`);
  console.log(`🔄 API calls made: ${stats.apiCalls}`);
  console.log(`⚠️  Errors: ${stats.errors.length}`);
  console.log('='.repeat(60));
}

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 BATCH MANUAL EXTRACTION');
  console.log(`⏰ Started: ${stats.started.toISOString()}`);
  console.log(`⏱️  Max runtime: ${MAX_RUNTIME_HOURS} hours`);
  console.log(`📋 Max manuals: ${MAX_MANUALS_PER_RUN}`);
  console.log('='.repeat(60));
  
  // Get already processed manufacturers from database
  const { data: existingData } = await supabase
    .from('fault_finding_guides')
    .select('manufacturer, model_name')
    .limit(1000);
  
  const processedModels = new Set(
    (existingData || []).map(d => `${d.manufacturer}-${d.model_name}`.toLowerCase())
  );
  
  console.log(`\n📊 Already in database: ${processedModels.size} model entries`);
  
  // Get list of manuals from database
  const { data: manuals, error } = await supabase
    .from('boiler_manuals')
    .select('name, url, manufacturer')
    .or('name.ilike.%installation%,name.ilike.%service%')
    .order('manufacturer')
    .limit(500);
  
  if (error) {
    console.error('Failed to get manuals:', error);
    return;
  }
  
  console.log(`📚 Found ${manuals.length} manuals to process`);
  
  // Filter out already processed
  const toProcess = manuals.filter(m => {
    const key = `${getManufacturerName(m.manufacturer)}-${m.name}`.toLowerCase();
    return !processedModels.has(key);
  });
  
  console.log(`📋 New manuals to process: ${toProcess.length}`);
  
  // Process manuals
  const maxEndTime = stats.started.getTime() + (MAX_RUNTIME_HOURS * 60 * 60 * 1000);
  let processed = 0;
  
  for (const manual of toProcess) {
    // Check time limit
    if (Date.now() > maxEndTime) {
      console.log('\n⏰ Time limit reached!');
      break;
    }
    
    // Check manual limit
    if (processed >= MAX_MANUALS_PER_RUN) {
      console.log('\n📋 Manual limit reached!');
      break;
    }
    
    await processManual(manual);
    processed++;
    
    // Delay between manuals
    console.log(`   ⏳ Waiting ${DELAY_BETWEEN_MANUALS_MS/1000}s before next...`);
    await sleep(DELAY_BETWEEN_MANUALS_MS);
    
    // Print progress every 10 manuals
    if (processed % 10 === 0) {
      printStats();
    }
  }
  
  // Final stats
  printStats();
  
  // Save stats to file
  fs.writeFileSync('scripts/batch-stats.json', JSON.stringify(stats, null, 2));
  console.log('\n💾 Stats saved to scripts/batch-stats.json');
  
  // Query final database totals
  const { count: faultCount } = await supabase
    .from('fault_finding_guides')
    .select('*', { count: 'exact', head: true });
  
  const { count: procCount } = await supabase
    .from('service_procedures')
    .select('*', { count: 'exact', head: true });
  
  console.log('\n📊 DATABASE TOTALS:');
  console.log(`   Fault codes: ${faultCount}`);
  console.log(`   Procedures: ${procCount}`);
  
  console.log('\n✅ BATCH EXTRACTION COMPLETE');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⚠️ Interrupted! Saving stats...');
  fs.writeFileSync('scripts/batch-stats.json', JSON.stringify(stats, null, 2));
  printStats();
  process.exit(0);
});

main().catch(error => {
  console.error('Fatal error:', error);
  fs.writeFileSync('scripts/batch-stats.json', JSON.stringify(stats, null, 2));
  printStats();
});
