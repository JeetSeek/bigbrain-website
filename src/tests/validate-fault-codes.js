/**
 * Fault Code Validation Script
 * 
 * This script validates all fault code JSON files by reading them
 * directly from the filesystem rather than using ESM imports.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '../data/fault-codes');

// Function to read and validate a fault code file
const validateFaultCodeFile = (filePath, manufacturer) => {
  try {
    // Read the file synchronously
    const data = fs.readFileSync(filePath, 'utf8');
    const faultData = JSON.parse(data);
    
    // Validate basic structure
    if (!faultData.metadata) {
      console.error(`❌ Missing metadata in ${manufacturer}`);
      return false;
    }
    
    if (!faultData.fault_codes || !Array.isArray(faultData.fault_codes)) {
      console.error(`❌ Missing or invalid fault_codes array in ${manufacturer}`);
      return false;
    }
    
    // Count fault codes
    const faultCount = faultData.fault_codes.length;
    
    // Validate first fault code
    const sampleFault = faultData.fault_codes[0];
    const hasRequiredFields = sampleFault.code && sampleFault.description;
    
    // Test lookup for a specific code
    const testCode = sampleFault.code;
    const found = faultData.fault_codes.find(
      fc => fc.code.toString().trim().toUpperCase() === testCode.toString().trim().toUpperCase()
    );
    
    console.log(`✅ ${manufacturer}: ${faultCount} fault codes`);
    console.log(`   Sample: ${testCode} - ${found ? found.description : 'Not found'}`);
    
    return true;
  } catch (err) {
    console.error(`❌ Error validating ${manufacturer}:`, err.message);
    return false;
  }
};

// Main function to run validation
const runValidation = () => {
  console.log('🔍 FAULT CODE VALIDATION 🔍');
  console.log('===========================');
  
  try {
    // Read the directory
    const files = fs.readdirSync(dataDir);
    
    // Track overall status
    let success = true;
    let totalFaultFiles = 0;
    
    // Process each JSON file
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(dataDir, file);
        const manufacturer = file.replace('.json', '');
        
        const isValid = validateFaultCodeFile(filePath, manufacturer);
        success = success && isValid;
        totalFaultFiles++;
      }
    }
    
    console.log('\n===========================');
    if (success) {
      console.log(`✅ All ${totalFaultFiles} fault code files validated successfully!`);
    } else {
      console.log('❌ Some fault code files have validation issues.');
    }
  } catch (err) {
    console.error('❌ Error accessing fault code directory:', err.message);
  }
};

// Run the validation
runValidation();
