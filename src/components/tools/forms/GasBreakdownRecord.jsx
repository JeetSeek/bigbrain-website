import React, { useState, useCallback } from 'react';
import SignaturePad from './SignaturePad';

/**
 * Gas Breakdown Record
 * Digital form for recording gas appliance breakdown/repair visits
 * Compliant with Gas Safe Register requirements
 */

const CONTRACTOR_KEY = 'bb_breakdown_contractor';
const loadContractor = () => { try { const s = localStorage.getItem(CONTRACTOR_KEY); return s ? JSON.parse(s) : null; } catch { return null; } };
const saveContractorData = (d) => { try { localStorage.setItem(CONTRACTOR_KEY, JSON.stringify(d)); } catch {} };

const manufacturers = [
  'Ideal', 'Worcester Bosch', 'Vaillant', 'Baxi', 'Glow-worm', 'Potterton', 'Main',
  'Viessmann', 'Alpha', 'Ferroli', 'Ravenheat', 'Ariston', 'Intergas', 'Keston',
  'Vokera', 'Biasi', 'Remeha', 'Saunier Duval', 'Halstead', 'Morco', 'Myson',
  'Valor', 'Flavel', 'Robinson Willey', 'Cannon', 'Rangemaster', 'Rinnai', 'Other',
];

const applianceTypes = [
  'Boiler - Combi', 'Boiler - System', 'Boiler - Regular', 'Boiler - Back',
  'Gas Fire - Inset', 'Gas Fire - Outset', 'Gas Fire - Decorative',
  'Cooker', 'Hob', 'Oven', 'Water Heater - Instantaneous', 'Water Heater - Storage',
  'Warm Air Unit', 'Space Heater - Flued', 'Space Heater - Flueless', 'Other',
];

const locations = [
  'Kitchen', 'Utility Room', 'Airing Cupboard', 'Boiler House',
  'Bedroom 1', 'Bedroom 2', 'Living Room', 'Dining Room',
  'Bathroom', 'En-Suite', 'Garage', 'Loft', 'Cellar',
  'Hallway', 'External', 'Communal Area', 'Other',
];

const flueTypes = ['Room Sealed (RS)', 'Open Flue (OF)', 'Flueless (FL)', 'Fan Assisted (FA)', 'N/A'];

const generateRef = () => {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `BRK-${d}-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`;
};

const GasBreakdownRecord = () => {
  const saved = loadContractor();
  const [step, setStep] = useState(1);
  const totalSteps = 5;
  const [engineerSig, setEngineerSig] = useState(null);
  const [customerSig, setCustomerSig] = useState(null);
  const [sending, setSending] = useState(false);

  const [form, setForm] = useState({
    refNumber: generateRef(),
    visitDate: new Date().toISOString().split('T')[0],
    timeArrived: '',
    timeLeft: '',
    // Contractor
    contractorName: saved?.contractorName || '',
    contractorAddress: saved?.contractorAddress || '',
    contractorPhone: saved?.contractorPhone || '',
    gasSafeNo: saved?.gasSafeNo || '',
    idCardNo: saved?.idCardNo || '',
    // Customer
    customerName: '',
    customerAddress: '',
    customerPostcode: '',
    customerPhone: '',
    customerEmail: '',
    // Appliance
    applianceType: '',
    manufacturer: '',
    model: '',
    serialNo: '',
    gcNumber: '',
    location: '',
    flueType: '',
    faultCode: '',
    // Reported fault
    reportedFault: '',
    // Diagnosis
    diagnosisFindings: '',
    causeOfFault: '',
    // Safety checks
    gasTightnessTest: '',
    flueSafetyCheck: '',
    ventilationCheck: '',
    safetyDevicesCheck: '',
    operatingPressure: '',
    // Repair
    repairCompleted: '', // yes / no / partial
    workDescription: '',
    partsReplaced: '',
    partsRequired: '',
    // Post-repair readings
    co: '',
    co2: '',
    o2: '',
    flueTemp: '',
    ratio: '',
    gasRateKw: '',
    // Outcome
    outcome: '', // repaired / awaiting parts / not repairable / unsafe
    classification: '', // safe / at risk / immediately dangerous
    warningNoticeIssued: '',
    returnVisitRequired: '',
    returnVisitDate: '',
    additionalNotes: '',
    // Signatures
    engineerName: saved?.engineerName || '',
    customerSignedName: '',
  });

  const updateField = useCallback((key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const saveProfile = useCallback(() => {
    saveContractorData({
      contractorName: form.contractorName,
      contractorAddress: form.contractorAddress,
      contractorPhone: form.contractorPhone,
      gasSafeNo: form.gasSafeNo,
      idCardNo: form.idCardNo,
      engineerName: form.engineerName,
    });
  }, [form]);

  const handleEmail = useCallback(() => {
    saveProfile();
    setSending(true);
    const subject = `Gas Breakdown Record - ${form.refNumber} - ${form.customerAddress || 'No Address'}`;
    const body = [
      `GAS BREAKDOWN RECORD`,
      `Reference: ${form.refNumber}`,
      `Date: ${form.visitDate}  Time: ${form.timeArrived} - ${form.timeLeft}`,
      ``,
      `CONTRACTOR`,
      `Name: ${form.contractorName}`,
      `Gas Safe No: ${form.gasSafeNo}`,
      `Phone: ${form.contractorPhone}`,
      ``,
      `CUSTOMER`,
      `Name: ${form.customerName}`,
      `Address: ${form.customerAddress} ${form.customerPostcode}`,
      `Phone: ${form.customerPhone}`,
      ``,
      `APPLIANCE`,
      `Type: ${form.applianceType}`,
      `Make: ${form.manufacturer} ${form.model}`,
      `Serial: ${form.serialNo}  GC: ${form.gcNumber}`,
      `Location: ${form.location}  Flue: ${form.flueType}`,
      `Fault Code Displayed: ${form.faultCode}`,
      ``,
      `REPORTED FAULT`,
      form.reportedFault,
      ``,
      `DIAGNOSIS`,
      `Findings: ${form.diagnosisFindings}`,
      `Cause: ${form.causeOfFault}`,
      ``,
      `SAFETY CHECKS`,
      `Gas Tightness: ${form.gasTightnessTest}`,
      `Flue Safety: ${form.flueSafetyCheck}`,
      `Ventilation: ${form.ventilationCheck}`,
      `Safety Devices: ${form.safetyDevicesCheck}`,
      `Operating Pressure: ${form.operatingPressure} mbar`,
      ``,
      `REPAIR`,
      `Completed: ${form.repairCompleted}`,
      `Work Description: ${form.workDescription}`,
      `Parts Replaced: ${form.partsReplaced}`,
      `Parts Required: ${form.partsRequired}`,
      ``,
      `POST-REPAIR READINGS`,
      `CO: ${form.co} ppm  CO2: ${form.co2}%  O2: ${form.o2}%`,
      `Flue Temp: ${form.flueTemp}°C  Ratio: ${form.ratio}`,
      `Gas Rate: ${form.gasRateKw} kW`,
      ``,
      `OUTCOME: ${form.outcome?.toUpperCase()}`,
      `Classification: ${form.classification}`,
      `Warning Notice Issued: ${form.warningNoticeIssued}`,
      `Return Visit Required: ${form.returnVisitRequired}`,
      form.returnVisitDate ? `Return Visit Date: ${form.returnVisitDate}` : '',
      form.additionalNotes ? `\nNotes: ${form.additionalNotes}` : '',
      ``,
      `Engineer: ${form.engineerName}`,
      `Received By: ${form.customerSignedName}`,
    ].filter(l => l !== undefined).join('\n');

    const to = form.customerEmail || '';
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setTimeout(() => setSending(false), 2000);
  }, [form, saveProfile]);

  const inputClass = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-[16px] text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 min-h-[44px]';
  const labelClass = 'block text-xs font-semibold text-gray-600 mb-1';
  const sectionClass = 'text-xs font-bold text-gray-500 uppercase tracking-wider mt-4 mb-2';

  const RadioGroup = ({ field, options, cols = 2 }) => (
    <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {options.map(opt => (
        <button key={opt.value} type="button"
          onClick={() => updateField(field, opt.value)}
          className={`px-3 py-2.5 rounded-xl text-sm font-medium border min-h-[44px] transition-all ${
            form[field] === opt.value
              ? opt.color || 'bg-orange-600 text-white border-orange-600'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  const passOpts = [
    { value: 'pass', label: 'Pass', color: 'bg-emerald-600 text-white border-emerald-600' },
    { value: 'fail', label: 'Fail', color: 'bg-red-600 text-white border-red-600' },
    { value: 'N/A', label: 'N/A' },
  ];

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 pb-28">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-4 sm:p-5 mb-4">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3 blur-xl" />
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl flex-shrink-0">
            🔨
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Gas Breakdown Record</h1>
            <p className="text-sm text-white/70 mt-0.5">Ref: {form.refNumber}</p>
          </div>
        </div>
        <div className="flex gap-1.5 mt-4">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < step ? 'bg-white' : 'bg-white/25'}`} />
          ))}
        </div>
        <p className="text-[11px] text-white/60 mt-2">
          Step {step} of {totalSteps}: {['Contractor & Customer', 'Appliance & Fault', 'Diagnosis & Safety', 'Repair & Readings', 'Outcome & Signatures'][step - 1]}
        </p>
      </div>

      {/* ═══ STEP 1: Contractor & Customer ═══ */}
      {step === 1 && (
        <div className="space-y-3">
          <h3 className={sectionClass}>Contractor Details</h3>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 shadow-sm">
            <div>
              <label className={labelClass}>Company / Engineer Name *</label>
              <input type="text" value={form.contractorName} onChange={e => updateField('contractorName', e.target.value)}
                placeholder="e.g. Smith Heating Ltd" className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Gas Safe No *</label>
                <input type="text" inputMode="numeric" value={form.gasSafeNo} onChange={e => updateField('gasSafeNo', e.target.value)}
                  placeholder="e.g. 123456" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input type="tel" value={form.contractorPhone} onChange={e => updateField('contractorPhone', e.target.value)}
                  placeholder="07..." className={inputClass} />
              </div>
            </div>
          </div>

          <h3 className={sectionClass}>Customer / Property</h3>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 shadow-sm">
            <div>
              <label className={labelClass}>Customer Name *</label>
              <input type="text" value={form.customerName} onChange={e => updateField('customerName', e.target.value)}
                placeholder="Full name" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Property Address *</label>
              <input type="text" value={form.customerAddress} onChange={e => updateField('customerAddress', e.target.value)}
                placeholder="Full address" className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Postcode</label>
                <input type="text" value={form.customerPostcode} onChange={e => updateField('customerPostcode', e.target.value)}
                  placeholder="e.g. SW1A 1AA" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input type="tel" value={form.customerPhone} onChange={e => updateField('customerPhone', e.target.value)}
                  placeholder="07..." className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" value={form.customerEmail} onChange={e => updateField('customerEmail', e.target.value)}
                placeholder="customer@email.com" className={inputClass} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Visit Date *</label>
                <input type="date" value={form.visitDate} onChange={e => updateField('visitDate', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Time Arrived</label>
                <input type="time" value={form.timeArrived} onChange={e => updateField('timeArrived', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Time Left</label>
                <input type="time" value={form.timeLeft} onChange={e => updateField('timeLeft', e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ STEP 2: Appliance & Fault ═══ */}
      {step === 2 && (
        <div className="space-y-3">
          <h3 className={sectionClass}>Appliance</h3>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 shadow-sm">
            <div>
              <label className={labelClass}>Appliance Type *</label>
              <select value={form.applianceType} onChange={e => updateField('applianceType', e.target.value)} className={inputClass}>
                <option value="">Select type...</option>
                {applianceTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Manufacturer *</label>
                <select value={form.manufacturer} onChange={e => updateField('manufacturer', e.target.value)} className={inputClass}>
                  <option value="">Select...</option>
                  {manufacturers.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Model</label>
                <input type="text" value={form.model} onChange={e => updateField('model', e.target.value)}
                  placeholder="e.g. Logic Combi C30" className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Serial Number</label>
                <input type="text" value={form.serialNo} onChange={e => updateField('serialNo', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>GC Number</label>
                <input type="text" value={form.gcNumber} onChange={e => updateField('gcNumber', e.target.value)}
                  placeholder="e.g. 41-532-05" className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Location</label>
                <select value={form.location} onChange={e => updateField('location', e.target.value)} className={inputClass}>
                  <option value="">Select...</option>
                  {locations.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Flue Type</label>
                <select value={form.flueType} onChange={e => updateField('flueType', e.target.value)} className={inputClass}>
                  <option value="">Select...</option>
                  {flueTypes.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>Fault Code Displayed</label>
              <input type="text" value={form.faultCode} onChange={e => updateField('faultCode', e.target.value)}
                placeholder="e.g. F22, L2, E119" className={inputClass} />
            </div>
          </div>

          <h3 className={sectionClass}>Reported Fault</h3>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <label className={labelClass}>Customer's Description of Fault *</label>
            <textarea value={form.reportedFault} onChange={e => updateField('reportedFault', e.target.value)}
              placeholder="What the customer reported — e.g. 'No hot water, boiler showing F22 code, intermittent lockout since yesterday...'"
              rows={4} className={inputClass + ' resize-none'} />
          </div>
        </div>
      )}

      {/* ═══ STEP 3: Diagnosis & Safety ═══ */}
      {step === 3 && (
        <div className="space-y-3">
          <h3 className={sectionClass}>Diagnosis</h3>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 shadow-sm">
            <div>
              <label className={labelClass}>Findings *</label>
              <textarea value={form.diagnosisFindings} onChange={e => updateField('diagnosisFindings', e.target.value)}
                placeholder="What was found during investigation..."
                rows={3} className={inputClass + ' resize-none'} />
            </div>
            <div>
              <label className={labelClass}>Cause of Fault</label>
              <textarea value={form.causeOfFault} onChange={e => updateField('causeOfFault', e.target.value)}
                placeholder="Root cause — e.g. failed diverter valve, low system pressure, blocked condensate..."
                rows={3} className={inputClass + ' resize-none'} />
            </div>
          </div>

          <h3 className={sectionClass}>Safety Checks</h3>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4 shadow-sm">
            <div>
              <label className={labelClass}>Gas Tightness Test</label>
              <RadioGroup field="gasTightnessTest" options={passOpts} cols={3} />
            </div>
            <div>
              <label className={labelClass}>Flue Safety Check</label>
              <RadioGroup field="flueSafetyCheck" options={passOpts} cols={3} />
            </div>
            <div>
              <label className={labelClass}>Ventilation Check</label>
              <RadioGroup field="ventilationCheck" options={passOpts} cols={3} />
            </div>
            <div>
              <label className={labelClass}>Safety Devices</label>
              <RadioGroup field="safetyDevicesCheck" options={[
                { value: 'operating', label: 'Operating', color: 'bg-emerald-600 text-white border-emerald-600' },
                { value: 'not operating', label: 'Not Operating', color: 'bg-red-600 text-white border-red-600' },
                { value: 'N/A', label: 'N/A' },
              ]} cols={3} />
            </div>
            <div>
              <label className={labelClass}>Operating Pressure (mbar)</label>
              <input type="number" step="0.1" inputMode="decimal" value={form.operatingPressure}
                onChange={e => updateField('operatingPressure', e.target.value)} placeholder="e.g. 20.0" className={inputClass} />
            </div>
          </div>
        </div>
      )}

      {/* ═══ STEP 4: Repair & Readings ═══ */}
      {step === 4 && (
        <div className="space-y-3">
          <h3 className={sectionClass}>Repair</h3>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4 shadow-sm">
            <div>
              <label className={labelClass}>Repair Completed? *</label>
              <RadioGroup field="repairCompleted" options={[
                { value: 'yes', label: 'Yes — Fully Repaired', color: 'bg-emerald-600 text-white border-emerald-600' },
                { value: 'partial', label: 'Partial Repair', color: 'bg-amber-500 text-white border-amber-500' },
                { value: 'no', label: 'No — Awaiting Parts', color: 'bg-orange-500 text-white border-orange-500' },
              ]} cols={3} />
            </div>
            <div>
              <label className={labelClass}>Work Description *</label>
              <textarea value={form.workDescription} onChange={e => updateField('workDescription', e.target.value)}
                placeholder="All work carried out..." rows={3} className={inputClass + ' resize-none'} />
            </div>
            <div>
              <label className={labelClass}>Parts Replaced</label>
              <textarea value={form.partsReplaced} onChange={e => updateField('partsReplaced', e.target.value)}
                placeholder="List parts replaced with part numbers if available..." rows={2} className={inputClass + ' resize-none'} />
            </div>
            <div>
              <label className={labelClass}>Parts Required (if awaiting)</label>
              <textarea value={form.partsRequired} onChange={e => updateField('partsRequired', e.target.value)}
                placeholder="Parts needed for return visit..." rows={2} className={inputClass + ' resize-none'} />
            </div>
          </div>

          <h3 className={sectionClass}>Post-Repair Readings</h3>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { key: 'gasRateKw', label: 'Gas Rate (kW)', ph: 'e.g. 30.2' },
                { key: 'co', label: 'CO (ppm)', ph: 'e.g. 42' },
                { key: 'co2', label: 'CO₂ (%)', ph: 'e.g. 9.2' },
                { key: 'o2', label: 'O₂ (%)', ph: 'e.g. 5.1' },
                { key: 'flueTemp', label: 'Flue Temp (°C)', ph: 'e.g. 127' },
                { key: 'ratio', label: 'CO/CO₂ Ratio', ph: 'e.g. 0.0042' },
              ].map(f => (
                <div key={f.key}>
                  <label className={labelClass}>{f.label}</label>
                  <input type="number" step="any" inputMode="decimal" value={form[f.key]}
                    onChange={e => updateField(f.key, e.target.value)} placeholder={f.ph} className={inputClass} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ STEP 5: Outcome & Signatures ═══ */}
      {step === 5 && (
        <div className="space-y-3">
          <h3 className={sectionClass}>Outcome</h3>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4 shadow-sm">
            <div>
              <label className={labelClass}>Appliance Status *</label>
              <RadioGroup field="outcome" options={[
                { value: 'repaired', label: 'Repaired & Working', color: 'bg-emerald-600 text-white border-emerald-600' },
                { value: 'awaiting parts', label: 'Awaiting Parts', color: 'bg-amber-500 text-white border-amber-500' },
                { value: 'not repairable', label: 'Not Repairable', color: 'bg-gray-600 text-white border-gray-600' },
                { value: 'unsafe', label: 'Unsafe', color: 'bg-red-600 text-white border-red-600' },
              ]} />
            </div>
            <div>
              <label className={labelClass}>Safety Classification</label>
              <RadioGroup field="classification" options={[
                { value: 'safe', label: 'Safe to Use', color: 'bg-emerald-600 text-white border-emerald-600' },
                { value: 'at risk', label: 'At Risk (AR)', color: 'bg-orange-500 text-white border-orange-500' },
                { value: 'immediately dangerous', label: 'Imm. Dangerous (ID)', color: 'bg-red-600 text-white border-red-600' },
              ]} cols={3} />
            </div>
            <div>
              <label className={labelClass}>Warning Notice Issued?</label>
              <RadioGroup field="warningNoticeIssued" options={[
                { value: 'no', label: 'No' },
                { value: 'yes', label: 'Yes', color: 'bg-red-600 text-white border-red-600' },
              ]} />
            </div>
            <div>
              <label className={labelClass}>Return Visit Required?</label>
              <RadioGroup field="returnVisitRequired" options={[
                { value: 'no', label: 'No' },
                { value: 'yes', label: 'Yes', color: 'bg-orange-600 text-white border-orange-600' },
              ]} />
            </div>
            {form.returnVisitRequired === 'yes' && (
              <div>
                <label className={labelClass}>Return Visit Date</label>
                <input type="date" value={form.returnVisitDate} onChange={e => updateField('returnVisitDate', e.target.value)} className={inputClass} />
              </div>
            )}
            <div>
              <label className={labelClass}>Additional Notes</label>
              <textarea value={form.additionalNotes} onChange={e => updateField('additionalNotes', e.target.value)}
                placeholder="Any other observations or notes..." rows={3} className={inputClass + ' resize-none'} />
            </div>
          </div>

          <h3 className={sectionClass}>Engineer</h3>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 shadow-sm">
            <div>
              <label className={labelClass}>Engineer Name *</label>
              <input type="text" value={form.engineerName} onChange={e => updateField('engineerName', e.target.value)}
                placeholder="Full name" className={inputClass} />
            </div>
            <SignaturePad label="Engineer Signature" onSignatureChange={setEngineerSig} />
          </div>

          <h3 className={sectionClass}>Customer</h3>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 shadow-sm">
            <div>
              <label className={labelClass}>Name</label>
              <input type="text" value={form.customerSignedName} onChange={e => updateField('customerSignedName', e.target.value)}
                placeholder="Print name" className={inputClass} />
            </div>
            <SignaturePad label="Customer Signature" onSignatureChange={setCustomerSig} />
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 z-10" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <div className="max-w-3xl mx-auto flex gap-3 px-4 pt-3">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="flex-1 min-h-[48px] py-3 bg-gray-100 text-gray-700 font-bold rounded-xl border border-gray-200 active:scale-[0.98] transition-transform">
              Previous
            </button>
          )}
          {step < totalSteps ? (
            <button onClick={() => setStep(step + 1)} className="flex-1 min-h-[48px] py-3 bg-orange-600 text-white font-bold rounded-xl active:scale-[0.98] transition-transform shadow-sm">
              Next
            </button>
          ) : (
            <button onClick={handleEmail} disabled={sending}
              className="flex-1 min-h-[48px] py-3 bg-orange-600 text-white font-bold rounded-xl active:scale-[0.98] transition-transform shadow-sm disabled:opacity-50">
              {sending ? 'Opening...' : '📧 Email Breakdown Record'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GasBreakdownRecord;
