/**
 * Fault Code Service Validation Test
 * 
 * This script tests the FaultCodeService with various manufacturers and fault codes
 * to verify the complete implementation works as expected.
 */

// Mock supabase before importing FaultCodeService
jest.mock('../supabaseClient', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          limit: () => ({ data: [], error: null })
        }),
        ilike: () => ({
          eq: () => ({
            limit: () => ({ data: [], error: null })
          })
        })
      })
    })
  }
}));

// Mock the supabase import
import '../supabaseClient.js';

// Now import the service that depends on the mocked module
import { FaultCodeService } from '../utils/FaultCodeService.js';

// Test suite for fault code lookups
async function runTests() {
  console.log('🔍 FAULT CODE SERVICE VALIDATION TESTS 🔍');
  console.log('=========================================');
  
  try {
    // Test Ideal fault codes
    await testLookup('L2', 'Ideal', 'Logic+');
    await testLookup('F1', 'ideal', 'Logic+ 30');
    
    // Test Worcester fault codes
    await testLookup('E207', 'Worcester Bosch', 'Greenstar i');
    await testLookup('EA', 'worcester', 'Greenstar CDi');
    
    // Test Vaillant fault codes
    await testLookup('F.28', 'Vaillant', 'ecoTEC');
    await testLookup('f.22', 'vaillant', 'ecoFIT');
    
    // Test Baxi fault codes
    await testLookup('E01', 'Baxi', 'Duo-tec');
    await testLookup('e35', 'baxi', 'EcoBlue');
    
    // Test Glow-worm fault codes
    await testLookup('F.28', 'Glow-worm', 'Flexicom');
    await testLookup('f.20', 'glow worm', 'Ultimate');
    
    // Test Viessmann fault codes
    await testLookup('F4', 'Viessmann', 'Vitodens');
    await testLookup('f7', 'viessmann', 'Vitodens 100-W');
    
    // Test manufacturer inference from model
    await testLookup('E207', null, 'Worcester Bosch Greenstar');
    await testLookup('L2', null, 'Ideal Logic+');
    
    // Test case normalization
    await testLookup('f.28', 'VAILLANT', 'ecotec');
    
    // Test unknown fault code
    await testLookup('XYZ999', 'Ideal', 'Logic+');
    
    console.log('\n✅ All tests completed');
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
  }
}

// Helper function to test fault code lookup
async function testLookup(code, manufacturer, model) {
  console.log(`\nTesting: ${code} for ${manufacturer || 'unknown'} ${model || ''}`);
  
  try {
    const result = await FaultCodeService.lookup(code, manufacturer, model);
    
    if (result) {
      console.log('✅ Found:', {
        code: result.code,
        description: result.description,
        manufacturer: result.manufacturer
      });
      return true;
    } else {
      console.log('❌ Not found:', { code, manufacturer, model });
      return false;
    }
  } catch (err) {
    console.error('❌ Error:', err);
    return false;
  }
}

// Run the tests
runTests().catch(console.error);
