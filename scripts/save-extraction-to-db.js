/**
 * Save extracted data to Supabase database
 * Run: node scripts/save-extraction-to-db.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://hfyfidpbtoqnqhdywdzw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmeWZpZHBidG9xbnFoZHl3ZHp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0OTQ4OTksImV4cCI6MjA2MTA3MDg5OX0.eZrUGTGOOnHrZp2BoIbnaqSPvcmNKYfpoLXmGsa3PME';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function saveToDatabase() {
  console.log('📥 Loading extraction results...');
  const results = JSON.parse(fs.readFileSync('scripts/extraction_results.json', 'utf8'));
  
  // Get manufacturer from results or use default
  const manufacturer = results.manual?.manufacturer || 'Unknown';
  const model = results.specifications?.model?.name || results.manual?.name || 'Unknown Model';
  
  console.log(`\n📋 Saving data for: ${manufacturer} ${model}`);
  
  // 1. Save Fault Codes
  if (results.fault_codes?.fault_codes) {
    console.log(`\n❌ Saving ${results.fault_codes.fault_codes.length} fault codes...`);
    
    // Deduplicate by code + cause_code combination
    const uniqueFaults = new Map();
    for (const fc of results.fault_codes.fault_codes) {
      const key = `${fc.code}-${(fc.cause_codes || []).join(',')}`;
      if (!uniqueFaults.has(key)) {
        uniqueFaults.set(key, fc);
      }
    }
    
    const faultData = Array.from(uniqueFaults.values()).map(fc => ({
      manufacturer,
      model_name: model,
      fault_code: fc.code,
      cause_codes: fc.cause_codes || [],
      description: fc.description,
      reset_type: fc.reset_type,
      possible_causes: fc.possible_causes || [],
      components: fc.components || []
    }));
    
    const { data, error } = await supabase
      .from('fault_finding_guides')
      .insert(faultData)
      .select();
    
    if (error) {
      console.error('  ❌ Error:', error.message);
    } else {
      console.log(`  ✅ Saved ${faultData.length} unique fault codes`);
    }
  }
  
  // 2. Save Service Procedures
  if (results.service_procedures?.procedures) {
    console.log(`\n🔧 Saving ${results.service_procedures.procedures.length} procedures...`);
    
    const procData = results.service_procedures.procedures.map(proc => ({
      manufacturer,
      model_name: model,
      procedure_name: proc.name,
      procedure_type: proc.type,
      steps: proc.steps || [],
      tools_required: proc.tools_required || [],
      safety_warnings: proc.safety_warnings || [],
      expected_readings: proc.expected_readings || {}
    }));
    
    const { error } = await supabase
      .from('service_procedures')
      .insert(procData);
    
    if (error) {
      console.error('  ❌ Error:', error.message);
    } else {
      console.log(`  ✅ Saved ${procData.length} procedures`);
    }
  }
  
  console.log('\n✅ Database save complete!');
  
  // Verify data
  const { count: faultCount } = await supabase
    .from('fault_finding_guides')
    .select('*', { count: 'exact', head: true });
  
  const { count: procCount } = await supabase
    .from('service_procedures')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n📊 Database totals:`);
  console.log(`   Fault codes: ${faultCount}`);
  console.log(`   Procedures: ${procCount}`);
}

saveToDatabase().catch(console.error);
