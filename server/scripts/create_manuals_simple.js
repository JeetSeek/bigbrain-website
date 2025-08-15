#!/usr/bin/env node

/**
 * Simple Boiler Manuals Table Setup
 * Creates the table and inserts sample data using direct Supabase client operations
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function createBoilerManualsTable() {
  try {
    
    // Sample manual data to insert
    const sampleManuals = [
      {
        name: 'Baxi EcoBlue Advance Installation Manual',
        model: 'EcoBlue Advance',
        make: 'Baxi',
        manufacturer: 'Baxi',
        url: 'https://www.baxi.co.uk/downloads/ecoblue-advance-installation-manual.pdf',
        file_type: 'application/pdf',
        description: 'Complete installation and service manual for Baxi EcoBlue Advance combi boilers',
        popularity: 15
      },
      {
        name: 'Baxi EcoBlue Heat Service Manual',
        model: 'EcoBlue Heat',
        make: 'Baxi',
        manufacturer: 'Baxi',
        url: 'https://www.baxi.co.uk/downloads/ecoblue-heat-service-manual.pdf',
        file_type: 'application/pdf',
        description: 'Service and maintenance manual for Baxi EcoBlue Heat system boilers',
        popularity: 12
      },
      {
        name: 'Baxi Duo-tec Combi Installation Guide',
        model: 'Duo-tec Combi',
        make: 'Baxi',
        manufacturer: 'Baxi',
        url: 'https://www.baxi.co.uk/downloads/duo-tec-combi-installation.pdf',
        file_type: 'application/pdf',
        description: 'Installation guide for Baxi Duo-tec combi boiler range',
        popularity: 18
      },
      {
        name: 'Ideal Logic Max Combi Installation Manual',
        model: 'Logic Max Combi',
        make: 'Ideal',
        manufacturer: 'Ideal Heating',
        url: 'https://www.idealheating.com/downloads/logic-max-combi-installation.pdf',
        file_type: 'application/pdf',
        description: 'Installation and commissioning manual for Ideal Logic Max combi boilers',
        popularity: 20
      },
      {
        name: 'Worcester Bosch Greenstar CDi Classic Installation',
        model: 'Greenstar CDi Classic',
        make: 'Worcester Bosch',
        manufacturer: 'Worcester Bosch',
        url: 'https://www.worcester-bosch.co.uk/downloads/greenstar-cdi-classic-installation.pdf',
        file_type: 'application/pdf',
        description: 'Installation manual for Worcester Bosch Greenstar CDi Classic range',
        popularity: 22
      },
      {
        name: 'Vaillant ecoTEC Plus Installation Manual',
        model: 'ecoTEC Plus',
        make: 'Vaillant',
        manufacturer: 'Vaillant',
        url: 'https://www.vaillant.co.uk/downloads/ecotec-plus-installation.pdf',
        file_type: 'application/pdf',
        description: 'Complete installation manual for Vaillant ecoTEC Plus combi boilers',
        popularity: 17
      },
      {
        name: 'Glow-worm Energy Combi Installation Guide',
        model: 'Energy Combi',
        make: 'Glow-worm',
        manufacturer: 'Glow-worm',
        url: 'https://www.glow-worm.co.uk/downloads/energy-combi-installation.pdf',
        file_type: 'application/pdf',
        description: 'Installation guide for Glow-worm Energy combi boilers',
        popularity: 11
      },
      {
        name: 'Potterton Promax Combi Service Manual',
        model: 'Promax Combi',
        make: 'Potterton',
        manufacturer: 'Potterton',
        url: 'https://www.potterton.co.uk/downloads/promax-combi-service.pdf',
        file_type: 'application/pdf',
        description: 'Service manual for Potterton Promax combi boiler range',
        popularity: 9
      }
    ];
    
    // Try to insert the sample data (this will create the table if it doesn't exist)
    const { data: insertData, error: insertError } = await supabase
      .from('boiler_manuals')
      .insert(sampleManuals)
      .select();
    
    if (insertError) {
      console.error('❌ Error inserting data:', insertError);
      
      // The table doesn't exist, so we'll need to create it via SQL
      console.log('📋 Manual table creation required via Supabase dashboard or SQL editor.');
      console.log(`
CREATE TABLE boiler_manuals (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  model VARCHAR(255),
  make VARCHAR(255),
  manufacturer VARCHAR(255),
  url TEXT,
  file_type VARCHAR(50) DEFAULT 'application/pdf',
  description TEXT,
  popularity INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO boiler_manuals (name, model, make, manufacturer, url, file_type, description, popularity) VALUES
${sampleManuals.map(manual => 
  `('${manual.name.replace(/'/g, "''")}', '${manual.model}', '${manual.make}', '${manual.manufacturer}', '${manual.url}', '${manual.file_type}', '${manual.description.replace(/'/g, "''")}', ${manual.popularity})`
).join(',\n')};
      `);
      
    } else {
      insertData?.forEach(manual => {
        console.log(`   - ${manual.name} (${manual.make})`);
      });
    }
    
    // Test the API endpoint
    const response = await fetch('http://localhost:3204/api/manuals?manufacturer=baxi');
    const result = await response.json();
    
    if (result.manuals && result.manuals.length > 0) {
    } else {
    }
    
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

// Run the setup
createBoilerManualsTable();
