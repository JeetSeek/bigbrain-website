# BoilerBrain LLM Implementation Guide

## Overview

BoilerBrain is a diagnostic assistant that leverages large language models (LLMs) to help heating engineers troubleshoot and diagnose boiler issues. This document provides an overview of the current LLM implementation, training data sources, RAG (Retrieval Augmented Generation) pipeline, and potential areas for improvement.

## Current LLM Implementation

### Model Selection
- Primary: `gpt-4o-mini` from OpenAI
- Backup: `deepseek-chat` from DeepSeek
- Embeddings: `text-embedding-ada-002` from OpenAI

### System Prompting Strategy

The system employs a well-defined persona for the BoilerBrain assistant with the following characteristics:

```
You are BoilerBrain, an expert-level diagnostic assistant for professional gas heating engineers.
Be clear, efficient, and direct—never patronise. Your role is to help engineers solve real faults quickly and compliantly.
Always assume the user is a competent heating engineer. You're the engineer's second set of eyes on-site.

IMPORTANT MEMORY INSTRUCTIONS:
1. Pay careful attention to the CURRENT boiler manufacturer and model mentioned by the user
2. The user may change the boiler make or model during the conversation - always update your understanding
3. If the user says they have a different boiler than previously mentioned, acknowledge the change
4. Always get both the manufacturer AND model before providing specific troubleshooting advice
5. Maintain context of the entire conversation and refer back to earlier information when relevant
```

### Configuration Parameters
- Temperature: 0.4 (balanced between deterministic and creative responses)
- Max Tokens: 350 (limits response length)
- Conversation Summary Length: 12 turns (after which the conversation is summarized to manage context window)

## Knowledge Sources & RAG Implementation

### Static Knowledge Base
The application maintains a static knowledge base in `boilerKnowledgeService.js` with structured information about:
1. Fault codes by manufacturer (Worcester Bosch, Vaillant, Baxi, Ideal)
2. Common symptoms and troubleshooting steps
3. Safety warnings for specific scenarios

### Vector Search Implementation
The application uses a vector-based similarity search for retrieving relevant information:
- Similarity Threshold: 0.75 (configurable)
- Maximum Knowledge Snippets: 5 per query

### Data Extraction Patterns
The system uses regular expressions to extract key information from user messages:
- Manufacturer identification
- Model identification
- Fault codes
- Safety concerns
- Heating system types
- System components

## Client-side Engineering Chat Service

The frontend implements an `engineerChatService.js` that:
1. Maintains conversation context between messages
2. Tracks user sentiment and conversation flow
3. Extracts boiler information from messages
4. Generates responses with authentic engineer phrasing
5. Diagnoses boiler issues based on symptoms and fault codes

## Function Calling Capabilities

The LLM is configured with structured function declarations for:
1. Retrieving fault code information (`getFaultCodeInfo`)
2. Getting symptom information (`getSymptomInfo`)
3. Retrieving safety warnings (`getSafetyWarning`)
4. Getting maintenance advice (`getMaintenanceAdvice`)

## Areas for Improvement

### RAG Enhancement Opportunities
1. **Dynamic Knowledge Updating**: Implement a mechanism for engineers to contribute new knowledge that automatically updates the vector database
2. **Hybrid Retrieval**: Combine keyword and semantic search for more accurate knowledge retrieval
3. **Expanded Knowledge Base**: Include more manufacturers, models, and specialized fault codes
4. **Contextual Memory**: Improve the conversation summarization logic to retain more critical details

### LLM Implementation Improvements
1. **Fine-tuning**: Consider fine-tuning models on domain-specific boiler repair data
2. **Multi-modal Support**: Add capability for processing images of boilers, fault displays, etc.
3. **Enhanced Entity Recognition**: Replace regex patterns with more robust NER models for better information extraction
4. **Streaming Responses**: Implement streaming for faster perceived response time
5. **Caching Mechanism**: Cache common queries and responses for improved performance

### Technical Debt
1. **Test Coverage**: The RAG validation tests are currently failing and need to be fixed or properly mocked
2. **API Key Management**: Consider implementing a more secure key rotation mechanism
3. **Error Handling**: More robust error handling and fallback mechanisms when model calls fail

## Suggested Next Steps

1. Fix the failing RAG validation tests to ensure proper functionality
2. Expand the test coverage for the entire RAG pipeline
3. Implement analytics to track which knowledge sources are most useful
4. Consider fine-tuning a smaller open-source model for cost efficiency
5. Create a feedback loop system for continuous improvement of responses

---

This document provides a high-level overview of BoilerBrain's current LLM implementation. The combination of structured knowledge, vector search, and LLM capabilities creates a powerful diagnostic assistant for heating engineers. With the suggested improvements, BoilerBrain could further enhance its accuracy, efficiency, and user experience.
