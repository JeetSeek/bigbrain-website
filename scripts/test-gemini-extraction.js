/**
 * Gemini PDF Extraction Test
 * Testing with: Worcester Greenstar 28 CDi Compact Combi
 * 
 * Run: node scripts/test-gemini-extraction.js
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch';
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

// Gemini API Key
const GEMINI_API_KEY = 'AIzaSyAo52Eu2llZAYzYj27MLMOxFWnapZQ1KDg';

// Test manuals - Multiple manufacturers for validation
const TEST_MANUALS = [
  {
    name: 'Ideal Atlantic 30 Combi',
    url: 'https://hfyfidpbtoqnqhdywdzw.supabase.co/storage/v1/object/public/boiler-manuals/dhs_manuals_all/ideal-domestic/ATLANTIC_30_COMBI_NG_installation.pdf',
    manufacturer: 'Ideal',
    type: 'Combi'
  },
  {
    name: 'Vaillant ecoTEC exclusive 838',
    url: 'https://hfyfidpbtoqnqhdywdzw.supabase.co/storage/v1/object/public/boiler-manuals/dhs_manuals_all/vaillant/ecoTEC_exclusive_838_2007-201_installation.pdf',
    manufacturer: 'Vaillant',
    type: 'Combi'
  },
  {
    name: 'Ideal Boxer C28 Combi',
    url: 'https://hfyfidpbtoqnqhdywdzw.supabase.co/storage/v1/object/public/boiler-manuals/dhs_manuals_all/ideal-domestic/BOXER_C28_COMBI_NG_installation.pdf',
    manufacturer: 'Ideal',
    type: 'Combi'
  }
];

// Select which manual to test (change index to test different ones)
const TEST_MANUAL = TEST_MANUALS[process.argv[2] ? parseInt(process.argv[2]) : 0];

// Initialize Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function downloadPDF(url) {
  console.log('📥 Downloading PDF...');
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download PDF: ${response.status}`);
  }
  const buffer = await response.buffer();
  console.log(`✅ Downloaded: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
  return buffer;
}

async function extractTextFromPDF(buffer) {
  console.log('📄 Extracting text from PDF...');
  
  // Convert buffer to Uint8Array for pdfjs
  const uint8Array = new Uint8Array(buffer);
  
  // Load PDF document
  const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
  const pdfDoc = await loadingTask.promise;
  
  console.log(`📄 PDF has ${pdfDoc.numPages} pages`);
  
  // Extract text from all pages
  let fullText = '';
  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += `\n--- PAGE ${pageNum} ---\n${pageText}`;
    
    if (pageNum % 10 === 0) {
      console.log(`   Processed ${pageNum}/${pdfDoc.numPages} pages...`);
    }
  }
  
  console.log(`✅ Extracted ${pdfDoc.numPages} pages, ${fullText.length} characters`);
  return {
    text: fullText,
    pages: pdfDoc.numPages,
    info: {}
  };
}

async function extractWithGemini(text, extractionType) {
  // Use gemini-2.0-flash (stable, fast, good for extraction)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  
  const prompts = {
    // Extract fault codes - improved prompt
    fault_codes: `
You are extracting fault codes from a Worcester boiler manual. This manual contains FAULT CODE TABLES.

IMPORTANT: Look for tables with columns like "Fault code", "Cause code", "Description", "Reset type", "Possible cause".
Common Worcester fault codes include: EA, E2, E5, E9, C6, C7, D1, F0, F7, FA, FD, Fb, A1, C1, C4, EF, 9U, b7

Extract EVERY fault code you find. There should be 20-40+ fault codes in a typical Worcester manual.

For each fault code found, provide:
- code: The fault code (e.g., "EA", "E9", "C6")
- cause_codes: Array of cause codes associated (e.g., ["227", "229", "234"])
- description: Brief description of the fault
- reset_type: "Reset button", "Auto", or "Replace component"
- possible_causes: Array of possible causes
- components: Array of affected components

Return ONLY valid JSON:
{
  "fault_codes": [
    {
      "code": "EA",
      "cause_codes": ["227", "229", "234", "261"],
      "description": "No flame detected / ignition failure",
      "reset_type": "Reset button",
      "possible_causes": ["No gas supply", "Failed ignition attempts", "Flame lost during operation", "Gas valve error"],
      "components": ["gas valve", "electrode", "PCB", "sump/condensate"]
    }
  ],
  "total_found": 0
}

Search the ENTIRE text for fault codes. Look for patterns like:
- "EA 227" or "E9 219"
- "Fault code" followed by codes
- Tables with fault listings

MANUAL TEXT (search thoroughly):
${text}
`,

    // Extract service procedures - improved
    service_procedures: `
You are extracting service and maintenance procedures from a Worcester boiler manual.

Look for sections titled: "Service", "Maintenance", "Commissioning", "Servicing", "Annual Service".
Look for numbered steps, bullet points indicating procedures.

Extract DETAILED step-by-step procedures including:
- Component removal procedures (e.g., "To remove the fan...", "To remove the gas valve...")
- Cleaning procedures
- Testing procedures (gas rate, fan pressure, flue analysis)
- Commissioning checks

For each procedure provide:
- name: Specific procedure name (e.g., "Gas Valve Removal", "Fan Pressure Test", "Heat Exchanger Cleaning")
- type: "commissioning", "annual_service", "maintenance", "repair", "removal", "testing"
- steps: Array of ACTUAL numbered steps from the manual
- tools_required: Tools mentioned
- safety_warnings: Any warnings, cautions, notices
- expected_readings: Any specified values (pressures, temperatures, gas rates)
- page_reference: If page number is mentioned

Return ONLY valid JSON:
{
  "procedures": [
    {
      "name": "Gas Valve Removal and Replacement",
      "type": "removal",
      "steps": [
        "Isolate the mains electrical supply and the gas supply at the boiler gas cock",
        "Remove the combustion air inlet pipe",
        "Disconnect the electrical connector from the valve",
        "Remove the gas pipe from the top of the valve",
        "Undo the bottom gas pipe connection"
      ],
      "tools_required": ["Suitable spanner"],
      "safety_warnings": ["Check all gas connections for gas tightness after reassembly"],
      "expected_readings": {}
    }
  ],
  "total_found": 0
}

MANUAL TEXT (extract all procedures):
${text}
`,

    // Extract part information
    parts_info: `
You are a technical data extractor. Extract information about boiler parts and components from this Worcester manual.

For each part mentioned, provide:
- name: Part name
- part_number: Worcester part number if mentioned (format: 87XXXXXXXX)
- description: What the part does
- location: Where it's located in the boiler
- common_faults: What faults this part can cause
- replacement_notes: Any notes about replacement

Return ONLY valid JSON:
{
  "parts": [
    {
      "name": "Main PCB",
      "part_number": "87161095390",
      "description": "Main printed circuit board controlling all boiler functions",
      "location": "Behind front panel, top right",
      "common_faults": ["EA", "E9"],
      "replacement_notes": "Gas Safe registered engineer required"
    }
  ],
  "total_found": 0
}

MANUAL TEXT:
${text.substring(0, 100000)}
`,

    // Extract technical specifications
    specifications: `
You are a technical data extractor. Extract ALL technical specifications from this Worcester boiler manual.

Extract:
- Model details (name, output, type)
- Gas specifications (input, gas rate, burner pressure)
- Electrical specifications (voltage, fuse rating)
- Water specifications (flow rate, pressures)
- Dimensions and weights
- GC number (Gas Council number)
- Flue specifications

Return ONLY valid JSON:
{
  "model": {
    "name": "Greenstar 28CDi Compact",
    "manufacturer": "Worcester Bosch",
    "type": "Combi",
    "gc_number": "",
    "output_kw": {"heating": 28, "dhw": 28}
  },
  "gas": {
    "input_kw": 30.4,
    "gas_rate_m3h": 2.83,
    "burner_pressure_mbar": 12.5,
    "gas_type": "Natural Gas G20"
  },
  "electrical": {
    "voltage": "230V",
    "frequency": "50Hz",
    "fuse_rating": "3A"
  },
  "water": {
    "dhw_flow_rate_lpm": 11.4,
    "max_pressure_bar": 3,
    "min_pressure_bar": 0.5
  },
  "dimensions": {
    "height_mm": 710,
    "width_mm": 390,
    "depth_mm": 280,
    "weight_kg": 29.5
  },
  "flue": {
    "diameter_mm": 60,
    "max_length_m": 12
  }
}

MANUAL TEXT:
${text.substring(0, 50000)}
`
  };

  console.log(`\n🤖 Calling Gemini for: ${extractionType}...`);
  
  try {
    const result = await model.generateContent(prompts[extractionType]);
    const response = await result.response;
    let responseText = response.text();
    
    // Clean up response - remove markdown code blocks if present
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Parse JSON
    const parsed = JSON.parse(responseText);
    console.log(`✅ ${extractionType} extraction complete`);
    return parsed;
    
  } catch (error) {
    console.error(`❌ Error in ${extractionType}:`, error.message);
    return null;
  }
}

async function runTest() {
  console.log('='.repeat(60));
  console.log('🔧 GEMINI PDF EXTRACTION TEST');
  console.log(`📋 Manual: ${TEST_MANUAL.name}`);
  console.log('='.repeat(60));
  
  try {
    // Step 1: Download PDF
    const pdfBuffer = await downloadPDF(TEST_MANUAL.url);
    
    // Step 2: Extract text
    const pdfData = await extractTextFromPDF(pdfBuffer);
    
    // Save raw text for reference
    fs.writeFileSync('scripts/extracted_text.txt', pdfData.text);
    console.log('💾 Saved raw text to scripts/extracted_text.txt');
    
    // Step 3: Run all extractions
    const results = {
      manual: TEST_MANUAL,
      extraction_date: new Date().toISOString(),
      pdf_info: {
        pages: pdfData.pages,
        characters: pdfData.text.length
      },
      specifications: null,
      fault_codes: null,
      service_procedures: null,
      parts_info: null
    };
    
    // Extract specifications first
    results.specifications = await extractWithGemini(pdfData.text, 'specifications');
    
    // Extract fault codes
    results.fault_codes = await extractWithGemini(pdfData.text, 'fault_codes');
    
    // Extract service procedures
    results.service_procedures = await extractWithGemini(pdfData.text, 'service_procedures');
    
    // Extract parts info
    results.parts_info = await extractWithGemini(pdfData.text, 'parts_info');
    
    // Save results
    const outputPath = 'scripts/extraction_results.json';
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Saved results to ${outputPath}`);
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 EXTRACTION SUMMARY');
    console.log('='.repeat(60));
    
    if (results.specifications) {
      console.log('\n📋 SPECIFICATIONS:');
      console.log(`   Model: ${results.specifications.model?.name || 'Not found'}`);
      console.log(`   Output: ${results.specifications.model?.output_kw?.heating || '?'}kW`);
      console.log(`   GC Number: ${results.specifications.model?.gc_number || 'Not found'}`);
      console.log(`   Gas Rate: ${results.specifications.gas?.gas_rate_m3h || '?'} m³/h`);
    }
    
    if (results.fault_codes?.fault_codes) {
      console.log(`\n❌ FAULT CODES: ${results.fault_codes.fault_codes.length} found`);
      results.fault_codes.fault_codes.slice(0, 5).forEach(fc => {
        console.log(`   ${fc.code}: ${fc.description}`);
      });
      if (results.fault_codes.fault_codes.length > 5) {
        console.log(`   ... and ${results.fault_codes.fault_codes.length - 5} more`);
      }
    }
    
    if (results.service_procedures?.procedures) {
      console.log(`\n🔧 SERVICE PROCEDURES: ${results.service_procedures.procedures.length} found`);
      results.service_procedures.procedures.forEach(proc => {
        console.log(`   - ${proc.name} (${proc.type})`);
      });
    }
    
    if (results.parts_info?.parts) {
      console.log(`\n🔩 PARTS: ${results.parts_info.parts.length} found`);
      results.parts_info.parts.slice(0, 5).forEach(part => {
        console.log(`   - ${part.name} ${part.part_number ? `(${part.part_number})` : ''}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST COMPLETE');
    console.log('='.repeat(60));
    
    return results;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test
runTest().catch(console.error);
