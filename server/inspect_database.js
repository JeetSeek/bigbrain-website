import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('🔍 BOILERBRAIN DATABASE INSPECTION\n');
console.log('='.repeat(60));
console.log(`📍 Connected to: ${process.env.SUPABASE_URL}`);
console.log('='.repeat(60));

// 1. Storage Buckets
console.log('\n📦 STORAGE BUCKETS:');
const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
if (bucketsError) {
  console.error('❌ Error:', bucketsError.message);
} else if (buckets.length === 0) {
  console.log('   ⚠️  No storage buckets found');
} else {
  console.log(`   ✅ Found ${buckets.length} bucket(s):\n`);
  for (const bucket of buckets) {
    console.log(`   📁 ${bucket.name}`);
    console.log(`      - ID: ${bucket.id}`);
    console.log(`      - Public: ${bucket.public ? 'Yes' : 'No'}`);
    console.log(`      - Created: ${new Date(bucket.created_at).toLocaleString()}`);
    
    // List contents
    const { data: files } = await supabase.storage.from(bucket.name).list('', { limit: 10 });
    if (files && files.length > 0) {
      console.log(`      - Contents (first 10):`);
      files.forEach(f => console.log(`        • ${f.name}`));
    }
    console.log('');
  }
}

// 2. Database Tables
console.log('\n�� DATABASE TABLES:\n');

const tables = [
  'boiler_fault_codes',
  'diagnostic_fault_codes', 
  'enhanced_diagnostic_procedures',
  'boiler_manuals',
  'manufacturers',
  'chat_sessions',
  'knowledge_chunks',
  'users',
  'profiles'
];

for (const table of tables) {
  try {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      if (error.code === '42P01') {
        console.log(`   ⚠️  ${table}: Table does not exist`);
      } else {
        console.log(`   ❌ ${table}: Error - ${error.message}`);
      }
    } else {
      console.log(`   ✅ ${table}: ${count || 0} records`);
      
      // Get sample data for tables with records
      if (count > 0 && count < 10) {
        const { data: sample } = await supabase.from(table).select('*').limit(3);
        if (sample && sample.length > 0) {
          console.log(`      Sample columns: ${Object.keys(sample[0]).join(', ')}`);
        }
      }
    }
  } catch (e) {
    console.log(`   ❌ ${table}: ${e.message}`);
  }
}

// 3. Database Functions/RPCs
console.log('\n🔧 DATABASE FUNCTIONS:');
try {
  const { data: matchKnowledge, error: mkError } = await supabase
    .rpc('match_knowledge_chunks', { 
      query_embedding: new Array(1536).fill(0), 
      match_threshold: 0.5, 
      match_count: 1 
    });
  console.log('   ✅ match_knowledge_chunks: Available');
} catch (e) {
  console.log('   ⚠️  match_knowledge_chunks: Not available');
}

// 4. Auth Users
console.log('\n👥 AUTHENTICATION:');
try {
  // Note: listing users requires admin privileges
  console.log('   ℹ️  Auth inspection requires admin SDK access');
} catch (e) {
  console.log('   ⚠️  Cannot inspect auth users');
}

console.log('\n' + '='.repeat(60));
console.log('✅ Database inspection complete');
console.log('='.repeat(60));
