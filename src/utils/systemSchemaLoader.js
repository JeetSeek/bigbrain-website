/**
 * System Schema Loader
 *
 * Loads and parses the structured heating system component schema
 * Browser-compatible version that uses pre-processed schema data
 */
import yaml from 'js-yaml';

// Cache for the parsed schema
let systemSchemaCache = null;

/**
 * Extract and parse the structured system schema from LLMPROMPT.md
 * @returns {Object} The parsed system schema with all component data
 */
function loadSystemSchema() {
  // Return cached version if available
  if (systemSchemaCache) {
    return systemSchemaCache;
  }

  try {
    // Instead of reading from file system (which doesn't work in browser),
    // we use a pre-processed schema
    const schemaContent = getPreProcessedSchema();

    if (!schemaContent) {
      console.error('Failed to load pre-processed schema');
      return null;
    }

    // Parse the schema content (combining direct YAML and code blocks)
    const yamlContent = schemaContent
      // Remove YAML metadata at the top
      .replace(/^# version:.*\n# last_modified:.*\n/m, '')
      // Extract YAML from code blocks (```yaml...```)
      .replace(/```(?:yaml)?\n([\s\S]*?)```/g, '$1');

    // Parse the combined YAML
    const schema = yaml.load(yamlContent);

    // Cache the result
    systemSchemaCache = schema;

    return schema;
  } catch (error) {
    console.error('Error loading system schema:', error);
    return null;
  }
}

/**
 * Get system-specific component information based on heating system type
 * @param {string} systemType - 'combi', 'system', 'heat-only'
 * @param {string} componentName - Optional component name to filter
 * @returns {Array|Object} Components for the specified system type
 */
function getSystemComponents(systemType, componentName = null) {
  const schema = loadSystemSchema();

  if (!schema) {
    return null;
  }

  // Convert systemType to the format used in the schema
  const schemaKey = systemType.toLowerCase().replace(/\s+/g, '_').replace('-', '_');

  // Get components for the specified system type
  const systemData = schema[schemaKey];

  if (!systemData || !systemData.components) {
    return null;
  }

  // If component name is specified, return just that component
  if (componentName) {
    return systemData.components.find(
      component =>
        component.component_name.toLowerCase() === componentName.toLowerCase() ||
        (component.known_aliases &&
          component.known_aliases.some(
            alias => alias.toLowerCase() === componentName.toLowerCase()
          ))
    );
  }

  return systemData.components;
}

/**
 * Find potential components that might be related to specified symptoms
 * @param {string} systemType - 'combi', 'system', 'heat-only'
 * @param {Array} symptoms - Array of symptom descriptions
 * @returns {Array} Components that might be related to the symptoms
 */
function findComponentsBySymptoms(systemType, symptoms) {
  const components = getSystemComponents(systemType);

  if (!components) {
    return [];
  }

  // Convert symptoms to lowercase for case-insensitive matching
  const lowerSymptoms = symptoms.map(s => s.toLowerCase());

  // Find components with matching observable symptoms
  return components.filter(component => {
    // Check if component has observable symptoms
    if (!component.observable_symptoms) {
      return false;
    }

    // Check each symptom type (error_codes, noises, etc.)
    return Object.values(component.observable_symptoms).some(symptomList => {
      if (typeof symptomList === 'string') {
        // For string symptom descriptions, check if any of our symptoms are contained
        return lowerSymptoms.some(s => symptomList.toLowerCase().includes(s));
      } else if (Array.isArray(symptomList)) {
        // For arrays, check if any of our symptoms match any in the list
        return lowerSymptoms.some(s =>
          symptomList.some(listItem => listItem.toLowerCase().includes(s))
        );
      }
      return false;
    });
  });
}

/**
 * Returns the pre-processed schema content
 * This replaces file system operations that don't work in browsers
 *
 * @returns {string} The pre-processed schema content
 */
function getPreProcessedSchema() {
  // This is a simplified version of the schema for demonstration
  // In production, this would be a complete schema extracted at build time
  return `
combi_boiler:
  components:
    - component_name: "Heat Exchanger"
      known_aliases: ["main heat exchanger", "primary heat exchanger"]
      purpose: "Transfers heat from gas combustion to central heating water."
      interacts_with: ["Fan", "Gas valve", "Pump", "Flow sensor"]
      typical_faults:
        - scaling
        - blockage
        - leak
        - thermal_crack
      observable_symptoms:
        noises: ["kettling", "rumbling", "whistling"]
        temp_profile: "Inconsistent heating; hot spots"
      quick_tests:
        - "Check for consistent temperature across exchanger surface."
        - "Inspect for signs of leaks or corrosion."
      decision_rules:
        - if: "Noise increases with temperature AND pressure drops"
          then: "heat_exchanger.scaling"

heat_only_boiler:
  components:
    - component_name: "Feed & Expansion Tank"
      known_aliases: ["F&E tank", "header tank"]
      purpose: "Provides static head and makes up water in open‑vented systems."
      interacts_with: ["Vent pipe", "Gravity return"]
      typical_faults:
        - ball_valve_seized
        - tank_sludge
      observable_symptoms:
        noises: ["gurgling at high points"]
        temp_profile: "Low pressure at boiler; air ingress"
      quick_tests:
        - "Lift ball valve; verify fresh water enters freely."
      decision_rules:
        - if: "Air in radiators daily AND tank empty"
          then: "feed_expansion_tank.ball_valve_seized"
    - component_name: "Gravity Primary Circuit"
      known_aliases: ["gravity hot water circuit"]
      purpose: "Relies on thermosyphon to circulate between boiler and cylinder."
      interacts_with: ["Cylinder coil", "Vent pipe"]
      typical_faults:
        - blocked_cold_feed
        - incorrect_pipe_fall
      observable_symptoms:
        temp_profile: "Slow cylinder heating; boiler cycles rapidly"
      quick_tests:
        - "Feel flow and return; <10 °C delta after 30 min suggests blockage."
      decision_rules:
        - if: "Cylinder temp <40 °C after 1 h gravity heat"
          then: "gravity_primary_circuit.blocked_cold_feed"

system_boiler:
  components:
    - component_name: "Diverter Valve"
      known_aliases: ["3-way valve", "DHW priority valve"]
      purpose: "Directs flow between heating and hot water circuits."
      interacts_with: ["Pump", "Expansion vessel", "Hot water cylinder"]
      typical_faults:
        - stuck_in_midposition
        - actuator_failure
        - valve_blockage
      observable_symptoms:
        noises: ["humming", "buzzing"]
        temp_profile: "Hot water but no heating, or vice versa"
      quick_tests:
        - "Listen for motor actuation when switching modes."
        - "Check resistance of valve motor."
      decision_rules:
        - if: "Hot water OR heating but never both"
          then: "diverter_valve.stuck"
`;
}

export const systemSchema = {
  loadSystemSchema,
  getSystemComponents,
  findComponentsBySymptoms,
};
