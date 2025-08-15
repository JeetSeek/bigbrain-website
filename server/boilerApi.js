import express from 'express';
import boilerKnowledge from './boilerKnowledgeService.js';

const router = express.Router();

// GET /api/boiler/fault-codes/:manufacturer/:code
// Retrieves information about a specific fault code for a manufacturer
router.get('/fault-codes/:manufacturer/:code', (req, res) => {
  try {
    const { manufacturer, code } = req.params;
    const faultInfo = boilerKnowledge.findFaultCode(manufacturer, code);
    
    if (!faultInfo) {
      return res.status(404).json({ 
        error: `Fault code ${code} not found for ${manufacturer}`,
        // Provide list of known manufacturers for better UX
        knownManufacturers: boilerKnowledge.getManufacturers()
      });
    }
    
    res.json({ faultInfo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/boiler/symptoms/:symptom
// Retrieves troubleshooting information for a specific symptom
router.get('/symptoms/:symptom', (req, res) => {
  try {
    const { symptom } = req.params;
    const symptomInfo = boilerKnowledge.getSymptomHelp(symptom);
    
    if (!symptomInfo) {
      return res.status(404).json({ 
        error: `Information for symptom "${symptom}" not found`,
        // Provide list of known symptoms for better UX
        knownSymptoms: boilerKnowledge.getSymptoms()
      });
    }
    
    res.json({ symptomInfo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/boiler/safety/:concern
// Retrieves safety information for a specific concern
router.get('/safety/:concern', (req, res) => {
  try {
    const { concern } = req.params;
    const safetyInfo = boilerKnowledge.getSafetyWarning(concern);
    
    if (!safetyInfo) {
      return res.status(404).json({ 
        error: `Safety information for "${concern}" not found`,
        // Provide list of known safety concerns
        knownConcerns: Object.keys(boilerKnowledge.safetyWarnings || {})
      });
    }
    
    res.json({ safetyInfo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/boiler/maintenance/:type
// Retrieves maintenance information for a specific type of maintenance
router.get('/maintenance/:type', (req, res) => {
  try {
    const { type } = req.params;
    const maintenanceInfo = boilerKnowledge.getMaintenanceAdvice(type);
    
    if (!maintenanceInfo) {
      return res.status(404).json({ 
        error: `Maintenance information for "${type}" not found`,
        // Provide list of known maintenance types
        knownTypes: Object.keys(boilerKnowledge.maintenance || {})
      });
    }
    
    res.json({ maintenanceInfo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/boiler/manufacturers
// Retrieves list of all manufacturers in the knowledge base
router.get('/manufacturers', (req, res) => {
  try {
    const manufacturers = boilerKnowledge.getManufacturers();
    res.json({ manufacturers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/boiler/symptoms
// Retrieves list of all symptoms in the knowledge base
router.get('/symptoms', (req, res) => {
  try {
    const symptoms = boilerKnowledge.getSymptoms();
    res.json({ symptoms });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
