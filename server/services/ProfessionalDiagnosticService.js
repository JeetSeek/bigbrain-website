/**
 * Professional Diagnostic Service
 * Integrates with the new professional diagnostic database schema for Gas Safe engineer-level responses
 */

import { createClient } from '@supabase/supabase-js';
import MCPIntegrationService from './MCPIntegrationService.js';
import KnowledgeIngestionService from './KnowledgeIngestionService.js';

class ProfessionalDiagnosticService {
    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        );
        this.mcpService = new MCPIntegrationService();
        this.knowledgeIngestion = new KnowledgeIngestionService();
        this.cache = {
            manufacturers: new Map(),
            components: new Map(),
            procedures: new Map(),
            lastCacheUpdate: null,
            cacheTimeout: 30 * 60 * 1000 // 30 minutes
        };
    }

    /**
     * Extract diagnostic context from user message
     */
    extractDiagnosticContext(message) {
        
        const context = {
            faultCodes: [],
            manufacturer: null,
            model: null,
            systemType: null,
            symptoms: [],
            components: []
        };

        // Extract fault codes (F1, F2, F22, E1, L8, etc.)
        const faultCodePattern = /[FEL]\d{1,3}/gi;
        const faultMatches = message.match(faultCodePattern);
        if (faultMatches) {
            context.faultCodes = [...new Set(faultMatches.map(code => code.toUpperCase()))];
        }

        // Extract manufacturer names
        const manufacturers = [
            'Vaillant', 'Worcester', 'Bosch', 'Ideal', 'Baxi', 'Potterton',
            'Glow-worm', 'Ariston', 'Viessmann', 'Alpha', 'Ferroli', 'Ravenheat',
            'Intergas', 'Siemens', 'Remeha', 'Halstead', 'Main', 'Keston'
        ];
        
        for (const manufacturer of manufacturers) {
            if (message.toLowerCase().includes(manufacturer.toLowerCase())) {
                context.manufacturer = manufacturer;
                break;
            }
        }
        

        // Extract system types
        const systemTypes = ['combi', 'system', 'heat only', 'back boiler', 'regular'];
        for (const type of systemTypes) {
            if (message.toLowerCase().includes(type.toLowerCase())) {
                context.systemType = type;
                break;
            }
        }

        // Extract common components
        const components = [
            'gas valve', 'heat exchanger', 'pump', 'fan', 'pcb', 'ignition',
            'flame sensor', 'pressure sensor', 'temperature sensor', 'diverter valve',
            'expansion vessel', 'pressure relief valve', 'flue', 'air intake'
        ];
        
        for (const component of components) {
            if (message.toLowerCase().includes(component.toLowerCase())) {
                context.components.push(component);
            }
        }

        return context;
    }

    /**
     * Get professional fault code data from boiler_fault_codes table
     */
    async getProfessionalFaultCodeData(faultCodes, manufacturer = null) {
        try {
            console.log(`[DEBUG] Querying fault codes: ${JSON.stringify(faultCodes)}, manufacturer: ${manufacturer}`);
            
            let query = this.supabase
                .from('boiler_fault_codes')
                .select(`
                    fault_code,
                    description,
                    solutions,
                    manufacturer,
                    model_name,
                    gc_number
                `);

            if (faultCodes.length > 0) {
                // Use exact match for fault codes (they should be exact)
                query = query.in('fault_code', faultCodes);
            }

            if (manufacturer) {
                query = query.ilike('manufacturer', `%${manufacturer}%`);
            }

            const { data, error } = await query.limit(10);

            if (error) {
                console.error('Error fetching professional fault codes:', error);
                console.error('Query details:', { faultCodes, manufacturer });
                return [];
            }

            console.log(`[DEBUG] Found ${data?.length || 0} fault code records:`, JSON.stringify(data, null, 2));
            
            // If no data found, let's try a broader search to debug
            if (!data || data.length === 0) {
                const { data: broadData, error: broadError } = await this.supabase
                    .from('boiler_fault_codes')
                    .select('fault_code, manufacturer, description')
                    .ilike('manufacturer', '%Ideal%')
                    .limit(5);
                    
                console.log(`[DEBUG] Broad search found ${broadData?.length || 0} Ideal records:`, JSON.stringify(broadData, null, 2));
            }
            
            return data || [];
        } catch (error) {
            console.error('Professional fault code query failed:', error);
            return [];
        }
    }

    /**
     * Get component technical specifications
     */
    async getComponentSpecs(components) {
        if (components.length === 0) return [];

        try {
            const { data, error } = await this.supabase
                .from('boiler_components')
                .select(`
                    component_name,
                    component_type,
                    function_description,
                    electrical_specs,
                    operating_parameters,
                    test_procedures,
                    common_failure_modes,
                    safety_warnings,
                    isolation_requirements
                `)
                .in('component_name', components)
                .limit(5);

            if (error) {
                console.error('Error fetching component specs:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('Component specs query failed:', error);
            return [];
        }
    }

    /**
     * Get relevant diagnostic procedures from existing boiler_diagnostics table
     */
    async getDiagnosticProcedures(context) {
        try {
            let query = this.supabase
                .from('boiler_diagnostics')
                .select(`
                    section,
                    subsection,
                    content
                `);

            // Search for relevant diagnostic content
            if (context.faultCodes.length > 0) {
                query = query.or(`content.ilike.%${context.faultCodes[0]}%,section.ilike.%fault%`);
            }

            const { data, error } = await query.limit(3);

            if (error) {
                console.error('Error fetching diagnostic procedures:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('Diagnostic procedures query failed:', error);
            return [];
        }
    }

    /**
     * Get professional knowledge from existing knowledge_base
     */
    async getProfessionalKnowledge(context) {
        try {
            let query = this.supabase
                .from('knowledge_base')
                .select(`
                    content,
                    tag,
                    source
                `);

            // Search by fault codes or components
            if (context.faultCodes.length > 0) {
                query = query.or(`content.ilike.%${context.faultCodes[0]}%,tag.ilike.%${context.faultCodes[0]}%`);
            } else if (context.components.length > 0) {
                query = query.or(`content.ilike.%${context.components[0]}%,tag.ilike.%${context.components[0]}%`);
            }

            const { data, error } = await query.limit(3);

            if (error) {
                console.error('Error fetching professional knowledge:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('Professional knowledge query failed:', error);
            return [];
        }
    }

    /**
     * Build enhanced system prompt with professional diagnostic data
     */
    async buildProfessionalPrompt(basePrompt, userMessage) {
        const context = this.extractDiagnosticContext(userMessage);
        
        // Check if video search is requested or relevant
        const shouldSearchVideos = this.mcpService.shouldSearchVideos(userMessage) || 
                                   context.faultCodes.length > 0;
        
        // Get professional diagnostic data (including video search if relevant)
        const dataPromises = [
            this.getProfessionalFaultCodeData(context.faultCodes, context.manufacturer),
            this.getComponentSpecs(context.components),
            this.getDiagnosticProcedures(context),
            this.getProfessionalKnowledge(context)
        ];
        
        // Add video search if relevant
        if (shouldSearchVideos && context.faultCodes.length > 0) {
            dataPromises.push(
                this.mcpService.enhanceDiagnosticContext(context)
            );
        }
        
        const results = await Promise.all(dataPromises).catch(error => {
            console.error('Error fetching diagnostic data:', error);
            return [[], [], [], [], null];
        });
        
        const [faultCodeData, componentSpecs, procedures, knowledge, videoData] = results;
        
        // Automatically ingest and store new knowledge from MCP sources
        if (videoData && (videoData.videos?.length > 0 || videoData.webResults?.length > 0)) {
            
            // Run knowledge ingestion in background (don't block response)
            this.knowledgeIngestion.batchProcessKnowledge(videoData, context)
                .then(ingestionResults => {
                })
                .catch(error => {
                    console.error('[Knowledge Ingestion] Background processing failed:', error);
                });
        }

        let enhancedPrompt = basePrompt;

        // Add professional diagnostic context
        if (context.faultCodes.length > 0 || context.manufacturer) {
            enhancedPrompt += '\n\n**PROFESSIONAL DIAGNOSTIC CONTEXT:**\n';
            if (context.manufacturer) {
                enhancedPrompt += `Manufacturer: ${context.manufacturer}\n`;
            }
            if (context.systemType) {
                enhancedPrompt += `System Type: ${context.systemType}\n`;
            }
            if (context.faultCodes.length > 0) {
                enhancedPrompt += `Fault Codes: ${context.faultCodes.join(', ')}\n`;
            }
        }

        // Add professional fault code data
        if (faultCodeData && faultCodeData.length > 0) {
            enhancedPrompt += '\n\n**PROFESSIONAL FAULT CODE DATABASE:**\n';
            faultCodeData.forEach(fault => {
                enhancedPrompt += `\n**${fault.fault_code}** (${fault.manufacturer}):\n`;
                enhancedPrompt += `Description: ${fault.description}\n`;
                enhancedPrompt += `Model: ${fault.model_name || 'Multiple models'}\n`;
                
                if (fault.solutions) {
                    enhancedPrompt += `Solutions:\n${fault.solutions}\n`;
                }
                
                if (fault.gc_number) {
                    enhancedPrompt += `GC Number: ${fault.gc_number}\n`;
                }
                
                enhancedPrompt += `\n**CRITICAL**: Use this exact fault code information as your primary diagnostic reference.\n`;
            });
        }

        // Add component technical specifications
        if (componentSpecs && componentSpecs.length > 0) {
            enhancedPrompt += '\n\n**COMPONENT TECHNICAL SPECIFICATIONS:**\n';
            componentSpecs.forEach(component => {
                enhancedPrompt += `\n**${component.component_name}** (${component.component_type}):\n`;
                enhancedPrompt += `Function: ${component.function_description}\n`;
                
                if (component.electrical_specs) {
                    enhancedPrompt += `Electrical Specs: ${JSON.stringify(component.electrical_specs)}\n`;
                }
                
                if (component.test_procedures) {
                    enhancedPrompt += `Test Procedures: ${JSON.stringify(component.test_procedures)}\n`;
                }
                
                if (component.common_failure_modes) {
                    enhancedPrompt += `Common Failures: ${JSON.stringify(component.common_failure_modes)}\n`;
                }
                
                if (component.safety_warnings) {
                    enhancedPrompt += `Safety Warnings: ${JSON.stringify(component.safety_warnings)}\n`;
                }
            });
        }

        // Add diagnostic procedures from existing boiler_diagnostics
        if (procedures && procedures.length > 0) {
            enhancedPrompt += '\n\n**DIAGNOSTIC PROCEDURES:**\n';
            procedures.forEach(procedure => {
                enhancedPrompt += `\n**${procedure.section}** - ${procedure.subsection}:\n`;
                enhancedPrompt += `${procedure.content}\n`;
            });
        }

        // Add professional knowledge from existing knowledge_base
        if (knowledge && knowledge.length > 0) {
            enhancedPrompt += '\n\n**PROFESSIONAL KNOWLEDGE BASE:**\n';
            knowledge.forEach(item => {
                enhancedPrompt += `\n**${item.tag || 'Knowledge'}**:\n`;
                enhancedPrompt += `${item.content}\n`;
                
                if (item.source) {
                    enhancedPrompt += `Source: ${item.source}\n`;
                }
            });
        }

        // Add video-derived diagnostic knowledge and links
        if (videoData && videoData.videos && videoData.videos.length > 0) {
            
            // Add extracted knowledge from video transcripts
            if (videoData.extractedKnowledge) {
                enhancedPrompt += videoData.extractedKnowledge;
            }
            
            // Add comprehensive multimedia results (videos + web + manufacturer data)
            enhancedPrompt += this.mcpService.formatMultimediaResults(videoData);
            
            // Add instruction to include multimedia links in response
            enhancedPrompt += '\n**MULTIMEDIA INTEGRATION INSTRUCTION:**\n';
            enhancedPrompt += 'Include relevant video and documentation links in your response when they provide additional diagnostic value.\n';
            enhancedPrompt += 'Format video links as: "📺 [Video Title](URL) - Brief description"\n';
            enhancedPrompt += 'Format documentation links as: "📄 [Document Title](URL) - Brief description"\n';
            enhancedPrompt += 'Format service bulletins as: "📋 [Bulletin Title](URL) - Brief description"\n';
            enhancedPrompt += 'Only include resources that directly relate to the specific fault code or diagnostic procedure.\n';
            enhancedPrompt += 'Prioritize official manufacturer documentation and Gas Safe approved resources.\n';
        }

        // Add professional response guidelines
        enhancedPrompt += '\n\n**PROFESSIONAL RESPONSE PROTOCOL:**\n';
        enhancedPrompt += '1. Use the professional diagnostic data provided above as your primary reference\n';
        enhancedPrompt += '2. Provide systematic, step-by-step diagnostic guidance following Gas Safe procedures\n';
        enhancedPrompt += '3. Reference specific fault codes, test procedures, and expected values from the database\n';
        enhancedPrompt += '4. Include safety warnings and isolation requirements for all work\n';
        enhancedPrompt += '5. Specify required test equipment and expected measurements\n';
        enhancedPrompt += '6. Maintain conversational engineer-to-engineer tone while being technically precise\n';
        enhancedPrompt += '7. If database information is incomplete, clearly state this and provide general professional guidance\n';
        enhancedPrompt += '\nDELIVER EXPERT GAS SAFE ENGINEER GUIDANCE: Use the comprehensive professional diagnostic database above to provide detailed, safety-focused, and technically accurate advice that meets Gas Safe standards.';

        return enhancedPrompt;
    }

    /**
     * Get diagnostic summary for logging/debugging
     */
    getDiagnosticSummary(context) {
        return {
            fault_codes: context.faultCodes,
            manufacturer: context.manufacturer,
            system_type: context.systemType,
            components: context.components,
            timestamp: new Date().toISOString()
        };
    }
}

export default ProfessionalDiagnosticService;
