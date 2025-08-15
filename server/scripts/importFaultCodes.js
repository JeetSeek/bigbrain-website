/**
 * Import fault codes from JSON files into Supabase database
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function importFaultCodes() {
  try {
    
    // Read the Ideal fault codes JSON file
    const faultCodePath = '/Users/markburrows/Desktop/fault finding/fault codes all /ideal_fault_codes.json';
    
    if (!fs.existsSync(faultCodePath)) {
      console.error('❌ Fault code file not found:', faultCodePath);
      return;
    }
    
    const faultCodeData = JSON.parse(fs.readFileSync(faultCodePath, 'utf8'));
    
    // First, ensure we have the manufacturer in the database
    const { data: existingManufacturer, error: manufacturerError } = await supabase
      .from('manufacturers')
      .select('id')
      .eq('name', faultCodeData.manufacturer.toLowerCase())
      .single();
    
    let manufacturerId;
    
    if (existingManufacturer) {
      manufacturerId = existingManufacturer.id;
    } else {
      // Create manufacturer
      const { data: newManufacturer, error: createError } = await supabase
        .from('manufacturers')
        .insert({
          name: faultCodeData.manufacturer.toLowerCase(),
          display_name: faultCodeData.manufacturer,
          common_issues: 'Standard boiler issues',
          support_info: 'Contact manufacturer support'
        })
        .select('id')
        .single();
      
      if (createError) {
        console.error('❌ Error creating manufacturer:', createError);
        return;
      }
      
      manufacturerId = newManufacturer.id;
    }
    
    // Import fault codes
    
    for (const faultCode of faultCodeData.fault_codes) {
      // Check if fault code already exists
      const { data: existing } = await supabase
        .from('fault_codes')
        .select('id')
        .eq('manufacturer_id', manufacturerId)
        .eq('code', faultCode.fault_code)
        .single();
      
      if (existing) {
        continue;
      }
      
      // Insert fault code
      const { error: insertError } = await supabase
        .from('fault_codes')
        .insert({
          manufacturer_id: manufacturerId,
          code: faultCode.fault_code,
          description: faultCode.description,
          causes: [], // We'll populate this from solutions for now
          troubleshooting: faultCode.solutions || [],
          safety_level: 'Medium' // Default safety level
        });
      
      if (insertError) {
        console.error(`❌ Error inserting fault code ${faultCode.fault_code}:`, insertError);
      } else {
      }
    }
    
    
    // Test the import by querying L2
    const { data: testL2, error: testError } = await supabase
      .from('fault_codes')
      .select(`
        *,
        manufacturers(name, display_name)
      `)
      .eq('code', 'L2')
      .single();
    
    if (testError) {
      console.error('❌ Test query failed:', testError);
    } else {
    }
    
  } catch (error) {
    console.error('❌ Import failed:', error);
  }
}

// Run the import
importFaultCodes();
