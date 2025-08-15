# Supabase Schema Audit & Recommendations for Boiler Manuals

## Current Schema (from `001_create_boiler_manuals.sql`)

### Table: `boiler_manuals`
| Column         | Type                      | Description                                    |
| -------------- | ------------------------- | ---------------------------------------------- |
| id             | UUID (PK)                 | Unique ID, auto-generated                      |
| name           | VARCHAR(255)              | Manual/boiler model name                       |
| manufacturer   | VARCHAR(255)              | Manufacturer name                              |
| url            | TEXT                      | Link to manual file (PDF, etc.)                |
| description    | TEXT                      | Free text description                          |
| file_type      | VARCHAR(50)               | File MIME type (default: application/pdf)      |
| upload_date    | TIMESTAMP WITH TIME ZONE  | When uploaded (default: now)                   |
| popularity     | INTEGER                   | Popularity metric (default: 0)                 |
| created_at     | TIMESTAMP WITH TIME ZONE  | Creation timestamp (default: now)              |
| updated_at     | TIMESTAMP WITH TIME ZONE  | Last update timestamp (default: now)           |

- Indexes on: manufacturer, name, upload_date
- Row Level Security enabled: public read, admin write

---

## Recommendations for Improvement

### 1. Add Technical & Searchable Fields
To enable advanced troubleshooting, retrieval, and LLM-augmented support, consider adding:

| Column           | Type            | Description                                               |
|------------------|----------------|-----------------------------------------------------------|
| model_number     | VARCHAR(100)    | Official model number/code                                |
| gc_number        | VARCHAR(100)    | Gas Council number (UK)                                   |
| fault_codes      | TEXT[]          | List of fault/error codes covered in the manual           |
| keywords         | TEXT[]          | Search keywords (e.g., symptoms, parts, error codes)      |
| tags             | TEXT[]          | Tags for filtering (e.g., combi, system, condensing)      |
| year             | INTEGER         | Year of manufacture/release                               |
| pages            | INTEGER         | Number of pages in the manual                             |

### 2. Fault Code Table (Relational)
Add a separate table for fault codes, symptoms, and fixes, linked by manual/model:

```sql
CREATE TABLE public.boiler_fault_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manual_id UUID REFERENCES public.boiler_manuals(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    likely_cause TEXT,
    suggested_fix TEXT,
    severity VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_boiler_fault_codes_code ON public.boiler_fault_codes(code);
```

### 3. Manufacturer Table (Optional, for normalization)
If you have many manufacturers, consider a separate table:

```sql
CREATE TABLE public.boiler_manufacturers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    country VARCHAR(100),
    website TEXT
);
```

### 4. Linking Manuals to LLM/Retrieval
- Store chunked/manual text (for RAG) in a separate table or external vector DB.
- Add a `manual_text` or `embedding_id` column if integrating with a vector search service.

---

## How to Add/Update Information

### 1. Schema Migration
- Use SQL migration files (like your existing `migrations/001_create_boiler_manuals.sql`) for schema changes.
- Example: add a `model_number` column:
  ```sql
  ALTER TABLE public.boiler_manuals ADD COLUMN model_number VARCHAR(100);
  ```

### 2. Data Entry/Update
- Use Supabase dashboard, scripts, or admin API endpoints to add/update records.
- For bulk/manual uploads, prepare CSVs or use Supabase's table editor.
- For fault codes, link each code to its manual via `manual_id`.

### 3. Populating New Fields
- Extract fault codes, keywords, and tags from existing manuals (can be automated with LLMs/scripts).
- Regularly update popularity and tags based on user interaction and search analytics.

---

## Summary of Recommendations
- Add searchable and technical fields to `boiler_manuals`.
- Create a `boiler_fault_codes` table for granular troubleshooting.
- Normalize manufacturers if needed.
- Prepare for retrieval-augmented LLM support by storing chunked/manual text or embeddings.

---

## Next Steps
1. Review and approve schema changes above.
2. Run migration scripts to update Supabase schema.
3. Backfill new fields for existing manuals (manual or automated extraction).
4. Integrate new fields/tables into your app’s API and LLM retrieval logic.

If you’d like, I can generate migration scripts or example API queries for any of the above recommendations.
