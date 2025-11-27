/**
 * Check Extraction Results
 * View what has been extracted from PDFs
 */

import { supabase } from '../supabaseClient.js';

async function checkResults() {
  console.log('📊 Manual Intelligence Extraction Results\n');
  console.log('='.repeat(60));
  
  // 1. Overall statistics
  const { data: stats } = await supabase.rpc('exec_sql', {
    query: `
      SELECT 
        COUNT(*) as total_manuals,
        COUNT(DISTINCT manufacturer) as manufacturers,
        SUM(page_count) as total_pages,
        COUNT(DISTINCT primary_gc_number) as unique_gc_numbers
      FROM manual_intelligence
    `
  });
  
  const { data: manuals } = await supabase
    .from('manual_intelligence')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  
  const { data: gcNumbers } = await supabase
    .from('gc_number_registry')
    .select('*')
    .order('created_at', { ascending: false });
  
  const { data: chunks } = await supabase
    .from('manual_content_intelligence')
    .select('*')
    .limit(1);
  
  console.log('\n📈 STATISTICS:');
  console.log(`   Total Manuals Processed: ${manuals.length}`);
  console.log(`   Manufacturers: ${new Set(manuals.map(m => m.manufacturer)).size}`);
  console.log(`   Total Pages: ${manuals.reduce((sum, m) => sum + (m.page_count || 0), 0)}`);
  console.log(`   GC Numbers Found: ${gcNumbers.length}`);
  
  console.log('\n📋 PROCESSED MANUALS:');
  manuals.slice(0, 10).forEach((manual, i) => {
    console.log(`\n   ${i + 1}. ${manual.manufacturer.toUpperCase()}`);
    if (manual.model_name) console.log(`      Model: ${manual.model_name}`);
    if (manual.primary_gc_number) console.log(`      GC Number: ${manual.primary_gc_number}`);
    console.log(`      Pages: ${manual.page_count}`);
    console.log(`      PDF: ${manual.source_pdf_url.split('/').pop()}`);
  });
  
  if (gcNumbers.length > 0) {
    console.log('\n🔢 GC NUMBERS EXTRACTED:');
    const gcGroups = {};
    gcNumbers.forEach(gc => {
      if (!gcGroups[gc.gc_number]) gcGroups[gc.gc_number] = 0;
      gcGroups[gc.gc_number]++;
    });
    Object.entries(gcGroups).forEach(([gc, count]) => {
      console.log(`   ${gc} (found in ${count} manuals)`);
    });
  }
  
  // Sample content
  const { data: sampleContent } = await supabase
    .from('manual_content_intelligence')
    .select(`
      content_text,
      page_number,
      manual_intelligence!inner(primary_gc_number, manufacturer)
    `)
    .not('manual_intelligence.primary_gc_number', 'is', null)
    .limit(1)
    .single();
  
  if (sampleContent) {
    console.log('\n📄 SAMPLE EXTRACTED CONTENT:');
    console.log(`   GC: ${sampleContent.manual_intelligence.primary_gc_number}`);
    console.log(`   Page: ${sampleContent.page_number}`);
    console.log(`   Content: "${sampleContent.content_text.substring(0, 200)}..."`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✨ Done!\n');
}

checkResults()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
