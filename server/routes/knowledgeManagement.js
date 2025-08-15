/**
 * Knowledge Management API Routes
 * Provides endpoints for managing automatically ingested knowledge
 */

import express from 'express';
import KnowledgeIngestionService from '../services/KnowledgeIngestionService.js';
import EnhancedContentExtractionService from '../services/EnhancedContentExtractionService.js';

const router = express.Router();

// Lazy initialization to ensure environment variables are loaded
let knowledgeService = null;
let enhancedExtractor = null;

const getKnowledgeService = () => {
    if (!knowledgeService) {
        knowledgeService = new KnowledgeIngestionService();
    }
    return knowledgeService;
};

const getEnhancedExtractor = () => {
    if (!enhancedExtractor) {
        enhancedExtractor = new EnhancedContentExtractionService();
    }
    return enhancedExtractor;
};

/**
 * Get pending knowledge for review
 * GET /api/knowledge/pending
 */
router.get('/pending', async (req, res) => {
    try {
        const { limit = 20, minReliability = 0 } = req.query;
        
        const pendingKnowledge = await getKnowledgeService().getPendingKnowledge(parseInt(limit));
        
        // Filter by minimum reliability if specified
        const filtered = pendingKnowledge.filter(item => 
            item.reliability_score >= parseInt(minReliability)
        );
        
        res.json({
            success: true,
            pendingKnowledge: filtered,
            totalCount: filtered.length,
            averageReliability: filtered.length > 0 
                ? Math.round(filtered.reduce((sum, item) => sum + item.reliability_score, 0) / filtered.length)
                : 0,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('[Knowledge API] Failed to get pending knowledge:', error);
        res.status(500).json({
            error: 'Failed to retrieve pending knowledge',
            message: error.message
        });
    }
});

/**
 * Approve knowledge for production use
 * POST /api/knowledge/:id/approve
 */
router.post('/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;
        const { verificationNotes = '', reviewedBy = 'system' } = req.body;
        
        
        const result = await getKnowledgeService().promoteToVerifiedKnowledge(id, 'manual');
        
        if (result.success) {
            res.json({
                success: true,
                verifiedId: result.verifiedId,
                message: 'Knowledge approved and promoted to production',
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(400).json({
                error: 'Failed to approve knowledge',
                message: result.error
            });
        }
        
    } catch (error) {
        console.error('[Knowledge API] Approval failed:', error);
        res.status(500).json({
            error: 'Knowledge approval failed',
            message: error.message
        });
    }
});

/**
 * Reject knowledge
 * POST /api/knowledge/:id/reject
 */
router.post('/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const { rejectionReason = '' } = req.body;
        
        
        const { error } = await getKnowledgeService().supabase
            .from('discovered_knowledge')
            .update({
                verification_status: 'rejected',
                verified_at: new Date().toISOString(),
                verified_by: `manual_rejection: ${rejectionReason}`
            })
            .eq('id', id);
        
        if (error) {
            throw new Error('Failed to reject knowledge');
        }
        
        res.json({
            success: true,
            message: 'Knowledge rejected',
            rejectionReason,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('[Knowledge API] Rejection failed:', error);
        res.status(500).json({
            error: 'Knowledge rejection failed',
            message: error.message
        });
    }
});

/**
 * Get knowledge ingestion statistics
 * GET /api/knowledge/stats
 */
router.get('/stats', async (req, res) => {
    try {
        const { days = 7 } = req.query;
        
        const stats = await getKnowledgeService().getIngestionStats(parseInt(days));
        
        // Calculate summary statistics
        const summary = {
            totalDiscovered: stats.reduce((sum, stat) => sum + (stat.total_discovered || 0), 0),
            totalVerified: stats.reduce((sum, stat) => sum + (stat.total_verified || 0), 0),
            totalRejected: stats.reduce((sum, stat) => sum + (stat.total_rejected || 0), 0),
            averageReliability: stats.length > 0 
                ? Math.round(stats.reduce((sum, stat) => sum + (stat.avg_reliability_score || 0), 0) / stats.length)
                : 0,
            sourceBreakdown: {},
            dailyStats: stats
        };
        
        // Calculate source breakdown
        stats.forEach(stat => {
            if (!summary.sourceBreakdown[stat.source_type]) {
                summary.sourceBreakdown[stat.source_type] = {
                    discovered: 0,
                    verified: 0,
                    rejected: 0
                };
            }
            summary.sourceBreakdown[stat.source_type].discovered += stat.total_discovered || 0;
            summary.sourceBreakdown[stat.source_type].verified += stat.total_verified || 0;
            summary.sourceBreakdown[stat.source_type].rejected += stat.total_rejected || 0;
        });
        
        res.json({
            success: true,
            summary,
            period: `${days} days`,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('[Knowledge API] Stats retrieval failed:', error);
        res.status(500).json({
            error: 'Failed to retrieve statistics',
            message: error.message
        });
    }
});

/**
 * Get verified knowledge for specific fault code
 * GET /api/knowledge/verified/:faultCode
 */
router.get('/verified/:faultCode', async (req, res) => {
    try {
        const { faultCode } = req.params;
        const { manufacturer = null } = req.query;
        
        let query = getKnowledgeService().supabase
            .from('verified_knowledge')
            .select('*')
            .eq('fault_code', faultCode.toUpperCase())
            .order('reliability_score', { ascending: false });
        
        if (manufacturer) {
            query = query.ilike('manufacturer', `%${manufacturer}%`);
        }
        
        const { data, error } = await query.limit(10);
        
        if (error) {
            throw new Error('Failed to fetch verified knowledge');
        }
        
        res.json({
            success: true,
            faultCode: faultCode.toUpperCase(),
            manufacturer,
            verifiedKnowledge: data || [],
            totalFound: data?.length || 0,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('[Knowledge API] Verified knowledge retrieval failed:', error);
        res.status(500).json({
            error: 'Failed to retrieve verified knowledge',
            message: error.message
        });
    }
});

/**
 * Trigger manual knowledge discovery for specific fault code
 * POST /api/knowledge/discover
 */
router.post('/discover', async (req, res) => {
    try {
        const { faultCode, manufacturer, model = null, searchWeb = true, searchVideos = true } = req.body;
        
        if (!faultCode || !manufacturer) {
            return res.status(400).json({
                error: 'Fault code and manufacturer required',
                message: 'Please provide both fault code and manufacturer'
            });
        }
        
        
        const diagnosticContext = {
            faultCodes: [faultCode],
            manufacturer,
            model,
            symptoms: [],
            components: []
        };
        
        // Discover knowledge from multiple sources
        const videoData = await getKnowledgeService().mcpService.enhanceDiagnosticContext(diagnosticContext);
        
        // Process and store discovered knowledge
        const ingestionResults = await getKnowledgeService().batchProcessKnowledge(videoData, diagnosticContext);
        
        res.json({
            success: true,
            faultCode,
            manufacturer,
            model,
            discoveryResults: {
                videosProcessed: ingestionResults.videos.length,
                webResultsProcessed: ingestionResults.webResults.length,
                bulletinsProcessed: ingestionResults.serviceBulletins.length,
                totalStored: ingestionResults.totalStored,
                totalPromoted: ingestionResults.totalPromoted
            },
            ingestionResults,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('[Knowledge API] Manual discovery failed:', error);
        res.status(500).json({
            error: 'Knowledge discovery failed',
            message: error.message
        });
    }
});

/**
 * Get knowledge ingestion dashboard data
 * GET /api/knowledge/dashboard
 */
router.get('/dashboard', async (req, res) => {
    try {
        // Get recent stats
        const stats = await getKnowledgeService().getIngestionStats(30);
        
        // Get pending knowledge count by reliability
        const { data: pendingCounts } = await getKnowledgeService().supabase
            .from('discovered_knowledge')
            .select('reliability_score, confidence_level')
            .eq('verification_status', 'unverified');
        
        // Get top manufacturers and fault codes
        const { data: topManufacturers } = await getKnowledgeService().supabase
            .from('discovered_knowledge')
            .select('manufacturer')
            .not('manufacturer', 'is', null)
            .limit(100);
        
        const { data: topFaultCodes } = await getKnowledgeService().supabase
            .from('discovered_knowledge')
            .select('fault_code')
            .not('fault_code', 'is', null)
            .limit(100);
        
        // Process data for dashboard
        const manufacturerCounts = {};
        topManufacturers?.forEach(item => {
            manufacturerCounts[item.manufacturer] = (manufacturerCounts[item.manufacturer] || 0) + 1;
        });
        
        const faultCodeCounts = {};
        topFaultCodes?.forEach(item => {
            faultCodeCounts[item.fault_code] = (faultCodeCounts[item.fault_code] || 0) + 1;
        });
        
        const reliabilityDistribution = {
            high: pendingCounts?.filter(item => item.reliability_score >= 80).length || 0,
            medium: pendingCounts?.filter(item => item.reliability_score >= 60 && item.reliability_score < 80).length || 0,
            low: pendingCounts?.filter(item => item.reliability_score < 60).length || 0
        };
        
        res.json({
            success: true,
            dashboard: {
                stats,
                pendingCount: pendingCounts?.length || 0,
                reliabilityDistribution,
                topManufacturers: Object.entries(manufacturerCounts)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 10),
                topFaultCodes: Object.entries(faultCodeCounts)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 10)
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('[Knowledge API] Dashboard data failed:', error);
        res.status(500).json({
            error: 'Failed to retrieve dashboard data',
            message: error.message
        });
    }
});

/**
 * Process content with enhanced technical extraction
 * POST /api/knowledge/enhanced-process
 */
router.post('/enhanced-process', async (req, res) => {
    try {
        const { content, faultCode, manufacturer, sourceUrl, sourceType } = req.body;
        
        if (!content || !faultCode || !manufacturer) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['content', 'faultCode', 'manufacturer']
            });
        }
        
        
        // Use enhanced processing
        const result = await getKnowledgeService().processEnhancedKnowledge(
            content,
            faultCode,
            manufacturer,
            sourceUrl || 'manual_input',
            sourceType || 'manual'
        );
        
        res.json({
            success: result.success,
            knowledgeId: result.knowledgeId,
            reliabilityScore: result.reliabilityScore,
            qualityMetrics: result.qualityMetrics,
            autoPromoted: result.autoPromoted || false,
            error: result.error || null,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('[Enhanced Knowledge API] Processing failed:', error);
        res.status(500).json({
            error: 'Enhanced processing failed',
            message: error.message
        });
    }
});

/**
 * Get technical specifications for a fault code
 * GET /api/knowledge/technical-specs/:faultCode/:manufacturer
 */
router.get('/technical-specs/:faultCode/:manufacturer', async (req, res) => {
    try {
        const { faultCode, manufacturer } = req.params;
        
        const { data: techSpecs, error } = await getEnhancedExtractor().supabase
            .from('technical_specifications')
            .select('*')
            .eq('fault_code', faultCode)
            .eq('manufacturer', manufacturer)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        res.json({
            success: true,
            faultCode,
            manufacturer,
            technicalSpecs: techSpecs || [],
            count: techSpecs?.length || 0,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('[Enhanced Knowledge API] Technical specs retrieval failed:', error);
        res.status(500).json({
            error: 'Failed to retrieve technical specifications',
            message: error.message
        });
    }
});

/**
 * Get diagnostic procedures for a fault code
 * GET /api/knowledge/procedures/:faultCode/:manufacturer
 */
router.get('/procedures/:faultCode/:manufacturer', async (req, res) => {
    try {
        const { faultCode, manufacturer } = req.params;
        
        const { data: procedures, error } = await getEnhancedExtractor().supabase
            .from('enhanced_diagnostic_procedures')
            .select('*')
            .eq('fault_code', faultCode)
            .eq('manufacturer', manufacturer)
            .order('step_number', { ascending: true });
        
        if (error) throw error;
        
        res.json({
            success: true,
            faultCode,
            manufacturer,
            procedures: procedures || [],
            stepCount: procedures?.length || 0,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('[Enhanced Knowledge API] Procedures retrieval failed:', error);
        res.status(500).json({
            error: 'Failed to retrieve diagnostic procedures',
            message: error.message
        });
    }
});

/**
 * Get content quality metrics
 * GET /api/knowledge/quality-metrics
 */
router.get('/quality-metrics', async (req, res) => {
    try {
        const { minScore = 0, limit = 50 } = req.query;
        
        const { data: qualityMetrics, error } = await getEnhancedExtractor().supabase
            .from('content_quality_metrics')
            .select(`
                *,
                discovered_knowledge (
                    fault_code,
                    manufacturer,
                    source_type,
                    reliability_score
                )
            `)
            .gte('overall_quality_score', parseInt(minScore))
            .order('overall_quality_score', { ascending: false })
            .limit(parseInt(limit));
        
        if (error) throw error;
        
        // Calculate summary statistics
        const summary = {
            totalItems: qualityMetrics?.length || 0,
            averageQualityScore: qualityMetrics?.length > 0 
                ? Math.round(qualityMetrics.reduce((sum, item) => sum + item.overall_quality_score, 0) / qualityMetrics.length)
                : 0,
            gasSafeReady: qualityMetrics?.filter(item => item.gas_safe_ready).length || 0,
            professionalReady: qualityMetrics?.filter(item => item.professional_ready).length || 0,
            hasTechnicalValues: qualityMetrics?.filter(item => item.has_technical_values).length || 0,
            hasSafetyProcedures: qualityMetrics?.filter(item => item.has_safety_procedures).length || 0
        };
        
        res.json({
            success: true,
            qualityMetrics: qualityMetrics || [],
            summary,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('[Enhanced Knowledge API] Quality metrics retrieval failed:', error);
        res.status(500).json({
            error: 'Failed to retrieve quality metrics',
            message: error.message
        });
    }
});

/**
 * Test enhanced extraction on sample content
 * POST /api/knowledge/test-extraction
 */
router.post('/test-extraction', async (req, res) => {
    try {
        const { content, faultCode = 'TEST', manufacturer = 'TEST' } = req.body;
        
        if (!content) {
            return res.status(400).json({
                error: 'Content is required for testing'
            });
        }
        
        
        // Extract technical data without storing
        const technicalData = await getEnhancedExtractor().extractTechnicalData(
            content, faultCode, manufacturer
        );
        
        // Calculate reliability score
        const reliabilityAnalysis = await getEnhancedExtractor().calculateEnhancedReliabilityScore(
            content, 'test://example.com', 'test', technicalData
        );
        
        res.json({
            success: true,
            extractionResults: {
                technicalData,
                reliabilityAnalysis,
                contentLength: content.length,
                wordCount: content.split(' ').length
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('[Enhanced Knowledge API] Extraction test failed:', error);
        res.status(500).json({
            error: 'Extraction test failed',
            message: error.message
        });
    }
});

export default router;
