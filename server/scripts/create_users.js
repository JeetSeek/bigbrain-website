/**
 * Create User Accounts Script
 * Creates the requested user accounts in Supabase Auth and database
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

// User accounts to create
const users = [
  {
    email: 'demo@boilerbrain.com',
    password: 'boilerbrain',
    role: 'user',
    name: 'Demo User',
    tier: 'Pro'
  },
  {
    email: 'mark@boilerbrain.com',
    password: 'Smurf1980',
    role: 'admin',
    name: 'Mark Burrows',
    tier: 'Admin'
  },
  {
    email: 'burrows1980@yahoo.co.uk',
    password: 'Smurf1980',
    role: 'master',
    name: 'Mark Burrows (Master)',
    tier: 'Master'
  }
];

async function createUser(userInfo) {
  
  try {
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userInfo.email,
      password: userInfo.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: userInfo.name,
        role: userInfo.role,
        tier: userInfo.tier
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        
        // Try to get existing user
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers.users.find(u => u.email === userInfo.email);
        
        if (existingUser) {
          // Update existing user's metadata
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            existingUser.id,
            {
              user_metadata: {
                name: userInfo.name,
                role: userInfo.role,
                tier: userInfo.tier
              }
            }
          );
          
          if (updateError) {
            console.error(`❌ Failed to update user metadata: ${updateError.message}`);
          } else {
          }
          
          return existingUser;
        }
      } else {
        throw authError;
      }
    } else {
    }

    const user = authData?.user || null;
    
    // Create or update user profile in database (if users table exists)
    if (user) {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .upsert({
            id: user.id,
            email: userInfo.email,
            name: userInfo.name,
            role: userInfo.role,
            tier: userInfo.tier,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select();

        if (profileError) {
          if (profileError.message.includes('relation "users" does not exist')) {
          } else {
            console.error(`⚠️  Failed to create user profile: ${profileError.message}`);
          }
        } else {
        }
      } catch (profileErr) {
      }
    }

    return user;
    
  } catch (error) {
    console.error(`❌ Failed to create user ${userInfo.email}:`, error.message);
    return null;
  }
}

async function main() {
  
  // Test connection
  try {
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('❌ Failed to connect to Supabase:', error.message);
    process.exit(1);
  }

  // Create each user
  const results = [];
  for (const userInfo of users) {
    const result = await createUser(userInfo);
    results.push({ email: userInfo.email, success: !!result });
  }

  // Summary
  results.forEach(result => {
  });

  const successCount = results.filter(r => r.success).length;
  
  // List all users for verification
  try {
    const { data } = await supabase.auth.admin.listUsers();
    data.users.forEach(user => {
      const role = user.user_metadata?.role || 'user';
      console.log(`  - ${user.email} (${role}) - Created: ${new Date(user.created_at).toLocaleDateString()}`);
    });
  } catch (error) {
    console.error('Failed to list users:', error.message);
  }
}

// Run the script
main().catch(console.error);
