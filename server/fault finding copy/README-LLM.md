# LLM Integration for Heating System Fault Finding Database

This document provides technical implementation details for integrating the heating system fault finding guides with Large Language Models (LLMs) using vector embeddings and structured data relationships.

## Database Architecture

### 1. Schema Design

The database uses a hybrid approach combining vector embeddings for semantic search with structured relationships for precise querying:

#### Core Tables Structure

```sql
-- Components table
CREATE TABLE components (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    component_type TEXT NOT NULL,
    description TEXT NOT NULL,
    applies_to TEXT[] NOT NULL,
    function TEXT NOT NULL,
    embedding VECTOR(1536)  -- OpenAI embedding dimension
);

-- Symptoms table
CREATE TABLE symptoms (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    embedding VECTOR(1536)
);

-- Faults table
CREATE TABLE faults (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    component_id UUID REFERENCES components(id),
    embedding VECTOR(1536)
);

-- Procedures table
CREATE TABLE procedures (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    purpose TEXT NOT NULL,
    equipment_needed TEXT[] NOT NULL,
    steps JSONB NOT NULL,
    interpretation JSONB NOT NULL,
    embedding VECTOR(1536)
);

-- Relationships table
CREATE TABLE relationships (
    id UUID PRIMARY KEY,
    from_type TEXT NOT NULL,
    from_id UUID NOT NULL,
    relationship_type TEXT NOT NULL,
    to_type TEXT NOT NULL,
    to_id UUID NOT NULL,
    strength TEXT NOT NULL,
    conditions TEXT[] 
);

-- Document chunks table
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY,
    document_name TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB NOT NULL,
    embedding VECTOR(1536)
);
```

### 2. Vector Embedding Implementation

#### Content Chunking Strategy

Each document should be chunked into semantic units:

1. **Size**: 512-1024 tokens per chunk (balancing detail and context)
2. **Overlap**: 50-100 tokens of overlap between chunks for context continuity
3. **Semantic Boundaries**: Prioritize chunking at section/subsection boundaries

```python
def chunk_document(document_path, chunk_size=800, overlap=100):
    """
    Chunk a markdown document into semantic sections with overlap
    """
    with open(document_path, 'r') as f:
        content = f.read()
    
    # Split by markdown headers to maintain semantic sections
    sections = re.split(r'(#{1,6}\s+.*?)\n', content)
    
    chunks = []
    current_chunk = ""
    current_size = 0
    
    for i in range(0, len(sections), 2):
        if i+1 < len(sections):
            # Combine header with its content
            section = sections[i] + sections[i+1]
            section_size = len(section.split())
            
            if current_size + section_size <= chunk_size:
                # Add to current chunk
                current_chunk += section
                current_size += section_size
            else:
                # Store current chunk and start new one with overlap
                chunks.append(current_chunk)
                
                # Create overlap by finding a good boundary
                overlap_text = get_overlap_text(current_chunk, overlap)
                current_chunk = overlap_text + section
                current_size = len(current_chunk.split())
        else:
            # Handle trailing section
            current_chunk += sections[i]
    
    # Add final chunk
    if current_chunk:
        chunks.append(current_chunk)
    
    return chunks
```

#### Embedding Generation

Using OpenAI's text-embedding-3-small model (or equivalent):

```python
import openai
from supabase import create_client

# Initialize clients
openai.api_key = "your-openai-key"
supabase = create_client(
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY
)

async def generate_embeddings(chunks, document_name):
    """
    Generate embeddings for document chunks and store in Supabase
    """
    for i, chunk in enumerate(chunks):
        # Generate embedding
        response = await openai.embeddings.create(
            model="text-embedding-3-small",
            input=chunk
        )
        embedding = response.data[0].embedding
        
        # Extract metadata
        metadata = extract_metadata(chunk)
        
        # Store in Supabase
        supabase.table("document_chunks").insert({
            "document_name": document_name,
            "chunk_index": i,
            "content": chunk,
            "metadata": metadata,
            "embedding": embedding
        }).execute()
```

### 3. Relationship Mapping

Establish explicit connections between entities:

```python
def create_relationships(from_entity, relationship_type, to_entity, strength="medium", conditions=None):
    """
    Create relationship between two entities
    """
    supabase.table("relationships").insert({
        "from_type": from_entity["type"],
        "from_id": from_entity["id"],
        "relationship_type": relationship_type,
        "to_type": to_entity["type"],
        "to_id": to_entity["id"],
        "strength": strength,
        "conditions": conditions or []
    }).execute()
```

## Query Processing System

### 1. Query Understanding

Parse user queries to identify:
- Query type (diagnostic, informational, procedural)
- Relevant entities (components, symptoms, procedures)
- Contextual constraints (system type, age, conditions)

```python
def process_query(user_query):
    """
    Process a user query to extract intent and entities
    """
    # Use LLM to classify query and extract entities
    classification_prompt = f"""
    Analyze this query about heating systems: "{user_query}"
    
    1. Query type (choose one): diagnostic, informational, procedural
    2. Mentioned components: [list all heating components mentioned]
    3. Mentioned symptoms: [list all symptoms/problems mentioned]
    4. System constraints: [list any system types, conditions, or limitations mentioned]
    5. Expected response type: [troubleshooting steps, component information, test procedure, etc.]
    
    Format as JSON.
    """
    
    response = openai.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": classification_prompt}],
        response_format={"type": "json_object"}
    )
    
    query_analysis = json.loads(response.choices[0].message.content)
    return query_analysis
```

### 2. Retrieval Strategy

Different retrieval approaches based on query type:

#### Diagnostic Queries

```python
async def retrieve_for_diagnostic(symptom, components=None, system_type=None):
    """
    Retrieve information for diagnostic queries
    """
    # 1. Generate embedding for symptom
    symptom_embedding = await generate_embedding(symptom)
    
    # 2. Find matching symptoms with vector search
    symptom_results = supabase.rpc(
        "match_symptoms",
        {
            "query_embedding": symptom_embedding,
            "match_threshold": 0.78,
            "match_count": 5
        }
    ).execute()
    
    # 3. Find related faults through relationships
    symptom_ids = [s["id"] for s in symptom_results.data]
    fault_relationships = supabase.table("relationships").select("to_id").eq("from_type", "symptom").in_("from_id", symptom_ids).eq("to_type", "fault").execute()
    
    # 4. Get detailed fault and component information
    fault_ids = [r["to_id"] for r in fault_relationships.data]
    
    # 5. Apply component and system type filters if provided
    query = supabase.table("faults").select("*").in_("id", fault_ids)
    if components:
        related_component_ids = get_component_ids(components)
        query = query.in_("component_id", related_component_ids)
    
    faults = query.execute()
    
    # 6. Get relevant procedural information
    procedures = get_relevant_procedures(fault_ids)
    
    # 7. Get supporting document chunks
    supporting_chunks = get_supporting_document_chunks(symptom, components)
    
    return {
        "symptoms": symptom_results.data,
        "faults": faults.data,
        "procedures": procedures,
        "supporting_content": supporting_chunks
    }
```

#### Informational Queries

```python
async def retrieve_for_informational(component_name=None, topic=None):
    """
    Retrieve information for general information queries
    """
    if component_name:
        # Retrieve component information
        component_embedding = await generate_embedding(component_name)
        components = supabase.rpc(
            "match_components",
            {
                "query_embedding": component_embedding,
                "match_threshold": 0.75,
                "match_count": 2
            }
        ).execute()
        
        # Get related document chunks
        component_chunks = get_component_document_chunks(components.data[0]["id"])
        
        return {
            "component_info": components.data,
            "supporting_content": component_chunks
        }
    
    if topic:
        # Search across all document chunks
        topic_embedding = await generate_embedding(topic)
        relevant_chunks = supabase.rpc(
            "match_documents",
            {
                "query_embedding": topic_embedding,
                "match_threshold": 0.70,
                "match_count": 8
            }
        ).execute()
        
        return {
            "topic_information": relevant_chunks.data
        }
```

### 3. Response Generation

Generate structured responses using LLM:

```python
async def generate_response(query_analysis, retrieved_data):
    """
    Generate a structured response using the LLM
    """
    # Prepare context from retrieved data
    context = format_retrieval_context(retrieved_data)
    
    response_prompt = f"""
    Query: {query_analysis["original_query"]}
    
    Query Analysis: {json.dumps(query_analysis)}
    
    Retrieved Information:
    {context}
    
    Based on the above information from our heating system fault finding database, provide a helpful and accurate response.
    
    If diagnosing a problem:
    1. List the most likely causes based on symptoms
    2. Provide specific diagnostic steps in order of priority
    3. Explain how to confirm the exact fault
    4. Describe resolution approaches
    
    If explaining a component or procedure:
    1. Provide a clear definition/explanation
    2. Include technical specifications if relevant
    3. Describe related components or systems
    4. Cover common issues or maintenance requirements
    
    Only include information supported by the retrieved data. If essential information is missing, indicate what additional details would help provide a more complete answer.
    """
    
    # Call LLM for response generation
    response = openai.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": response_prompt}]
    )
    
    return response.choices[0].message.content
```

## Supabase Implementation

### 1. Vector Search Functions

Create PostgreSQL functions for vector search:

```sql
-- Create vector similarity search function
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding VECTOR(1536),
    match_threshold FLOAT,
    match_count INT
)
RETURNS TABLE (
    id UUID,
    document_name TEXT,
    chunk_index INT,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        document_chunks.id,
        document_chunks.document_name,
        document_chunks.chunk_index,
        document_chunks.content,
        document_chunks.metadata,
        1 - (document_chunks.embedding <=> query_embedding) AS similarity
    FROM document_chunks
    WHERE 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;

-- Create similar functions for other entity types
CREATE OR REPLACE FUNCTION match_components(
    query_embedding VECTOR(1536),
    match_threshold FLOAT,
    match_count INT
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    component_type TEXT,
    description TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        components.id,
        components.name,
        components.component_type,
        components.description,
        1 - (components.embedding <=> query_embedding) AS similarity
    FROM components
    WHERE 1 - (components.embedding <=> query_embedding) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;
```

### 2. Data Ingestion Pipeline

Process for ingesting documents into the database:

```javascript
// Example Node.js ingestion script

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { Configuration, OpenAIApi } = require('openai');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');

dotenv.config();

// Initialize clients
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

async function processDocuments() {
    const docsDir = '/Users/markburrows/Desktop/fault finding/';
    const files = fs.readdirSync(docsDir).filter(file => file.endsWith('.md') && file !== 'README.md' && file !== 'README-LLM.md');
    
    for (const file of files) {
        console.log(`Processing ${file}...`);
        const filePath = path.join(docsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Extract metadata
        const metadata = extractMetadata(content, file);
        
        // Chunk the document
        const chunks = chunkDocument(content);
        
        // Process each chunk
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            
            // Generate embedding
            const embeddingResponse = await openai.createEmbedding({
                model: "text-embedding-3-small",
                input: chunk,
            });
            const embedding = embeddingResponse.data.data[0].embedding;
            
            // Store in Supabase
            await supabase.from('document_chunks').insert({
                id: uuidv4(),
                document_name: file.replace('.md', ''),
                chunk_index: i,
                content: chunk,
                metadata: {
                    ...metadata,
                    chunk_type: getChunkType(chunk),
                    entities: extractEntities(chunk)
                },
                embedding: embedding
            });
            
            console.log(`Stored chunk ${i+1}/${chunks.length} for ${file}`);
            
            // Respect rate limits
            await new Promise(r => setTimeout(r, 200));
        }
    }
}

function extractMetadata(content, filename) {
    // Extract system type, component type, etc.
    // This is a simplified example
    const systemTypes = ['condensing_boiler', 'non_condensing_boiler', 'underfloor_heating', 'radiator_system', 'open_vent', 'sealed_system'];
    
    const metadata = {
        document_type: getDocumentType(filename),
        system_types: systemTypes.filter(type => content.toLowerCase().includes(type.replace('_', ' '))),
        contains_procedures: content.includes('Diagnostic Procedures:'),
        contains_symptoms: content.includes('Symptoms:'),
        contains_reference: content.includes('Reference') || content.includes('Table')
    };
    
    return metadata;
}

// Additional helper functions for chunking, entity extraction, etc.
```

## Integration with LLM Application

### 1. Client-Side Implementation

Example React component for querying the fault finding database:

```jsx
import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function FaultFindingAssistant() {
    const [query, setQuery] = useState('');
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);
    
    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        
        try {
            // Process query via API
            const result = await axios.post('/api/fault-finding/query', { query });
            setResponse(result.data.response);
        } catch (error) {
            console.error('Error querying fault-finding database:', error);
            setResponse('Error processing your query. Please try again.');
        } finally {
            setLoading(false);
        }
    }
    
    return (
        <div className="fault-finding-assistant">
            <h2>Heating System Fault Finding Assistant</h2>
            
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Describe the heating system problem or ask a question..."
                    className="query-input"
                />
                <button type="submit" disabled={loading || !query}>
                    {loading ? 'Processing...' : 'Submit'}
                </button>
            </form>
            
            {response && (
                <div className="response-container">
                    <h3>Diagnostic Response:</h3>
                    <div className="response-content">
                        {response.split('\n').map((line, i) => (
                            <p key={i}>{line}</p>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default FaultFindingAssistant;
```

### 2. Server-Side API

Example Node.js API endpoint for handling queries:

```javascript
// api/fault-finding/query.js
import { createClient } from '@supabase/supabase-js';
import { Configuration, OpenAIApi } from 'openai';

// Initialize clients
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { query } = req.body;
        
        // 1. Analyze query
        const queryAnalysis = await analyzeQuery(query);
        
        // 2. Retrieve relevant information
        const retrievedData = await retrieveInformation(queryAnalysis, query);
        
        // 3. Generate response
        const response = await generateResponse(query, queryAnalysis, retrievedData);
        
        return res.status(200).json({ response });
    } catch (error) {
        console.error('Error processing fault finding query:', error);
        return res.status(500).json({ error: 'Error processing your request' });
    }
}

async function analyzeQuery(query) {
    // Similar to the process_query function above
    // ...
}

async function retrieveInformation(queryAnalysis, originalQuery) {
    // Implement retrieval based on query type
    // ...
}

async function generateResponse(query, queryAnalysis, retrievedData) {
    // Generate the final response using LLM
    // ...
}
```

## Performance Optimization

### 1. Caching Strategy

Implement caching for common queries:

```javascript
// Simple in-memory cache
const queryCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function getCachedResponse(query) {
    const normalizedQuery = normalizeQuery(query);
    const cachedItem = queryCache.get(normalizedQuery);
    
    if (cachedItem && (Date.now() - cachedItem.timestamp) < CACHE_TTL) {
        return cachedItem.response;
    }
    
    return null;
}

function cacheResponse(query, response) {
    const normalizedQuery = normalizeQuery(query);
    queryCache.set(normalizedQuery, {
        response,
        timestamp: Date.now()
    });
}

function normalizeQuery(query) {
    // Normalize query to increase cache hits
    return query.toLowerCase().trim().replace(/\s+/g, ' ');
}
```

### 2. Batch Processing

For document ingestion:

```javascript
async function batchProcessDocuments(documents, batchSize = 5) {
    for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        await Promise.all(batch.map(doc => processDocument(doc)));
        console.log(`Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(documents.length/batchSize)}`);
    }
}
```

## Maintenance and Updates

### 1. Regular Reindexing

Schedule periodic reindexing of documents:

```javascript
// Update embeddings for all documents
async function updateAllEmbeddings() {
    const { data: chunks } = await supabase
        .from('document_chunks')
        .select('id, content');
    
    console.log(`Updating embeddings for ${chunks.length} chunks...`);
    
    const batchSize = 10;
    for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        await Promise.all(batch.map(async (chunk) => {
            const embeddingResponse = await openai.createEmbedding({
                model: "text-embedding-3-small",
                input: chunk.content,
            });
            const embedding = embeddingResponse.data.data[0].embedding;
            
            await supabase
                .from('document_chunks')
                .update({ embedding })
                .eq('id', chunk.id);
        }));
        
        console.log(`Updated batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(chunks.length/batchSize)}`);
        await new Promise(r => setTimeout(r, 500)); // Respect rate limits
    }
}
```

### 2. Content Refresh

Process for adding new documents:

```javascript
async function addNewDocument(filePath) {
    // Check if document already exists
    const documentName = path.basename(filePath, '.md');
    const { data: existingChunks } = await supabase
        .from('document_chunks')
        .select('id')
        .eq('document_name', documentName);
    
    if (existingChunks && existingChunks.length > 0) {
        // Delete existing chunks
        await supabase
            .from('document_chunks')
            .delete()
            .eq('document_name', documentName);
        
        console.log(`Deleted ${existingChunks.length} existing chunks for ${documentName}`);
    }
    
    // Process the new document
    // (reuse document processing code from earlier)
}
```

## Monitoring and Analytics

Track query performance and user interactions:

```javascript
async function logQuery(query, retrievalStats, responseTime, userId = 'anonymous') {
    await supabase.from('query_logs').insert({
        query_text: query,
        user_id: userId,
        timestamp: new Date().toISOString(),
        retrieval_stats: retrievalStats,
        response_time_ms: responseTime,
        embedding_model: 'text-embedding-3-small',
        llm_model: 'gpt-4'
    });
}

// Use in API handler
const startTime = Date.now();
// ... process query ...
const retrieval = await retrieveInformation(queryAnalysis, query);
// ... generate response ...
const endTime = Date.now();
await logQuery(query, {
    chunks_retrieved: retrieval.chunks.length,
    top_similarity: retrieval.chunks[0]?.similarity || 0,
    query_type: queryAnalysis.query_type
}, endTime - startTime, req.user?.id);
```

## Conclusion

This implementation provides a robust framework for integrating the heating system fault finding guides with Large Language Models using Supabase and vector embeddings. The system allows for both semantic searching and structured relationship queries, providing comprehensive answers to diagnostic and informational queries about heating systems.

For optimal results:

1. Regularly update the database as new documentation is created
2. Monitor query patterns to identify gaps in content
3. Refine embeddings and chunking strategies based on performance
4. Consider implementing user feedback mechanisms to improve accuracy
5. Periodically review and update relationship mappings between entities

By following this implementation guide, you can create a powerful LLM-based assistant for heating system diagnostics that leverages your comprehensive documentation to provide accurate, contextual troubleshooting assistance.
