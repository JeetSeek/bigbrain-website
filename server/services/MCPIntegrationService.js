/**
 * MCP Integration Service
 * Integrates Model Context Protocol tools for enhanced diagnostic capabilities
 * Supports YouTube search, video transcript extraction, and knowledge ingestion
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

class MCPIntegrationService {
    constructor() {
        this.mcpServers = new Map();
        this.videoCache = new Map();
        this.transcriptCache = new Map();
        this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours
        this.initialized = false;
        
        // Don't initialize MCP servers in constructor to avoid blocking
        // They will be initialized lazily when first needed
    }

    async initializeMCPServers() {
        if (this.initialized) {
            return;
        }
        
        
        // YouTube MCP Server configuration
        const youtubeConfig = {
            name: 'youtube-mcp',
            command: 'npx',
            args: ['@modelcontextprotocol/server-youtube'],
            env: {
                YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY
            }
        };
        
        // Web Search MCP Server configuration  
        const webSearchConfig = {
            name: 'web-search-mcp',
            command: 'npx',
            args: ['@modelcontextprotocol/server-brave-search'],
            env: {
                BRAVE_API_KEY: process.env.BRAVE_API_KEY
            }
        };
        
        // Web Scraper MCP Server for manufacturer websites
        const webScraperConfig = {
            name: 'web-scraper-mcp',
            command: 'npx',
            args: ['@modelcontextprotocol/server-puppeteer'],
            env: {}
        };
        
        // Google Search MCP Server for general web search
        const googleSearchConfig = {
            name: 'google-search-mcp',
            command: 'npx',
            args: ['@modelcontextprotocol/server-google-search'],
            env: {
                GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
                GOOGLE_CSE_ID: process.env.GOOGLE_CSE_ID
            }
        };
        
        this.mcpServers.set('youtube', youtubeConfig);
        this.mcpServers.set('web-search', webSearchConfig);
        this.mcpServers.set('web-scraper', webScraperConfig);
        this.mcpServers.set('google-search', googleSearchConfig);
        
        this.initialized = true;
        console.log('[MCP] Configured servers:', Array.from(this.mcpServers.keys()));
    }

    /**
     * Search YouTube for boiler diagnostic videos
     */
    async searchYouTubeVideos(query, maxResults = 5) {
        try {
            // Ensure MCP servers are initialized
            await this.initializeMCPServers();
            
            
            // Enhance query with boiler-specific terms
            const enhancedQuery = `${query} boiler diagnostic repair gas safe engineer`;
            
            const searchResults = await this.callMCPTool('youtube', 'search_videos', {
                query: enhancedQuery,
                max_results: maxResults,
                order: 'relevance'
            });
            
            if (searchResults && searchResults.videos) {
                const videos = searchResults.videos.map(video => ({
                    id: video.id,
                    title: video.title,
                    description: video.description,
                    url: `https://www.youtube.com/watch?v=${video.id}`,
                    thumbnail: video.thumbnail,
                    duration: video.duration,
                    channel: video.channel,
                    publishedAt: video.publishedAt,
                    relevanceScore: this.calculateVideoRelevance(video, query)
                }));
                
                // Sort by relevance score
                videos.sort((a, b) => b.relevanceScore - a.relevanceScore);
                
                return videos;
            }
            
            return [];
        } catch (error) {
            console.error('[MCP YouTube] Search failed:', error);
            return [];
        }
    }

    /**
     * Extract transcript from YouTube video
     */
    async getVideoTranscript(videoId) {
        try {
            if (this.transcriptCache.has(videoId)) {
                const cached = this.transcriptCache.get(videoId);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    return cached.transcript;
                }
            }
            
            
            const transcript = await this.callMCPTool('youtube', 'get_transcript', {
                video_id: videoId,
                language: 'en'
            });
            
            if (transcript && transcript.text) {
                // Cache the transcript
                this.transcriptCache.set(videoId, {
                    transcript: transcript.text,
                    timestamp: Date.now()
                });
                
                return transcript.text;
            }
            
            return null;
        } catch (error) {
            console.error(`[MCP YouTube] Transcript extraction failed for ${videoId}:`, error);
            return null;
        }
    }

    /**
     * Search for diagnostic videos and extract relevant knowledge
     */
    async searchDiagnosticVideos(faultCode, manufacturer, model = null) {
        try {
            const queries = [
                `${manufacturer} ${model || ''} ${faultCode} fault code repair`,
                `${manufacturer} boiler ${faultCode} diagnostic`,
                `${faultCode} fault ${manufacturer} troubleshooting`,
                `gas safe ${manufacturer} ${faultCode} repair guide`
            ].filter(q => q.trim());
            
            const allVideos = [];
            
            // Search with multiple queries for comprehensive coverage
            for (const query of queries.slice(0, 2)) { // Limit to 2 queries to avoid rate limits
                const videos = await this.searchYouTubeVideos(query, 3);
                allVideos.push(...videos);
            }
            
            // Remove duplicates and get top 5 most relevant
            const uniqueVideos = this.deduplicateVideos(allVideos);
            const topVideos = uniqueVideos.slice(0, 5);
            
            // Extract transcripts for top 2 videos for knowledge extraction
            const videosWithTranscripts = [];
            for (const video of topVideos.slice(0, 2)) {
                const transcript = await this.getVideoTranscript(video.id);
                videosWithTranscripts.push({
                    ...video,
                    transcript,
                    hasTranscript: !!transcript
                });
                
                // Small delay to respect rate limits
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            return {
                videos: topVideos,
                videosWithTranscripts,
                totalFound: allVideos.length
            };
            
        } catch (error) {
            console.error('[MCP YouTube] Diagnostic video search failed:', error);
            return { videos: [], videosWithTranscripts: [], totalFound: 0 };
        }
    }

    /**
     * Extract diagnostic knowledge from video transcripts
     */
    extractDiagnosticKnowledge(transcript, faultCode) {
        if (!transcript) return null;
        
        const knowledge = {
            faultCode,
            procedures: [],
            tools: [],
            safetyWarnings: [],
            timeEstimates: [],
            troubleshootingSteps: []
        };
        
        // Extract procedures (look for step-by-step instructions)
        const procedureRegex = /(?:step \d+|first|second|third|next|then|finally)[\s:]+([^.!?]+[.!?])/gi;
        let match;
        while ((match = procedureRegex.exec(transcript)) !== null) {
            knowledge.procedures.push(match[1].trim());
        }
        
        // Extract tool mentions
        const toolRegex = /(?:use|need|require|get)[\s]+(?:a|an|the)?\s*(multimeter|manometer|gas analyzer|screwdriver|spanner|wrench|probe|tester)/gi;
        while ((match = toolRegex.exec(transcript)) !== null) {
            knowledge.tools.push(match[1].toLowerCase());
        }
        
        // Extract safety warnings
        const safetyRegex = /(turn off|isolate|safety|danger|warning|caution|gas off|electric off)[^.!?]*[.!?]/gi;
        while ((match = safetyRegex.exec(transcript)) !== null) {
            knowledge.safetyWarnings.push(match[0].trim());
        }
        
        // Extract time estimates
        const timeRegex = /(\d+)\s*(minute|hour|second)s?/gi;
        while ((match = timeRegex.exec(transcript)) !== null) {
            knowledge.timeEstimates.push(`${match[1]} ${match[2]}s`);
        }
        
        return knowledge;
    }

    /**
     * Calculate video relevance score for ranking
     */
    calculateVideoRelevance(video, originalQuery) {
        let score = 0;
        const queryTerms = originalQuery.toLowerCase().split(' ');
        const title = video.title.toLowerCase();
        const description = video.description.toLowerCase();
        
        // Title matches (highest weight)
        queryTerms.forEach(term => {
            if (title.includes(term)) score += 10;
            if (description.includes(term)) score += 5;
        });
        
        // Boost for professional/educational content
        const professionalTerms = ['gas safe', 'engineer', 'repair', 'diagnostic', 'troubleshoot', 'service'];
        professionalTerms.forEach(term => {
            if (title.includes(term)) score += 8;
            if (description.includes(term)) score += 4;
        });
        
        // Boost for recent videos (within 2 years)
        const publishDate = new Date(video.publishedAt);
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
        if (publishDate > twoYearsAgo) score += 3;
        
        return score;
    }

    /**
     * Remove duplicate videos based on title similarity
     */
    deduplicateVideos(videos) {
        const unique = [];
        const seenTitles = new Set();
        
        for (const video of videos) {
            const normalizedTitle = video.title.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (!seenTitles.has(normalizedTitle)) {
                seenTitles.add(normalizedTitle);
                unique.push(video);
            }
        }
        
        return unique;
    }

    /**
     * Generic MCP tool caller
     */
    async callMCPTool(serverName, toolName, parameters) {
        try {
            const serverConfig = this.mcpServers.get(serverName);
            if (!serverConfig) {
                throw new Error(`MCP server '${serverName}' not configured`);
            }
            
            // For now, simulate MCP calls - in production you'd use actual MCP client
            
            // Simulate MCP tool responses
            if (serverName === 'youtube' && toolName === 'search_videos') {
                return await this.simulateYouTubeSearch(parameters.query, parameters.max_results);
            }
            
            if (serverName === 'youtube' && toolName === 'get_transcript') {
                return await this.simulateTranscriptExtraction(parameters.video_id);
            }
            
            if (serverName === 'web-search' && toolName === 'search') {
                return await this.simulateWebSearch(parameters.query, parameters.count);
            }
            
            if (serverName === 'web-scraper' && toolName === 'scrape_page') {
                return await this.simulateWebScraping(parameters.url);
            }
            
            return null;
        } catch (error) {
            console.error(`[MCP ${serverName}] Tool call failed:`, error);
            throw error;
        }
    }

    /**
     * Simulate YouTube search (replace with actual MCP when available)
     */
    async simulateYouTubeSearch(query, maxResults) {
        // This would be replaced with actual YouTube MCP server calls
        
        // Return realistic sample data structure
        return {
            videos: [
                {
                    id: 'dQw4w9WgXcQ',
                    title: `${query} - Professional Gas Safe Repair Guide`,
                    description: `Complete diagnostic procedure for ${query} including step-by-step troubleshooting`,
                    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
                    duration: '12:34',
                    channel: 'Gas Safe Training',
                    publishedAt: '2024-01-15T10:00:00Z'
                }
            ]
        };
    }

    /**
     * Simulate transcript extraction (replace with actual MCP when available)
     */
    async simulateTranscriptExtraction(videoId) {
        
        // Return realistic transcript structure
        return {
            text: `Welcome to this diagnostic guide. First, turn off the gas supply for safety. 
                   Check the fault code display. For this particular fault, you'll need a multimeter 
                   and manometer. Step 1: Check gas pressure at the inlet. Step 2: Test ignition 
                   electrode continuity. Step 3: Verify flame detection circuit. This should take 
                   about 30 minutes to complete. Always follow Gas Safe procedures.`
        };
    }

    /**
     * Simulate web search (replace with actual MCP when available)
     */
    async simulateWebSearch(query, count = 5) {
        
        // Extract manufacturer and fault code from query for realistic results
        const manufacturers = ['ideal', 'vaillant', 'worcester', 'baxi', 'viessmann'];
        const detectedManufacturer = manufacturers.find(m => query.toLowerCase().includes(m));
        const faultCodeMatch = query.match(/[FEL]\d{1,3}/i);
        
        const results = [];
        
        // Simulate manufacturer website results
        if (detectedManufacturer) {
            results.push({
                title: `${detectedManufacturer.charAt(0).toUpperCase() + detectedManufacturer.slice(1)} ${faultCodeMatch ? faultCodeMatch[0] : ''} Fault Code - Service Manual`,
                url: `https://${detectedManufacturer}heating.com/service-manual/${faultCodeMatch ? faultCodeMatch[0].toLowerCase() : 'diagnostics'}`,
                snippet: `Official ${detectedManufacturer} diagnostic procedure for ${faultCodeMatch ? faultCodeMatch[0] : 'fault codes'}. Includes step-by-step troubleshooting, required tools, and safety procedures.`,
                source: 'manufacturer_website'
            });
            
            results.push({
                title: `${detectedManufacturer.charAt(0).toUpperCase() + detectedManufacturer.slice(1)} Technical Service Bulletin - ${faultCodeMatch ? faultCodeMatch[0] : 'Diagnostics'}`,
                url: `https://${detectedManufacturer}heating.com/technical-bulletins/${faultCodeMatch ? faultCodeMatch[0].toLowerCase() : 'general'}`,
                snippet: `Latest technical updates and known issues for ${faultCodeMatch ? faultCodeMatch[0] : 'diagnostic procedures'}. Gas Safe approved procedures and component specifications.`,
                source: 'service_bulletin'
            });
        }
        
        // Simulate general diagnostic results
        results.push({
            title: `Gas Safe ${query} - Professional Diagnostic Guide`,
            url: `https://gassaferegister.co.uk/help-and-advice/fault-finding/${faultCodeMatch ? faultCodeMatch[0].toLowerCase() : 'general'}`,
            snippet: `Official Gas Safe guidance for ${query}. Professional diagnostic procedures, safety requirements, and compliance information.`,
            source: 'gas_safe_official'
        });
        
        return results.slice(0, count);
    }

    /**
     * Simulate web scraping (replace with actual MCP when available)
     */
    async simulateWebScraping(url) {
        
        // Return realistic scraped content structure
        return {
            title: `Technical Documentation - ${url.includes('ideal') ? 'Ideal Heating' : 'Manufacturer'} Service Manual`,
            text: `FAULT CODE DIAGNOSTIC PROCEDURE
                   
                   Safety Warning: Ensure gas supply is isolated before commencing work.
                   
                   Fault Code: L2 - Ignition Lockout
                   Description: The boiler has failed to ignite after multiple attempts.
                   
                   Diagnostic Steps:
                   1. Check gas supply pressure (should be 20mbar ±2mbar)
                   2. Inspect ignition electrode for damage or contamination
                   3. Test ignition lead continuity (should be <2 ohms)
                   4. Verify gas valve operation (230V AC during ignition sequence)
                   5. Check flue for blockages or restrictions
                   
                   Required Tools:
                   - Digital multimeter
                   - Gas pressure gauge (manometer)
                   - Basic hand tools
                   
                   Expected Time: 30-45 minutes
                   
                   Safety Note: All work must comply with Gas Safety (Installation and Use) Regulations.`,
            links: [
                { text: 'Download Service Manual PDF', url: `${url}/service-manual.pdf` },
                { text: 'Technical Bulletins', url: `${url}/technical-bulletins` },
                { text: 'Spare Parts Diagram', url: `${url}/parts-diagram` }
            ]
        };
    }

    /**
     * Format video results for chat response
     */
    formatVideoResults(videos, includeTranscripts = false) {
        if (!videos || videos.length === 0) {
            return '';
        }
        
        let videoSection = '\n\n**📺 RELEVANT DIAGNOSTIC VIDEOS:**\n';
        
        videos.forEach((video, index) => {
            videoSection += `\n**${index + 1}. ${video.title}**\n`;
            videoSection += `   🔗 [Watch Video](${video.url})\n`;
            videoSection += `   📺 Channel: ${video.channel}\n`;
            videoSection += `   ⏱️ Duration: ${video.duration}\n`;
            
            if (video.description && video.description.length > 0) {
                const shortDesc = video.description.substring(0, 100) + '...';
                videoSection += `   📝 ${shortDesc}\n`;
            }
            
            if (includeTranscripts && video.transcript) {
                const knowledge = this.extractDiagnosticKnowledge(video.transcript, '');
                if (knowledge.procedures.length > 0) {
                    videoSection += `   🔧 Key Steps: ${knowledge.procedures.slice(0, 2).join(', ')}\n`;
                }
            }
        });
        
        videoSection += '\n*Click video links to watch detailed diagnostic procedures*\n';
        return videoSection;
    }

    /**
     * Format web search results for chat response
     */
    formatWebResults(webResults, serviceBulletins = []) {
        if ((!webResults || webResults.length === 0) && (!serviceBulletins || serviceBulletins.length === 0)) {
            return '';
        }
        
        let webSection = '\n\n**🌐 MANUFACTURER & WEB RESOURCES:**\n';
        
        // Add manufacturer website results
        if (webResults && webResults.length > 0) {
            webSection += '\n**Official Manufacturer Documentation:**\n';
            webResults.slice(0, 3).forEach((result, index) => {
                webSection += `\n**${index + 1}. ${result.title}**\n`;
                webSection += `   🔗 [View Documentation](${result.url})\n`;
                if (result.snippet) {
                    webSection += `   📄 ${result.snippet}\n`;
                }
                webSection += `   📍 Source: ${result.source || 'manufacturer'}\n`;
            });
        }
        
        // Add service bulletins
        if (serviceBulletins && serviceBulletins.length > 0) {
            webSection += '\n**Technical Service Bulletins:**\n';
            serviceBulletins.slice(0, 2).forEach((bulletin, index) => {
                webSection += `\n**${index + 1}. ${bulletin.title}**\n`;
                webSection += `   🔗 [Read Bulletin](${bulletin.url})\n`;
                if (bulletin.snippet) {
                    webSection += `   📋 ${bulletin.snippet}\n`;
                }
            });
        }
        
        webSection += '\n*Access official manufacturer documentation and latest technical updates*\n';
        return webSection;
    }

    /**
     * Format combined multimedia results (videos + web)
     */
    formatMultimediaResults(videoData) {
        let multimediaSection = '';
        
        // Add video results
        if (videoData.videos && videoData.videos.length > 0) {
            multimediaSection += this.formatVideoResults(videoData.videos, true);
        }
        
        // Add web results
        if (videoData.webResults || videoData.serviceBulletins) {
            multimediaSection += this.formatWebResults(videoData.webResults, videoData.serviceBulletins);
        }
        
        return multimediaSection;
    }

    /**
     * Enhanced diagnostic context with video and web integration
     */
    async enhanceDiagnosticContext(diagnosticContext) {
        try {
            const { faultCodes, manufacturer, model } = diagnosticContext;
            
            if (faultCodes.length === 0) {
                return { videos: [], webResults: [], enhancedContext: '' };
            }
            
            const primaryFaultCode = faultCodes[0];
            
            // Run multiple searches in parallel for comprehensive coverage
            const [videoResults, manufacturerWebResults, serviceBulletins] = await Promise.all([
                this.searchDiagnosticVideos(primaryFaultCode, manufacturer, model),
                manufacturer ? this.searchManufacturerWebsites(manufacturer, primaryFaultCode, model) : Promise.resolve([]),
                manufacturer ? this.searchServiceBulletins(manufacturer, primaryFaultCode) : Promise.resolve([])
            ]).catch(error => {
                console.error('[MCP] Parallel search failed:', error);
                return [{ videos: [], videosWithTranscripts: [], totalFound: 0 }, [], []];
            });
            
            // Extract knowledge from video transcripts
            let extractedKnowledge = '';
            if (videoResults.videosWithTranscripts.length > 0) {
                extractedKnowledge += '\n\n**📹 VIDEO-DERIVED DIAGNOSTIC INSIGHTS:**\n';
                
                videoResults.videosWithTranscripts.forEach(video => {
                    if (video.transcript) {
                        const knowledge = this.extractDiagnosticKnowledge(video.transcript, primaryFaultCode);
                        
                        if (knowledge.procedures.length > 0) {
                            extractedKnowledge += `\n**From "${video.title}":**\n`;
                            knowledge.procedures.slice(0, 3).forEach((proc, i) => {
                                extractedKnowledge += `${i + 1}. ${proc}\n`;
                            });
                        }
                        
                        if (knowledge.tools.length > 0) {
                            extractedKnowledge += `Tools mentioned: ${[...new Set(knowledge.tools)].join(', ')}\n`;
                        }
                    }
                });
            }
            
            // Add manufacturer website data
            let webKnowledge = '';
            if (manufacturerWebResults.length > 0) {
                webKnowledge += '\n\n**🌐 MANUFACTURER WEBSITE DATA:**\n';
                manufacturerWebResults.slice(0, 3).forEach(result => {
                    webKnowledge += `\n**${result.title}**\n`;
                    webKnowledge += `🔗 Source: ${result.url}\n`;
                    if (result.snippet) {
                        webKnowledge += `📄 ${result.snippet}\n`;
                    }
                });
            }
            
            // Add service bulletin information
            let bulletinKnowledge = '';
            if (serviceBulletins.length > 0) {
                bulletinKnowledge += '\n\n**📋 SERVICE BULLETINS & TECHNICAL UPDATES:**\n';
                serviceBulletins.slice(0, 2).forEach(bulletin => {
                    bulletinKnowledge += `\n**${bulletin.title}**\n`;
                    bulletinKnowledge += `🔗 ${bulletin.url}\n`;
                    if (bulletin.snippet) {
                        bulletinKnowledge += `📄 ${bulletin.snippet}\n`;
                    }
                });
            }
            
            return {
                videos: videoResults.videos,
                videosWithTranscripts: videoResults.videosWithTranscripts,
                webResults: manufacturerWebResults,
                serviceBulletins,
                extractedKnowledge: extractedKnowledge + webKnowledge + bulletinKnowledge,
                totalVideosFound: videoResults.totalFound,
                totalWebResults: manufacturerWebResults.length + serviceBulletins.length
            };
            
        } catch (error) {
            console.error('[MCP] Context enhancement failed:', error);
            return { videos: [], webResults: [], enhancedContext: '' };
        }
    }

    /**
     * Check if video search is relevant for the query
     */
    shouldSearchVideos(message) {
        const videoTriggers = [
            'video', 'watch', 'show me', 'tutorial', 'guide', 'how to',
            'demonstration', 'visual', 'step by step', 'procedure'
        ];
        
        const messageLower = message.toLowerCase();
        return videoTriggers.some(trigger => messageLower.includes(trigger)) ||
               messageLower.includes('fault') || // Always search for fault codes
               messageLower.includes('repair') ||
               messageLower.includes('diagnostic');
    }

    /**
     * Search manufacturer websites for technical documentation
     */
    async searchManufacturerWebsites(manufacturer, faultCode, model = null) {
        try {
            
            // Define manufacturer website patterns
            const manufacturerSites = {
                'ideal': ['idealheating.com', 'ideal-heating.com'],
                'vaillant': ['vaillant.co.uk', 'vaillant.com'],
                'worcester': ['worcesterbosch.co.uk', 'worcester-bosch.com'],
                'baxi': ['baxi.co.uk', 'baxi.com'],
                'viessmann': ['viessmann.co.uk', 'viessmann.com'],
                'ariston': ['ariston.com', 'ariston.co.uk'],
                'glow-worm': ['glow-worm.co.uk'],
                'alpha': ['alpha-innovation.co.uk']
            };
            
            const sites = manufacturerSites[manufacturer.toLowerCase()] || [];
            const searchResults = [];
            
            for (const site of sites.slice(0, 2)) { // Limit to 2 sites per manufacturer
                const queries = [
                    `site:${site} ${faultCode} fault code`,
                    `site:${site} ${model || ''} ${faultCode} error`,
                    `site:${site} service manual ${faultCode}`,
                    `site:${site} technical bulletin ${faultCode}`
                ].filter(q => q.trim());
                
                for (const query of queries.slice(0, 2)) {
                    const results = await this.searchWebDiagnostics(query);
                    searchResults.push(...results);
                    
                    // Small delay to respect rate limits
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
            
            return this.deduplicateWebResults(searchResults);
            
        } catch (error) {
            console.error('[MCP Manufacturer] Website search failed:', error);
            return [];
        }
    }

    /**
     * Scrape manufacturer technical documentation
     */
    async scrapeManufacturerDocs(url, faultCode) {
        try {
            
            const scrapedData = await this.callMCPTool('web-scraper', 'scrape_page', {
                url: url,
                wait_for: 'networkidle0',
                extract_text: true,
                extract_links: true
            });
            
            if (scrapedData && scrapedData.text) {
                // Extract relevant sections about the fault code
                const relevantSections = this.extractRelevantDocSections(
                    scrapedData.text, 
                    faultCode
                );
                
                return {
                    url,
                    title: scrapedData.title || 'Technical Documentation',
                    text: scrapedData.text,
                    relevantSections,
                    links: scrapedData.links || [],
                    extractedAt: new Date().toISOString()
                };
            }
            
            return null;
        } catch (error) {
            console.error(`[MCP Scraper] Failed to scrape ${url}:`, error);
            return null;
        }
    }

    /**
     * Extract relevant sections from technical documentation
     */
    extractRelevantDocSections(text, faultCode) {
        const sections = [];
        const lines = text.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Look for fault code mentions with context
            if (line.toLowerCase().includes(faultCode.toLowerCase())) {
                const startIdx = Math.max(0, i - 3);
                const endIdx = Math.min(lines.length, i + 10);
                const section = lines.slice(startIdx, endIdx).join('\n');
                
                sections.push({
                    type: 'fault_code_reference',
                    content: section,
                    lineNumber: i
                });
            }
            
            // Look for diagnostic procedure sections
            if (line.toLowerCase().includes('diagnostic') || 
                line.toLowerCase().includes('troubleshoot') ||
                line.toLowerCase().includes('fault finding')) {
                const startIdx = Math.max(0, i - 1);
                const endIdx = Math.min(lines.length, i + 8);
                const section = lines.slice(startIdx, endIdx).join('\n');
                
                sections.push({
                    type: 'diagnostic_procedure',
                    content: section,
                    lineNumber: i
                });
            }
        }
        
        return sections.slice(0, 5); // Limit to 5 most relevant sections
    }

    /**
     * Web search for additional diagnostic information
     */
    async searchWebDiagnostics(query) {
        try {
            
            const searchResults = await this.callMCPTool('web-search', 'search', {
                query: query,
                count: 5,
                search_type: 'web'
            });
            
            return searchResults || [];
        } catch (error) {
            console.error('[MCP Web] Search failed:', error);
            return [];
        }
    }

    /**
     * Search for manufacturer service bulletins and technical updates
     */
    async searchServiceBulletins(manufacturer, faultCode) {
        try {
            
            const queries = [
                `${manufacturer} service bulletin ${faultCode}`,
                `${manufacturer} technical update ${faultCode}`,
                `${manufacturer} recall ${faultCode}`,
                `${manufacturer} field notice ${faultCode}`,
                `${manufacturer} TSB ${faultCode}` // Technical Service Bulletin
            ];
            
            const allResults = [];
            
            for (const query of queries.slice(0, 3)) {
                const results = await this.searchWebDiagnostics(query);
                allResults.push(...results);
                
                // Small delay between searches
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            return this.deduplicateWebResults(allResults);
            
        } catch (error) {
            console.error('[MCP Bulletins] Service bulletin search failed:', error);
            return [];
        }
    }

    /**
     * Remove duplicate web search results
     */
    deduplicateWebResults(results) {
        const unique = [];
        const seenUrls = new Set();
        
        for (const result of results) {
            if (result.url && !seenUrls.has(result.url)) {
                seenUrls.add(result.url);
                unique.push(result);
            }
        }
        
        return unique;
    }
}

export default MCPIntegrationService;
