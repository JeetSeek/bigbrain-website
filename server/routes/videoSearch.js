/**
 * Video Search API Routes
 * Provides endpoints for YouTube video search and knowledge extraction
 */

import express from 'express';
import MCPIntegrationService from '../services/MCPIntegrationService.js';

const router = express.Router();
const mcpService = new MCPIntegrationService();

/**
 * Search for diagnostic videos
 * POST /api/videos/search
 */
router.post('/search', async (req, res) => {
    try {
        const { query, manufacturer, model, faultCode, maxResults = 5 } = req.body;
        
        if (!query && !faultCode) {
            return res.status(400).json({
                error: 'Query or fault code required',
                message: 'Please provide either a search query or fault code'
            });
        }
        
        
        let searchQuery = query;
        if (!searchQuery && faultCode) {
            searchQuery = `${manufacturer || ''} ${model || ''} ${faultCode} fault`.trim();
        }
        
        const videos = await mcpService.searchYouTubeVideos(searchQuery, maxResults);
        
        res.json({
            success: true,
            query: searchQuery,
            videos,
            totalFound: videos.length,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('[Video API] Search failed:', error);
        res.status(500).json({
            error: 'Video search failed',
            message: error.message
        });
    }
});

/**
 * Get video transcript and extract diagnostic knowledge
 * GET /api/videos/:videoId/transcript
 */
router.get('/:videoId/transcript', async (req, res) => {
    try {
        const { videoId } = req.params;
        const { extractKnowledge = true } = req.query;
        
        
        const transcript = await mcpService.getVideoTranscript(videoId);
        
        if (!transcript) {
            return res.status(404).json({
                error: 'Transcript not found',
                message: 'No transcript available for this video'
            });
        }
        
        const response = {
            success: true,
            videoId,
            transcript,
            transcriptLength: transcript.length,
            timestamp: new Date().toISOString()
        };
        
        // Extract diagnostic knowledge if requested
        if (extractKnowledge === 'true') {
            const knowledge = mcpService.extractDiagnosticKnowledge(transcript, '');
            response.extractedKnowledge = knowledge;
        }
        
        res.json(response);
        
    } catch (error) {
        console.error('[Video API] Transcript extraction failed:', error);
        res.status(500).json({
            error: 'Transcript extraction failed',
            message: error.message
        });
    }
});

/**
 * Enhanced diagnostic search with video integration
 * POST /api/videos/diagnostic-search
 */
router.post('/diagnostic-search', async (req, res) => {
    try {
        const { faultCode, manufacturer, model, includeTranscripts = true } = req.body;
        
        if (!faultCode || !manufacturer) {
            return res.status(400).json({
                error: 'Fault code and manufacturer required',
                message: 'Please provide both fault code and manufacturer'
            });
        }
        
        
        const diagnosticContext = {
            faultCodes: [faultCode],
            manufacturer,
            model: model || null
        };
        
        const videoData = await mcpService.enhanceDiagnosticContext(diagnosticContext);
        
        res.json({
            success: true,
            faultCode,
            manufacturer,
            model,
            videos: videoData.videos,
            videosWithTranscripts: includeTranscripts ? videoData.videosWithTranscripts : undefined,
            extractedKnowledge: videoData.extractedKnowledge,
            totalFound: videoData.totalVideosFound,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('[Video API] Diagnostic search failed:', error);
        res.status(500).json({
            error: 'Diagnostic video search failed',
            message: error.message
        });
    }
});

/**
 * Get MCP server status and capabilities
 * GET /api/videos/status
 */
router.get('/status', async (req, res) => {
    try {
        const status = {
            mcpEnabled: process.env.MCP_ENABLE_YOUTUBE === 'true',
            youtubeApiConfigured: !!process.env.YOUTUBE_API_KEY && process.env.YOUTUBE_API_KEY !== 'your_youtube_api_key_here',
            braveApiConfigured: !!process.env.BRAVE_API_KEY && process.env.BRAVE_API_KEY !== 'your_brave_search_api_key_here',
            cacheTimeout: parseInt(process.env.MCP_VIDEO_CACHE_TIMEOUT) || 86400000,
            maxVideosPerQuery: parseInt(process.env.MCP_MAX_VIDEOS_PER_QUERY) || 5,
            availableServers: ['youtube-mcp', 'brave-search-mcp', 'web-scraper-mcp'],
            timestamp: new Date().toISOString()
        };
        
        res.json(status);
        
    } catch (error) {
        console.error('[Video API] Status check failed:', error);
        res.status(500).json({
            error: 'Status check failed',
            message: error.message
        });
    }
});

export default router;
