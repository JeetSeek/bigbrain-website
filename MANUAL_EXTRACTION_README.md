# Manual Intelligence Extraction Project

## 🎯 Project Goal

Extract comprehensive intelligence from 5,670+ boiler PDF manuals to enable AI-powered diagnostics with accurate, manufacturer-specific information.

---

## 📋 What We're Trying to Achieve

### Primary Objectives

1. **Extract GC Numbers** from PDFs
   - Gas Council numbers uniquely identify boiler models
   - Link manuals to specific boiler versions
   - Enable exact manual matching in chat

2. **Extract Model Information**
   - Model names (e.g., "Logic 24", "Greenstar 30")
   - Boiler types (combi, system, regular)
   - Output ratings (kW)

3. **Extract Fault Code Information**
   - Fault code definitions from manuals
   - Diagnostic procedures
   - Troubleshooting steps
   - Page numbers for reference

4. **Create Searchable Content**
   - Chunk PDFs into searchable sections
   - Enable semantic search with AI embeddings
   - Link content to fault codes

---

## 🗄️ Database Schema

### Tables Created

#### 1. `manual_intelligence`
Main table storing processed manual metadata
- Manufacturer, model, GC numbers
- Page count, processing status
- PDF URL reference

#### 2. `manual_content_intelligence`
Searchable content chunks from manuals
- Text content (1000 char chunks)
- Page numbers
- AI embeddings (vector) for semantic search
- Mentioned fault codes

#### 3. `gc_number_registry`
GC number to manual mappings
- GC number → Manual ID
- Model details
- Extraction confidence

#### 4. `fault_code_manual_index`
Links fault codes to manual sections
- Fault code → Content chunks
- Page numbers
- Relevance scores

---

## 🔧 Technical Approach

### Phase 1: PDF Processing
1. Download PDF from Supabase Storage
2. Parse with `pdf-parse` library
3. Extract text content

### Phase 2: Information Extraction
1. **GC Numbers**: Regex patterns for "GC No. XX XXX XX"
2. **Models**: Filename + text pattern matching
3. **Fault Codes**: Pattern matching for "L2", "E9", etc.
4. **Chunking**: Split text into 1000-char searchable chunks

### Phase 3: AI Enhancement
1. Create embeddings with OpenAI (text-embedding-3-small)
2. Store vectors in Supabase (pgvector)
3. Enable semantic search

### Phase 4: Chat Integration
1. User asks: "Ideal Logic 24 L2"
2. System finds GC number for Logic 24
3. Searches manual content for L2 fault
4. Returns exact manual excerpt with page number
5. Provides PDF download link

---

## 📊 Expected Results

### Before (Current State)
```
User: "Ideal Logic 24 L2"
AI: "L2 indicates ignition lockout. Check gas supply..."
```
Generic response, no manual reference

### After (With Manual Intelligence)
```
User: "Ideal Logic 24 L2"
AI: "According to Ideal Logic+ Manual (GC: 47 348 91, Page 42):

'Fault L2 - Ignition Lockout
The boiler has failed to ignite after 3 attempts.

Diagnostic Steps:
1. Check gas pressure at test point (20mbar ±1)
2. Inspect electrode gap (3-4mm)
3. Check electrode lead continuity (<1Ω)
4. Clean condensate trap
5. Check flue terminal

If fault persists, check PCB (Part: 173534)'

📄 Download Manual: [Ideal Logic+ Installation Guide](url)
```
Specific, accurate, with manual citations!

---

## 🎯 Success Criteria

### Must Have
- ✅ Extract GC numbers from 80%+ of manuals
- ✅ Link GC numbers to manuals in database
- ✅ Extract fault code sections
- ✅ Create searchable content chunks

### Should Have
- ✅ Extract model names from 70%+ of manuals
- ✅ Identify fault code pages
- ✅ AI embeddings for semantic search

### Nice to Have
- Extract boiler specifications
- Extract wiring diagrams references
- Extract part numbers

---

## 📈 Current Progress

### Completed
- ✅ Database schema created
- ✅ PDF extraction service built
- ✅ GC number extraction working
- ✅ Content chunking working
- ✅ Processing script created

### Results from Test (10 manuals)
- **GC Numbers**: 2 unique found (24135 10, 24135 14)
- **Content Chunks**: 60 created
- **Pages Processed**: 178
- **Success Rate**: 40% (4/10 manuals had full content)

### Issues Identified
- Model name extraction needs improvement
- Some PDFs not chunking properly
- Need better pattern matching for different manual formats

---

## 🚀 Next Steps (For New Project)

### 1. Improve Extraction Patterns
- Test with 50+ manuals from different manufacturers
- Refine GC number patterns
- Better model name extraction
- Handle different PDF formats

### 2. Add Manual Sources
- Scrape freeboilermanuals.com (50+ manufacturers)
- Download and process systematically
- Verify GC numbers against manufacturer data

### 3. Build RAG System
- Process all 5,670 manuals
- Create embeddings ($3-5 one-time cost)
- Build semantic search API
- Integrate with chat

### 4. Quality Assurance
- Verify GC number accuracy
- Test fault code matching
- Validate manual citations
- User testing with engineers

---

## 💰 Cost Estimate

### One-Time Costs
- **PDF Processing**: FREE (pdf-parse)
- **Embeddings**: 5,670 manuals × 50 pages × 500 tokens = 142M tokens
  - Cost: 142M × $0.00002 = **$2.84**
- **Storage**: 10GB PDFs + 500MB vectors = **$2.50/month**

### Ongoing Costs
- **Query embeddings**: ~$0.001 per chat
- **Database queries**: FREE (Supabase free tier)
- **Total monthly**: **~$3-5**

---

## 🔍 Technical Stack

### Current Implementation
- **Language**: Node.js (ES6 modules)
- **PDF Parser**: pdf-parse
- **Database**: Supabase PostgreSQL + pgvector
- **AI**: OpenAI text-embedding-3-small
- **Storage**: Supabase Storage (5,670 PDFs)

### Files Created
```
server/
├── services/
│   └── PDFIntelligenceExtractor.js    # PDF processing service
├── scripts/
│   ├── processExistingManuals.js      # Batch processor
│   └── checkExtractionResults.js      # Results viewer
└── supabaseClient.js                  # Database connection
```

### Database Tables
```
manual_intelligence              # Main metadata table
manual_content_intelligence      # Searchable content chunks
gc_number_registry              # GC number mappings
fault_code_manual_index         # Fault code → manual links
```

---

## 📝 Lessons Learned

### What Worked
1. ✅ GC number extraction with regex patterns
2. ✅ Content chunking for searchability
3. ✅ Database schema design
4. ✅ Batch processing approach

### What Needs Improvement
1. ❌ Model name extraction (too many NULLs)
2. ❌ Inconsistent PDF formats
3. ❌ Some PDFs don't chunk properly
4. ❌ Need better error handling

### Recommendations
1. **Test with diverse manufacturers** before processing all
2. **Manual verification** of first 100 extractions
3. **Iterative refinement** of extraction patterns
4. **Separate project** for data collection vs. production use

---

## 🎓 How to Use This in New Project

### 1. Copy Database Schema
Use the migration files to create tables in new project

### 2. Improve Extraction Service
- Test with 100 manuals from 10 manufacturers
- Refine patterns based on results
- Add manufacturer-specific handling

### 3. Build Data Pipeline
- Download manuals systematically
- Process in batches of 100
- Verify quality at each step
- Build confidence before full run

### 4. Integrate with Chat
- Search by GC number
- Semantic search for fault codes
- Return manual excerpts with citations
- Provide PDF download links

---

## 📞 Support & References

### Key Patterns

**GC Number Extraction:**
```javascript
/GC\s*(?:No\.?|Number)?\s*:?\s*([\d\s]+[A-Z]?)/gi
```

**Fault Code Extraction:**
```javascript
/(?:fault|error)\s*code\s*([A-Z]\d{1,2})/gi
```

**Model Extraction:**
```javascript
/DELTA[_\s]+([A-Z0-9_\s]+?)(?:_COMBI|_installation)/i
/(Logic|Greenstar|ecoTEC)\s*\+?\s*\d+/gi
```

### Database Queries

**Search by GC Number:**
```sql
SELECT * FROM manual_intelligence 
WHERE primary_gc_number = '47 348 91';
```

**Find Fault Code in Manuals:**
```sql
SELECT mi.*, mci.content_text, mci.page_number
FROM manual_content_intelligence mci
JOIN manual_intelligence mi ON mci.manual_id = mi.id
WHERE 'L2' = ANY(mci.fault_codes_mentioned);
```

---

## ✅ Conclusion

This project has proven the concept works:
- GC numbers CAN be extracted from PDFs
- Content CAN be made searchable
- Manual citations CAN be provided to AI

**Next step:** Build a dedicated data extraction project with:
1. Better extraction patterns
2. Quality verification
3. Systematic processing
4. Production-ready pipeline

**Goal:** Enable BoilerBrain to provide manufacturer-specific diagnostics with exact manual references and GC number matching.

---

**Created:** October 1, 2025  
**Status:** Proof of Concept Complete  
**Next:** Build Production Data Pipeline
