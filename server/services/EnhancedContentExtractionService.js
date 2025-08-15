/**
 * Enhanced Content Extraction Service
 * Advanced technical content extraction for professional Gas Safe diagnostic standards
 * Leverages new database enhancements for better knowledge quality
 */

import { createClient } from '@supabase/supabase-js';

class EnhancedContentExtractionService {
    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        );
        
        // Technical value extraction patterns
        this.technicalPatterns = {
            voltage: /(\d+(?:\.\d+)?)\s*(?:v|volt|volts|vdc|vac)/gi,
            pressure: /(\d+(?:\.\d+)?)\s*(?:mbar|bar|psi|kpa)/gi,
            temperature: /(\d+(?:\.\d+)?)\s*(?:°c|celsius|degrees)/gi,
            resistance: /(\d+(?:\.\d+)?)\s*(?:ω|ohm|ohms|kω|kohm)/gi,
            current: /(\d+(?:\.\d+)?)\s*(?:μa|ma|amp|amps|microamp)/gi,
            frequency: /(\d+(?:\.\d+)?)\s*(?:hz|hertz|khz)/gi,
            flow: /(\d+(?:\.\d+)?)\s*(?:l\/min|lpm|gpm|m³\/h)/gi
        };
        
        // Component identification patterns
        this.componentPatterns = {
            'gas_valve': /gas\s+valve|solenoid\s+valve|main\s+valve/gi,
            'ignition_electrode': /ignition\s+electrode|spark\s+electrode|igniter/gi,
            'flame_sensor': /flame\s+sensor|flame\s+detection|ionisation/gi,
            'pcb': /pcb|printed\s+circuit\s+board|control\s+board|main\s+board/gi,
            'heat_exchanger': /heat\s+exchanger|primary\s+heat\s+exchanger/gi,
            'pump': /circulation\s+pump|heating\s+pump|water\s+pump/gi,
            'diverter_valve': /diverter\s+valve|3-way\s+valve|motorised\s+valve/gi,
            'pressure_switch': /pressure\s+switch|air\s+pressure\s+switch/gi,
            'thermistor': /thermistor|temperature\s+sensor|ntc/gi,
            'fan': /fan|combustion\s+fan|centrifugal\s+fan/gi
        };
        
        // Safety procedure patterns
        this.safetyPatterns = {
            'gas_isolation': /turn\s+off\s+gas|isolate\s+gas|gas\s+isolation|close\s+gas\s+valve/gi,
            'electrical_isolation': /isolate\s+electrical|turn\s+off\s+power|electrical\s+isolation/gi,
            'pressure_release': /release\s+pressure|depressurise|vent\s+system/gi,
            'safety_checks': /safety\s+check|gas\s+tightness|let\s+by\s+test|spillage\s+test/gi,
            'ppe_requirements': /safety\s+glasses|gloves|ppe|personal\s+protective/gi
        };
        
        // Part number patterns
        this.partNumberPatterns = [
            /part\s+(?:number|no\.?)\s*:?\s*([A-Z0-9\-\/]+)/gi,
            /p\/n\s*:?\s*([A-Z0-9\-\/]+)/gi,
            /code\s*:?\s*([A-Z0-9\-\/]+)/gi,
            /ref\s*:?\s*([A-Z0-9\-\/]+)/gi
        ];
        
        // Test equipment patterns
        this.testEquipmentPatterns = {
            'multimeter': /multimeter|digital\s+meter|electrical\s+meter/gi,
            'manometer': /manometer|pressure\s+gauge|gas\s+pressure\s+meter/gi,
            'gas_analyzer': /gas\s+analyzer|flue\s+gas\s+analyzer|combustion\s+analyzer/gi,
            'oscilloscope': /oscilloscope|scope|signal\s+analyzer/gi,
            'thermometer': /thermometer|temperature\s+probe|infrared\s+thermometer/gi,
            'flow_meter': /flow\s+meter|water\s+flow\s+meter/gi
        };
    }

    /**
     * Extract comprehensive technical data from content
     */
    async extractTechnicalData(content, faultCode, manufacturer) {
        const technicalData = {
            technical_values: {},
            component_specifications: {},
            safety_procedures: [],
            gas_safe_regulations: [],
            part_numbers: [],
            test_equipment: [],
            step_by_step_procedure: [],
            estimated_repair_time: null,
            skill_level_required: 'professional',
            manufacturer_official: false,
            gas_safe_official: false
        };

        // Extract technical values
        for (const [type, pattern] of Object.entries(this.technicalPatterns)) {
            const matches = [...content.matchAll(pattern)];
            if (matches.length > 0) {
                technicalData.technical_values[type] = matches.map(match => ({
                    value: parseFloat(match[1]),
                    unit: match[0].replace(match[1], '').trim(),
                    context: this.extractContext(content, match.index, 50)
                }));
            }
        }

        // Extract component specifications
        for (const [component, pattern] of Object.entries(this.componentPatterns)) {
            const matches = [...content.matchAll(pattern)];
            if (matches.length > 0) {
                technicalData.component_specifications[component] = {
                    mentioned: true,
                    context: matches.map(match => this.extractContext(content, match.index, 100)),
                    technical_specs: this.extractComponentSpecs(content, component)
                };
            }
        }

        // Extract safety procedures
        for (const [safetyType, pattern] of Object.entries(this.safetyPatterns)) {
            const matches = [...content.matchAll(pattern)];
            if (matches.length > 0) {
                technicalData.safety_procedures.push({
                    type: safetyType,
                    procedures: matches.map(match => this.extractContext(content, match.index, 150))
                });
            }
        }

        // Extract part numbers
        for (const pattern of this.partNumberPatterns) {
            const matches = [...content.matchAll(pattern)];
            technicalData.part_numbers.push(...matches.map(match => match[1]));
        }

        // Extract test equipment
        for (const [equipment, pattern] of Object.entries(this.testEquipmentPatterns)) {
            if (pattern.test(content)) {
                technicalData.test_equipment.push(equipment);
            }
        }

        // Extract step-by-step procedures
        technicalData.step_by_step_procedure = this.extractStepByStepProcedure(content);

        // Extract estimated repair time
        technicalData.estimated_repair_time = this.extractRepairTime(content);

        // Determine skill level
        technicalData.skill_level_required = this.determineSkillLevel(content);

        // Check source authority
        technicalData.manufacturer_official = this.isManufacturerOfficial(content, manufacturer);
        technicalData.gas_safe_official = this.isGasSafeOfficial(content);

        // Extract Gas Safe regulations
        technicalData.gas_safe_regulations = this.extractGasSafeRegulations(content);

        return technicalData;
    }

    /**
     * Calculate enhanced reliability score using new criteria
     */
    async calculateEnhancedReliabilityScore(content, sourceUrl, sourceType, technicalData) {
        let score = 0;
        const factors = [];

        // Get scoring criteria from database
        const { data: criteria } = await this.supabase
            .from('reliability_scoring_criteria')
            .select('*')
            .eq('active', true);

        // Get source quality data
        const domain = this.extractDomain(sourceUrl);
        const { data: sourceQuality } = await this.supabase
            .from('source_quality_tracking')
            .select('*')
            .eq('source_domain', domain)
            .single();

        // Base score from source quality
        if (sourceQuality) {
            score += sourceQuality.base_reliability_score;
            factors.push(`Base source score: ${sourceQuality.base_reliability_score}`);
        } else {
            score += 40; // Default base score
        }

        // Technical specificity scoring
        const technicalValueCount = Object.keys(technicalData.technical_values).length;
        const componentSpecCount = Object.keys(technicalData.component_specifications).length;
        const partNumberCount = technicalData.part_numbers.length;

        if (technicalValueCount > 0) {
            score += Math.min(technicalValueCount * 3, 15);
            factors.push(`Technical values: +${Math.min(technicalValueCount * 3, 15)}`);
        }

        if (componentSpecCount > 0) {
            score += Math.min(componentSpecCount * 2, 10);
            factors.push(`Component specs: +${Math.min(componentSpecCount * 2, 10)}`);
        }

        if (partNumberCount > 0) {
            score += Math.min(partNumberCount * 2, 8);
            factors.push(`Part numbers: +${Math.min(partNumberCount * 2, 8)}`);
        }

        // Safety compliance scoring
        if (technicalData.safety_procedures.length > 0) {
            score += Math.min(technicalData.safety_procedures.length * 3, 12);
            factors.push(`Safety procedures: +${Math.min(technicalData.safety_procedures.length * 3, 12)}`);
        }

        if (technicalData.gas_safe_regulations.length > 0) {
            score += Math.min(technicalData.gas_safe_regulations.length * 4, 16);
            factors.push(`Gas Safe regulations: +${Math.min(technicalData.gas_safe_regulations.length * 4, 16)}`);
        }

        // Step-by-step procedure scoring
        if (technicalData.step_by_step_procedure.length > 0) {
            score += Math.min(technicalData.step_by_step_procedure.length * 2, 12);
            factors.push(`Procedure steps: +${Math.min(technicalData.step_by_step_procedure.length * 2, 12)}`);
        }

        // Test equipment scoring
        if (technicalData.test_equipment.length > 0) {
            score += Math.min(technicalData.test_equipment.length * 2, 8);
            factors.push(`Test equipment: +${Math.min(technicalData.test_equipment.length * 2, 8)}`);
        }

        // Official source bonuses
        if (technicalData.manufacturer_official) {
            score += 15;
            factors.push('Manufacturer official: +15');
        }

        if (technicalData.gas_safe_official) {
            score += 20;
            factors.push('Gas Safe official: +20');
        }

        // Professional skill level bonus
        if (technicalData.skill_level_required === 'professional') {
            score += 5;
            factors.push('Professional level: +5');
        }

        // Cap score at 100
        score = Math.min(score, 100);

        return {
            score,
            factors,
            technical_depth: this.calculateTechnicalDepth(technicalData),
            safety_compliance: this.calculateSafetyCompliance(technicalData),
            professional_readiness: score >= 80
        };
    }

    /**
     * Store enhanced knowledge with technical data
     */
    async storeEnhancedKnowledge(knowledgeData, technicalData, reliabilityAnalysis) {
        try {
            // Store main knowledge record with enhanced fields
            const { data: knowledge, error: knowledgeError } = await this.supabase
                .from('discovered_knowledge')
                .insert({
                    ...knowledgeData,
                    ...technicalData,
                    reliability_score: reliabilityAnalysis.score
                })
                .select()
                .single();

            if (knowledgeError) throw knowledgeError;

            // Store quality metrics
            await this.supabase
                .from('content_quality_metrics')
                .insert({
                    discovered_knowledge_id: knowledge.id,
                    technical_depth_score: reliabilityAnalysis.technical_depth,
                    safety_compliance_score: reliabilityAnalysis.safety_compliance,
                    professional_standards_score: reliabilityAnalysis.score,
                    diagnostic_relevance_score: this.calculateDiagnosticRelevance(knowledgeData, technicalData),
                    content_specificity_score: this.calculateContentSpecificity(technicalData),
                    
                    // Quality indicators
                    has_technical_values: Object.keys(technicalData.technical_values).length > 0,
                    has_safety_procedures: technicalData.safety_procedures.length > 0,
                    has_step_by_step_guide: technicalData.step_by_step_procedure.length > 0,
                    has_part_numbers: technicalData.part_numbers.length > 0,
                    has_test_equipment: technicalData.test_equipment.length > 0,
                    has_gas_safe_compliance: technicalData.gas_safe_regulations.length > 0,
                    
                    // Content analysis
                    word_count: knowledgeData.extracted_content.split(' ').length,
                    technical_terms_count: this.countTechnicalTerms(knowledgeData.extracted_content),
                    safety_warnings_count: technicalData.safety_procedures.length,
                    procedure_steps_count: technicalData.step_by_step_procedure.length,
                    
                    overall_quality_score: reliabilityAnalysis.score,
                    gas_safe_ready: reliabilityAnalysis.safety_compliance >= 80,
                    professional_ready: reliabilityAnalysis.professional_readiness
                });

            // Store technical specifications if detailed enough
            if (Object.keys(technicalData.technical_values).length > 0) {
                const techSpecs = this.prepareTechnicalSpecifications(knowledge, technicalData);
                if (techSpecs.length > 0) {
                    await this.supabase
                        .from('technical_specifications')
                        .insert(techSpecs);
                }
            }

            // Store diagnostic procedures if structured enough
            if (technicalData.step_by_step_procedure.length > 0) {
                const procedures = this.prepareDiagnosticProcedures(knowledge, technicalData);
                if (procedures.length > 0) {
                    await this.supabase
                        .from('enhanced_diagnostic_procedures')
                        .insert(procedures);
                }
            }

            return {
                success: true,
                knowledgeId: knowledge.id,
                reliabilityScore: reliabilityAnalysis.score,
                qualityMetrics: reliabilityAnalysis
            };

        } catch (error) {
            console.error('[Enhanced Content Extraction] Storage error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Helper methods for content analysis
    extractContext(content, index, length) {
        const start = Math.max(0, index - length);
        const end = Math.min(content.length, index + length);
        return content.substring(start, end).trim();
    }

    extractComponentSpecs(content, component) {
        // Extract technical specifications for specific components
        const specs = {};
        const componentContext = content.toLowerCase();
        
        if (componentContext.includes(component)) {
            // Look for voltage specifications
            const voltageMatch = componentContext.match(new RegExp(`${component}.*?(\\d+(?:\\.\\d+)?)\\s*(?:v|volt)`, 'i'));
            if (voltageMatch) specs.voltage = voltageMatch[1];
            
            // Look for resistance specifications
            const resistanceMatch = componentContext.match(new RegExp(`${component}.*?(\\d+(?:\\.\\d+)?)\\s*(?:ω|ohm)`, 'i'));
            if (resistanceMatch) specs.resistance = resistanceMatch[1];
        }
        
        return specs;
    }

    extractStepByStepProcedure(content) {
        const steps = [];
        const stepPatterns = [
            /step\s+(\d+)[:\.]?\s*([^.!?]*[.!?])/gi,
            /(\d+)[:\.]?\s*([^.!?]*(?:check|test|measure|verify)[^.!?]*[.!?])/gi
        ];

        for (const pattern of stepPatterns) {
            const matches = [...content.matchAll(pattern)];
            steps.push(...matches.map(match => ({
                step: parseInt(match[1]),
                description: match[2].trim()
            })));
        }

        return steps.sort((a, b) => a.step - b.step).map(s => s.description);
    }

    extractRepairTime(content) {
        const timePattern = /(?:take|takes|approximately|about|around)\s+(\d+)\s*(?:minutes?|mins?|hours?)/gi;
        const match = timePattern.exec(content);
        if (match) {
            const value = parseInt(match[1]);
            const unit = match[0].toLowerCase();
            return unit.includes('hour') ? value * 60 : value;
        }
        return null;
    }

    determineSkillLevel(content) {
        const professionalIndicators = [
            /gas\s+safe/gi,
            /qualified\s+engineer/gi,
            /professional/gi,
            /certified/gi,
            /licensed/gi
        ];

        const basicIndicators = [
            /diy/gi,
            /homeowner/gi,
            /simple/gi,
            /easy/gi
        ];

        const professionalCount = professionalIndicators.reduce((count, pattern) => 
            count + (pattern.test(content) ? 1 : 0), 0);
        const basicCount = basicIndicators.reduce((count, pattern) => 
            count + (pattern.test(content) ? 1 : 0), 0);

        if (professionalCount > basicCount) return 'professional';
        if (basicCount > 0) return 'basic';
        return 'intermediate';
    }

    isManufacturerOfficial(content, manufacturer) {
        const officialIndicators = [
            new RegExp(`${manufacturer}.*(?:official|service\\s+bulletin|technical\\s+bulletin)`, 'gi'),
            /official\s+(?:guidance|documentation|manual)/gi,
            /service\s+bulletin/gi,
            /technical\s+bulletin/gi
        ];

        return officialIndicators.some(pattern => pattern.test(content));
    }

    isGasSafeOfficial(content) {
        const gasSafeIndicators = [
            /gas\s+safe\s+register.*official/gi,
            /official\s+gas\s+safe/gi,
            /gas\s+safety.*regulation/gi
        ];

        return gasSafeIndicators.some(pattern => pattern.test(content));
    }

    extractGasSafeRegulations(content) {
        const regulations = [];
        const regulationPatterns = [
            /gas\s+safety.*regulation\s*(\d+)/gi,
            /bs\s*(\d+)/gi,
            /building\s+regulation\s*([a-z]\d*)/gi
        ];

        for (const pattern of regulationPatterns) {
            const matches = [...content.matchAll(pattern)];
            regulations.push(...matches.map(match => match[0]));
        }

        return [...new Set(regulations)]; // Remove duplicates
    }

    calculateTechnicalDepth(technicalData) {
        let score = 0;
        score += Object.keys(technicalData.technical_values).length * 10;
        score += Object.keys(technicalData.component_specifications).length * 8;
        score += technicalData.part_numbers.length * 5;
        score += technicalData.test_equipment.length * 6;
        return Math.min(score, 100);
    }

    calculateSafetyCompliance(technicalData) {
        let score = 0;
        score += technicalData.safety_procedures.length * 15;
        score += technicalData.gas_safe_regulations.length * 20;
        if (technicalData.gas_safe_official) score += 30;
        return Math.min(score, 100);
    }

    calculateDiagnosticRelevance(knowledgeData, technicalData) {
        let score = 50; // Base score
        
        // Fault code specificity
        if (knowledgeData.fault_code && knowledgeData.fault_code !== 'UNKNOWN') {
            score += 20;
        }
        
        // Manufacturer specificity
        if (knowledgeData.manufacturer && knowledgeData.manufacturer !== 'UNKNOWN') {
            score += 15;
        }
        
        // Diagnostic procedure presence
        if (technicalData.step_by_step_procedure.length > 0) {
            score += 15;
        }
        
        return Math.min(score, 100);
    }

    calculateContentSpecificity(technicalData) {
        let score = 0;
        
        // Technical values specificity
        const techValueCount = Object.keys(technicalData.technical_values).length;
        score += Math.min(techValueCount * 8, 40);
        
        // Component specificity
        const componentCount = Object.keys(technicalData.component_specifications).length;
        score += Math.min(componentCount * 6, 30);
        
        // Part number specificity
        score += Math.min(technicalData.part_numbers.length * 5, 20);
        
        // Procedure specificity
        score += Math.min(technicalData.step_by_step_procedure.length * 2, 10);
        
        return Math.min(score, 100);
    }

    countTechnicalTerms(content) {
        const technicalTerms = [
            'voltage', 'current', 'resistance', 'pressure', 'temperature',
            'multimeter', 'manometer', 'pcb', 'solenoid', 'thermistor',
            'electrode', 'sensor', 'valve', 'pump', 'heat exchanger'
        ];
        
        return technicalTerms.reduce((count, term) => {
            const regex = new RegExp(term, 'gi');
            const matches = content.match(regex);
            return count + (matches ? matches.length : 0);
        }, 0);
    }

    prepareTechnicalSpecifications(knowledge, technicalData) {
        const specs = [];
        
        for (const [type, values] of Object.entries(technicalData.technical_values)) {
            for (const valueData of values) {
                specs.push({
                    fault_code: knowledge.fault_code,
                    manufacturer: knowledge.manufacturer,
                    model: knowledge.model,
                    component_name: 'General', // Could be enhanced to detect specific components
                    specification_type: type,
                    nominal_value: valueData.value,
                    unit: valueData.unit,
                    source_url: knowledge.source_url,
                    reliability_score: knowledge.reliability_score,
                    verified: knowledge.reliability_score >= 80
                });
            }
        }
        
        return specs;
    }

    prepareDiagnosticProcedures(knowledge, technicalData) {
        const procedures = [];
        
        technicalData.step_by_step_procedure.forEach((step, index) => {
            procedures.push({
                fault_code: knowledge.fault_code,
                manufacturer: knowledge.manufacturer,
                model: knowledge.model,
                procedure_name: `Diagnostic Procedure for ${knowledge.fault_code}`,
                procedure_type: 'diagnostic_test',
                step_number: index + 1,
                step_description: step,
                tools_required: technicalData.test_equipment,
                safety_warnings: technicalData.safety_procedures.map(sp => sp.type),
                estimated_time_minutes: technicalData.estimated_repair_time,
                skill_level: technicalData.skill_level_required,
                source_url: knowledge.source_url,
                reliability_score: knowledge.reliability_score,
                verified: knowledge.reliability_score >= 80
            });
        });
        
        return procedures;
    }

    extractDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.toLowerCase();
        } catch (error) {
            return '';
        }
    }
}

export default EnhancedContentExtractionService;
