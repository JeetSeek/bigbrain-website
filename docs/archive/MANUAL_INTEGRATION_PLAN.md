# Manual Integration Plan - Better Diagnostics

**Goal:** Use the 5,670 boiler manuals for accurate, manufacturer-specific diagnostics

---

## Current Situation

**What we have:**
- 5,670 PDF manuals in Supabase Storage
- 753 fault codes in database
- Generic diagnostic procedures
- AI chat using database only

**What we're missing:**
- Actual manual content in diagnostics
- Model-specific troubleshooting
- Manufacturer's exact instructions
- Page references to manuals

---

## Solution: RAG (Retrieval Augmented Generation)

### Architecture

```
User Query: "Ideal Logic 24 L2"
     ↓
1. Extract: manufacturer="Ideal", model="Logic 24", fault="L2"
     ↓
2. Database Query: Get fault code info (current system)
     ↓
3. Vector Search: Find relevant manual sections
     ↓
4. Combine: Database + Manual excerpts
     ↓
5. AI Response: Professional diagnosis with manual references
```

---

## Implementation Steps

### Step 1: PDF Text Extraction

**Tool:** `pdf-parse` npm package

```javascript
// server/services/ManualProcessingService.js
import pdfParse from 'pdf-parse';

async function extractManualText(pdfUrl) {
  const response = await fetch(pdfUrl);
  const buffer = await response.arrayBuffer();
  const data = await pdfParse(Buffer.from(buffer));
  
  return {
    text: data.text,
    pages: data.numpages,
    info: data.info
  };
}
```

**Process:**
1. Download PDF from Supabase Storage
2. Extract text with pdf-parse
3. Split into chunks (500-1000 chars each)
4. Store chunks with metadata

---

### Step 2: Create Embeddings

**Tool:** OpenAI Embeddings API

```javascript
async function createEmbedding(text) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small', // Cheaper, faster
      input: text
    })
  });
  
  const data = await response.json();
  return data.data[0].embedding; // 1536 dimensions
}
```

**Cost:** ~$0.02 per 1M tokens (very cheap!)

---

### Step 3: Store in Vector Database

**Database:** Supabase pgvector extension

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create manual_chunks table
CREATE TABLE manual_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_id UUID REFERENCES boiler_manuals(id),
  manufacturer TEXT,
  model TEXT,
  chunk_text TEXT,
  chunk_index INTEGER,
  page_number INTEGER,
  embedding vector(1536), -- OpenAI embedding size
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast similarity search
CREATE INDEX ON manual_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

---

### Step 4: Semantic Search

```javascript
async function searchManuals(query, manufacturer, model) {
  // Create embedding for user query
  const queryEmbedding = await createEmbedding(query);
  
  // Search for similar chunks
  const { data } = await supabase.rpc('match_manual_chunks', {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: 5,
    filter_manufacturer: manufacturer,
    filter_model: model
  });
  
  return data; // Top 5 most relevant manual sections
}
```

**SQL Function:**
```sql
CREATE OR REPLACE FUNCTION match_manual_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_manufacturer text,
  filter_model text
)
RETURNS TABLE (
  id uuid,
  chunk_text text,
  page_number int,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    manual_chunks.id,
    manual_chunks.chunk_text,
    manual_chunks.page_number,
    1 - (manual_chunks.embedding <=> query_embedding) as similarity
  FROM manual_chunks
  WHERE 
    manufacturer ILIKE filter_manufacturer
    AND model ILIKE '%' || filter_model || '%'
    AND 1 - (manual_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY manual_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

### Step 5: Enhanced Chat Integration

```javascript
// In server/index.js chat endpoint

// After extracting fault code
const faultInfo = await EnhancedFaultCodeService.getComprehensiveFaultInfo(userText);

// NEW: Search manuals for relevant content
const manualSections = await searchManuals(
  `${manufacturer} ${model} ${faultCode} troubleshooting`,
  manufacturer,
  model
);

// Build enhanced context
let context = `
🔴 FAULT CODE: ${faultCode} = ${description}

📖 MANUFACTURER MANUAL EXCERPTS:
${manualSections.map((section, i) => `
${i + 1}. (Page ${section.page_number}, Similarity: ${(section.similarity * 100).toFixed(0)}%)
${section.chunk_text}
`).join('\n')}

💡 DATABASE INFORMATION:
${faultInfo.context}

⚠️ YOU MUST use the manual excerpts above as the PRIMARY source.
`;
```

---

## Quick Win: Manual Linking (Can do NOW)

While building RAG, implement manual linking:

```javascript
// Add to fault code response
const manual = await supabase
  .from('boiler_manuals')
  .select('*')
  .ilike('manufacturer', manufacturer)
  .ilike('name', `%${model}%`)
  .single();

if (manual) {
  reply += `\n\n📄 **Official Manual:** [${manual.name}](${manual.url})`;
  reply += `\nFor detailed instructions, refer to the manufacturer's manual.`;
}
```

---

## Cost Estimate

### One-Time Setup (Processing 5,670 manuals)

**Assumptions:**
- Average manual: 50 pages
- Average page: 500 words = 650 tokens
- Total tokens: 5,670 × 50 × 650 = 184M tokens

**Costs:**
- Text extraction: FREE (pdf-parse)
- Embeddings: 184M tokens × $0.00002 per 1K = **$3.68**
- Storage: 5,670 manuals × 50 chunks × 1KB = 283MB = **$0.03/month**

**Total one-time cost: ~$4**

### Ongoing Costs (Per query)

- Embedding user query: ~50 tokens × $0.00002 = **$0.000001**
- Vector search: FREE (Supabase)
- AI response: ~1000 tokens × $0.00015 = **$0.00015**

**Cost per chat: ~$0.00015 (negligible)**

---

## Timeline

### Phase 1: Manual Linking (1 hour) ⚡
- Add manual lookup to chat
- Show PDF links in responses
- **Benefit:** Users can reference official docs

### Phase 2: Text Extraction (4 hours) 📄
- Set up pdf-parse
- Process 100 test manuals
- Store extracted text
- **Benefit:** Have manual content ready

### Phase 3: Vector Database (2 hours) 🗄️
- Enable pgvector
- Create tables and indexes
- Set up embedding pipeline
- **Benefit:** Fast semantic search

### Phase 4: RAG Integration (3 hours) 🤖
- Implement semantic search
- Enhance chat with manual excerpts
- Test and refine
- **Benefit:** Professional diagnostics

**Total: ~10 hours for full implementation**

---

## Expected Results

### Before (Current)
```
User: "Ideal Logic 24 L2"
AI: "L2 indicates ignition lockout. Check gas supply, 
     ignition electrode, and flue. Reset boiler."
```
**Generic, vague, no specifics**

### After (With RAG)
```
User: "Ideal Logic 24 L2"
AI: "L2 - Ignition Lockout on Ideal Logic 24

According to the Ideal Logic+ Installation Manual (Page 42):

'Fault L2 indicates the boiler has failed to ignite after 
3 attempts. This is usually caused by:
1. Insufficient gas pressure (check inlet pressure is 20mbar)
2. Faulty ignition electrode (gap should be 3-4mm)
3. Blocked flue (check condensate trap)

Diagnostic Procedure:
1. Check gas pressure at test point - should read 20mbar ±1
2. Inspect electrode gap with feeler gauge
3. Remove and clean condensate trap
4. Reset using the reset button for 3 seconds

If fault persists after these checks, the PCB may need 
replacement (Part No: 173534).'

📄 Full Manual: [Ideal Logic+ Manual](link)
⚠️ Gas Safe registered engineer required for gas work.

What readings did you get when checking the gas pressure?"
```
**Specific, detailed, professional, with part numbers!**

---

## Recommendation

**Start with Phase 1 (Manual Linking)** - Can implement in 1 hour, immediate value

Then build RAG system over next week for professional-grade diagnostics.

---

## Next Steps

1. ✅ Approve this plan
2. ⚡ Implement Phase 1 (manual linking) - 1 hour
3. 📄 Process first 100 manuals - 2 hours
4. 🧪 Test RAG with sample data
5. 🚀 Roll out to all 5,670 manuals

**Want me to start with Phase 1 (manual linking) now?** It will take ~1 hour and give immediate improvement!
