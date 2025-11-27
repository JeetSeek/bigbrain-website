/**
 * Process Existing Manuals Script
 * Extracts intelligence from PDFs already in Supabase Storage
 */

import { supabase } from '../supabaseClient.js';
import PDFIntelligenceExtractor from '../services/PDFIntelligenceExtractor.js';

async function processExistingManuals(limit = 10) {
  console.log('🚀 Starting PDF Intelligence Extraction\n');
  
  // Get existing manuals from storage
  const { data: manuals, error } = await supabase
    .from('boiler_manuals')
    .select('*')
    .limit(limit);
  
  if (error) {
    console.error('Error fetching manuals:', error);
    return;
  }
  
  console.log(`📚 Found ${manuals.length} manuals to process\n`);
  
  const extractor = new PDFIntelligenceExtractor();
  let processed = 0;
  let failed = 0;
  
  for (const manual of manuals) {
    try {
      console.log(`\n📄 [${processed + failed + 1}/${manuals.length}] Processing: ${manual.name}`);
      
      // Extract intelligence from PDF
      const result = await extractor.processPDF(
        manual.url,
        manual.manufacturer,
        manual.name
      );
      
      if (!result.success) {
        console.error(`   ❌ Failed: ${result.error}`);
        failed++;
        continue;
      }
      
      // Insert into manual_intelligence table
      const { data: manualIntel, error: insertError } = await supabase
        .from('manual_intelligence')
        .insert({
          source_manual_id: manual.id,
          source_pdf_url: manual.url,
          manufacturer: result.metadata.manufacturer,
          model_name: result.metadata.modelName,
          primary_gc_number: result.metadata.gcNumbers[0] || null,
          all_gc_numbers: result.metadata.gcNumbers,
          page_count: result.metadata.pageCount,
          text_extracted: true,
          content_chunked: true
        })
        .select()
        .single();
      
      if (insertError) {
        console.error(`   ❌ DB Error: ${insertError.message}`);
        failed++;
        continue;
      }
      
      // Insert GC number mappings
      if (result.gcMappings.length > 0) {
        const gcInserts = result.gcMappings.map(gc => ({
          gc_number: gc.gcNumber,
          manual_id: manualIntel.id,
          model_name: gc.modelName,
          extraction_confidence: 0.9
        }));
        
        await supabase
          .from('gc_number_registry')
          .insert(gcInserts);
      }
      
      // Insert content chunks
      const chunkInserts = result.chunks.map(chunk => ({
        manual_id: manualIntel.id,
        content_text: chunk.text,
        chunk_index: chunk.index,
        page_number: chunk.page,
        fault_codes_mentioned: chunk.faultCodes,
        char_count: chunk.text.length,
        word_count: chunk.text.split(/\s+/).length
      }));
      
      if (chunkInserts.length > 0) {
        await supabase
          .from('manual_content_intelligence')
          .insert(chunkInserts);
      }
      
      console.log(`   ✅ Success!`);
      console.log(`      - GC Numbers: ${result.metadata.gcNumbers.length}`);
      console.log(`      - Chunks: ${result.chunks.length}`);
      console.log(`      - Pages: ${result.metadata.pageCount}`);
      
      processed++;
      
      // Rate limiting - be nice to the server
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n\n📊 Processing Complete!`);
  console.log(`   ✅ Processed: ${processed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success Rate: ${((processed / manuals.length) * 100).toFixed(1)}%`);
}

// Run if called directly
const limit = process.argv[2] ? parseInt(process.argv[2]) : 10;
processExistingManuals(limit)
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n💥 Fatal error:', err);
    process.exit(1);
  });
