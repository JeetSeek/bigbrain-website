/**
 * LLM Data Source Monitor
 * Tracks and logs exactly where the LLM gets its diagnostic information from
 */

class LLMDataSourceMonitor {
  constructor() {
    this.requestId = 0;
    this.dataSourceLog = [];
  }

  /**
   * Start monitoring a new request
   */
  startRequest(message, sessionId) {
    this.requestId++;
    const request = {
      id: this.requestId,
      timestamp: new Date().toISOString(),
      message,
      sessionId,
      dataSources: [],
      systemPrompt: null,
      finalResponse: null
    };
    
    
    this.dataSourceLog.push(request);
    return this.requestId;
  }

  /**
   * Log when hybrid diagnostic system is called
   */
  logHybridDiagnosticCall(requestId, diagnosticContext) {
    const request = this.dataSourceLog.find(r => r.id === requestId);
    if (!request) return;

    console.log(`📊 [LLM Monitor] Diagnostic context:`, {
      faultCodes: diagnosticContext.faultCodes?.length || 0,
      components: diagnosticContext.components?.length || 0,
      symptoms: diagnosticContext.symptoms?.length || 0,
      procedures: diagnosticContext.procedures?.length || 0
    });

    request.dataSources.push({
      type: 'hybrid_diagnostic',
      source: 'enhanced_hybrid_service',
      data: {
        faultCodesFound: diagnosticContext.faultCodes?.length || 0,
        componentsFound: diagnosticContext.components?.length || 0,
        symptomsFound: diagnosticContext.symptoms?.length || 0,
        proceduresFound: diagnosticContext.procedures?.length || 0,
        faultCodeDetails: diagnosticContext.faultCodes || []
      }
    });
  }

  /**
   * Log when database queries are made
   */
  logDatabaseQuery(requestId, queryType, table, results) {
    const request = this.dataSourceLog.find(r => r.id === requestId);
    if (!request) return;


    request.dataSources.push({
      type: 'database_query',
      source: 'supabase',
      queryType,
      table,
      resultCount: results?.length || 0,
      data: results
    });
  }

  /**
   * Log when structured files are accessed
   */
  logStructuredFileAccess(requestId, fileName, dataType, results) {
    const request = this.dataSourceLog.find(r => r.id === requestId);
    if (!request) return;


    request.dataSources.push({
      type: 'structured_file',
      source: 'local_json',
      fileName,
      dataType,
      resultCount: results?.length || 0,
      data: results
    });
  }

  /**
   * Log when LLM training data is used (fallback)
   */
  logLLMTrainingDataFallback(requestId, reason) {
    const request = this.dataSourceLog.find(r => r.id === requestId);
    if (!request) return;


    request.dataSources.push({
      type: 'llm_training_data',
      source: 'openai_model',
      reason,
      warning: 'Using potentially inaccurate training data instead of structured knowledge'
    });
  }

  /**
   * Log the final system prompt sent to LLM
   */
  logSystemPrompt(requestId, systemPrompt) {
    const request = this.dataSourceLog.find(r => r.id === requestId);
    if (!request) return;

    
    // Check if prompt contains fault code specific information
    const containsFaultCodeInfo = systemPrompt.includes('FAULT CODE DATABASE INFO');
    const containsComponentInfo = systemPrompt.includes('COMPONENT INFO');
    const containsProcedureInfo = systemPrompt.includes('DIAGNOSTIC PROCEDURES');
    
    console.log(`   - Contains procedure info: ${containsProcedureInfo}`);

    request.systemPrompt = {
      length: systemPrompt.length,
      containsFaultCodeInfo,
      containsComponentInfo,
      containsProcedureInfo,
      preview: systemPrompt.substring(0, 200) + '...'
    };
  }

  /**
   * Log the final LLM response
   */
  logFinalResponse(requestId, response) {
    const request = this.dataSourceLog.find(r => r.id === requestId);
    if (!request) return;

    console.log(`📝 [LLM Monitor] Response preview: "${response.substring(0, 100)}..."`);

    request.finalResponse = {
      length: response.length,
      preview: response.substring(0, 200)
    };
  }

  /**
   * Generate comprehensive data source report
   */
  generateReport(requestId) {
    const request = this.dataSourceLog.find(r => r.id === requestId);
    if (!request) return null;

    console.log(`📈 Data Sources Used: ${request.dataSources.length}`);
    
    if (request.dataSources.length === 0) {
    }

    request.dataSources.forEach((source, index) => {
      console.log(`\n   ${index + 1}. ${source.type.toUpperCase()}`);
      if (source.resultCount !== undefined) {
      }
      if (source.reason) {
      }
      if (source.warning) {
      }
    });

    if (request.systemPrompt) {
      console.log(`   Has component info: ${request.systemPrompt.containsComponentInfo}`);
    }


    return request;
  }

  /**
   * Get the latest request for debugging
   */
  getLatestRequest() {
    return this.dataSourceLog[this.dataSourceLog.length - 1];
  }
}

export default LLMDataSourceMonitor;
