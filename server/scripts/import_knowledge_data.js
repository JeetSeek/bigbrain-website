#!/usr/bin/env node

/**
 * Comprehensive Knowledge Base Import Script
 * Imports fault codes, components, symptoms, and diagnostic procedures
 * from structured JSON files into Supabase database
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

// Base paths for data files - configurable via environment variables
const FAULT_CODES_PATH = process.env.FAULT_CODES_PATH || '/Users/markburrows/Desktop/fault finding/fault codes all';
const STRUCTURED_DATA_PATH = process.env.STRUCTURED_DATA_PATH || '/Users/markburrows/Desktop/fault finding/structured_data';

// Validate paths exist
if (!process.env.FAULT_CODES_PATH && !process.env.STRUCTURED_DATA_PATH) {
  console.warn('⚠️  Using default hardcoded paths. Consider setting FAULT_CODES_PATH and STRUCTURED_DATA_PATH environment variables.');
}

/**
 * Import boiler components from components.json
 */
async function importComponents() {
  
  try {
    const componentsData = await fs.readFile(
      path.join(STRUCTURED_DATA_PATH, 'components.json'), 
      'utf8'
    );
    const components = JSON.parse(componentsData);
    
    const processedComponents = components.map(comp => ({
      component_id: comp.id,
      name: comp.name,
      component_type: comp.component_type,
      description: comp.description,
      function_description: comp.function || null,
      applies_to: comp.applies_to || [],
      common_issues: comp.common_issues || [],
      diagnostic_tips: comp.diagnostic_tips || [],
      maintenance_schedule: comp.maintenance_schedule || null
    }));
    
    const { data, error } = await supabase
      .from('boiler_components')
      .upsert(processedComponents, { 
        onConflict: 'component_id',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error('❌ Error importing components:', error);
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Failed to import components:', error);
    return false;
  }
}

/**
 * Import diagnostic symptoms from symptoms.json
 */
async function importSymptoms() {
  
  try {
    const symptomsData = await fs.readFile(
      path.join(STRUCTURED_DATA_PATH, 'symptoms.json'), 
      'utf8'
    );
    const symptoms = JSON.parse(symptomsData);
    
    const processedSymptoms = symptoms.map(symptom => ({
      symptom_id: symptom.id,
      name: symptom.name,
      description: symptom.description,
      category: symptom.category || 'general',
      severity_level: symptom.severity_level || 1,
      safety_critical: symptom.safety_critical || false,
      measurement_units: symptom.measurement_units || null,
      normal_range: symptom.normal_range || null
    }));
    
    const { data, error } = await supabase
      .from('diagnostic_symptoms')
      .upsert(processedSymptoms, { 
        onConflict: 'symptom_id',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error('❌ Error importing symptoms:', error);
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Failed to import symptoms:', error);
    return false;
  }
}

/**
 * Import diagnostic procedures from procedures.json
 */
async function importProcedures() {
  
  try {
    const proceduresData = await fs.readFile(
      path.join(STRUCTURED_DATA_PATH, 'procedures.json'), 
      'utf8'
    );
    const procedures = JSON.parse(proceduresData);
    
    const processedProcedures = procedures.map(proc => ({
      procedure_id: proc.id,
      name: proc.name,
      description: proc.description,
      steps: proc.steps || [],
      required_tools: proc.required_tools || [],
      safety_requirements: proc.safety_requirements || [],
      estimated_time_minutes: proc.estimated_time_minutes || null,
      skill_level: proc.skill_level || 'intermediate',
      applies_to_systems: proc.applies_to_systems || []
    }));
    
    const { data, error } = await supabase
      .from('diagnostic_procedures')
      .upsert(processedProcedures, { 
        onConflict: 'procedure_id',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error('❌ Error importing procedures:', error);
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Failed to import procedures:', error);
    return false;
  }
}

/**
 * Import manufacturer fault codes from individual JSON files
 */
async function importManufacturerFaultCodes() {
  
  // Use the actual file names found in the directory
  const faultCodeFiles = [
    'acv_fault_codes.json',
    'alpha_fault_codes.json', 
    'ariston_fault_codes.json',
    'baxi_fault_codes.json',
    'danfoss_fault_codes.json',
    'ferroli_fault_codes.json',
    'glow_worm_fault_codes.json',
    'ideal_fault_codes.json',
    'intergas_fault_codes.json',
    'johnson_and_starley_fault_codes.json',
    'main_fault_codes.json',
    'potterton_fault_codes.json',
    'ravenheat_fault_codes.json',
    'siemens_fault_codes.json',
    'sime_fault_codes.json',
    'vaillant_fault_codes.json',
    'viessmann_fault_codes.json',
    'vokera_fault_codes.json',
    'worcester_bosch_fault_codes.json'
  ];
  
  let totalImported = 0;
  
  for (const fileName of faultCodeFiles) {
    try {
      const filePath = path.join(FAULT_CODES_PATH, fileName);
      const faultData = await fs.readFile(filePath, 'utf8');
      const faultInfo = JSON.parse(faultData);
      
      if (!faultInfo.fault_codes || !Array.isArray(faultInfo.fault_codes)) {
        continue;
      }
      
      // Process fault codes for knowledge_embeddings table
      const knowledgeEntries = [];
      
      for (const fault of faultInfo.fault_codes) {
        // Create comprehensive content for each fault code
        const content = `
Manufacturer: ${faultInfo.manufacturer}
Fault Code: ${fault.fault_code}
Description: ${fault.description}

Solutions:
${fault.solutions ? fault.solutions.map(sol => `• ${sol}`).join('\n') : 'No specific solutions provided'}

${fault.additional_info ? `Additional Information: ${fault.additional_info}` : ''}
${fault.safety_notes ? `Safety Notes: ${fault.safety_notes}` : ''}
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
            system_types: fault.applies_to || []
          },
          is_active: true
        });
      }
      
      // Insert into knowledge_embeddings table
      const { data, error } = await supabase
        .from('knowledge_embeddings')
        .upsert(knowledgeEntries, { 
          onConflict: 'content',
          ignoreDuplicates: true 
        });
      
      if (error) {
        console.error(`❌ Error importing ${fileName} fault codes:`, error);
        continue;
      }
      
      totalImported += knowledgeEntries.length;
      
    } catch (error) {
    }
  }
  
  return totalImported > 0;
}

/**
 * Import relationships from relationships.json
 */
async function importRelationships() {
  
  try {
    const relationshipsData = await fs.readFile(
      path.join(STRUCTURED_DATA_PATH, 'relationships.json'), 
      'utf8'
    );
    const relationships = JSON.parse(relationshipsData);
    
    // Process component-fault relationships
    if (relationships.component_fault) {
      const componentFaultRels = relationships.component_fault.map(rel => ({
        component_id: rel.component_id,
        fault_code: rel.fault_code,
        manufacturer: rel.manufacturer,
        relationship_type: rel.relationship_type || 'related_to',
        confidence_score: rel.confidence_score || 1.0
      }));
      
      const { error: compError } = await supabase
        .from('component_fault_relationships')
        .upsert(componentFaultRels, { ignoreDuplicates: true });
      
      if (compError) {
        console.error('❌ Error importing component-fault relationships:', compError);
      } else {
      }
    }
    
    // Process symptom-fault relationships
    if (relationships.symptom_fault) {
      const symptomFaultRels = relationships.symptom_fault.map(rel => ({
        symptom_id: rel.symptom_id,
        fault_code: rel.fault_code,
        manufacturer: rel.manufacturer,
        relationship_strength: rel.relationship_strength || 1.0,
        diagnostic_priority: rel.diagnostic_priority || 1
      }));
      
      const { error: sympError } = await supabase
        .from('symptom_fault_relationships')
        .upsert(symptomFaultRels, { ignoreDuplicates: true });
      
      if (sympError) {
        console.error('❌ Error importing symptom-fault relationships:', sympError);
      } else {
      }
    }
    
    return true;
    
  } catch (error) {
    return false;
  }
}

/**
 * Main import function
 */
async function main() {
  
  const results = {
    components: await importComponents(),
    symptoms: await importSymptoms(),
    procedures: await importProcedures(),
    faultCodes: await importManufacturerFaultCodes(),
    relationships: await importRelationships()
  };
  
  Object.entries(results).forEach(([category, success]) => {
  });
  
  const successCount = Object.values(results).filter(Boolean).length;
  console.log(`\n🎯 Overall: ${successCount}/${Object.keys(results).length} categories imported successfully`);
  
  if (successCount === Object.keys(results).length) {
  } else {
  }
}

// Run the import
main().catch(console.error);
