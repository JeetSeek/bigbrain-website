/**
 * Knowledge Ingestion Service
 * Automatically discovers, analyzes, and stores reliable diagnostic knowledge
 * from web sources, manufacturer websites, and video content
 */

import { createClient } from '@supabase/supabase-js';
import MCPIntegrationService from './MCPIntegrationService.js';
import EnhancedContentExtractionService from './EnhancedContentExtractionService.js';

class KnowledgeIngestionService {
    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        );
        // Initialize MCP service with lazy loading to prevent blocking
        this.mcpService = new MCPIntegrationService();
        
        // Initialize enhanced content extraction service
        this.enhancedExtractor = new EnhancedContentExtractionService();
        
        this.reliabilityThresholds = {
            high: 80,
            medium: 60,
            low: 40
        };
        
        this.trustedSources = [
            'gassaferegister.co.uk',
            'idealheating.com',
            'vaillant.co.uk',
            'worcesterbosch.co.uk',
            'baxi.co.uk',
            'viessmann.co.uk',
            'ariston.com',
            'glow-worm.co.uk',
            'alpha-innovation.co.uk'
        ];
    }

    /**
     * Analyze and score content reliability
     */
    analyzeContentReliability(content, sourceUrl, sourceType) {
        let score = 0;
        const analysis = {
            factors: [],
            warnings: [],
            confidence: 'pending'
        };
        
        // Source credibility scoring
        const domain = this.extractDomain(sourceUrl);
        if (this.trustedSources.includes(domain)) {
            score += 40;
            analysis.factors.push('Trusted manufacturer/official source');
        } else if (domain.includes('gov.uk') || domain.includes('.gov')) {
            score += 50;
            analysis.factors.push('Government/regulatory source');
        } else if (domain.includes('training') || domain.includes('education')) {
            score += 20;
            analysis.factors.push('Educational source');
        }
        
        // Content type scoring
        if (sourceType === 'manufacturer_website') {
            score += 30;
            analysis.factors.push('Official manufacturer documentation');
        } else if (sourceType === 'service_bulletin') {
            score += 35;
            analysis.factors.push('Technical service bulletin');
        } else if (sourceType === 'youtube') {
            score += 10;
            analysis.factors.push('Video content (requires verification)');
        }
        
        // Content quality indicators
        const qualityIndicators = [
            { pattern: /gas safe/gi, score: 15, description: 'Gas Safe compliance mentioned' },
            { pattern: /safety.*(?:warning|procedure|isolation)/gi, score: 10, description: 'Safety procedures included' },
            { pattern: /step.*\d+/gi, score: 10, description: 'Structured step-by-step procedure' },
            { pattern: /multimeter|manometer|pressure.*gauge/gi, score: 8, description: 'Professional tools mentioned' },
            { pattern: /\d+.*(?:mbar|volt|ohm|amp)/gi, score: 12, description: 'Technical specifications included' },
            { pattern: /service.*manual|technical.*bulletin/gi, score: 15, description: 'Official documentation reference' }
        ];
        
        qualityIndicators.forEach(indicator => {
            if (indicator.pattern.test(content)) {
                score += indicator.score;
                analysis.factors.push(indicator.description);
            }
        });
        
        // Content warning indicators
        const warningIndicators = [
            { pattern: /diy|amateur|quick.*fix/gi, description: 'DIY/amateur content warning' },
            { pattern: /not.*qualified|unlicensed/gi, description: 'Unqualified source warning' },
            { pattern: /bypass.*safety|skip.*step/gi, description: 'Safety bypass warning' }
        ];
        
        warningIndicators.forEach(indicator => {
            if (indicator.pattern.test(content)) {
                score -= 20;
                analysis.warnings.push(indicator.description);
            }
        });
        
        // Determine confidence level
        if (score >= this.reliabilityThresholds.high) {
            analysis.confidence = 'high';
        } else if (score >= this.reliabilityThresholds.medium) {
            analysis.confidence = 'medium';
        } else if (score >= this.reliabilityThresholds.low) {
            analysis.confidence = 'low';
        } else {
            analysis.confidence = 'very_low';
        }
        
        return {
            score: Math.max(0, Math.min(100, score)),
            analysis
        };
    }

    /**
     * Extract diagnostic knowledge from content
     */
    extractDiagnosticKnowledge(content, faultCode, manufacturer) {
        const knowledge = [];
        
        // Extract diagnostic procedures
        const procedurePatterns = [
            /(?:step \d+|procedure|method)[\s:]+([^.!?]+[.!?])/gi,
            /(?:check|test|verify|inspect)[\s]+([^.!?]+[.!?])/gi,
            /(?:diagnostic|troubleshoot)[\s]+([^.!?]+[.!?])/gi
        ];
        
        procedurePatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                knowledge.push({
                    type: 'diagnostic_procedure',
                    content: match[1].trim(),
                    faultCode,
                    manufacturer
                });
            }
        });
        
        // Extract fault descriptions
        const faultPattern = new RegExp(`${faultCode}[\\s:]+([^.!?]+[.!?])`, 'gi');
        let faultMatch;
        while ((faultMatch = faultPattern.exec(content)) !== null) {
            knowledge.push({
                type: 'fault_description',
                content: faultMatch[1].trim(),
                faultCode,
                manufacturer
            });
        }
        
        // Extract safety warnings
        const safetyPattern = /(safety|warning|caution|danger)[^.!?]*[.!?]/gi;
        let safetyMatch;
        while ((safetyMatch = safetyPattern.exec(content)) !== null) {
            knowledge.push({
                type: 'safety_warning',
                content: safetyMatch[0].trim(),
                faultCode,
                manufacturer
            });
        }
        
        // Extract tool requirements
        const toolPattern = /(multimeter|manometer|gas.*analyzer|pressure.*gauge|screwdriver|spanner)[^.!?]*[.!?]/gi;
        let toolMatch;
        while ((toolMatch = toolPattern.exec(content)) !== null) {
            knowledge.push({
                type: 'tool_requirement',
                content: toolMatch[0].trim(),
                faultCode,
                manufacturer
            });
        }
        
        return knowledge.slice(0, 10); // Limit to 10 most relevant pieces
    }

    /**
     * Extract keywords from content for searchability
     */
    extractKeywords(content, faultCode, manufacturer) {
        const keywords = new Set();
        
        // Add primary identifiers
        if (faultCode) keywords.add(faultCode.toLowerCase());
        if (manufacturer) keywords.add(manufacturer.toLowerCase());
        
        // Extract technical terms
        const technicalTerms = [
            'ignition', 'flame', 'pressure', 'temperature', 'sensor', 'valve', 'pump',
            'heat exchanger', 'pcb', 'electrode', 'gas supply', 'flue', 'combustion',
            'lockout', 'overheat', 'flow', 'circulation', 'modulation', 'burner'
        ];
        
        technicalTerms.forEach(term => {
            if (content.toLowerCase().includes(term)) {
                keywords.add(term);
            }
        });
        
        // Extract fault code patterns
        const faultCodes = content.match(/[FEL]\d{1,3}/gi);
        if (faultCodes) {
            faultCodes.forEach(code => keywords.add(code.toLowerCase()));
        }
        
        return Array.from(keywords);
    }

    /**
     * Process knowledge with enhanced technical extraction
     */
    async processEnhancedKnowledge(content, faultCode, manufacturer, sourceUrl, sourceType) {
        try {
            
            // Extract comprehensive technical data
            const technicalData = await this.enhancedExtractor.extractTechnicalData(
                content, faultCode, manufacturer
            );
            
            // Calculate enhanced reliability score
            const reliabilityAnalysis = await this.enhancedExtractor.calculateEnhancedReliabilityScore(
                content, sourceUrl, sourceType, technicalData
            );
            
            // Prepare knowledge data
            const knowledgeData = {
                fault_code: faultCode || 'UNKNOWN',
                manufacturer: manufacturer || 'UNKNOWN',
                model: technicalData.model || null,
                content_type: sourceType, // Use content_type instead of knowledge_type
                extracted_content: content,
                source_url: sourceUrl,
                source_type: sourceType,
                keywords: this.extractKeywords(content, faultCode, manufacturer),
                reliability_score: reliabilityAnalysis.score,
                confidence_level: this.getConfidenceLevel(reliabilityAnalysis.score)
            };
            
            // Store enhanced knowledge
            const result = await this.enhancedExtractor.storeEnhancedKnowledge(
                knowledgeData, technicalData, reliabilityAnalysis
            );
            
            if (result.success) {
                
                // Auto-promote high-quality content
                if (reliabilityAnalysis.score >= this.reliabilityThresholds.high) {
                    await this.promoteToVerifiedKnowledge(result.knowledgeId, 'auto_enhanced');
                    console.log(`[Knowledge Ingestion] Auto-promoted high-quality content (${reliabilityAnalysis.score}%)`);
                    result.autoPromoted = true;
                }
                
                // Update ingestion stats
                await this.updateIngestionStats(sourceType, reliabilityAnalysis.score);
            }
            
            return result;
            
        } catch (error) {
            console.error('[Knowledge Ingestion] Enhanced processing error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Store discovered knowledge to database
     */
    async storeDiscoveredKnowledge(knowledgeData) {
        try {
            const {
                sourceType,
                sourceUrl,
                sourceTitle,
                faultCode,
                manufacturer,
                model,
                content,
                contentType
            } = knowledgeData;
            
            
            // Analyze content reliability
            const reliability = this.analyzeContentReliability(content, sourceUrl, sourceType);
            
            // Extract diagnostic knowledge pieces
            const extractedKnowledge = this.extractDiagnosticKnowledge(content, faultCode, manufacturer);
            
            // Extract keywords
            const keywords = this.extractKeywords(content, faultCode, manufacturer);
            
            // Store main discovery record
            const { data: discoveryData, error: discoveryError } = await this.supabase
                .from('discovered_knowledge')
                .insert({
                    source_type: sourceType,
                    source_url: sourceUrl,
                    source_title: sourceTitle,
                    fault_code: faultCode,
                    manufacturer: manufacturer,
                    model: model,
                    extracted_content: content,
                    content_type: contentType,
                    reliability_score: reliability.score,
                    confidence_level: reliability.analysis.confidence,
                    keywords: keywords
                })
                .select()
                .single();
            
            if (discoveryError) {
                console.error('[Knowledge Ingestion] Failed to store discovery:', discoveryError);
                return { success: false, error: discoveryError };
            }
            
            
            // If reliability is high enough, automatically promote to verified knowledge
            if (reliability.score >= this.reliabilityThresholds.high && 
                reliability.analysis.warnings.length === 0) {
                
                await this.promoteToVerifiedKnowledge(discoveryData.id, 'auto_verified');
            }
            
            // Update ingestion stats
            await this.updateIngestionStats(sourceType, reliability.score);
            
            return {
                success: true,
                discoveryId: discoveryData.id,
                reliabilityScore: reliability.score,
                confidence: reliability.analysis.confidence,
                autoPromoted: reliability.score >= this.reliabilityThresholds.high,
                extractedPieces: extractedKnowledge.length
            };
            
        } catch (error) {
            console.error('[Knowledge Ingestion] Storage failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Promote discovered knowledge to verified knowledge table
     */
    async promoteToVerifiedKnowledge(discoveryId, verificationMethod = 'manual') {
        try {
            // Get the discovery record
            const { data: discovery, error: fetchError } = await this.supabase
                .from('discovered_knowledge')
                .select('*')
                .eq('id', discoveryId)
                .single();
            
            if (fetchError || !discovery) {
                throw new Error('Discovery record not found');
            }
            
            // Create verified knowledge record
            const { data: verified, error: verifyError } = await this.supabase
                .from('verified_knowledge')
                .insert({
                    discovered_knowledge_id: discoveryId,
                    fault_code: discovery.fault_code,
                    manufacturer: discovery.manufacturer,
                    model: discovery.model,
                    knowledge_type: discovery.content_type,
                    content: discovery.extracted_content,
                    source_url: discovery.source_url,
                    source_type: discovery.source_type,
                    reliability_score: discovery.reliability_score,
                    verification_notes: `Verified via ${verificationMethod}`,
                    gas_safe_compliant: discovery.reliability_score >= 80,
                    professional_reviewed: verificationMethod === 'manual'
                })
                .select()
                .single();
            
            if (verifyError) {
                throw new Error('Failed to create verified knowledge');
            }
            
            // Update discovery status
            await this.supabase
                .from('discovered_knowledge')
                .update({
                    verification_status: 'verified',
                    verified_at: new Date().toISOString(),
                    verified_by: verificationMethod
                })
                .eq('id', discoveryId);
            
            return { success: true, verifiedId: verified.id };
            
        } catch (error) {
            console.error('[Knowledge Ingestion] Promotion failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update daily ingestion statistics
     */
    async updateIngestionStats(sourceType, reliabilityScore) {
        try {
            const today = new Date().toISOString().split('T')[0];
            
            // Upsert daily stats
            const { error } = await this.supabase
                .from('knowledge_ingestion_stats')
                .upsert({
                    date: today,
                    source_type: sourceType,
                    total_discovered: 1,
                    avg_reliability_score: reliabilityScore
                }, {
                    onConflict: 'date,source_type',
                    count: 'exact'
                });
            
            if (error) {
                console.error('[Knowledge Ingestion] Stats update failed:', error);
            }
            
        } catch (error) {
            console.error('[Knowledge Ingestion] Stats update error:', error);
        }
    }

    /**
     * Process and store knowledge from MCP search results
     */
    async processSearchResults(searchResults, diagnosticContext) {
        const { faultCodes, manufacturer, model } = diagnosticContext;
        const primaryFaultCode = faultCodes[0];
        
        const ingestionResults = [];
        
        for (const result of searchResults) {
            try {
                // Determine content type based on result
                let contentType = 'general_information';
                if (result.snippet && result.snippet.toLowerCase().includes('step')) {
                    contentType = 'diagnostic_procedure';
                } else if (result.snippet && result.snippet.toLowerCase().includes('fault')) {
                    contentType = 'fault_description';
                } else if (result.snippet && result.snippet.toLowerCase().includes('safety')) {
                    contentType = 'safety_warning';
                }
                
                const knowledgeData = {
                    sourceType: result.source || 'web_search',
                    sourceUrl: result.url,
                    sourceTitle: result.title,
                    faultCode: primaryFaultCode,
                    manufacturer: manufacturer,
                    model: model,
                    content: result.snippet || result.description || '',
                    contentType: contentType
                };
                
                const ingestionResult = await this.storeDiscoveredKnowledge(knowledgeData);
                ingestionResults.push({
                    url: result.url,
                    title: result.title,
                    ...ingestionResult
                });
                
                // Small delay between ingestions
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.error(`[Knowledge Ingestion] Failed to process result ${result.url}:`, error);
                ingestionResults.push({
                    url: result.url,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return ingestionResults;
    }

    /**
     * Process and store knowledge from video transcripts
     */
    async processVideoKnowledge(videos, diagnosticContext) {
        const { faultCodes, manufacturer, model } = diagnosticContext;
        const primaryFaultCode = faultCodes[0];
        
        const ingestionResults = [];
        
        for (const video of videos) {
            if (!video.transcript) continue;
            
            try {
                // Use enhanced processing for better technical content extraction
                const result = await this.processEnhancedKnowledge(
                    video.transcript,
                    primaryFaultCode,
                    manufacturer,
                    video.url,
                    'youtube'
                );
                
                ingestionResults.push({
                    videoId: video.id,
                    title: video.title,
                    success: result.success,
                    reliabilityScore: result.reliabilityScore || 0,
                    autoPromoted: result.autoPromoted || false,
                    qualityMetrics: result.qualityMetrics || null,
                    error: result.error || null
                });
                
            } catch (error) {
                console.error(`[Knowledge Ingestion] Failed to process video ${video.id}:`, error);
                ingestionResults.push({
                    videoId: video.id,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return ingestionResults;
    }

    /**
     * Get pending knowledge for manual review
     */
    async getPendingKnowledge(limit = 10) {
        try {
            const { data, error } = await this.supabase
                .from('discovered_knowledge')
                .select('*')
                .eq('verification_status', 'unverified')
                .order('reliability_score', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(limit);
            
            if (error) {
                throw new Error('Failed to fetch pending knowledge');
            }
            
            return data || [];
        } catch (error) {
            console.error('[Knowledge Ingestion] Failed to get pending knowledge:', error);
            return [];
        }
    }

    /**
     * Get ingestion statistics
     */
    async getIngestionStats(days = 7) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            
            const { data, error } = await this.supabase
                .from('knowledge_ingestion_stats')
                .select('*')
                .gte('date', startDate.toISOString().split('T')[0])
                .order('date', { ascending: false });
            
            if (error) {
                throw new Error('Failed to fetch ingestion stats');
            }
            
            return data || [];
        } catch (error) {
            console.error('[Knowledge Ingestion] Failed to get stats:', error);
            return [];
        }
    }

    /**
     * Get confidence level based on reliability score
     */
    getConfidenceLevel(reliabilityScore) {
        if (reliabilityScore >= this.reliabilityThresholds.high) {
            return 'high';
        } else if (reliabilityScore >= this.reliabilityThresholds.medium) {
            return 'medium';
        } else {
            return 'low';
        }
    }

    /**
     * Utility: Extract domain from URL
     */
    extractDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.toLowerCase();
        } catch (error) {
            return '';
        }
    }

    /**
     * Batch process multiple knowledge sources
     */
    async batchProcessKnowledge(videoData, diagnosticContext) {
        
        const results = {
            videos: [],
            webResults: [],
            serviceBulletins: [],
            totalProcessed: 0,
            totalStored: 0,
            totalPromoted: 0
        };
        
        // Process videos with transcripts
        if (videoData.videosWithTranscripts && videoData.videosWithTranscripts.length > 0) {
            const videoResults = await this.processVideoKnowledge(videoData.videosWithTranscripts, diagnosticContext);
            results.videos = videoResults;
            results.totalProcessed += videoResults.length;
            results.totalStored += videoResults.filter(r => r.success).length;
            results.totalPromoted += videoResults.filter(r => r.autoPromoted).length;
        }
        
        // Process web search results
        if (videoData.webResults && videoData.webResults.length > 0) {
            const webResults = await this.processSearchResults(videoData.webResults, diagnosticContext);
            results.webResults = webResults;
            results.totalProcessed += webResults.length;
            results.totalStored += webResults.filter(r => r.success).length;
            results.totalPromoted += webResults.filter(r => r.autoPromoted).length;
        }
        
        // Process service bulletins
        if (videoData.serviceBulletins && videoData.serviceBulletins.length > 0) {
            const bulletinResults = await this.processSearchResults(videoData.serviceBulletins, diagnosticContext);
            results.serviceBulletins = bulletinResults;
            results.totalProcessed += bulletinResults.length;
            results.totalStored += bulletinResults.filter(r => r.success).length;
            results.totalPromoted += bulletinResults.filter(r => r.autoPromoted).length;
        }
        
        
        return results;
    }
}

export default KnowledgeIngestionService;
