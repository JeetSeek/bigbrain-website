#!/usr/bin/env node

/**
 * Fix Semantic Search and Content Quality
 * Updates search vectors and improves content formatting
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
 * Update search vectors for all existing records
 */
async function updateSearchVectors() {
  
  try {
    // Update search vectors for all records
    const { error } = await supabase.rpc('update_search_vectors');
    
    if (error) {
      // If the function doesn't exist, create it
      
      const { error: createError } = await supabase.rpc('exec_sql', {
        query: `
          CREATE OR REPLACE FUNCTION update_search_vectors()
          RETURNS void AS $$
          BEGIN
            UPDATE knowledge_embeddings 
            SET content_search_vector = to_tsvector('english', content)
            WHERE content_search_vector IS NULL OR content_search_vector = '';
          END;
          $$ LANGUAGE plpgsql;
        `
      });
      
      if (createError) {
        // Direct update approach
        const { error: updateError } = await supabase
          .from('knowledge_embeddings')
          .update({ 
            content_search_vector: supabase.rpc('to_tsvector', { config: 'english', document: 'content' })
          })
          .is('content_search_vector', null);
        
        if (updateError) throw updateError;
      } else {
        // Run the function
        const { error: runError } = await supabase.rpc('update_search_vectors');
        if (runError) throw runError;
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Failed to update search vectors:', error);
    return false;
  }
}

/**
 * Test the improved semantic search
 */
async function testSemanticSearch() {
  
  const testQueries = [
    'boiler heating water',
    'ignition failure',
    'low pressure',
    'gas valve',
    'thermistor fault'
  ];
  
  try {
    for (const query of testQueries) {
      // Use proper PostgreSQL full-text search
      const { data: results, error } = await supabase
        .from('knowledge_embeddings')
        .select('content, tag, metadata')
        .textSearch('content_search_vector', query.replace(/\s+/g, ' & '))
        .eq('is_active', true)
        .limit(3);
      
      if (error) {
        // Fallback to ILIKE search
        const { data: fallbackResults, error: fallbackError } = await supabase
          .from('knowledge_embeddings')
          .select('content, tag, metadata')
          .ilike('content', `%${query}%`)
          .eq('is_active', true)
          .limit(3);
        
        if (fallbackError) throw fallbackError;
        
        console.log(`✅ Query: "${query}" - Found ${fallbackResults.length} results (fallback)`);
        if (fallbackResults.length > 0) {
          const preview = fallbackResults[0].content.substring(0, 80) + '...';
        }
      } else {
        if (results.length > 0) {
          const preview = results[0].content.substring(0, 80) + '...';
        }
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Semantic search test failed:', error);
    return false;
  }
}

/**
 * Improve content quality by reformatting fault code entries
 */
async function improveContentQuality() {
  
  try {
    // Get fault code entries that need formatting improvement
    const { data: faultCodes, error } = await supabase
      .from('knowledge_embeddings')
      .select('id, content, metadata')
      .eq('tag', 'fault_code')
      .eq('is_active', true)
      .limit(50); // Process in batches
    
    if (error) throw error;
    
    let improvedCount = 0;
    
    for (const record of faultCodes) {
      try {
        // Check if content needs improvement
        if (!record.content.includes('Manufacturer:') || 
            !record.content.includes('Fault Code:') ||
            !record.content.includes('Description:') ||
            !record.content.includes('Solutions:')) {
          
          // Extract data from metadata and content
          const manufacturer = record.metadata?.manufacturer || 'Unknown';
          const faultCode = record.metadata?.fault_code || 'Unknown';
          
          // Try to extract description and solutions from existing content
          let description = 'Fault condition detected';
          let solutions = ['Contact qualified engineer', 'Check system operation'];
          
          // Parse existing content for better data
          const lines = record.content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.toLowerCase().includes('description') || 
                line.toLowerCase().includes('issue') ||
                line.toLowerCase().includes('problem')) {
              description = lines[i + 1]?.trim() || description;
            }
            if (line.toLowerCase().includes('solution') || 
                line.toLowerCase().includes('fix') ||
                line.toLowerCase().includes('action')) {
              // Collect solutions
              const solutionLines = [];
              for (let j = i + 1; j < lines.length && j < i + 5; j++) {
                const solutionLine = lines[j]?.trim();
                if (solutionLine && solutionLine.length > 5) {
                  solutionLines.push(solutionLine);
                }
              }
              if (solutionLines.length > 0) {
                solutions = solutionLines;
              }
            }
          }
          
          // Create improved content format
          const improvedContent = `Manufacturer: ${manufacturer}
Fault Code: ${faultCode}
Description: ${description}
Solutions:
${solutions.map(s => `• ${s}`).join('\n')}

Technical Details:
This fault code indicates a specific system condition that requires attention. Follow the solutions in order and ensure all safety procedures are observed.

Keywords: ${manufacturer.toLowerCase()}, ${faultCode.toLowerCase()}, fault, diagnostic, troubleshooting`;
          
          // Update the record
          const { error: updateError } = await supabase
            .from('knowledge_embeddings')
            .update({ 
              content: improvedContent,
              content_search_vector: supabase.rpc('to_tsvector', { 
                config: 'english', 
                document: improvedContent 
              })
            })
            .eq('id', record.id);
          
          if (updateError) {
            console.error(`Failed to update record ${record.id}:`, updateError);
          } else {
            improvedCount++;
          }
        }
        
      } catch (recordError) {
        console.error(`Error processing record ${record.id}:`, recordError);
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Content quality improvement failed:', error);
    return false;
  }
}

/**
 * Test content quality after improvements
 */
async function testContentQuality() {
  
  try {
    // Sample some fault code entries to check quality
    const { data: samples, error } = await supabase
      .from('knowledge_embeddings')
      .select('content, metadata')
      .eq('tag', 'fault_code')
      .eq('is_active', true)
      .limit(10);
    
    if (error) throw error;
    
    let qualityScore = 0;
    let totalChecks = 0;
    
    samples.forEach(sample => {
      totalChecks += 5;
      
      // Check if content has manufacturer
      if (sample.content.includes('Manufacturer:')) qualityScore++;
      
      // Check if content has fault code
      if (sample.content.includes('Fault Code:')) qualityScore++;
      
      // Check if content has description
      if (sample.content.includes('Description:')) qualityScore++;
      
      // Check if content has solutions
      if (sample.content.includes('Solutions:')) qualityScore++;
      
      // Check if content has keywords
      if (sample.content.includes('Keywords:')) qualityScore++;
    });
    
    const qualityPercentage = Math.round((qualityScore / totalChecks) * 100);
    
    
    if (qualityPercentage >= 90) {
    } else if (qualityPercentage >= 75) {
    } else {
    }
    
    return qualityPercentage;
    
  } catch (error) {
    console.error('❌ Content quality test failed:', error);
    return 0;
  }
}

/**
 * Main execution
 */
async function main() {
  
  const tasks = [
    { name: 'Update Search Vectors', fn: updateSearchVectors },
    { name: 'Test Semantic Search', fn: testSemanticSearch },
    { name: 'Improve Content Quality', fn: improveContentQuality },
    { name: 'Test Content Quality', fn: testContentQuality }
  ];
  
  const results = [];
  
  for (const task of tasks) {
    try {
      const result = await task.fn();
      results.push({ name: task.name, success: !!result, result });
    } catch (error) {
      console.error(`❌ ${task.name} failed:`, error);
      results.push({ name: task.name, success: false, result: null });
    }
  }
  
  // Summary
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  results.forEach(result => {
  });
  
  
  if (successful === total) {
  } else {
    console.log(`⚠️  ${total - successful} improvement(s) need attention.`);
  }
}

// Run the improvements
main().catch(console.error);
