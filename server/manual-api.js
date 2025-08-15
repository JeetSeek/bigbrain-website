import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = 3003; // Using a different port to avoid conflicts

app.use(cors());
app.use(express.json());

// Initialize Supabase clients - one for admin tasks, one for public access
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Bucket configuration
const BUCKET_NAME = process.env.BUCKET_NAME || 'boiler-manuals';

// Initialize bucket using admin client
async function initializeBucket() {
  try {
    // First check if the bucket exists using admin client
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    if (listError) throw listError;
    
    const bucketExists = buckets.some(bucket => bucket.name === BUCKET_NAME);
    if (!bucketExists) {
      try {
        const { data, error: createError } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
          public: true,
          file_size_limit: 10000000, // 10MB limit
          allowed_mime_types: ['application/pdf', 'image/*']
        });
        if (createError) throw createError;
      } catch (createErr) {
        console.error('Error during bucket creation:', createErr);
        throw createErr;
      }
    }
  } catch (err) {
    console.error('Error initializing bucket:', err);
    throw err;
  }
}

// Initialize bucket at startup
initializeBucket().catch(err => {
  console.error('Failed to initialize bucket:', err);
  process.exit(1);
});

// Start the server
app.listen(PORT, () => {
});

// List all manuals
app.get('/api/manuals', async (req, res) => {
  try {
    const search = req.query.search || '';
    const manufacturer = req.query.manufacturer || '';
    const sortBy = req.query.sort || 'name';
    const order = req.query.order === 'asc' ? 'ASC' : 'DESC';
    
    // Query the database for manuals
    const { data: manuals, error } = await supabase
      .from('boiler_manuals')
      .select('*')
      .order('name', { ascending: order === 'ASC' });

    if (error) throw error;

    if (manuals.length > 0) {
      console.log('First manual:', {
        name: manuals[0].name,
        manufacturer: manuals[0].manufacturer
      });
    } else {
    }

    // Filter by search and manufacturer
    const filteredManuals = manuals.filter(manual => {
      const matchesSearch = !search || 
        manual.model.toLowerCase().includes(search.toLowerCase()) ||
        manual.make.toLowerCase().includes(search.toLowerCase()) ||
        manual.description?.toLowerCase().includes(search.toLowerCase());
      const matchesManufacturer = !manufacturer ||
        manual.make.toLowerCase() === manufacturer.toLowerCase();
      return matchesSearch && matchesManufacturer;
    });


    // Sort the filtered results
    const sortedManuals = filteredManuals.sort((a, b) => {
      const aValue = sortBy === 'upload_date' ? a.upload_date : a[sortBy];
      const bValue = sortBy === 'upload_date' ? b.upload_date : b[sortBy];
      
      return order === 'ASC' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    });

    // Format the response
    const formattedManuals = sortedManuals.slice(0, 50).map(manual => ({
      id: manual.id,
      model_name: manual.model,
      manufacturer: manual.make,
      download_url: manual.url,
      file_type: manual.file_type || 'application/pdf',
      upload_date: manual.upload_date,
      description: manual.description,
      popularity: manual.popularity || 0
    }));

    res.json({ manuals: formattedManuals });
  } catch (err) {
    console.error('Error fetching manuals:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get manufacturers for filter dropdown
app.get('/api/manufacturers', async (req, res) => {
  try {
    const { data: manuals, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', {
        limit: 1000,
        offset: 0
      });

    if (error) throw error;

    // Extract unique manufacturers from metadata
    const manufacturers = Array.from(new Set(
      manuals
        .filter(m => m.metadata?.manufacturer)
        .map(m => m.metadata.manufacturer)
    ));

    res.json({ manufacturers: manufacturers.sort() });
  } catch (err) {
    console.error('Error fetching manufacturers:', err);
    res.json({ manufacturers: [] });
  }
});

// Get a download URL for a manual
app.get('/api/manuals/:id/download', async (req, res) => {
  try {
    const { data: manual, error } = await supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(req.params.id);

    if (error) throw error;

    // Update popularity
    await supabase.storage
      .from(BUCKET_NAME)
      .update(req.params.id, null, {
        metadata: {
          ...manual.metadata,
          popularity: (manual.metadata?.popularity || 0) + 1
        }
      });

    res.json({ 
      download_url: manual.data.publicUrl,
      filename: req.params.id,
      file_type: manual.metadata?.file_type || 'application/pdf'
    });
  } catch (err) {
    console.error('Error getting download URL:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get manufacturers for filter dropdown
app.get('/api/manufacturers', async (req, res) => {
  try {
    const manufacturers = await db.all('SELECT DISTINCT manufacturer FROM manuals ORDER BY manufacturer');
    res.json({ manufacturers: manufacturers && manufacturers.length ? manufacturers.map(m => m.manufacturer) : [] });
  } catch (err) {
    console.error('Error fetching manufacturers:', err);
    res.json({ manufacturers: [] });
  }
});

// Get a download URL for a manual
app.get('/api/manuals/:id/download', async (req, res) => {
  try {
    const manual = await db.get('SELECT * FROM manuals WHERE id = ?', [req.params.id]);
    
    if (!manual) {
      return res.status(404).json({ error: 'Manual not found' });
    }
    
    // Just return the existing download URL for now
    res.json({ 
      download_url: manual.download_url,
      filename: manual.model_name,
      file_type: manual.file_type || 'application/pdf'
    });
  } catch (err) {
    console.error('Error getting download URL:', err);
    res.status(500).json({ error: err.message });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});
