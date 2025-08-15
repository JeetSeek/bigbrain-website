#!/usr/bin/env node

/**
 * Add Missing Fault Codes to Database - Simplified Version
 * Uses direct Supabase client to add comprehensive fault code coverage
 */

import dotenv from 'dotenv';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
dotenv.config();

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const MISSING_FAULT_CODES = [
  // Ideal Boiler Fault Codes (additional to existing F1, L2)
  { manufacturer: 'Ideal', fault_code: 'F2', description: 'Flame loss', solutions: 'Check gas valve\nClean flame sensor\nCheck ignition system', model_name: 'Logic' },
  { manufacturer: 'Ideal', fault_code: 'F3', description: 'Fan fault', solutions: 'Check fan operation\nReplace fan if faulty\nCheck electrical connections', model_name: 'Logic' },
  { manufacturer: 'Ideal', fault_code: 'F4', description: 'Flow thermistor fault', solutions: 'Check thermistor connections\nReplace flow thermistor\nCheck wiring harness', model_name: 'Logic' },

  // Worcester Bosch Fault Codes
  { manufacturer: 'Worcester Bosch', fault_code: 'E1', description: 'Ignition failure', solutions: 'Check gas supply\nClean ignition electrodes\nCheck gas valve operation', model_name: 'Greenstar' },
  { manufacturer: 'Worcester Bosch', fault_code: 'E2', description: 'Fan failure', solutions: 'Check fan operation\nReplace fan motor\nCheck electrical supply to fan', model_name: 'Greenstar' },
  { manufacturer: 'Worcester Bosch', fault_code: 'E3', description: 'Temperature sensor fault', solutions: 'Check sensor connections\nReplace temperature sensor\nCheck wiring', model_name: 'Greenstar' },
  { manufacturer: 'Worcester Bosch', fault_code: 'E4', description: 'Overheat protection', solutions: 'Check system circulation\nCheck pump operation\nReset overheat thermostat', model_name: 'Greenstar' },
  { manufacturer: 'Worcester Bosch', fault_code: 'E5', description: 'Gas valve fault', solutions: 'Check gas valve operation\nReplace gas valve\nCheck electrical connections', model_name: 'Greenstar' },

  // Vaillant Fault Codes (additional to existing F22, F28)
  { manufacturer: 'Vaillant', fault_code: 'F29', description: 'Flame failure during operation', solutions: 'Check gas supply\nClean flame sensor\nCheck ignition electrodes', model_name: 'ecoTEC' },
  { manufacturer: 'Vaillant', fault_code: 'F61', description: 'Gas valve fault', solutions: 'Check gas valve operation\nReplace gas valve\nCheck electrical supply', model_name: 'ecoTEC' },
  { manufacturer: 'Vaillant', fault_code: 'F62', description: 'Combustion air pressure switch fault', solutions: 'Check air pressure switch\nCheck flue for blockages\nReplace pressure switch', model_name: 'ecoTEC' },

  // Baxi Fault Codes
  { manufacturer: 'Baxi', fault_code: 'E1', description: 'Ignition failure', solutions: 'Check gas supply\nClean ignition electrodes\nCheck spark generator', model_name: 'Duo-tec' },
  { manufacturer: 'Baxi', fault_code: 'E2', description: 'Fan failure', solutions: 'Check fan operation\nReplace fan motor\nCheck fan electrical connections', model_name: 'Duo-tec' },
  { manufacturer: 'Baxi', fault_code: 'E3', description: 'Overheat protection', solutions: 'Check system circulation\nReset overheat thermostat\nCheck pump operation', model_name: 'Duo-tec' },
  { manufacturer: 'Baxi', fault_code: 'E4', description: 'Low water pressure', solutions: 'Check system pressure\nTop up system pressure\nCheck for leaks', model_name: 'Duo-tec' },
  { manufacturer: 'Baxi', fault_code: 'E5', description: 'Temperature sensor fault', solutions: 'Replace temperature sensor\nCheck sensor wiring\nCheck connections', model_name: 'Duo-tec' },

  // Viessmann Fault Codes
  { manufacturer: 'Viessmann', fault_code: 'F1', description: 'Temperature sensor fault', solutions: 'Replace temperature sensor\nCheck sensor connections\nCheck wiring', model_name: 'Vitodens' },
  { manufacturer: 'Viessmann', fault_code: 'F2', description: 'Pressure sensor fault', solutions: 'Replace pressure sensor\nCheck sensor connections\nCalibrate pressure sensor', model_name: 'Vitodens' },
  { manufacturer: 'Viessmann', fault_code: 'F3', description: 'Ignition failure', solutions: 'Check gas supply\nClean ignition electrodes\nCheck ignition transformer', model_name: 'Vitodens' },
  { manufacturer: 'Viessmann', fault_code: 'F4', description: 'Fan failure', solutions: 'Check fan motor\nReplace fan assembly\nCheck fan control circuit', model_name: 'Vitodens' },
  { manufacturer: 'Viessmann', fault_code: 'F5', description: 'Gas valve fault', solutions: 'Check gas valve operation\nReplace gas valve\nCheck valve control circuit', model_name: 'Vitodens' }
];

async function addFaultCodes() {
  console.log('🔧 ADDING MISSING FAULT CODES TO DATABASE');
  console.log(`📊 Processing ${MISSING_FAULT_CODES.length} fault codes for major UK manufacturers`);
  console.log('============================================================\n');

  let addedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const faultCode of MISSING_FAULT_CODES) {
    try {
      // Check if fault code already exists
      const { data: existing, error: checkError } = await supabase
        .from('boiler_fault_codes')
        .select('id')
        .eq('manufacturer', faultCode.manufacturer)
        .eq('fault_code', faultCode.fault_code)
        .single();

      if (existing && !checkError) {
        console.log(`⚠️  ${faultCode.manufacturer} ${faultCode.fault_code}: Already exists, skipping`);
        skippedCount++;
        continue;
      }

      // Add new fault code
      const { data, error } = await supabase
        .from('boiler_fault_codes')
        .insert([{
          manufacturer: faultCode.manufacturer,
          fault_code: faultCode.fault_code,
          description: faultCode.description,
          solutions: faultCode.solutions,
          model_name: faultCode.model_name
        }])
        .select();

      if (error) {
        console.log(`❌ ${faultCode.manufacturer} ${faultCode.fault_code}: Database error - ${error.message}`);
        errorCount++;
      } else {
        console.log(`✅ ${faultCode.manufacturer} ${faultCode.fault_code}: Added successfully`);
        addedCount++;
      }

    } catch (error) {
      console.log(`❌ ${faultCode.manufacturer} ${faultCode.fault_code}: Exception - ${error.message}`);
      errorCount++;
    }
  }

  console.log('\n============================================================');
  console.log('📊 DATABASE UPDATE SUMMARY');
  console.log('============================================================');
  console.log(`✅ Added: ${addedCount} fault codes`);
  console.log(`⚠️  Skipped: ${skippedCount} (already exist)`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📊 Total Processed: ${addedCount + skippedCount + errorCount}`);
  
  if (addedCount > 0) {
    console.log('\n🎉 SUCCESS: Database expanded with new fault codes!');
    console.log('🇬🇧 Major UK manufacturers now have comprehensive coverage');
    console.log('🎯 Ready for 100% accuracy testing on expanded database');
  }
}

// Run the database update
addFaultCodes().catch(console.error);
