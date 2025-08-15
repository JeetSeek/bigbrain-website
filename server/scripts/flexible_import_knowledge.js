#!/usr/bin/env node

/**
 * Flexible Knowledge Base Import Script
 * Dynamically discovers and imports fault codes from any directory structure
 * Plus imports structured diagnostic data
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Recursively find all JSON files in a directory
 */
async function findJsonFiles(dir, maxDepth = 3, currentDepth = 0) {
  if (currentDepth >= maxDepth) return [];
  
  const files = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const subFiles = await findJsonFiles(fullPath, maxDepth, currentDepth + 1);
        files.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
  }
  
  return files;
}

/**
 * Import a single fault code file
 */
async function importSingleFaultCodeFile(filePath) {
  try {
    const faultData = await fs.readFile(filePath, 'utf8');
    const faultInfo = JSON.parse(faultData);
    
    // Skip files that don't have fault code structure
    if (!faultInfo.fault_codes || !Array.isArray(faultInfo.fault_codes)) {
      return { success: false, reason: 'No fault_codes array found', count: 0 };
    }
    
    if (!faultInfo.manufacturer) {
      return { success: false, reason: 'No manufacturer specified', count: 0 };
    }
    
    // Process fault codes for knowledge_embeddings table
    const knowledgeEntries = [];
    
    for (const fault of faultInfo.fault_codes) {
      if (!fault.fault_code || !fault.description) {
        continue; // Skip incomplete entries
      }
      
      // Create comprehensive content for each fault code
      const content = `
Manufacturer: ${faultInfo.manufacturer}
Fault Code: ${fault.fault_code}
Description: ${fault.description}

Solutions:
${fault.solutions ? fault.solutions.map(sol => `• ${sol}`).join('\n') : 'Contact qualified Gas Safe engineer for diagnosis and repair'}

${fault.additional_info ? `Additional Information: ${fault.additional_info}` : ''}
${fault.safety_notes ? `Safety Notes: ${fault.safety_notes}` : ''}
${fault.category ? `Category: ${fault.category}` : ''}
      `.trim();
      
      knowledgeEntries.push({
        content: content,
        tag: 'fault_code',
        source: 'manufacturer_data',
        metadata: {
          manufacturer: faultInfo.manufacturer,
          fault_code: fault.fault_code,
          description: fault.description,
          solutions: fault.solutions || [],
          category: fault.category || 'general',
          severity: fault.severity || 'medium',
          system_types: fault.applies_to || [],
          file_source: path.basename(filePath)
        },
        is_active: true
      });
    }
    
    if (knowledgeEntries.length === 0) {
      return { success: false, reason: 'No valid fault codes found', count: 0 };
    }
    
    // Insert into knowledge_embeddings table
    const { data, error } = await supabase
      .from('knowledge_embeddings')
      .upsert(knowledgeEntries, { 
        onConflict: 'content',
        ignoreDuplicates: true 
      });
    
    if (error) {
      return { success: false, reason: error.message, count: 0 };
    }
    
    return { 
      success: true, 
      manufacturer: faultInfo.manufacturer,
      count: knowledgeEntries.length 
    };
    
  } catch (error) {
    return { success: false, reason: error.message, count: 0 };
  }
}

/**
 * Import all manufacturer fault codes by discovering JSON files
 */
async function importAllFaultCodes() {
  
  const searchPaths = [
    '/Users/markburrows/Desktop/fault finding/fault codes all',
    '/Users/markburrows/Desktop/fault finding',
    '/Users/markburrows/CascadeProjects/bigbrain_website/bigbrain_recovered/src/data'
  ];
  
  let allJsonFiles = [];
  
  for (const searchPath of searchPaths) {
    try {
      const files = await findJsonFiles(searchPath);
      allJsonFiles.push(...files);
    } catch (error) {
    }
  }
  
  // Filter for likely fault code files
  const faultCodeFiles = allJsonFiles.filter(file => {
    const basename = path.basename(file).toLowerCase();
    return basename.includes('fault') || 
           basename.includes('ideal') || 
           basename.includes('worcester') ||
           basename.includes('vaillant') ||
           basename.includes('viessmann') ||
           basename.includes('baxi') ||
           basename.includes('ariston') ||
           basename.includes('ferroli') ||
           basename.includes('alpha') ||
           basename.includes('glow') ||
           basename.includes('intergas') ||
           basename.includes('johnson') ||
           basename.includes('main') ||
           basename.includes('potterton') ||
           basename.includes('ravenheat') ||
           basename.includes('siemens') ||
           basename.includes('sime') ||
           basename.includes('vokera') ||
           basename.includes('acv') ||
           basename.includes('danfoss');
  });
  
  
  let totalImported = 0;
  let successfulImports = 0;
  const results = [];
  
  for (const filePath of faultCodeFiles) {
    console.log(`📄 Processing: ${path.basename(filePath)}`);
    const result = await importSingleFaultCodeFile(filePath);
    
    if (result.success) {
      totalImported += result.count;
      successfulImports++;
    } else {
      console.log(`⚠️  Skipped ${path.basename(filePath)}: ${result.reason}`);
    }
    
    results.push({ file: path.basename(filePath), ...result });
  }
  
  console.log(`📈 Total fault codes imported: ${totalImported}`);
  
  return totalImported > 0;
}

/**
 * Import additional troubleshooting knowledge
 */
async function importAdditionalKnowledge() {
  
  const additionalKnowledge = [
    {
      content: `Gas Safe Regulations and Safety Protocols

Key Safety Requirements:
• Always check for gas leaks before starting work
• Ensure adequate ventilation in work area
• Use calibrated gas detection equipment
• Follow lockout/tagout procedures
• Verify gas supply isolation before component removal
• Test all joints with leak detection fluid
• Complete combustion analysis after repairs
• Issue safety certificates as required

Emergency Procedures:
• Gas leak detected: Isolate supply, ventilate area, no ignition sources
• High CO readings: Immediately isolate appliance, ventilate area
• Unsafe appliance: Issue warning notice, disconnect if necessary`,
      tag: 'safety',
      source: 'gas_safe_regulations',
      metadata: { category: 'safety', priority: 'critical' }
    },
    {
      content: `Systematic Boiler Diagnosis Approach

Step 1: Initial Assessment
• Record customer symptoms and observations
• Check boiler display for fault codes
• Verify power supply and controls operation
• Check system pressure and water levels

Step 2: Safety Checks
• Test gas supply and pressure
• Verify flue integrity and termination
• Check ventilation requirements
• Test gas tightness of all connections

Step 3: Combustion Analysis
• Measure flue gas composition (O₂, CO, CO₂)
• Calculate combustion efficiency
• Check flue gas temperature
• Verify air/fuel ratio settings

Step 4: Component Testing
• Test ignition system operation
• Verify gas valve operation and modulation
• Check heat exchanger condition
• Test safety devices and interlocks`,
      tag: 'procedure',
      source: 'diagnostic_methodology',
      metadata: { category: 'diagnosis', skill_level: 'intermediate' }
    },
    {
      content: `Common Boiler Symptoms and Causes

No Hot Water:
• Diverter valve failure (combi boilers)
• Secondary heat exchanger blockage
• Thermistor failure
• Control board issues
• Low system pressure

No Heating:
• Pump failure or air lock
• Motorised valve failure
• Room thermostat issues
• Boiler thermostat failure
• System circulation problems

Intermittent Operation:
• Flame rectification issues
• Gas supply pressure variations
• Heat exchanger scaling
• Control system faults
• Electrical connection problems

Noisy Operation:
• Pump bearing wear
• System debris circulation
• Heat exchanger scaling
• Expansion vessel failure
• Incorrect system balancing`,
      tag: 'symptom',
      source: 'troubleshooting_guide',
      metadata: { category: 'symptoms', system_types: ['all'] }
    },
    {
      content: `Condensing Boiler Specific Issues

Condensate System Problems:
• Blocked condensate trap
• Frozen condensate pipe
• Condensate pump failure
• Incorrect pipe falls
• Acidic condensate corrosion

Efficiency Issues:
• Return temperature too high
• Secondary heat exchanger scaling
• Incorrect system design
• Poor system balancing
• Inadequate system controls

Common Fault Patterns:
• F28/F29 codes: Ignition/flame issues
• F22 codes: Low water pressure
• F75 codes: Pressure sensor faults
• F61 codes: Gas valve problems
• F83 codes: Temperature sensor issues`,
      tag: 'fault_code',
      source: 'condensing_boiler_guide',
      metadata: { category: 'condensing', system_types: ['condensing_boiler'] }
    }
  ];
  
  const processedEntries = additionalKnowledge.map(entry => ({
    ...entry,
    is_active: true
  }));
  
  const { data, error } = await supabase
    .from('knowledge_embeddings')
    .upsert(processedEntries, { 
      onConflict: 'content',
      ignoreDuplicates: true 
    });
  
  if (error) {
    console.error('❌ Error importing additional knowledge:', error);
    return false;
  }
  
  return true;
}

/**
 * Main import function
 */
async function main() {
  
  const results = {
    faultCodes: await importAllFaultCodes(),
    additionalKnowledge: await importAdditionalKnowledge()
  };
  
  // Get final statistics
  const { data: totalRecords } = await supabase
    .from('knowledge_embeddings')
    .select('tag', { count: 'exact' });
  
  const { data: tagStats } = await supabase
    .from('knowledge_embeddings')
    .select('tag')
    .eq('is_active', true);
  
  const tagCounts = {};
  if (tagStats) {
    tagStats.forEach(record => {
      tagCounts[record.tag] = (tagCounts[record.tag] || 0) + 1;
    });
  }
  
  console.log('📋 Records by category:');
  Object.entries(tagCounts).forEach(([tag, count]) => {
  });
  
  Object.entries(results).forEach(([category, success]) => {
  });
  
  const successCount = Object.values(results).filter(Boolean).length;
  console.log(`\n🏆 Overall: ${successCount}/${Object.keys(results).length} categories imported successfully`);
  
  if (successCount === Object.keys(results).length) {
  } else {
  }
}

// Run the import
main().catch(console.error);
