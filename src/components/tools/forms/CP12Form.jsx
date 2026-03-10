import React, { useState, useRef, useCallback, useEffect } from 'react';
import SignaturePad from './SignaturePad';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// ─── Contractor Profile (localStorage) ─────────────────────────────────────
const CONTRACTOR_PROFILE_KEY = 'bb_cp12_contractor_profile';
const loadProfile = () => { try { const s = localStorage.getItem(CONTRACTOR_PROFILE_KEY); return s ? JSON.parse(s) : null; } catch { return null; } };
const saveProfile = (d) => { try { localStorage.setItem(CONTRACTOR_PROFILE_KEY, JSON.stringify(d)); } catch {} };
const generateCertNumber = () => { const d = new Date().toISOString().slice(0,10).replace(/-/g,''); return `CP12-${d}-${Math.floor(Math.random()*9999).toString().padStart(4,'0')}`; };

// ─── Constants ──────────────────────────────────────────────────────────────
const applianceTypes = [
  'Boiler - Combi', 'Boiler - System', 'Boiler - Regular', 'Boiler - Back',
  'Gas Fire - Inset', 'Gas Fire - Outset', 'Gas Fire - Decorative',
  'Cooker', 'Cooker - Range', 'Hob', 'Oven',
  'Water Heater - Instantaneous', 'Water Heater - Storage', 'Water Heater - Multipoint',
  'Warm Air Unit', 'Space Heater - Flued', 'Space Heater - Flueless',
  'Tumble Dryer', 'Refrigerator', 'Other',
];

const locations = [
  'Kitchen', 'Utility Room', 'Airing Cupboard', 'Boiler House',
  'Bedroom 1', 'Bedroom 2', 'Bedroom 3', 'Bedroom 4',
  'Living Room', 'Dining Room', 'Lounge', 'Conservatory',
  'Bathroom', 'En-Suite', 'WC', 'Cloakroom',
  'Garage', 'Loft', 'Cellar', 'Basement',
  'Hallway', 'Landing', 'Porch', 'Communal Area',
  'Commercial Kitchen', 'Office', 'External', 'Other',
];

const manufacturers = [
  'Ideal', 'Worcester Bosch', 'Vaillant', 'Baxi', 'Glow-worm', 'Potterton', 'Main',
  'Viessmann', 'Alpha', 'Ferroli', 'Ravenheat', 'Ariston', 'Intergas', 'Keston',
  'Vokera', 'Biasi', 'Remeha', 'Saunier Duval', 'Halstead', 'Morco', 'Myson',
  'Valor', 'Flavel', 'Robinson Willey', 'Cannon', 'Rangemaster', 'Rinnai', 'Other',
];

const flueTypes = ['Room Sealed (RS)', 'Open Flue (OF)', 'Balanced Flue (BF)', 'Flueless (FL)', 'N/A'];

const classificationOptions = [
  { code: 'PASS', label: 'Safe', bg: 'bg-green-500', border: 'border-green-500', light: 'bg-green-50 text-green-700' },
  { code: 'AR', label: 'At Risk', bg: 'bg-orange-500', border: 'border-orange-500', light: 'bg-orange-50 text-orange-700' },
  { code: 'ID', label: 'Imm. Dangerous', bg: 'bg-red-600', border: 'border-red-600', light: 'bg-red-50 text-red-700' },
];

// ─── Postcode Lookup (free api.postcodes.io) ─────────────────────────────────
const PostcodeLookup = ({ onSelect, inputClass }) => {
  const [pc, setPc] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const lookup = async () => {
    const clean = pc.trim().replace(/\s+/g, '');
    if (clean.length < 5) { setError('Enter a valid UK postcode'); return; }
    setLoading(true); setError(''); setResults(null);
    try {
      const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (data.status === 200 && data.result) {
        const r = data.result;
        // Build address suggestions from area data
        const parts = [r.admin_ward, r.admin_district, r.admin_county].filter(Boolean);
        const formatted = r.postcode;
        setResults({ postcode: formatted, area: parts.join(', '), district: r.admin_district || '', ward: r.admin_ward || '', county: r.admin_county || '', region: r.region || '' });
      } else {
        setError('Postcode not found');
      }
    } catch {
      setError('Lookup failed — check connection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input type="text" value={pc} onChange={(e) => setPc(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && lookup()}
          placeholder="e.g. SW1A 1AA" className={inputClass + ' flex-1'} maxLength={8} />
        <button type="button" onClick={lookup} disabled={loading}
          className="px-4 min-h-[44px] bg-[#1a1a2e] text-white rounded-lg font-bold text-xs uppercase tracking-wider disabled:opacity-50 whitespace-nowrap">
          {loading ? '...' : 'Find'}
        </button>
      </div>
      {error && <div className="text-xs text-red-600 font-semibold">{error}</div>}
      {results && (
        <button type="button" onClick={() => { onSelect(results); setResults(null); setPc(''); }}
          className="w-full text-left p-3 bg-green-50 border-2 border-green-300 rounded-lg hover:bg-green-100 transition-colors">
          <div className="text-xs font-black text-green-800 uppercase tracking-wider">Tap to use this address</div>
          <div className="text-sm font-bold text-green-900 mt-0.5">{results.area}</div>
          <div className="text-xs text-green-700 font-semibold">{results.postcode}</div>
        </button>
      )}
    </div>
  );
};

const CP12Form = () => {
  const [step, setStep] = useState(1);
  const totalSteps = 6;
  const sp = loadProfile();
  const [formData, setFormData] = useState({
    // Certificate
    certificateNumber: generateCertNumber(),
    // Contractor (auto-filled from saved profile)
    contractorName: sp?.contractorName || '', contractorAddress: sp?.contractorAddress || '',
    contractorPostcode: sp?.contractorPostcode || '', contractorPhone: sp?.contractorPhone || '',
    contractorEmail: sp?.contractorEmail || '',
    contractorGasSafeNo: sp?.contractorGasSafeNo || '', contractorGasSafeIdNo: sp?.contractorGasSafeIdNo || '',
    // Property
    installAddress: '', installPostcode: '',
    // Landlord/Client
    clientName: '', clientAddress: '', clientPostcode: '', clientPhone: '', clientEmail: '',
    // Tenant (NEW - HSE required)
    tenantName: '', tenantPhone: '', tenantPresent: null,
    // Dates
    inspectionDate: new Date().toISOString().split('T')[0], nextInspectionDate: '',
    // Gas Supply
    emergencyControlAccessible: null, emergencyControlLocation: '',
    pipeworkCondition: null, gasTightnessTest: null, gasTightnessTestMethod: '',
    // Safety Devices
    coAlarmFitted: null, coAlarmTest: null, coAlarmExpiryDate: '', coAlarmMake: '',
    smokeAlarmFitted: null, smokeAlarmTest: null,
    // Comments
    additionalComments: '', recommendedWork: '',
    // Appliances
    appliances: [],
    // Declaration
    engineerName: sp?.engineerName || '', customerName: '',
    reg26_9Confirmed: false,
  });
  const [engineerSignature, setEngineerSignature] = useState(null);
  const [customerSignature, setCustomerSignature] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [generating, setGenerating] = useState(false);
  const certificateRef = useRef(null);

  const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  
  const createEmptyAppliance = () => ({
    id: Date.now(), type: '', location: '', make: '', model: '',
    ownedBy: 'Landlord',
    applianceServiced: null, flueType: '', inspectedTested: null,
    // Readings (HSE Reg 26(9) compliant)
    operatingPressure: '', heatInput: '', heatInputUnit: 'kW',
    gasRate: '', gasRateUnit: 'm³/hr',
    coReading: '', co2Reading: '', ratioReading: '',
    flueFlowSpillage: null,
    // Safety checks
    safetyDeviceOperation: null, ventilation: null, fluePerformance: null,
    visualConditionFlue: null, applianceSafe: null,
    classification: '', // PASS, NCS, AR, ID
    // Defects
    defects: '', remedialAction: '',
    labelledWarningIssued: null, warningNoticeNo: '',
  });

  const addAppliance = () => setFormData(prev => ({ ...prev, appliances: [...prev.appliances, createEmptyAppliance()] }));
  const removeAppliance = (id) => setFormData(prev => ({ ...prev, appliances: prev.appliances.filter(a => a.id !== id) }));
  const updateAppliance = (id, field, value) => setFormData(prev => ({
    ...prev, appliances: prev.appliances.map(a => a.id === id ? { ...a, [field]: value } : a)
  }));

  const calculateNextInspection = () => {
    const date = new Date(formData.inspectionDate);
    date.setFullYear(date.getFullYear() + 1);
    updateField('nextInspectionDate', date.toISOString().split('T')[0]);
  };

  const [profileSaved, setProfileSaved] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [showValidation, setShowValidation] = useState(false);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [step]);

  const saveContractorProfile = () => {
    saveProfile({
      contractorName: formData.contractorName, contractorAddress: formData.contractorAddress,
      contractorPostcode: formData.contractorPostcode, contractorPhone: formData.contractorPhone,
      contractorEmail: formData.contractorEmail, contractorGasSafeNo: formData.contractorGasSafeNo,
      contractorGasSafeIdNo: formData.contractorGasSafeIdNo, engineerName: formData.engineerName,
    });
    setProfileSaved(true); setTimeout(() => setProfileSaved(false), 2000);
  };

  const validateForm = useCallback(() => {
    const errs = [];
    if (!formData.contractorName.trim()) errs.push('Contractor business name required');
    if (!formData.contractorGasSafeNo.trim()) errs.push('Gas Safe registration number required');
    if (!formData.contractorGasSafeIdNo.trim()) errs.push('Gas Safe ID card number required');
    if (formData.contractorGasSafeNo && !/^\d{5,7}$/.test(formData.contractorGasSafeNo.trim())) errs.push('Gas Safe number should be 5-7 digits');
    if (!formData.installAddress.trim()) errs.push('Property address required');
    if (!formData.clientName.trim()) errs.push('Landlord/client name required');
    if (!formData.inspectionDate) errs.push('Inspection date required');
    if (!formData.nextInspectionDate) errs.push('Next inspection date required');
    if (!formData.emergencyControlAccessible) errs.push('Emergency control accessibility required');
    if (!formData.pipeworkCondition) errs.push('Pipework condition required');
    if (!formData.gasTightnessTest) errs.push('Gas tightness test result required');
    if (formData.appliances.length === 0) errs.push('At least one appliance must be added');
    formData.appliances.forEach((a, i) => {
      const n = i + 1;
      if (!a.type) errs.push(`Appliance ${n}: Type required`);
      if (!a.location) errs.push(`Appliance ${n}: Location required`);
      if (!a.make) errs.push(`Appliance ${n}: Make required`);
      if (!a.flueType) errs.push(`Appliance ${n}: Flue type required`);
      if (!a.safetyDeviceOperation) errs.push(`Appliance ${n}: Safety device check required`);
      if (!a.ventilation) errs.push(`Appliance ${n}: Ventilation check required`);
      if (!a.applianceSafe) errs.push(`Appliance ${n}: Appliance safe status required`);
      if (!a.classification) errs.push(`Appliance ${n}: Classification (ID/AR/Pass) required`);
      if ((a.classification === 'ID' || a.classification === 'AR') && !a.labelledWarningIssued) errs.push(`Appliance ${n}: Warning notice required for ${a.classification}`);
    });
    if (!formData.engineerName.trim()) errs.push('Engineer name required');
    if (!engineerSignature) errs.push('Engineer signature required');
    return errs;
  }, [formData, engineerSignature]);

  const generatePDF = async () => {
    if (!certificateRef.current) return null;
    setGenerating(true);
    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfPageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfPageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfPageHeight;
      }
      return pdf;
    } catch (err) {
      console.error('PDF generation failed:', err);
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const downloadPDF = async () => {
    const pdf = await generatePDF();
    if (pdf) {
      const addr = formData.installAddress.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
      const filename = `CP12_${formData.certificateNumber}_${addr}_${formData.inspectionDate}.pdf`;
      pdf.save(filename);
    }
  };

  const handleEmailWithPDF = async () => {
    if (!formData.clientEmail) { alert('Please enter client/landlord email address'); return; }
    await downloadPDF();
    const subject = `CP12 Landlord Gas Safety Record - ${formData.installAddress} - ${formData.certificateNumber}`;
    const body = `Dear ${formData.clientName},\n\nPlease find attached your Landlord Gas Safety Record (CP12).\n\nCertificate No: ${formData.certificateNumber}\nProperty: ${formData.installAddress}, ${formData.installPostcode}\nInspection Date: ${formData.inspectionDate}\nNext Inspection Due: ${formData.nextInspectionDate}\n\nContractor: ${formData.contractorName}\nGas Safe Registration: ${formData.contractorGasSafeNo}\nPhone: ${formData.contractorPhone}\n\nThis record has been produced in accordance with the Gas Safety (Installation and Use) Regulations 1998.\n\nPlease attach the downloaded PDF to this email before sending.\n\nKind regards,\n${formData.engineerName}`;
    window.location.href = `mailto:${formData.clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const inputClass = "w-full px-4 py-3 min-h-[44px] border-2 border-gray-200 rounded-lg text-[16px] text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1a1a2e] focus:border-[#1a1a2e] transition-all";
  const selectClass = "w-full px-4 py-3 min-h-[44px] border-2 border-gray-200 rounded-lg text-[16px] text-gray-900 bg-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1a1a2e]";
  const labelClass = "block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider";
  const sectionClass = "text-sm font-black text-[#1a1a2e] mb-3 uppercase tracking-wide";

  const renderButtonGroup = (options, value, onChange, cols) => (
    <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${cols || Math.min(options.length, 4)}, 1fr)` }}>
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => onChange(opt)}
          className={`min-h-[44px] py-2.5 px-2 rounded-lg text-xs font-bold border-2 transition-all active:scale-95 ${
            value === opt ? 'bg-[#1a1a2e] text-white border-[#1a1a2e] shadow-sm' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-400'
          }`}>{opt}</button>
      ))}
    </div>
  );

  const renderClassification = (appId, currentValue) => (
    <div className="grid grid-cols-2 gap-2">
      {classificationOptions.map(opt => (
        <button key={opt.code} type="button" onClick={() => updateAppliance(appId, 'classification', opt.code)}
          className={`min-h-[48px] py-2.5 px-3 rounded-lg text-xs font-bold border-2 transition-all active:scale-95 ${
            currentValue === opt.code ? `${opt.bg} text-white border-transparent shadow-md` : `${opt.light} border-gray-200 hover:border-gray-300`
          }`}>
          <div className="text-sm font-black">{opt.code}</div>
          <div className="font-semibold text-[10px] mt-0.5 opacity-80">{opt.label}</div>
        </button>
      ))}
    </div>
  );

  const handlePreview = () => {
    const errors = validateForm();
    if (errors.length > 0) { setValidationErrors(errors); setShowValidation(true); }
    else { setShowValidation(false); setShowPreview(true); }
  };

  const stepLabels = ['Engineer', 'Property', 'Gas Supply', 'Appliances', 'Safety', 'Sign Off'];
  const StepIndicator = () => (
    <div className="flex items-center justify-between mb-1 px-1">
      {stepLabels.map((label, i) => {
        const s = i + 1;
        return (
          <React.Fragment key={s}>
            <button onClick={() => setStep(s)} className="flex flex-col items-center gap-0.5 min-w-[40px] min-h-[44px] justify-center">
              <div className={`w-7 h-7 rounded-md flex items-center justify-center font-black text-[11px] transition-all ${
                step === s ? 'bg-[#FFD600] text-black shadow-md' : step > s ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-400'
              }`}>{step > s ? '\u2713' : s}</div>
              <span className={`text-[9px] font-bold uppercase tracking-wider ${step === s ? 'text-[#1a1a2e]' : 'text-gray-400'}`}>{label}</span>
            </button>
            {i < stepLabels.length - 1 && <div className={`flex-1 h-0.5 mx-0.5 mt-[-12px] ${step > s ? 'bg-green-500' : 'bg-gray-200'}`} />}
          </React.Fragment>
        );
      })}
    </div>
  );

  // Helper for pass/fail display in preview
  const pf = (v) => v === 'Pass' ? '\u2713' : v === 'Fail' ? '\u2717' : v === 'N/A' ? 'N/A' : '-';
  const pfColor = (v) => v === 'Pass' ? 'text-green-700' : v === 'Fail' ? 'text-red-700' : 'text-gray-600';
  const classColor = (c) => c === 'ID' ? 'bg-red-600 text-white' : c === 'AR' ? 'bg-orange-500 text-white' : c === 'PASS' ? 'bg-green-600 text-white' : 'bg-gray-200';

  const Preview = () => {
    const cellBorder = 'border border-black';
    const sectionHeader = 'bg-[#1a1a2e] text-white text-[10px] font-bold px-2 py-1 uppercase tracking-wide';
    const fieldLabel = 'text-[8px] text-gray-500 uppercase tracking-wider leading-none';
    const fieldValue = 'text-[11px] font-semibold text-black leading-tight mt-0.5';
    const thinBorder = 'border-r border-gray-400';

    return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-2 overflow-auto">
      <div className="bg-white max-w-[700px] w-full max-h-[95vh] overflow-auto shadow-2xl">
        <div className="sticky top-0 bg-[#1a1a2e] text-white px-4 py-2.5 flex justify-between items-center z-10">
          <h2 className="font-bold text-sm tracking-wide">CP12 Certificate Preview</h2>
          <button onClick={() => setShowPreview(false)} className="w-8 h-8 bg-white/20 rounded-full text-lg leading-none">&times;</button>
        </div>
        
        <div className="p-4 bg-gray-200">
          <div ref={certificateRef} className="bg-white text-[11px] leading-tight" style={{fontFamily:'Arial, Helvetica, sans-serif', border:'3px solid #000'}}>

            {/* ═══ HEADER BANNER ═══ */}
            <div className="flex items-stretch border-b-[3px] border-black">
              <div className="bg-[#FFD600] flex items-center px-3 py-2 border-r-[3px] border-black" style={{minWidth:'140px'}}>
                <div className="flex items-center gap-1.5">
                  <div className="bg-black text-[#FFD600] w-8 h-8 flex items-center justify-center font-black text-lg rounded-sm">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none"><path d="M12 2C8 2 6 6 6 10c0 3 1.5 5 3 6.5V20h6v-3.5c1.5-1.5 3-3.5 3-6.5 0-4-2-8-6-8z" fill="#FFD600"/><path d="M10 20v2h4v-2h-4z" fill="#FFD600"/></svg>
                  </div>
                  <div>
                    <div className="text-black font-black text-[13px] leading-none tracking-tight">Gas Safe</div>
                    <div className="text-black text-[8px] font-bold leading-none">REGISTER</div>
                  </div>
                </div>
              </div>
              <div className="flex-1 bg-[#1a1a2e] flex items-center justify-center px-4 py-2">
                <div className="text-center">
                  <div className="text-[#FFD600] font-black text-[15px] tracking-widest leading-none">LANDLORD'S GAS SAFETY RECORD</div>
                  <div className="text-gray-400 text-[9px] mt-1 tracking-wider">Gas Safety (Installation and Use) Regulations 1998</div>
                </div>
              </div>
              <div className="bg-white flex items-center justify-center px-3 border-l-[3px] border-black" style={{minWidth:'60px'}}>
                <div className="text-center">
                  <div className="text-[9px] text-gray-500 font-bold">FORM</div>
                  <div className="text-[18px] font-black text-black leading-none">CP12</div>
                </div>
              </div>
            </div>

            {/* ═══ SECTION 1: RECORD DETAILS ═══ */}
            <div className={sectionHeader} style={{borderBottom:'2px solid #000'}}>
              <span className="bg-[#FFD600] text-black px-1.5 py-0.5 rounded-sm mr-2 text-[9px]">1</span>
              RECORD DETAILS
            </div>
            <div className="grid grid-cols-4 border-b-[3px] border-black">
              <div className={`p-2 ${thinBorder}`}>
                <div className={fieldLabel}>Certificate No.</div>
                <div className={fieldValue}>{formData.certificateNumber}</div>
              </div>
              <div className={`p-2 ${thinBorder}`}>
                <div className={fieldLabel}>Record Issued For</div>
                <div className={fieldValue}>Gas Safety Check</div>
              </div>
              <div className={`p-2 ${thinBorder}`}>
                <div className={fieldLabel}>Date of Check</div>
                <div className={fieldValue}>{formData.inspectionDate}</div>
              </div>
              <div className="p-2">
                <div className={fieldLabel}>Next Check Due By</div>
                <div className={fieldValue}>{formData.nextInspectionDate}</div>
              </div>
            </div>

            {/* ═══ SECTION 2: ENGINEER DETAILS ═══ */}
            <div className={sectionHeader} style={{borderBottom:'2px solid #000'}}>
              <span className="bg-[#FFD600] text-black px-1.5 py-0.5 rounded-sm mr-2 text-[9px]">2</span>
              GAS SAFE REGISTERED ENGINEER DETAILS
            </div>
            <div className="grid grid-cols-3 border-b-[3px] border-black">
              <div className={`p-2 ${thinBorder} col-span-2`}>
                <div className={fieldLabel}>Business Name & Address</div>
                <div className={fieldValue}>{formData.contractorName || '-'}</div>
                <div className="text-[10px] text-gray-700 mt-0.5">{formData.contractorAddress || '-'}{formData.contractorPostcode ? `, ${formData.contractorPostcode}` : ''}</div>
                <div className="text-[10px] text-gray-700">Tel: {formData.contractorPhone || '-'}{formData.contractorEmail ? ` | ${formData.contractorEmail}` : ''}</div>
              </div>
              <div className="p-2">
                <div className={fieldLabel}>Gas Safe Reg. No.</div>
                <div className="text-[14px] font-black text-black tracking-wider mt-0.5">{formData.contractorGasSafeNo || '-'}</div>
                <div className="mt-1.5"><span className={fieldLabel}>ID Card No.</span></div>
                <div className={fieldValue}>{formData.contractorGasSafeIdNo || '-'}</div>
              </div>
            </div>

            {/* ═══ SECTION 3: PROPERTY ADDRESS ═══ */}
            <div className={sectionHeader} style={{borderBottom:'2px solid #000'}}>
              <span className="bg-[#FFD600] text-black px-1.5 py-0.5 rounded-sm mr-2 text-[9px]">3</span>
              ADDRESS WHERE APPLIANCE(S) CHECKED
            </div>
            <div className="grid grid-cols-2 border-b-[3px] border-black">
              <div className={`p-2 ${thinBorder}`}>
                <div className={fieldLabel}>Property Address</div>
                <div className={fieldValue}>{formData.installAddress || '-'}</div>
                <div className="text-[10px] font-bold text-black">{formData.installPostcode || '-'}</div>
              </div>
              <div className="p-2">
                <div className={fieldLabel}>Tenant Details</div>
                <div className={fieldValue}>{formData.tenantName || 'N/A'}</div>
                {formData.tenantPhone && <div className="text-[10px] text-gray-700">Tel: {formData.tenantPhone}</div>}
                {formData.tenantPresent && <div className="text-[10px] text-gray-700">Present at check: {formData.tenantPresent}</div>}
              </div>
            </div>

            {/* ═══ SECTION 4: LANDLORD DETAILS ═══ */}
            <div className={sectionHeader} style={{borderBottom:'2px solid #000'}}>
              <span className="bg-[#FFD600] text-black px-1.5 py-0.5 rounded-sm mr-2 text-[9px]">4</span>
              LANDLORD / MANAGING AGENT DETAILS
            </div>
            <div className="grid grid-cols-3 border-b-[3px] border-black">
              <div className={`p-2 ${thinBorder}`}>
                <div className={fieldLabel}>Name</div>
                <div className={fieldValue}>{formData.clientName || '-'}</div>
              </div>
              <div className={`p-2 ${thinBorder}`}>
                <div className={fieldLabel}>Address</div>
                <div className={fieldValue}>{formData.clientAddress || 'Same as property'}</div>
                <div className="text-[10px] text-gray-700">{formData.clientPostcode || ''}</div>
              </div>
              <div className="p-2">
                <div className={fieldLabel}>Contact</div>
                <div className={fieldValue}>Tel: {formData.clientPhone || '-'}</div>
                {formData.clientEmail && <div className="text-[10px] text-gray-700">{formData.clientEmail}</div>}
              </div>
            </div>

            {/* ═══ SECTION 5: GAS INSTALLATION PIPEWORK ═══ */}
            <div className={sectionHeader} style={{borderBottom:'2px solid #000'}}>
              <span className="bg-[#FFD600] text-black px-1.5 py-0.5 rounded-sm mr-2 text-[9px]">5</span>
              GAS INSTALLATION PIPEWORK
            </div>
            <div className="grid grid-cols-5 border-b-[3px] border-black">
              <div className={`p-1.5 ${thinBorder} text-center`}>
                <div className={fieldLabel}>ECV Accessible</div>
                <div className={`${fieldValue} ${formData.emergencyControlAccessible === 'Yes' ? 'text-green-700' : formData.emergencyControlAccessible === 'No' ? 'text-red-700' : ''}`}>{formData.emergencyControlAccessible || '-'}</div>
              </div>
              <div className={`p-1.5 ${thinBorder} text-center`}>
                <div className={fieldLabel}>ECV Location</div>
                <div className={fieldValue}>{formData.emergencyControlLocation || '-'}</div>
              </div>
              <div className={`p-1.5 ${thinBorder} text-center`}>
                <div className={fieldLabel}>Pipework Condition</div>
                <div className={`${fieldValue} font-bold ${pfColor(formData.pipeworkCondition)}`}>{formData.pipeworkCondition || '-'}</div>
              </div>
              <div className={`p-1.5 ${thinBorder} text-center`}>
                <div className={fieldLabel}>Tightness Test</div>
                <div className={`${fieldValue} font-bold ${pfColor(formData.gasTightnessTest)}`}>{formData.gasTightnessTest || '-'}</div>
              </div>
              <div className="p-1.5 text-center">
                <div className={fieldLabel}>Test Method</div>
                <div className={fieldValue}>{formData.gasTightnessTestMethod || '-'}</div>
              </div>
            </div>

            {/* ═══ SECTION 6: APPLIANCE DETAILS ═══ */}
            <div className={sectionHeader} style={{borderBottom:'2px solid #000'}}>
              <span className="bg-[#FFD600] text-black px-1.5 py-0.5 rounded-sm mr-2 text-[9px]">6</span>
              APPLIANCE DETAILS
            </div>
            {formData.appliances.length === 0 ? (
              <div className="p-4 text-center text-gray-400 italic border-b-[3px] border-black">No appliances recorded</div>
            ) : formData.appliances.map((app, i) => (
              <div key={app.id} className="border-b-[3px] border-black">
                {/* Appliance number bar */}
                <div className="flex items-center justify-between bg-gray-100 border-b border-black px-2 py-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-[#1a1a2e] text-white w-6 h-6 flex items-center justify-center rounded-sm text-[10px] font-black">{i + 1}</span>
                    <span className="font-bold text-[11px] text-black">{app.make} {app.model} - {app.type}</span>
                  </div>
                  {app.classification && (
                    <span className={`px-3 py-1 text-[10px] font-black tracking-wider ${
                      app.classification === 'ID' ? 'bg-red-600 text-white' :
                      app.classification === 'AR' ? 'bg-orange-500 text-white' :
                      'bg-green-600 text-white'
                    }`}>{app.classification === 'PASS' ? 'PASS - SAFE' : app.classification === 'AR' ? 'AT RISK' : app.classification === 'ID' ? 'IMMEDIATELY DANGEROUS' : app.classification}</span>
                  )}
                </div>
                {/* Row 1: Appliance identification */}
                <div className="grid grid-cols-4 border-b border-gray-400">
                  <div className={`p-1.5 ${thinBorder}`}><div className={fieldLabel}>Location</div><div className={fieldValue}>{app.location || '-'}</div></div>
                  <div className={`p-1.5 ${thinBorder}`}><div className={fieldLabel}>Type</div><div className={fieldValue}>{app.type || '-'}</div></div>
                  <div className={`p-1.5 ${thinBorder}`}><div className={fieldLabel}>Make</div><div className={fieldValue}>{app.make || '-'}</div></div>
                  <div className="p-1.5"><div className={fieldLabel}>Model</div><div className={fieldValue}>{app.model || '-'}</div></div>
                </div>
                {/* Row 2: Appliance details */}
                <div className="grid grid-cols-5 border-b border-gray-400">
                  <div className={`p-1.5 ${thinBorder}`}><div className={fieldLabel}>Flue Type</div><div className={fieldValue}>{app.flueType?.match(/\(([^)]+)\)/)?.[1] || app.flueType || '-'}</div></div>
                  <div className={`p-1.5 ${thinBorder}`}><div className={fieldLabel}>Owned By</div><div className={fieldValue}>{app.ownedBy || '-'}</div></div>
                  <div className={`p-1.5 ${thinBorder}`}><div className={fieldLabel}>Appliance Serviced</div><div className={fieldValue}>{app.applianceServiced || '-'}</div></div>
                  <div className={`p-1.5 ${thinBorder}`}><div className={fieldLabel}>Inspected & Tested</div><div className={fieldValue}>{app.inspectedTested || '-'}</div></div>
                  <div className="p-1.5"><div className={fieldLabel}>Spillage Test</div><div className={`${fieldValue} ${pfColor(app.flueFlowSpillage)}`}>{pf(app.flueFlowSpillage)}</div></div>
                </div>
                {/* Row 3: Combustion readings */}
                <div className="grid grid-cols-7 border-b border-gray-400 bg-blue-50/50">
                  <div className={`p-1.5 ${thinBorder} text-center`}><div className={fieldLabel}>Op. Pressure</div><div className={fieldValue}>{app.operatingPressure ? `${app.operatingPressure} mb` : '-'}</div></div>
                  <div className={`p-1.5 ${thinBorder} text-center`}><div className={fieldLabel}>Heat Input</div><div className={fieldValue}>{app.heatInput ? `${app.heatInput} ${app.heatInputUnit}` : '-'}</div></div>
                  <div className={`p-1.5 ${thinBorder} text-center`}><div className={fieldLabel}>Gas Rate</div><div className={fieldValue}>{app.gasRate ? `${app.gasRate} ${app.gasRateUnit}` : '-'}</div></div>
                  <div className={`p-1.5 ${thinBorder} text-center`}><div className={fieldLabel}>CO (ppm)</div><div className={fieldValue}>{app.coReading || '-'}</div></div>
                  <div className={`p-1.5 ${thinBorder} text-center`}><div className={fieldLabel}>CO&#x2082; (%)</div><div className={fieldValue}>{app.co2Reading || '-'}</div></div>
                  <div className={`p-1.5 ${thinBorder} text-center`}><div className={fieldLabel}>CO/CO&#x2082;</div><div className={fieldValue}>{app.ratioReading || '-'}</div></div>
                  <div className="p-1.5 text-center"><div className={fieldLabel}>Ratio</div><div className={fieldValue}>{app.ratioReading ? (parseFloat(app.coReading) / parseFloat(app.co2Reading) * 100).toFixed(4) || '-' : '-'}</div></div>
                </div>
                {/* Row 4: Safety checks - official table format */}
                <div className="grid grid-cols-6 border-b border-gray-400">
                  <div className={`p-1.5 ${thinBorder} text-center`}><div className={fieldLabel}>Safety Device</div><div className={`text-[12px] font-black mt-0.5 ${pfColor(app.safetyDeviceOperation)}`}>{pf(app.safetyDeviceOperation)}</div></div>
                  <div className={`p-1.5 ${thinBorder} text-center`}><div className={fieldLabel}>Ventilation</div><div className={`text-[12px] font-black mt-0.5 ${pfColor(app.ventilation)}`}>{pf(app.ventilation)}</div></div>
                  <div className={`p-1.5 ${thinBorder} text-center`}><div className={fieldLabel}>Flue Flow</div><div className={`text-[12px] font-black mt-0.5 ${pfColor(app.fluePerformance)}`}>{pf(app.fluePerformance)}</div></div>
                  <div className={`p-1.5 ${thinBorder} text-center`}><div className={fieldLabel}>Flue Condition</div><div className={`text-[12px] font-black mt-0.5 ${pfColor(app.visualConditionFlue)}`}>{pf(app.visualConditionFlue)}</div></div>
                  <div className={`p-1.5 ${thinBorder} text-center`}><div className={fieldLabel}>Safe to Use</div><div className={`text-[12px] font-black mt-0.5 ${pfColor(app.applianceSafe)}`}>{pf(app.applianceSafe)}</div></div>
                  <div className="p-1.5 text-center"><div className={fieldLabel}>Warning Issued</div><div className={`${fieldValue} font-bold`}>{app.labelledWarningIssued === 'Yes' ? `Yes #${app.warningNoticeNo || ''}` : app.labelledWarningIssued || '-'}</div></div>
                </div>
                {/* Row 5: Defects & remedial */}
                <div className="grid grid-cols-2">
                  <div className={`p-1.5 ${thinBorder} ${app.defects ? 'bg-red-50' : ''}`}><div className={fieldLabel}>Defects Identified</div><div className={`${fieldValue} ${app.defects ? 'text-red-700' : ''}`}>{app.defects || 'None'}</div></div>
                  <div className={`p-1.5 ${app.remedialAction ? 'bg-amber-50' : ''}`}><div className={fieldLabel}>Remedial Action Taken</div><div className={fieldValue}>{app.remedialAction || 'None'}</div></div>
                </div>
              </div>
            ))}

            {/* ═══ SECTION 7: SAFETY DEVICES ═══ */}
            <div className={sectionHeader} style={{borderBottom:'2px solid #000'}}>
              <span className="bg-[#FFD600] text-black px-1.5 py-0.5 rounded-sm mr-2 text-[9px]">7</span>
              SAFETY DEVICES
            </div>
            <div className="grid grid-cols-5 border-b-[3px] border-black">
              <div className={`p-1.5 ${thinBorder} text-center`}>
                <div className={fieldLabel}>CO Alarm Fitted</div>
                <div className={`${fieldValue} font-bold`}>{formData.coAlarmFitted || '-'}</div>
              </div>
              <div className={`p-1.5 ${thinBorder} text-center`}>
                <div className={fieldLabel}>CO Alarm Test</div>
                <div className={`${fieldValue} font-bold ${pfColor(formData.coAlarmTest)}`}>{formData.coAlarmTest || '-'}</div>
              </div>
              <div className={`p-1.5 ${thinBorder} text-center`}>
                <div className={fieldLabel}>CO Alarm Expiry</div>
                <div className={fieldValue}>{formData.coAlarmExpiryDate || '-'}</div>
              </div>
              <div className={`p-1.5 ${thinBorder} text-center`}>
                <div className={fieldLabel}>Smoke Alarm</div>
                <div className={`${fieldValue} font-bold`}>{formData.smokeAlarmFitted || '-'}</div>
              </div>
              <div className="p-1.5 text-center">
                <div className={fieldLabel}>Smoke Test</div>
                <div className={`${fieldValue} font-bold ${pfColor(formData.smokeAlarmTest)}`}>{formData.smokeAlarmTest || '-'}</div>
              </div>
            </div>

            {/* ═══ SECTION 8: COMMENTS ═══ */}
            {(formData.additionalComments || formData.recommendedWork) && (
              <>
                <div className={sectionHeader} style={{borderBottom:'2px solid #000'}}>
                  <span className="bg-[#FFD600] text-black px-1.5 py-0.5 rounded-sm mr-2 text-[9px]">8</span>
                  ADDITIONAL COMMENTS & RECOMMENDED WORK
                </div>
                <div className="border-b-[3px] border-black p-2">
                  {formData.additionalComments && <div className="text-[10px]"><span className="font-bold">Comments: </span>{formData.additionalComments}</div>}
                  {formData.recommendedWork && <div className="text-[10px] mt-1"><span className="font-bold">Recommended work: </span>{formData.recommendedWork}</div>}
                </div>
              </>
            )}

            {/* ═══ SECTION 9: SIGNATURES ═══ */}
            <div className={sectionHeader} style={{borderBottom:'2px solid #000'}}>
              <span className="bg-[#FFD600] text-black px-1.5 py-0.5 rounded-sm mr-2 text-[9px]">{formData.additionalComments || formData.recommendedWork ? '9' : '8'}</span>
              SIGNATURES
            </div>
            <div className="grid grid-cols-2">
              <div className={`p-3 ${thinBorder}`}>
                <div className={fieldLabel}>Engineer Name</div>
                <div className="text-[12px] font-bold text-black mt-0.5">{formData.engineerName || '-'}</div>
                <div className={`${fieldLabel} mt-2`}>Engineer Signature</div>
                {engineerSignature ? <img src={engineerSignature} alt="Engineer signature" className="h-14 max-w-full mt-1" /> : <div className="h-14 mt-1 border-b-2 border-black border-dashed" />}
                <div className={`${fieldLabel} mt-2`}>Date</div>
                <div className={fieldValue}>{formData.inspectionDate}</div>
              </div>
              <div className="p-3">
                <div className={fieldLabel}>Received By (Name)</div>
                <div className="text-[12px] font-bold text-black mt-0.5">{formData.customerName || '-'}</div>
                <div className={`${fieldLabel} mt-2`}>Signature</div>
                {customerSignature ? <img src={customerSignature} alt="Customer signature" className="h-14 max-w-full mt-1" /> : <div className="h-14 mt-1 border-b-2 border-black border-dashed" />}
                <div className={`${fieldLabel} mt-2`}>Date</div>
                <div className={fieldValue}>{formData.inspectionDate}</div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t-[3px] border-black bg-gray-100 px-3 py-1.5 flex justify-between items-center">
              <div className="text-[8px] text-gray-500">Gas Safe registered engineer details can be verified at <b>www.GasSafeRegister.co.uk</b> or call <b>0800 408 5577</b></div>
              <div className="text-[8px] text-gray-400">Generated by BoilerBrain</div>
            </div>

          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-white border-t-2 border-gray-300 p-3 space-y-2">
          <div className="flex gap-2">
            <button onClick={() => setShowPreview(false)} className="flex-1 min-h-[48px] py-3 bg-gray-100 text-gray-700 font-bold rounded-lg border border-gray-300 active:scale-[0.98] transition-transform">
              Edit
            </button>
            <button onClick={downloadPDF} disabled={generating} className="flex-1 min-h-[48px] py-3 bg-[#1a1a2e] text-white font-bold rounded-lg disabled:opacity-50 active:scale-[0.98] transition-transform">
              {generating ? 'Generating...' : 'Download PDF'}
            </button>
          </div>
          <button onClick={handleEmailWithPDF} disabled={generating} className="w-full min-h-[48px] py-3 bg-[#FFD600] text-black font-bold rounded-lg disabled:opacity-50 active:scale-[0.98] transition-transform">
            Download & Email to Landlord
          </button>
          <p className="text-[10px] text-gray-400 text-center">PDF downloads first, then opens email client with pre-filled message</p>
        </div>
      </div>
    </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto bg-gray-50 pb-24">
      {showPreview && <Preview />}

      {/* Validation Modal */}
      {showValidation && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-auto shadow-2xl border-2 border-red-600">
            <div className="bg-red-600 text-white px-4 py-3 flex justify-between items-center">
              <h3 className="font-black text-sm uppercase tracking-wide">Validation Errors ({validationErrors.length})</h3>
              <button onClick={() => setShowValidation(false)} className="w-7 h-7 bg-white/20 rounded text-sm">&times;</button>
            </div>
            <div className="p-4 space-y-2">
              {validationErrors.map((err, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-red-500 mt-0.5 flex-shrink-0 font-black">&times;</span>
                  <span className="text-gray-700">{err}</span>
                </div>
              ))}
              <button onClick={() => setShowValidation(false)} className="w-full mt-3 py-2.5 bg-[#1a1a2e] text-white font-bold rounded-lg text-sm">
                Go Back & Fix
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header - Gas Safe branded */}
      <div className="bg-[#1a1a2e] text-white px-4 py-3 sticky top-0 z-20" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
        <div className="flex items-center justify-between">
          <button onClick={() => step > 1 && setStep(step - 1)} disabled={step === 1}
            className="w-10 h-10 bg-white/10 border border-white/20 rounded-lg flex items-center justify-center disabled:opacity-30 text-base font-bold active:scale-95 transition-transform">&#8592;</button>
          <div className="text-center flex-1 mx-3">
            <div className="flex items-center justify-center gap-2">
              <span className="bg-[#FFD600] text-black text-[9px] font-black px-1.5 py-0.5 rounded-sm">CP12</span>
              <h1 className="text-sm font-bold tracking-tight">Gas Safety Record</h1>
            </div>
            <div className="text-[10px] text-gray-400 font-mono">{formData.certificateNumber}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowPreview(true)} className="w-10 h-10 bg-[#FFD600] text-black rounded-lg flex items-center justify-center text-sm font-black active:scale-95 transition-transform">&#128065;</button>
            <button onClick={() => step < totalSteps && setStep(step + 1)} disabled={step === totalSteps}
              className="w-10 h-10 bg-white/10 border border-white/20 rounded-lg flex items-center justify-center disabled:opacity-30 text-base font-bold active:scale-95 transition-transform">&#8594;</button>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="bg-white py-2 px-2 border-b-2 border-gray-200 shadow-sm">
        <StepIndicator />
      </div>

      {/* Content */}
      <div className="p-4">

        {/* ═══ STEP 1: Engineer / Contractor Details ═══ */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className={sectionClass}>Gas Safe Registered Engineer</h3>
            <div className="bg-white rounded-lg p-4 space-y-3 border-2 border-gray-200 shadow-sm">
              <div>
                <label className={labelClass}>Business Name <span className="text-red-500">*</span></label>
                <input type="text" value={formData.contractorName} onChange={(e) => updateField('contractorName', e.target.value)}
                  placeholder="Enter business name" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Address</label>
                <input type="text" value={formData.contractorAddress} onChange={(e) => updateField('contractorAddress', e.target.value)}
                  placeholder="Business address" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Postcode</label>
                  <input type="text" value={formData.contractorPostcode} onChange={(e) => updateField('contractorPostcode', e.target.value)}
                    placeholder="Postcode" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input type="tel" value={formData.contractorPhone} onChange={(e) => updateField('contractorPhone', e.target.value)}
                    placeholder="Phone number" className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" value={formData.contractorEmail} onChange={(e) => updateField('contractorEmail', e.target.value)}
                  placeholder="Business email" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Gas Safe Reg. No. <span className="text-red-500">*</span></label>
                  <input type="text" inputMode="numeric" value={formData.contractorGasSafeNo} onChange={(e) => updateField('contractorGasSafeNo', e.target.value)}
                    placeholder="e.g. 123456" className={inputClass} maxLength={7} autoComplete="off" />
                </div>
                <div>
                  <label className={labelClass}>Gas Safe ID Card No. <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.contractorGasSafeIdNo} onChange={(e) => updateField('contractorGasSafeIdNo', e.target.value)}
                    placeholder="ID card number" className={inputClass} />
                </div>
              </div>
            </div>
            <button type="button" onClick={saveContractorProfile}
              className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all ${profileSaved ? 'bg-green-100 text-green-700 border-2 border-green-300' : 'bg-gray-100 text-[#1a1a2e] border-2 border-gray-200 hover:border-gray-400'}`}>
              {profileSaved ? '\u2713 Profile Saved!' : 'Save Profile for Future Certificates'}
            </button>
          </div>
        )}

        {/* ═══ STEP 2: Property, Landlord, Tenant, Dates ═══ */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className={sectionClass}>Property Address</h3>
            <div className="bg-white rounded-lg p-4 space-y-3 border-2 border-gray-200 shadow-sm">
              <div>
                <label className={labelClass}>Postcode Finder</label>
                <PostcodeLookup inputClass={inputClass} onSelect={(r) => {
                  updateField('installPostcode', r.postcode);
                  if (!formData.installAddress) updateField('installAddress', r.area);
                }} />
              </div>
              <div>
                <label className={labelClass}>Address <span className="text-red-500">*</span></label>
                <input type="text" value={formData.installAddress} onChange={(e) => updateField('installAddress', e.target.value)}
                  placeholder="Property address" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Postcode <span className="text-red-500">*</span></label>
                <input type="text" value={formData.installPostcode} onChange={(e) => updateField('installPostcode', e.target.value)}
                  placeholder="Postcode" className={inputClass} />
              </div>
            </div>

            <h3 className={sectionClass}>Landlord / Agent Details</h3>
            <div className="bg-white rounded-lg p-4 space-y-3 border-2 border-gray-200 shadow-sm">
              <div>
                <label className={labelClass}>Name <span className="text-red-500">*</span></label>
                <input type="text" value={formData.clientName} onChange={(e) => updateField('clientName', e.target.value)}
                  placeholder="Landlord / agent name" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Postcode Finder</label>
                <PostcodeLookup inputClass={inputClass} onSelect={(r) => {
                  updateField('clientPostcode', r.postcode);
                  if (!formData.clientAddress) updateField('clientAddress', r.area);
                }} />
              </div>
              <div>
                <label className={labelClass}>Address (if different from property)</label>
                <input type="text" value={formData.clientAddress} onChange={(e) => updateField('clientAddress', e.target.value)}
                  placeholder="Landlord address" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>Postcode</label>
                  <input type="text" value={formData.clientPostcode} onChange={(e) => updateField('clientPostcode', e.target.value)} placeholder="Postcode" className={inputClass} autoComplete="postal-code" />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input type="tel" value={formData.clientPhone} onChange={(e) => updateField('clientPhone', e.target.value)} placeholder="Phone" className={inputClass} autoComplete="tel" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" value={formData.clientEmail} onChange={(e) => updateField('clientEmail', e.target.value)} placeholder="Email" className={inputClass} autoComplete="email" />
              </div>
            </div>

            <h3 className={sectionClass}>Tenant Details</h3>
            <div className="bg-white rounded-lg p-4 space-y-3 border-2 border-gray-200 shadow-sm">
              <div>
                <label className={labelClass}>Tenant Name</label>
                <input type="text" value={formData.tenantName} onChange={(e) => updateField('tenantName', e.target.value)}
                  placeholder="Tenant name (if applicable)" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Tenant Phone</label>
                  <input type="tel" value={formData.tenantPhone} onChange={(e) => updateField('tenantPhone', e.target.value)} placeholder="Phone" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Tenant Present?</label>
                  {renderButtonGroup(['Yes', 'No'], formData.tenantPresent, (v) => updateField('tenantPresent', v))}
                </div>
              </div>
            </div>

            <h3 className={sectionClass}>Inspection Dates</h3>
            <div className="bg-white rounded-lg p-4 space-y-3 border-2 border-gray-200 shadow-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Date of Check <span className="text-red-500">*</span></label>
                  <input type="date" value={formData.inspectionDate} onChange={(e) => updateField('inspectionDate', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Next Check Due <span className="text-red-500">*</span></label>
                  <input type="date" value={formData.nextInspectionDate} onChange={(e) => updateField('nextInspectionDate', e.target.value)} className={inputClass} />
                </div>
              </div>
              <button type="button" onClick={calculateNextInspection}
                className="w-full py-2 bg-[#1a1a2e] text-white rounded-lg text-sm font-bold">
                Auto-set to 12 months from check date
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 3: Gas Supply & Pipework ═══ */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className={sectionClass}>Gas Installation Pipework</h3>
            <div className="bg-white rounded-lg p-4 space-y-4 border-2 border-gray-200 shadow-sm">
              <div>
                <label className={labelClass}>Emergency control accessible <span className="text-red-500">*</span></label>
                {renderButtonGroup(['Yes', 'No'], formData.emergencyControlAccessible, (v) => updateField('emergencyControlAccessible', v))}
              </div>
              {formData.emergencyControlAccessible === 'Yes' && (
                <div>
                  <label className={labelClass}>ECV Location</label>
                  <select value={formData.emergencyControlLocation} onChange={(e) => updateField('emergencyControlLocation', e.target.value)} className={selectClass}>
                    <option value="">Select location</option>
                    <option>Meter box - external</option><option>Meter box - internal</option><option>Under stairs</option>
                    <option>Kitchen</option><option>Utility room</option><option>Cellar</option><option>Garage</option><option>Other</option>
                  </select>
                </div>
              )}
              <div>
                <label className={labelClass}>Visual condition of pipework <span className="text-red-500">*</span></label>
                {renderButtonGroup(['Pass', 'Fail', 'N/A'], formData.pipeworkCondition, (v) => updateField('pipeworkCondition', v))}
              </div>
              <div>
                <label className={labelClass}>Gas tightness test <span className="text-red-500">*</span></label>
                {renderButtonGroup(['Pass', 'Fail', 'N/A'], formData.gasTightnessTest, (v) => updateField('gasTightnessTest', v))}
              </div>
              {formData.gasTightnessTest === 'Pass' && (
                <div>
                  <label className={labelClass}>Test method</label>
                  {renderButtonGroup(['Let-by test', 'Tightness test', 'Both'], formData.gasTightnessTestMethod, (v) => updateField('gasTightnessTestMethod', v))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ STEP 4: Appliances ═══ */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className={sectionClass + " mb-0"}>Appliances</h3>
              <span className="text-xs text-gray-400">{formData.appliances.length}/10</span>
            </div>

            {formData.appliances.map((app, idx) => (
              <div key={app.id} className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <div className="bg-[#1a1a2e] text-white px-4 py-2.5 flex justify-between items-center">
                  <span className="font-bold text-sm">Appliance {idx + 1}</span>
                  <div className="flex items-center gap-2">
                    {app.classification && <span className={`px-2 py-0.5 rounded text-[10px] font-black ${classColor(app.classification)}`}>{app.classification}</span>}
                    <button type="button" onClick={() => removeAppliance(app.id)} className="text-red-400 text-xs font-semibold">Remove</button>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Type <span className="text-red-500">*</span></label>
                      <select value={app.type} onChange={(e) => updateAppliance(app.id, 'type', e.target.value)} className={selectClass}>
                        <option value="">Select type</option>
                        {applianceTypes.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Location <span className="text-red-500">*</span></label>
                      <select value={app.location} onChange={(e) => updateAppliance(app.id, 'location', e.target.value)} className={selectClass}>
                        <option value="">Select</option>
                        {locations.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Make <span className="text-red-500">*</span></label>
                      <select value={app.make} onChange={(e) => updateAppliance(app.id, 'make', e.target.value)} className={selectClass}>
                        <option value="">Select</option>
                        {manufacturers.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Model</label>
                      <input type="text" value={app.model} onChange={(e) => updateAppliance(app.id, 'model', e.target.value)} placeholder="Model" className={inputClass} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Owned by</label>
                      {renderButtonGroup(['Landlord', 'Tenant'], app.ownedBy, (v) => updateAppliance(app.id, 'ownedBy', v))}
                    </div>
                    <div>
                      <label className={labelClass}>Appliance serviced?</label>
                      {renderButtonGroup(['Yes', 'No', 'N/A'], app.applianceServiced, (v) => updateAppliance(app.id, 'applianceServiced', v))}
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Flue type <span className="text-red-500">*</span></label>
                    {renderButtonGroup(flueTypes, app.flueType, (v) => updateAppliance(app.id, 'flueType', v), 3)}
                  </div>
                  <div>
                    <label className={labelClass}>Inspected and tested</label>
                    {renderButtonGroup(['Yes', 'No'], app.inspectedTested, (v) => updateAppliance(app.id, 'inspectedTested', v))}
                  </div>

                  {/* Readings - Reg 26(9) compliant */}
                  <div className="pt-3 border-t border-gray-200">
                    <h4 className="text-[#1a1a2e] font-black text-xs mb-3 uppercase tracking-wide">Readings &amp; Combustion Analysis</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className={labelClass}>Op. Pressure (mb)</label>
                        <input type="text" inputMode="decimal" value={app.operatingPressure} onChange={(e) => updateAppliance(app.id, 'operatingPressure', e.target.value)} placeholder="e.g. 12.5" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Heat Input</label>
                        <input type="text" inputMode="decimal" value={app.heatInput} onChange={(e) => updateAppliance(app.id, 'heatInput', e.target.value)} placeholder="e.g. 30" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Unit</label>
                        {renderButtonGroup(['kW', 'Btu/h'], app.heatInputUnit, (v) => updateAppliance(app.id, 'heatInputUnit', v))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <label className={labelClass}>Gas Rate</label>
                        <input type="text" inputMode="decimal" value={app.gasRate} onChange={(e) => updateAppliance(app.id, 'gasRate', e.target.value)} placeholder="e.g. 2.8" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Gas Rate Unit</label>
                        {renderButtonGroup(['m\u00b3/hr', 'ft\u00b3/hr'], app.gasRateUnit, (v) => updateAppliance(app.id, 'gasRateUnit', v))}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div>
                        <label className={labelClass}>CO (ppm)</label>
                        <input type="text" inputMode="decimal" value={app.coReading} onChange={(e) => updateAppliance(app.id, 'coReading', e.target.value)} placeholder="ppm" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>CO&#x2082; (%)</label>
                        <input type="text" inputMode="decimal" value={app.co2Reading} onChange={(e) => updateAppliance(app.id, 'co2Reading', e.target.value)} placeholder="%" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>CO/CO&#x2082; Ratio</label>
                        <input type="text" inputMode="decimal" value={app.ratioReading} onChange={(e) => updateAppliance(app.id, 'ratioReading', e.target.value)} placeholder="Ratio" className={inputClass} />
                      </div>
                    </div>
                    <div className="mt-2">
                      <label className={labelClass}>Flue flow / spillage test</label>
                      {renderButtonGroup(['Pass', 'Fail', 'N/A'], app.flueFlowSpillage, (v) => updateAppliance(app.id, 'flueFlowSpillage', v))}
                    </div>
                  </div>

                  {/* Safety Checks */}
                  <div className="pt-3 border-t border-gray-200">
                    <h4 className="text-[#1a1a2e] font-black text-xs mb-3 uppercase tracking-wide">Safety Checks</h4>
                    <div className="space-y-2">
                      <div><label className={labelClass}>Safety device operation <span className="text-red-500">*</span></label>
                        {renderButtonGroup(['Pass', 'Fail', 'N/A'], app.safetyDeviceOperation, (v) => updateAppliance(app.id, 'safetyDeviceOperation', v))}</div>
                      <div><label className={labelClass}>Ventilation <span className="text-red-500">*</span></label>
                        {renderButtonGroup(['Pass', 'Fail', 'N/A'], app.ventilation, (v) => updateAppliance(app.id, 'ventilation', v))}</div>
                      <div><label className={labelClass}>Flue performance</label>
                        {renderButtonGroup(['Pass', 'Fail', 'N/A'], app.fluePerformance, (v) => updateAppliance(app.id, 'fluePerformance', v))}</div>
                      <div><label className={labelClass}>Visual condition of flue</label>
                        {renderButtonGroup(['Pass', 'Fail', 'N/A'], app.visualConditionFlue, (v) => updateAppliance(app.id, 'visualConditionFlue', v))}</div>
                      <div><label className={labelClass}>Appliance safe to use? <span className="text-red-500">*</span></label>
                        {renderButtonGroup(['Pass', 'Fail'], app.applianceSafe, (v) => updateAppliance(app.id, 'applianceSafe', v))}</div>
                    </div>
                  </div>

                  {/* Classification */}
                  <div className="pt-3 border-t border-gray-200">
                    <h4 className="text-[#1a1a2e] font-black text-xs mb-3 uppercase tracking-wide">Classification <span className="text-red-500">*</span></h4>
                    {renderClassification(app.id, app.classification)}
                  </div>

                  {/* Defects & Warning */}
                  <div className="pt-3 border-t border-gray-200 space-y-2">
                    <div>
                      <label className={labelClass}>Defects identified</label>
                      <textarea value={app.defects} onChange={(e) => updateAppliance(app.id, 'defects', e.target.value)} placeholder="None" rows={2} className={inputClass + " resize-none"} />
                    </div>
                    <div>
                      <label className={labelClass}>Remedial action taken</label>
                      <textarea value={app.remedialAction} onChange={(e) => updateAppliance(app.id, 'remedialAction', e.target.value)} placeholder="None" rows={2} className={inputClass + " resize-none"} />
                    </div>
                    <div>
                      <label className={labelClass}>Warning notice issued? {(app.classification === 'ID' || app.classification === 'AR') && <span className="text-red-500">* Required for {app.classification}</span>}</label>
                      {renderButtonGroup(['Yes', 'No'], app.labelledWarningIssued, (v) => updateAppliance(app.id, 'labelledWarningIssued', v))}
                    </div>
                    {app.labelledWarningIssued === 'Yes' && (
                      <div>
                        <label className={labelClass}>Warning Notice No.</label>
                        <input type="text" value={app.warningNoticeNo} onChange={(e) => updateAppliance(app.id, 'warningNoticeNo', e.target.value)} placeholder="Notice reference" className={inputClass} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <button type="button" onClick={addAppliance} disabled={formData.appliances.length >= 10}
              className="w-full py-3 bg-[#1a1a2e] text-white rounded-lg font-bold disabled:opacity-50 uppercase tracking-wide text-sm">
              + Add Appliance ({formData.appliances.length}/10)
            </button>
          </div>
        )}

        {/* ═══ STEP 5: Safety Devices & Comments ═══ */}
        {step === 5 && (
          <div className="space-y-4">
            <h3 className={sectionClass}>CO Alarm</h3>
            <div className="bg-white rounded-lg p-4 space-y-3 border-2 border-gray-200 shadow-sm">
              <div>
                <label className={labelClass}>CO alarm fitted?</label>
                {renderButtonGroup(['Yes', 'No'], formData.coAlarmFitted, (v) => updateField('coAlarmFitted', v))}
              </div>
              {formData.coAlarmFitted === 'Yes' && (
                <>
                  <div>
                    <label className={labelClass}>CO alarm test</label>
                    {renderButtonGroup(['Pass', 'Fail', 'N/A'], formData.coAlarmTest, (v) => updateField('coAlarmTest', v))}
                  </div>
                  <div>
                    <label className={labelClass}>Expiry date</label>
                    <input type="date" value={formData.coAlarmExpiryDate} onChange={(e) => updateField('coAlarmExpiryDate', e.target.value)} className={inputClass} />
                  </div>
                </>
              )}
            </div>

            <h3 className={sectionClass}>Smoke Alarm</h3>
            <div className="bg-white rounded-lg p-4 space-y-3 border-2 border-gray-200 shadow-sm">
              <div>
                <label className={labelClass}>Smoke alarm fitted?</label>
                {renderButtonGroup(['Yes', 'No'], formData.smokeAlarmFitted, (v) => updateField('smokeAlarmFitted', v))}
              </div>
              {formData.smokeAlarmFitted === 'Yes' && (
                <div>
                  <label className={labelClass}>Smoke alarm test</label>
                  {renderButtonGroup(['Pass', 'Fail', 'N/A'], formData.smokeAlarmTest, (v) => updateField('smokeAlarmTest', v))}
                </div>
              )}
            </div>

            <h3 className={sectionClass}>Additional Comments</h3>
            <textarea value={formData.additionalComments} onChange={(e) => updateField('additionalComments', e.target.value)}
              placeholder="Any additional comments or observations" rows={3} className={inputClass + " resize-none"} />

            <h3 className={sectionClass}>Recommended Work</h3>
            <textarea value={formData.recommendedWork} onChange={(e) => updateField('recommendedWork', e.target.value)}
              placeholder="Any recommended work (not covered by this check)" rows={3} className={inputClass + " resize-none"} />
          </div>
        )}

        {/* ═══ STEP 6: Signatures ═══ */}
        {step === 6 && (
          <div className="space-y-4">
            <h3 className={sectionClass}>Engineer Details</h3>
            <div className="bg-white rounded-lg p-4 space-y-3 border-2 border-gray-200 shadow-sm">
              <div>
                <label className={labelClass}>Engineer Name <span className="text-red-500">*</span></label>
                <input type="text" value={formData.engineerName} onChange={(e) => updateField('engineerName', e.target.value)}
                  placeholder="Full name" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Engineer Signature <span className="text-red-500">*</span></label>
                <SignaturePad label="" onSignatureChange={setEngineerSignature} />
              </div>
            </div>

            <h3 className={sectionClass}>Received By</h3>
            <div className="bg-white rounded-lg p-4 space-y-3 border-2 border-gray-200 shadow-sm">
              <div>
                <label className={labelClass}>Name</label>
                <input type="text" value={formData.customerName} onChange={(e) => updateField('customerName', e.target.value)}
                  placeholder="Tenant / landlord name" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Signature</label>
                <SignaturePad label="" onSignatureChange={setCustomerSignature} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation - safe area aware for home indicator */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t-2 border-gray-200 z-10" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <div className="max-w-lg mx-auto flex gap-3 px-4 pt-3">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="flex-1 min-h-[48px] py-3 bg-gray-100 text-gray-700 font-bold rounded-lg border border-gray-300 active:scale-[0.98] transition-transform">
              Previous
            </button>
          )}
          {step < totalSteps ? (
            <button onClick={() => setStep(step + 1)} className="flex-1 min-h-[48px] py-3 bg-[#1a1a2e] text-white font-bold rounded-lg active:scale-[0.98] transition-transform shadow-sm">
              Next
            </button>
          ) : (
            <button onClick={handlePreview} className="flex-1 min-h-[48px] py-3 bg-[#FFD600] text-black font-black rounded-lg active:scale-[0.98] transition-transform shadow-sm uppercase tracking-wide text-sm">
              Preview &amp; Generate PDF
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CP12Form;
