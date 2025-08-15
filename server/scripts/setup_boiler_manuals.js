#!/usr/bin/env node

/**
 * Setup Boiler Manuals Table
 * 
 * This script creates the boiler_manuals table and populates it with sample data
 * to fix the Boiler Manual Finder database connection issue.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function setupBoilerManualsTable() {
  try {
    
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, 'create_boiler_manuals_table.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`   ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`);
        
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement
        });
        
        if (error) {
          console.error(`❌ Error executing statement ${i + 1}:`, error);
          // Try direct query execution instead
          const { error: directError } = await supabase
            .from('_temp')
            .select('1')
            .limit(1);
          
          if (directError) {
            // For CREATE TABLE and INSERT statements, we'll use a different approach
            if (statement.includes('CREATE TABLE')) {
            } else if (statement.includes('INSERT INTO')) {
            }
          }
        } else {
        }
      }
    }
    
    // Verify the table was created and has data
    const { data: manuals, error: selectError } = await supabase
      .from('boiler_manuals')
      .select('id, name, make')
      .limit(5);
    
    if (selectError) {
      console.error('❌ Error verifying table:', selectError);
      
      // Try creating the table directly using the client
      
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS boiler_manuals (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          model VARCHAR(255),
          make VARCHAR(255),
          manufacturer VARCHAR(255),
          url TEXT,
          download_url TEXT,
          file_type VARCHAR(50) DEFAULT 'application/pdf',
          description TEXT,
          popularity INTEGER DEFAULT 0,
          upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      
      // Insert sample data directly
      const sampleManuals = [
        {
          name: 'Baxi EcoBlue Advance Installation Manual',
          model: 'EcoBlue Advance',
          make: 'Baxi',
          manufacturer: 'Baxi',
          url: 'https://www.baxi.co.uk/downloads/ecoblue-advance-installation-manual.pdf',
          description: 'Complete installation and service manual for Baxi EcoBlue Advance combi boilers',
          popularity: 15
        },
        {
          name: 'Baxi EcoBlue Heat Service Manual',
          model: 'EcoBlue Heat',
          make: 'Baxi',
          manufacturer: 'Baxi',
          url: 'https://www.baxi.co.uk/downloads/ecoblue-heat-service-manual.pdf',
          description: 'Service and maintenance manual for Baxi EcoBlue Heat system boilers',
          popularity: 12
        },
        {
          name: 'Ideal Logic Max Combi Installation Manual',
          model: 'Logic Max Combi',
          make: 'Ideal',
          manufacturer: 'Ideal Heating',
          url: 'https://www.idealheating.com/downloads/logic-max-combi-installation.pdf',
          description: 'Installation and commissioning manual for Ideal Logic Max combi boilers',
          popularity: 20
        },
        {
          name: 'Worcester Bosch Greenstar CDi Classic Installation',
          model: 'Greenstar CDi Classic',
          make: 'Worcester Bosch',
          manufacturer: 'Worcester Bosch',
          url: 'https://www.worcester-bosch.co.uk/downloads/greenstar-cdi-classic-installation.pdf',
          description: 'Installation manual for Worcester Bosch Greenstar CDi Classic range',
          popularity: 22
        },
        {
          name: 'Vaillant ecoTEC Plus Installation Manual',
          model: 'ecoTEC Plus',
          make: 'Vaillant',
          manufacturer: 'Vaillant',
          url: 'https://www.vaillant.co.uk/downloads/ecotec-plus-installation.pdf',
          description: 'Complete installation manual for Vaillant ecoTEC Plus combi boilers',
          popularity: 17
        }
      ];
      
      // Try to insert sample data
      const { data: insertData, error: insertError } = await supabase
        .from('boiler_manuals')
        .insert(sampleManuals)
        .select();
      
      if (insertError) {
        console.error('❌ Error inserting sample data:', insertError);
      } else {
      }
      
    } else {
      manuals?.forEach(manual => {
        console.log(`   - ${manual.name} (${manual.make})`);
      });
    }
    
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run the setup
setupBoilerManualsTable();
