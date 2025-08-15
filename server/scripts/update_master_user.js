/**
 * Update Master User Script
 * Updates the existing burrows1980@yahoo.co.uk user to have master role
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Create Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function updateMasterUser() {
  
  try {
    // Get all users to find the existing user
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      throw listError;
    }
    
    const existingUser = usersData.users.find(u => u.email === 'burrows1980@yahoo.co.uk');
    
    if (!existingUser) {
      console.error('❌ User burrows1980@yahoo.co.uk not found');
      return;
    }
    
    console.log(`📧 Found user: ${existingUser.email} (ID: ${existingUser.id})`);
    
    // Update user metadata to master role
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      {
        user_metadata: {
          name: 'Mark Burrows (Master)',
          role: 'master',
          tier: 'Master'
        }
      }
    );
    
    if (updateError) {
      throw updateError;
    }
    
    
    // Also update password if needed
    const { error: passwordError } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      {
        password: 'Smurf1980'
      }
    );
    
    if (passwordError) {
      console.warn('⚠️  Could not update password:', passwordError.message);
    } else {
    }
    
    // List final user state
    const { data: finalUsers } = await supabase.auth.admin.listUsers();
    finalUsers.users.forEach(user => {
      const role = user.user_metadata?.role || 'user';
      const name = user.user_metadata?.name || 'Unknown';
      console.log(`  - ${user.email} (${role}) - ${name}`);
    });
    
  } catch (error) {
    console.error('❌ Failed to update master user:', error.message);
  }
}

// Run the script
updateMasterUser().catch(console.error);
