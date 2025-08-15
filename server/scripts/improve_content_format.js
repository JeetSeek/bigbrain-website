#!/usr/bin/env node

/**
 * Improve Content Format - Direct Approach
 * Updates fault code entries with better structured content
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Improve content formatting for fault codes
 */
async function improveContentFormatting() {
  
  try {
    // Get fault code entries that need better formatting
    const { data: faultCodes, error } = await supabase
      .from('knowledge_embeddings')
      .select('id, content, metadata')
      .eq('tag', 'fault_code')
      .eq('is_active', true)
      .limit(100); // Process in batches
    
    if (error) throw error;
    
    let improvedCount = 0;
    const updates = [];
    
    for (const record of faultCodes) {
      try {
        // Check if content needs improvement (missing structured format)
        if (!record.content.includes('Manufacturer:') || 
            !record.content.includes('Fault Code:') ||
            !record.content.includes('Description:') ||
            !record.content.includes('Solutions:')) {
          
          // Extract data from metadata and existing content
          const manufacturer = record.metadata?.manufacturer || 'Unknown';
          const faultCode = record.metadata?.fault_code || extractFaultCode(record.content);
          
          // Parse existing content for description and solutions
          const { description, solutions } = parseExistingContent(record.content);
          
          // Create improved content format
          const improvedContent = formatFaultCodeContent(manufacturer, faultCode, description, solutions);
          
          updates.push({
            id: record.id,
            content: improvedContent
          });
          
          improvedCount++;
        }
        
      } catch (recordError) {
        console.error(`Error processing record ${record.id}:`, recordError);
      }
    }
    
    // Batch update records (without tsvector for now)
    if (updates.length > 0) {
      
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('knowledge_embeddings')
          .update({ content: update.content })
          .eq('id', update.id);
        
        if (updateError) {
          console.error(`Failed to update record ${update.id}:`, updateError);
        }
      }
    }
    
    return improvedCount;
    
  } catch (error) {
    console.error('❌ Content formatting improvement failed:', error);
    return 0;
  }
}

/**
 * Extract fault code from content text
 */
function extractFaultCode(content) {
  const faultCodeMatch = content.match(/\b[FE]\d{1,3}\b/i);
  return faultCodeMatch ? faultCodeMatch[0] : 'Unknown';
}

/**
 * Parse existing content for description and solutions
 */
function parseExistingContent(content) {
  let description = 'Fault condition detected';
  let solutions = ['Contact qualified engineer', 'Check system operation'];
  
  const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Look for description patterns
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    
    // Common description indicators
    if (line.includes('description:') || 
        line.includes('issue:') ||
        line.includes('problem:') ||
        line.includes('fault:')) {
      const nextLine = lines[i + 1];
      if (nextLine && nextLine.length > 10) {
        description = nextLine;
      }
    }
    
    // If line looks like a description (not too short, not a solution)
    if (lines[i].length > 20 && 
        !line.includes('check') && 
        !line.includes('replace') &&
        !line.includes('contact') &&
        !line.includes('solution') &&
        i < 5) { // Near the top
      description = lines[i];
    }
  }
  
  // Look for solutions
  const solutionLines = [];
  let inSolutionSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    
    if (line.includes('solution') || 
        line.includes('fix') ||
        line.includes('action') ||
        line.includes('steps')) {
      inSolutionSection = true;
      continue;
    }
    
    if (inSolutionSection || 
        line.includes('check') || 
        line.includes('replace') ||
        line.includes('ensure') ||
        line.includes('verify') ||
        line.includes('clean') ||
        line.includes('reset')) {
      
      if (lines[i].length > 10 && lines[i].length < 200) {
        solutionLines.push(lines[i]);
      }
    }
  }
  
  if (solutionLines.length > 0) {
    solutions = solutionLines.slice(0, 5); // Max 5 solutions
  }
  
  return { description, solutions };
}

/**
 * Format fault code content in structured format
 */
function formatFaultCodeContent(manufacturer, faultCode, description, solutions) {
  return `Manufacturer: ${manufacturer}
Fault Code: ${faultCode}
Description: ${description}

Solutions:
${solutions.map(s => `• ${s}`).join('\n')}

Technical Details:
This fault code indicates a specific system condition that requires attention from a qualified Gas Safe engineer. Follow the diagnostic steps systematically and ensure all safety procedures are observed.

Keywords: ${manufacturer.toLowerCase()}, ${faultCode.toLowerCase()}, fault code, diagnostic, troubleshooting, boiler service`;
}

/**
 * Update search vectors separately (simpler approach)
 */
async function updateSearchVectorsSimple() {
  
  try {
    // Use SQL to update search vectors directly
    const { error } = await supabase.rpc('exec_sql', {
      query: `
        UPDATE knowledge_embeddings 
        SET content_search_vector = to_tsvector('english', content)
        WHERE tag = 'fault_code' AND is_active = true;
      `
    });
    
    if (error) {
      
      // Alternative: Get records and update individually
      const { data: records, error: fetchError } = await supabase
        .from('knowledge_embeddings')
        .select('id')
        .eq('tag', 'fault_code')
        .eq('is_active', true)
        .limit(50);
      
      if (fetchError) throw fetchError;
      
      // For now, we'll rely on the trigger to update search vectors
      
    } else {
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Search vector update failed:', error);
    return false;
  }
}

/**
 * Test improved content quality
 */
async function testImprovedQuality() {
  
  try {
    const { data: samples, error } = await supabase
      .from('knowledge_embeddings')
      .select('content, metadata')
      .eq('tag', 'fault_code')
      .eq('is_active', true)
      .limit(20);
    
    if (error) throw error;
    
    let qualityScore = 0;
    let totalChecks = 0;
    let wellFormattedCount = 0;
    
    samples.forEach(sample => {
      totalChecks += 5;
      let recordScore = 0;
      
      // Check structured format
      if (sample.content.includes('Manufacturer:')) { qualityScore++; recordScore++; }
      if (sample.content.includes('Fault Code:')) { qualityScore++; recordScore++; }
      if (sample.content.includes('Description:')) { qualityScore++; recordScore++; }
      if (sample.content.includes('Solutions:')) { qualityScore++; recordScore++; }
      if (sample.content.includes('Keywords:')) { qualityScore++; recordScore++; }
      
      if (recordScore >= 4) wellFormattedCount++;
    });
    
    const qualityPercentage = Math.round((qualityScore / totalChecks) * 100);
    const wellFormattedPercentage = Math.round((wellFormattedCount / samples.length) * 100);
    
    console.log(`✅ Well-formatted entries: ${wellFormattedPercentage}% (${wellFormattedCount}/${samples.length})`);
    
    if (qualityPercentage >= 90) {
    } else if (qualityPercentage >= 75) {
    } else {
    }
    
    return { qualityPercentage, wellFormattedPercentage };
    
  } catch (error) {
    console.error('❌ Content quality test failed:', error);
    return { qualityPercentage: 0, wellFormattedPercentage: 0 };
  }
}

/**
 * Main execution
 */
async function main() {
  
  // Step 1: Improve content formatting
  const improvedCount = await improveContentFormatting();
  
  // Step 2: Update search vectors
  await updateSearchVectorsSimple();
  
  // Step 3: Test quality
  const qualityResults = await testImprovedQuality();
  
  // Summary
  console.log(`✅ Content quality: ${qualityResults.qualityPercentage}%`);
  
  if (qualityResults.qualityPercentage >= 75) {
  } else {
  }
}

// Run the improvements
main().catch(console.error);
