-- Data Migration Script: Transfer existing fault codes to professional diagnostic schema
-- This script migrates data from existing tables to the new professional structure

-- First, ensure we have manufacturer data in the enhanced table
INSERT INTO manufacturers_enhanced (manufacturer_name, diagnostic_protocols, fault_code_patterns)
SELECT DISTINCT 
    manufacturer,
    jsonb_build_object(
        'standard_procedures', jsonb_build_array(
            'Visual inspection',
            'Electrical testing',
            'Gas tightness test',
            'Combustion analysis'
        ),
        'diagnostic_sequence', jsonb_build_array(
            'Check fault code display',
            'Record system parameters',
            'Follow manufacturer procedure',
            'Test related components'
        )
    ) as diagnostic_protocols,
    jsonb_build_object(
        'format', 'Standard alphanumeric',
        'prefix_meaning', 'F=Fault, E=Error, L=Lockout',
        'documentation_required', true
    ) as fault_code_patterns
FROM (
    SELECT DISTINCT manufacturer FROM boiler_fault_codes WHERE manufacturer IS NOT NULL
    UNION
    SELECT DISTINCT manufacturer FROM fault_codes WHERE manufacturer IS NOT NULL
) as manufacturers
ON CONFLICT (manufacturer_name) DO NOTHING;

-- Migrate fault codes from boiler_fault_codes table
INSERT INTO diagnostic_fault_codes (
    manufacturer_id,
    fault_code,
    fault_description,
    severity_level,
    gas_safe_category,
    root_causes,
    diagnostic_procedures,
    required_equipment,
    expected_values,
    safety_precautions,
    component_references
)
SELECT 
    me.id as manufacturer_id,
    bfc.fault_code,
    bfc.description as fault_description,
    CASE 
        WHEN bfc.fault_code LIKE 'F%' AND bfc.fault_code IN ('F1', 'F2', 'F3', 'F4', 'F5') THEN 'critical'
        WHEN bfc.fault_code LIKE 'F%' THEN 'major'
        WHEN bfc.fault_code LIKE 'E%' THEN 'minor'
        WHEN bfc.fault_code LIKE 'L%' THEN 'critical'
        ELSE 'warning'
    END as severity_level,
    'gas_appliance' as gas_safe_category,
    
    -- Convert solutions array to structured root causes
    CASE 
        WHEN bfc.solutions IS NOT NULL THEN
            jsonb_build_object(
                'primary_causes', bfc.solutions,
                'investigation_required', true,
                'component_failure_likely', true
            )
        ELSE
            jsonb_build_object(
                'primary_causes', jsonb_build_array('Component malfunction', 'System parameter out of range'),
                'investigation_required', true,
                'component_failure_likely', false
            )
    END as root_causes,
    
    -- Build professional diagnostic procedures
    jsonb_build_object(
        'initial_checks', jsonb_build_array(
            'Record all displayed fault codes',
            'Note system operating conditions',
            'Check gas supply and pressure',
            'Verify electrical supply'
        ),
        'systematic_testing', jsonb_build_array(
            'Isolate gas supply following Gas Safe procedures',
            'Test electrical continuity of related components',
            'Check wiring connections and terminals',
            'Measure operating parameters against specifications'
        ),
        'verification_steps', jsonb_build_array(
            'Clear fault codes',
            'Restart system under controlled conditions',
            'Monitor for fault recurrence',
            'Complete combustion analysis if required'
        )
    ) as diagnostic_procedures,
    
    -- Standard Gas Safe equipment requirements
    jsonb_build_object(
        'essential_equipment', jsonb_build_array(
            'Digital multimeter',
            'Manometer (gas pressure)',
            'Gas leak detector',
            'Combustion analyzer'
        ),
        'manufacturer_specific', jsonb_build_array(
            'Service manual',
            'Wiring diagrams',
            'Technical bulletins'
        ),
        'safety_equipment', jsonb_build_array(
            'Gas isolation tools',
            'Personal protective equipment',
            'Ventilation equipment'
        )
    ) as required_equipment,
    
    -- Expected values (generic - to be enhanced with manufacturer data)
    jsonb_build_object(
        'gas_pressure', jsonb_build_object('min', '19mbar', 'max', '21mbar', 'nominal', '20mbar'),
        'electrical_supply', jsonb_build_object('voltage', '230V ±10%', 'frequency', '50Hz'),
        'combustion_parameters', jsonb_build_object(
            'co2_min', '8.5%',
            'co2_max', '9.5%',
            'co_max', '100ppm',
            'flue_temp_max', '200°C'
        )
    ) as expected_values,
    
    -- Gas Safe safety precautions
    jsonb_build_object(
        'before_work', jsonb_build_array(
            'Turn off gas supply at meter',
            'Allow system to cool down',
            'Ensure adequate ventilation',
            'Check for gas leaks'
        ),
        'during_work', jsonb_build_array(
            'No naked flames or smoking',
            'Use appropriate tools only',
            'Follow manufacturer procedures',
            'Monitor for gas escape'
        ),
        'after_work', jsonb_build_array(
            'Test all gas connections',
            'Complete combustion analysis',
            'Check safety devices operation',
            'Issue Gas Safety Certificate if required'
        )
    ) as safety_precautions,
    
    -- Component references based on fault code patterns
    CASE 
        WHEN bfc.fault_code IN ('F1', 'F2', 'F3', 'F4', 'F5') THEN
            jsonb_build_array('ignition_system', 'gas_valve', 'flame_sensor')
        WHEN bfc.fault_code LIKE 'F2%' THEN
            jsonb_build_array('heat_exchanger', 'pump', 'pressure_sensor')
        WHEN bfc.fault_code LIKE 'F7%' THEN
            jsonb_build_array('fan', 'air_pressure_switch', 'flue_system')
        ELSE
            jsonb_build_array('pcb', 'sensors', 'actuators')
    END as component_references

FROM boiler_fault_codes bfc
JOIN manufacturers_enhanced me ON me.manufacturer_name = bfc.manufacturer
WHERE bfc.fault_code IS NOT NULL AND bfc.description IS NOT NULL
ON CONFLICT (manufacturer_id, fault_code) DO UPDATE SET
    fault_description = EXCLUDED.fault_description,
    root_causes = EXCLUDED.root_causes,
    diagnostic_procedures = EXCLUDED.diagnostic_procedures,
    updated_at = NOW();

-- Migrate any additional fault codes from the fault_codes table
INSERT INTO diagnostic_fault_codes (
    manufacturer_id,
    fault_code,
    fault_description,
    severity_level,
    gas_safe_category,
    root_causes,
    diagnostic_procedures,
    required_equipment,
    safety_precautions
)
SELECT 
    me.id as manufacturer_id,
    fc.code as fault_code,
    fc.description as fault_description,
    'major' as severity_level, -- Default severity
    'gas_appliance' as gas_safe_category,
    
    jsonb_build_object(
        'primary_causes', jsonb_build_array('System malfunction', 'Component failure'),
        'investigation_required', true
    ) as root_causes,
    
    jsonb_build_object(
        'initial_checks', jsonb_build_array(
            'Record fault code and system status',
            'Check basic system parameters',
            'Verify gas and electrical supplies'
        ),
        'systematic_testing', jsonb_build_array(
            'Follow manufacturer diagnostic procedure',
            'Test related components systematically',
            'Check wiring and connections'
        )
    ) as diagnostic_procedures,
    
    jsonb_build_object(
        'essential_equipment', jsonb_build_array(
            'Digital multimeter',
            'Manometer',
            'Gas leak detector'
        )
    ) as required_equipment,
    
    jsonb_build_object(
        'gas_safe_isolation', jsonb_build_array(
            'Isolate gas supply',
            'Ensure system safety',
            'Follow Gas Safe procedures'
        )
    ) as safety_precautions

FROM fault_codes fc
JOIN manufacturers_enhanced me ON me.manufacturer_name = fc.manufacturer
WHERE fc.code IS NOT NULL 
  AND fc.description IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM diagnostic_fault_codes dfc 
      WHERE dfc.manufacturer_id = me.id 
      AND dfc.fault_code = fc.code
  );

-- Create some common boiler components with professional specifications
INSERT INTO boiler_components (
    component_name,
    component_type,
    function_description,
    electrical_specs,
    operating_parameters,
    test_procedures,
    common_failure_modes,
    safety_warnings,
    isolation_requirements
) VALUES 
(
    'Gas Valve',
    'actuator',
    'Controls gas flow to the burner based on heat demand and safety interlocks',
    jsonb_build_object(
        'operating_voltage', '230V AC',
        'coil_resistance', '3.2kΩ ±10%',
        'power_consumption', '8W'
    ),
    jsonb_build_object(
        'inlet_pressure', '20mbar ±1mbar',
        'outlet_pressure', 'Variable based on demand',
        'response_time', '<2 seconds'
    ),
    jsonb_build_object(
        'electrical_test', 'Measure coil resistance with multimeter',
        'gas_tightness', 'Test with manometer and leak detection fluid',
        'operation_test', 'Check opening/closing with system demand'
    ),
    jsonb_build_array(
        'Coil burnout due to overvoltage',
        'Mechanical seizure from debris',
        'Gas tightness failure',
        'Electrical connection corrosion'
    ),
    jsonb_build_array(
        'High pressure gas component',
        'Electrical shock hazard',
        'Gas leak potential'
    ),
    jsonb_build_object(
        'gas_isolation', 'Turn off at meter before work',
        'electrical_isolation', 'Isolate mains supply',
        'pressure_relief', 'Vent system pressure safely'
    )
),
(
    'Ignition System',
    'ignition',
    'Provides spark for gas ignition and flame detection',
    jsonb_build_object(
        'spark_voltage', '15kV minimum',
        'detection_current', '2-10μA',
        'electrode_gap', '3-4mm'
    ),
    jsonb_build_object(
        'spark_rate', '1-2 sparks per second',
        'detection_threshold', '2μA minimum',
        'response_time', '<1 second'
    ),
    jsonb_build_object(
        'spark_test', 'Visual inspection of spark quality',
        'detection_test', 'Measure flame rectification current',
        'electrode_condition', 'Check for carbon deposits and wear'
    ),
    jsonb_build_array(
        'Electrode wear and carbon buildup',
        'Ignition transformer failure',
        'Flame detection circuit failure',
        'Wiring insulation breakdown'
    ),
    jsonb_build_array(
        'High voltage electrical hazard',
        'Risk of gas accumulation during testing'
    ),
    jsonb_build_object(
        'electrical_safety', 'High voltage - use insulated tools',
        'gas_safety', 'Ensure adequate ventilation'
    )
);

-- Create some basic diagnostic procedures
INSERT INTO diagnostic_procedures (
    procedure_name,
    procedure_type,
    step_by_step_instructions,
    required_tools,
    expected_results,
    gas_safe_requirements,
    estimated_time_minutes,
    skill_level
) VALUES 
(
    'Systematic Fault Code Diagnosis',
    'systematic',
    jsonb_build_object(
        'preparation', jsonb_build_array(
            'Record all fault codes displayed',
            'Note system operating conditions',
            'Gather manufacturer documentation'
        ),
        'investigation', jsonb_build_array(
            'Check gas supply pressure (20mbar ±1mbar)',
            'Verify electrical supply (230V ±10%)',
            'Test safety devices operation',
            'Inspect flue and air intake'
        ),
        'component_testing', jsonb_build_array(
            'Test components indicated by fault code',
            'Check wiring and connections',
            'Measure operating parameters',
            'Compare with manufacturer specifications'
        ),
        'verification', jsonb_build_array(
            'Clear fault codes',
            'Restart system under supervision',
            'Monitor for fault recurrence',
            'Complete combustion analysis'
        )
    ),
    jsonb_build_object(
        'essential', jsonb_build_array(
            'Digital multimeter',
            'Manometer',
            'Gas leak detector',
            'Combustion analyzer'
        ),
        'manufacturer_specific', jsonb_build_array(
            'Service manual',
            'Wiring diagrams',
            'Fault code reference'
        )
    ),
    jsonb_build_object(
        'gas_pressure', '20mbar ±1mbar',
        'electrical_supply', '230V ±10%',
        'combustion_co2', '8.5-9.5%',
        'combustion_co', '<100ppm'
    ),
    jsonb_build_object(
        'isolation_required', true,
        'gas_tightness_test', true,
        'combustion_analysis', true,
        'safety_certificate', 'If work affects gas safety'
    ),
    45,
    'qualified'
);

-- Add some diagnostic relationships
INSERT INTO diagnostic_relationships (
    source_type, source_id, target_type, target_id, relationship_type,
    confidence_score, frequency_occurrence, engineer_notes
)
SELECT 
    'fault_code', dfc.id, 'component', bc.id, 'indicates_failure',
    0.85, 'common', 
    'Fault code commonly indicates failure or malfunction of this component'
FROM diagnostic_fault_codes dfc
CROSS JOIN boiler_components bc
WHERE (
    (dfc.fault_code IN ('F1', 'F2', 'F3', 'F4', 'F5') AND bc.component_name = 'Ignition System') OR
    (dfc.fault_code LIKE 'F2%' AND bc.component_name = 'Gas Valve')
)
LIMIT 20; -- Limit initial relationships

-- Create a summary view for easy querying
CREATE OR REPLACE VIEW diagnostic_summary AS
SELECT 
    dfc.fault_code,
    me.manufacturer_name,
    dfc.fault_description,
    dfc.severity_level,
    dfc.root_causes->>'primary_causes' as primary_causes,
    dfc.diagnostic_procedures->>'initial_checks' as initial_checks,
    dfc.required_equipment->>'essential_equipment' as essential_equipment,
    dfc.created_at
FROM diagnostic_fault_codes dfc
JOIN manufacturers_enhanced me ON dfc.manufacturer_id = me.id
ORDER BY me.manufacturer_name, dfc.fault_code;
