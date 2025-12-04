# BoilerBrain Database Improvements & LLM Manual Access

## Current State Analysis

### Database Assets
| Table | Rows | Purpose |
|-------|------|---------|
| `boiler_manuals` | 3,073 | Manual catalog with URLs |
| `boiler_fault_codes` | 753 | Fault codes + solutions |
| `boiler_diagnostics` | 178 | Diagnostic content |
| `gas_safety_regulations` | 42 | Safety regs |
| `building_regulations` | 6 | Building regs |
| `manual_intelligence` | 10 | PDF processing tracker |
| `manual_content_intelligence` | 60 | Chunked content (no embeddings yet) |

### Storage
- **8,281 PDF files** in Supabase Storage
- Top manufacturers: Ideal (1,323), Worcester (582), Potterton (314), Baxi (291)

### ⚠️ Current Gap
- Only **10 of 3,073 manuals** have been processed
- **0 embeddings** created (vector column exists but empty)
- **0 search vectors** created
- **pgvector extension** is installed but not utilized

---

## Implementation Plan for LLM Manual Access

### Phase 1: Vector Search Functions ✅ DONE
Created two RPC functions:

```sql
-- Semantic search using embeddings
SELECT * FROM match_manual_content(
  query_embedding := '<embedding_vector>',
  match_threshold := 0.7,
  match_count := 5,
  filter_manufacturer := 'Worcester'
);

-- Full-text search fallback
SELECT * FROM search_manual_content(
  search_query := 'ignition lockout electrode',
  match_count := 10,
  filter_manufacturer := 'Ideal'
);

-- Fault code specific lookup
SELECT * FROM get_manual_content_for_fault(
  p_fault_code := 'F22',
  p_manufacturer := 'Worcester',
  p_limit := 5
);

-- Full diagnostic context for LLM
SELECT * FROM get_diagnostic_context(
  p_manufacturer := 'Worcester',
  p_fault_code := 'F22',
  p_symptoms := 'low pressure'
);
```

### Phase 2: PDF Processing Pipeline (TODO)

Need to create a batch processing script that:

1. **Extracts text from PDFs** using pdf-parse or similar
2. **Chunks content** into ~500-1000 word sections
3. **Creates embeddings** using OpenAI text-embedding-3-small
4. **Updates database** with embeddings and search vectors

```javascript
// Example processing flow
async function processPDF(pdfUrl, manufacturer) {
  // 1. Download PDF from Supabase Storage
  const pdfBuffer = await fetch(pdfUrl).then(r => r.arrayBuffer());
  
  // 2. Extract text
  const pdfData = await pdfParse(pdfBuffer);
  const text = pdfData.text;
  
  // 3. Chunk into sections
  const chunks = chunkText(text, { maxTokens: 500, overlap: 50 });
  
  // 4. Create embeddings for each chunk
  for (const chunk of chunks) {
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: chunk.text
    });
    
    // 5. Store in manual_content_intelligence
    await supabase.from('manual_content_intelligence').insert({
      manual_id: manualId,
      content_text: chunk.text,
      chunk_index: chunk.index,
      page_number: chunk.page,
      content_embedding: embedding.data[0].embedding,
      search_vector: null // Will be auto-generated
    });
  }
}
```

### Phase 3: LLM Integration (TODO)

Update the chat endpoint to use RAG:

```javascript
// In chat handler
async function enhancePromptWithManualContext(userMessage, manufacturer, faultCode) {
  // 1. Create embedding for user's question
  const queryEmbedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: userMessage
  });
  
  // 2. Search for relevant manual sections
  const { data: manualContext } = await supabase.rpc('match_manual_content', {
    query_embedding: queryEmbedding.data[0].embedding,
    match_threshold: 0.7,
    match_count: 3,
    filter_manufacturer: manufacturer
  });
  
  // 3. Get fault code specific info
  const { data: faultContext } = await supabase.rpc('get_manual_content_for_fault', {
    p_fault_code: faultCode,
    p_manufacturer: manufacturer,
    p_limit: 2
  });
  
  // 4. Build enhanced prompt
  const context = [
    ...manualContext.map(m => `[${m.manufacturer} Manual, Page ${m.page_number}]: ${m.content_text}`),
    ...faultContext.map(f => `[Fault Code Reference]: ${f.content_text}`)
  ].join('\n\n');
  
  return `
MANUFACTURER MANUAL CONTEXT:
${context}

USER QUESTION: ${userMessage}
`;
}
```

---

## Prioritized Improvements

### 🔴 High Priority
1. **Process top 5 manufacturers' manuals first**
   - Worcester (582 PDFs) - Most common
   - Ideal (1,323 PDFs) - Most files
   - Baxi (291 PDFs)
   - Vaillant
   - Potterton (314 PDFs)

2. **Create embeddings for existing 60 chunks**
   - Quick win - infrastructure already exists

3. **Add RAG to chat endpoint**
   - Pass manufacturer context to LLM

### 🟡 Medium Priority
4. **Populate fault_code_manual_index**
   - Link fault codes to specific manual pages
   - Enables instant lookup

5. **Add search_vector for full-text search**
   - Fallback when embeddings don't match

6. **Create manual recommendation engine**
   - "For this fault code, download this manual: [link]"

### 🟢 Nice to Have
7. **OCR for scanned PDFs**
   - Some older manuals may be images

8. **Auto-extract fault code tables**
   - Many manuals have fault code appendices

9. **Multi-language support**
   - Some manuals in other languages

---

## Cost Estimates

### Embedding Creation (text-embedding-3-small)
- ~$0.02 per 1M tokens
- Estimated 50M tokens for all manuals = ~$1.00

### Storage
- Already included in Supabase plan

### LLM Queries with RAG
- Additional ~500 tokens context per query
- Minimal cost increase

---

## Next Steps

1. **Run this command to check if embedding creation works:**
   ```sql
   -- Test with a sample chunk
   UPDATE manual_content_intelligence 
   SET content_embedding = '[0.1, 0.2, ...]'::vector(1536)
   WHERE id = (SELECT id FROM manual_content_intelligence LIMIT 1);
   ```

2. **Create a processing Edge Function** to batch process PDFs

3. **Add RAG retrieval** to the chat endpoint

Would you like me to implement any of these phases?
