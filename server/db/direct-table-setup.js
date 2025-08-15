/**
 * Direct Table Setup for Chat Sessions
 * 
 * This script creates the chat_sessions table using direct HTTP requests to the Supabase API
 * with the service role key for admin privileges.
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';  // Add this dependency if needed

// Load environment variables
dotenv.config();

// SQL for creating the chat_sessions table
const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  session_id TEXT UNIQUE NOT NULL,
  history JSONB DEFAULT '[]'::jsonb NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
`;

/**
 * Create the chat_sessions table using direct SQL via the REST API
 */
async function createTable() {
  
  try {
    // Use the Supabase Management API for direct SQL execution
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        query: CREATE_TABLE_SQL
      })
    });
    
    if (!response.ok) {
      console.error('Failed to create table:', response.status, response.statusText);
      const responseText = await response.text();
      console.error('Response:', responseText);
      
      // Try an alternate approach using a parameter object
      const altResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          query: CREATE_TABLE_SQL
        })
      });
      
      if (!altResponse.ok) {
        console.error('Alternate approach failed:', altResponse.status, altResponse.statusText);
        const altResponseText = await altResponse.text();
        console.error('Alt Response:', altResponseText);
        
        // As a last resort, try to create the table through the Supabase dashboard using instructions
        console.log('2. Navigate to the SQL Editor');
        
        return false;
      }
      
      return true;
    }
    
    return true;
  } catch (error) {
    console.error('Error creating table:', error);
    return false;
  }
}

/**
 * Test if the table exists by trying to query it
 */
async function testTable() {
  
  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/chat_sessions?select=count&limit=1`, {
      method: 'GET',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    
    if (response.ok) {
      return true;
    } else {
      console.error('Table query failed:', response.status, response.statusText);
      const responseText = await response.text();
      console.error('Response:', responseText);
      return false;
    }
  } catch (error) {
    console.error('Error testing table:', error);
    return false;
  }
}

/**
 * Insert a test record into the table
 */
async function insertTestRecord() {
  
  const testRecord = {
    session_id: `test-session-${Date.now()}`,
    history: JSON.stringify([{role: 'system', content: 'Test message'}]),
    metadata: JSON.stringify({test: true, timestamp: Date.now()})
  };
  
  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/chat_sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(testRecord)
    });
    
    if (response.ok) {
      const data = await response.json();
      return true;
    } else {
      console.error('Failed to insert test record:', response.status, response.statusText);
      const responseText = await response.text();
      console.error('Response:', responseText);
      return false;
    }
  } catch (error) {
    console.error('Error inserting test record:', error);
    return false;
  }
}

/**
 * Main function to run the table setup process
 */
async function run() {
  
  // First test if the table already exists
  const tableExists = await testTable();
  if (tableExists) {
    return true;
  }
  
  // Create the table if it doesn't exist
  const created = await createTable();
  if (!created) {
    console.error('Failed to create chat_sessions table.');
    return false;
  }
  
  // Test if the table was created successfully
  const tableCreated = await testTable();
  if (!tableCreated) {
    console.error('Table was created but is not queryable.');
    return false;
  }
  
  // Insert a test record to verify the table is working
  const recordInserted = await insertTestRecord();
  if (!recordInserted) {
    console.error('Failed to insert test record.');
    return false;
  }
  
  return true;
}

// Run the setup
console.log('Starting database setup at', new Date().toISOString());
run()
  .then(success => {
    if (success) {
      process.exit(0);
    } else {
      console.error('Database setup failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unhandled error during database setup:', error);
    process.exit(1);
  });
