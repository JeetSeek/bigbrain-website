import React, { useState, useCallback } from 'react';
import SignaturePad from './SignaturePad';

/**
 * Gas Service Record
 * Digital form for recording gas appliance servicing work
 * Compliant with Gas Safe Register requirements
 */

const CONTRACTOR_KEY = 'bb_service_contractor';
const loadContractor = () => { try { const s = localStorage.getItem(CONTRACTOR_KEY); return s ? JSON.parse(s) : null; } catch { return null; } };
const saveContractor = (d) => { try { localStorage.setItem(CONTRACTOR_KEY, JSON.stringify(d)); } catch {} };

const manufacturers = [
  'Ideal', 'Worcester Bosch', 'Vaillant', 'Baxi', 'Glow-worm', 'Potterton', 'Main',
  'Viessmann', 'Alpha', 'Ferroli', 'Ravenheat', 'Ariston', 'Intergas', 'Keston',
  'Vokera', 'Biasi', 'Remeha', 'Saunier Duval', 'Halstead', 'Morco', 'Myson',
  'Valor', 'Flavel', 'Robinson Willey', 'Cannon', 'Rangemaster', 'Rinnai', 'Other',
];

const applianceTypes = [
  'Boiler - Combi', 'Boiler - System', 'Boiler - Regular', 'Boiler - Back',
  'Gas Fire - Inset', 'Gas Fire - Outset', 'Gas Fire - Decorative',
  'Cooker', 'Cooker - Range', 'Hob', 'Oven',
  'Water Heater - Instantaneous', 'Water Heater - Storage', 'Water Heater - Multipoint',
  'Warm Air Unit', 'Space Heater - Flued', 'Space Heater - Flueless',
  'Tumble Dryer', 'Other',
];

const locations = [
  'Kitchen', 'Utility Room', 'Airing Cupboard', 'Boiler House',
  'Bedroom 1', 'Bedroom 2', 'Bedroom 3', 'Living Room', 'Dining Room',
  'Bathroom', 'En-Suite', 'Garage', 'Loft', 'Cellar',
  'Hallway', 'Landing', 'External', 'Communal Area', 'Other',
];

const flueTypes = ['Room Sealed (RS)', 'Open Flue (OF)', 'Flueless (FL)', 'Fan Assisted (FA)', 'N/A'];

const generateRef = () => {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `SVC-${d}-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`;
};

const GasServiceRecord = () => {
  const saved = loadContractor();
  const [step, setStep] = useState(1);
  const totalSteps = 5;
  const [engineerSig, setEngineerSig] = useState(null);
  const [customerSig, setCustomerSig] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);

  const [form, setForm] = useState({
    // Reference
    refNumber: generateRef(),
    serviceDate: new Date().toISOString().split('T')[0],
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
    installDate: '',
    // Pre-service checks
    visualCondition: '', // satisfactory / unsatisfactory
    ventilation: '', // adequate / inadequate / N/A
    flueTermination: '', // satisfactory / unsatisfactory / N/A
    flueCond: '', // satisfactory / unsatisfactory / N/A
    safetyDevices: '', // operating / not operating
    gasTightnessTest: '', // pass / fail
    operatingPressure: '',
    burnerPressure: '',
    // Gas readings
    gasRateKw: '',
    co: '',
    co2: '',
    o2: '',
    flueTemp: '',
    ambientTemp: '',
    ratio: '',
    efficiencyNet: '',
    // Service work
    stripClean: false,
    electrodes: false,
    gasket: false,
    condTrap: false,
    filter: false,
    systemPressure: false,
    inhibitor: false,
    controls: false,
    // Faults / observations
    faultsFound: '',
    workCarried: '',
    partsUsed: '',
    recommendations: '',
    // Outcome
    outcome: '', // serviceable / not serviceable / at risk / immediately dangerous
    nextServiceDate: '',
    // Signatures
    engineerName: saved?.engineerName || '',
    customerSignedName: '',
  });

  const updateField = useCallback((key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleCheck = useCallback((key) => {
    setForm(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Save contractor profile for reuse
  const saveProfile = useCallback(() => {
    saveContractor({
      contractorName: form.contractorName,
      contractorAddress: form.contractorAddress,
      contractorPhone: form.contractorPhone,
      gasSafeNo: form.gasSafeNo,
      idCardNo: form.idCardNo,
      engineerName: form.engineerName,
    });
  }, [form]);

  // Generate mailto link for emailing the record
  const handleEmail = useCallback(() => {
    saveProfile();
    setSending(true);
    const subject = `Gas Service Record - ${form.refNumber} - ${form.customerAddress || 'No Address'}`;
    const body = [
      `GAS SERVICE RECORD`,
      `Reference: ${form.refNumber}`,
      `Date: ${form.serviceDate}`,
      ``,
      `CONTRACTOR`,
      `Name: ${form.contractorName}`,
      `Gas Safe No: ${form.gasSafeNo}`,
      `Phone: ${form.contractorPhone}`,
      ``,
      `CUSTOMER`,
      `Name: ${form.customerName}`,
      `Address: ${form.customerAddress} ${form.customerPostcode}`,
      ``,
      `APPLIANCE`,
      `Type: ${form.applianceType}`,
      `Make: ${form.manufacturer} ${form.model}`,
      `Serial: ${form.serialNo}`,
      `GC Number: ${form.gcNumber}`,
      `Location: ${form.location}`,
      `Flue Type: ${form.flueType}`,
      ``,
      `PRE-SERVICE CHECKS`,
      `Visual Condition: ${form.visualCondition}`,
      `Ventilation: ${form.ventilation}`,
      `Flue Termination: ${form.flueTermination}`,
      `Flue Condition: ${form.flueCond}`,
      `Safety Devices: ${form.safetyDevices}`,
      `Gas Tightness: ${form.gasTightnessTest}`,
      `Operating Pressure: ${form.operatingPressure} mbar`,
      `Burner Pressure: ${form.burnerPressure} mbar`,
      ``,
      `GAS READINGS`,
      `Gas Rate: ${form.gasRateKw} kW`,
      `CO: ${form.co} ppm`,
      `CO2: ${form.co2}%`,
      `O2: ${form.o2}%`,
      `Flue Temp: ${form.flueTemp}°C`,
      `Ambient Temp: ${form.ambientTemp}°C`,
      `CO/CO2 Ratio: ${form.ratio}`,
      `Efficiency (Net): ${form.efficiencyNet}%`,
      ``,
      `SERVICE WORK COMPLETED`,
      form.stripClean ? '✓ Strip & clean burner/heat exchanger' : '',
      form.electrodes ? '✓ Check/replace electrodes' : '',
      form.gasket ? '✓ Replace gaskets/seals' : '',
      form.condTrap ? '✓ Clean condensate trap/siphon' : '',
      form.filter ? '✓ Clean/replace filters' : '',
      form.systemPressure ? '✓ Check system pressure/expansion vessel' : '',
      form.inhibitor ? '✓ Check/top-up inhibitor' : '',
      form.controls ? '✓ Check controls & thermostat operation' : '',
      ``,
      `Faults Found: ${form.faultsFound}`,
      `Work Carried Out: ${form.workCarried}`,
      `Parts Used: ${form.partsUsed}`,
      `Recommendations: ${form.recommendations}`,
      ``,
      `OUTCOME: ${form.outcome?.toUpperCase()}`,
      `Next Service Due: ${form.nextServiceDate}`,
      ``,
      `Engineer: ${form.engineerName}`,
      `Received By: ${form.customerSignedName}`,
    ].filter(Boolean).join('\n');

    const to = form.customerEmail || '';
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setTimeout(() => setSending(false), 2000);
  }, [form, saveProfile]);

  // Common classes
  const inputClass = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-[16px] text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 min-h-[44px]';
  const labelClass = 'block text-xs font-semibold text-gray-600 mb-1';
  const sectionClass = 'text-xs font-bold text-gray-500 uppercase tracking-wider mt-4 mb-2';
  const checkClass = 'flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 active:scale-[0.98] transition-transform cursor-pointer';

  const RadioGroup = ({ field, options, cols = 2 }) => (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {options.map(opt => (
        <button key={opt.value} type="button"
          onClick={() => updateField(field, opt.value)}
          className={`px-3 py-2.5 rounded-xl text-sm font-medium border min-h-[44px] transition-all ${
            form[field] === opt.value
              ? opt.color || 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  const outcomeOptions = [
    { value: 'serviceable', label: 'Serviceable', color: 'bg-emerald-600 text-white border-emerald-600' },
    { value: 'not serviceable', label: 'Not Serviceable', color: 'bg-amber-500 text-white border-amber-500' },
    { value: 'at risk', label: 'At Risk (AR)', color: 'bg-orange-500 text-white border-orange-500' },
    { value: 'immediately dangerous', label: 'Imm. Dangerous (ID)', color: 'bg-red-600 text-white border-red-600' },
  ];

  const passFailOpts = [
    { value: 'satisfactory', label: 'Satisfactory', color: 'bg-emerald-600 text-white border-emerald-600' },
    { value: 'unsatisfactory', label: 'Unsatisfactory', color: 'bg-red-600 text-white border-red-600' },
  ];

  const ventOpts = [
    { value: 'adequate', label: 'Adequate', color: 'bg-emerald-600 text-white border-emerald-600' },
    { value: 'inadequate', label: 'Inadequate', color: 'bg-red-600 text-white border-red-600' },
    { value: 'N/A', label: 'N/A' },
  ];

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 pb-28">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-4 sm:p-5 mb-4">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3 blur-xl" />
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl flex-shrink-0">
            🔧
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Gas Service Record</h1>
            <p className="text-sm text-white/70 mt-0.5">Ref: {form.refNumber}</p>
          </div>
        </div>
        {/* Step indicator */}
        <div className="flex gap-1.5 mt-4">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < step ? 'bg-white' : 'bg-white/25'}`} />
          ))}
        </div>
        <p className="text-[11px] text-white/60 mt-2">
          Step {step} of {totalSteps}: {['Contractor & Customer', 'Appliance Details', 'Checks & Readings', 'Service Work', 'Outcome & Signatures'][step - 1]}
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
            <div>
              <label className={labelClass}>Address</label>
              <input type="text" value={form.contractorAddress} onChange={e => updateField('contractorAddress', e.target.value)}
                placeholder="Business address" className={inputClass} />
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
            <div>
              <label className={labelClass}>ID Card No</label>
              <input type="text" value={form.idCardNo} onChange={e => updateField('idCardNo', e.target.value)}
                placeholder="Gas Safe ID card number" className={inputClass} />
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
              <label className={labelClass}>Email (for sending certificate)</label>
              <input type="email" value={form.customerEmail} onChange={e => updateField('customerEmail', e.target.value)}
                placeholder="customer@email.com" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Service Date *</label>
              <input type="date" value={form.serviceDate} onChange={e => updateField('serviceDate', e.target.value)}
                className={inputClass} />
            </div>
          </div>
        </div>
      )}

      {/* ═══ STEP 2: Appliance Details ═══ */}
      {step === 2 && (
        <div className="space-y-3">
          <h3 className={sectionClass}>Appliance Information</h3>
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
                <input type="text" value={form.serialNo} onChange={e => updateField('serialNo', e.target.value)}
                  placeholder="From data plate" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>GC Number</label>
                <input type="text" inputMode="numeric" value={form.gcNumber} onChange={e => updateField('gcNumber', e.target.value)}
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
              <label className={labelClass}>Date of Installation (if known)</label>
              <input type="date" value={form.installDate} onChange={e => updateField('installDate', e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>
      )}

      {/* ═══ STEP 3: Checks & Readings ═══ */}
      {step === 3 && (
        <div className="space-y-3">
          <h3 className={sectionClass}>Pre-Service Checks</h3>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4 shadow-sm">
            <div>
              <label className={labelClass}>Visual Condition</label>
              <RadioGroup field="visualCondition" options={passFailOpts} />
            </div>
            <div>
              <label className={labelClass}>Ventilation</label>
              <RadioGroup field="ventilation" options={ventOpts} cols={3} />
            </div>
            <div>
              <label className={labelClass}>Flue Termination</label>
              <RadioGroup field="flueTermination" options={[...passFailOpts, { value: 'N/A', label: 'N/A' }]} cols={3} />
            </div>
            <div>
              <label className={labelClass}>Flue Condition</label>
              <RadioGroup field="flueCond" options={[...passFailOpts, { value: 'N/A', label: 'N/A' }]} cols={3} />
            </div>
            <div>
              <label className={labelClass}>Safety Devices</label>
              <RadioGroup field="safetyDevices" options={[
                { value: 'operating', label: 'Operating', color: 'bg-emerald-600 text-white border-emerald-600' },
                { value: 'not operating', label: 'Not Operating', color: 'bg-red-600 text-white border-red-600' },
              ]} />
            </div>
            <div>
              <label className={labelClass}>Gas Tightness Test</label>
              <RadioGroup field="gasTightnessTest" options={[
                { value: 'pass', label: 'Pass', color: 'bg-emerald-600 text-white border-emerald-600' },
                { value: 'fail', label: 'Fail', color: 'bg-red-600 text-white border-red-600' },
              ]} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Operating Pressure (mbar)</label>
                <input type="number" step="0.1" inputMode="decimal" value={form.operatingPressure}
                  onChange={e => updateField('operatingPressure', e.target.value)} placeholder="e.g. 20.0" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Burner Pressure (mbar)</label>
                <input type="number" step="0.1" inputMode="decimal" value={form.burnerPressure}
                  onChange={e => updateField('burnerPressure', e.target.value)} placeholder="e.g. 12.5" className={inputClass} />
              </div>
            </div>
          </div>

          <h3 className={sectionClass}>Combustion / Flue Gas Readings</h3>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 shadow-sm">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { key: 'gasRateKw', label: 'Gas Rate (kW)', ph: 'e.g. 30.2' },
                { key: 'co', label: 'CO (ppm)', ph: 'e.g. 42' },
                { key: 'co2', label: 'CO₂ (%)', ph: 'e.g. 9.2' },
                { key: 'o2', label: 'O₂ (%)', ph: 'e.g. 5.1' },
                { key: 'flueTemp', label: 'Flue Temp (°C)', ph: 'e.g. 127' },
                { key: 'ambientTemp', label: 'Ambient (°C)', ph: 'e.g. 21' },
                { key: 'ratio', label: 'CO/CO₂ Ratio', ph: 'e.g. 0.0042' },
                { key: 'efficiencyNet', label: 'Efficiency Net (%)', ph: 'e.g. 92.3' },
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

      {/* ═══ STEP 4: Service Work ═══ */}
      {step === 4 && (
        <div className="space-y-3">
          <h3 className={sectionClass}>Service Work Completed</h3>
          <div className="bg-white rounded-2xl border border-gray-100 p-3 space-y-2 shadow-sm">
            {[
              { key: 'stripClean', label: 'Strip & clean burner / heat exchanger' },
              { key: 'electrodes', label: 'Check / replace ignition & sensing electrodes' },
              { key: 'gasket', label: 'Replace gaskets & seals' },
              { key: 'condTrap', label: 'Clean condensate trap / siphon' },
              { key: 'filter', label: 'Clean / replace filters' },
              { key: 'systemPressure', label: 'Check system pressure & expansion vessel' },
              { key: 'inhibitor', label: 'Check / top-up system inhibitor' },
              { key: 'controls', label: 'Check controls, thermostat & programmer' },
            ].map(item => (
              <button key={item.key} type="button" onClick={() => toggleCheck(item.key)} className={checkClass}>
                <span className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  form[item.key] ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-300 bg-white'
                }`}>
                  {form[item.key] && <span className="text-sm">✓</span>}
                </span>
                <span className="text-sm text-gray-700">{item.label}</span>
              </button>
            ))}
          </div>

          <h3 className={sectionClass}>Additional Details</h3>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 shadow-sm">
            <div>
              <label className={labelClass}>Faults Found</label>
              <textarea value={form.faultsFound} onChange={e => updateField('faultsFound', e.target.value)}
                placeholder="Describe any faults found during service..." rows={3} className={inputClass + ' resize-none'} />
            </div>
            <div>
              <label className={labelClass}>Work Carried Out</label>
              <textarea value={form.workCarried} onChange={e => updateField('workCarried', e.target.value)}
                placeholder="Describe all work carried out..." rows={3} className={inputClass + ' resize-none'} />
            </div>
            <div>
              <label className={labelClass}>Parts Used</label>
              <textarea value={form.partsUsed} onChange={e => updateField('partsUsed', e.target.value)}
                placeholder="List any parts replaced..." rows={2} className={inputClass + ' resize-none'} />
            </div>
            <div>
              <label className={labelClass}>Recommendations</label>
              <textarea value={form.recommendations} onChange={e => updateField('recommendations', e.target.value)}
                placeholder="Recommended future work or observations..." rows={2} className={inputClass + ' resize-none'} />
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
              <label className={labelClass}>Appliance Status After Service *</label>
              <div className="grid grid-cols-2 gap-2">
                {outcomeOptions.map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => updateField('outcome', opt.value)}
                    className={`px-3 py-3 rounded-xl text-sm font-semibold border min-h-[44px] transition-all ${
                      form.outcome === opt.value ? opt.color : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass}>Next Service Due</label>
              <input type="date" value={form.nextServiceDate} onChange={e => updateField('nextServiceDate', e.target.value)} className={inputClass} />
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

          <h3 className={sectionClass}>Customer / Responsible Person</h3>
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
            <button onClick={() => setStep(step + 1)} className="flex-1 min-h-[48px] py-3 bg-emerald-600 text-white font-bold rounded-xl active:scale-[0.98] transition-transform shadow-sm">
              Next
            </button>
          ) : (
            <button onClick={handleEmail} disabled={sending}
              className="flex-1 min-h-[48px] py-3 bg-emerald-600 text-white font-bold rounded-xl active:scale-[0.98] transition-transform shadow-sm disabled:opacity-50">
              {sending ? 'Opening...' : '📧 Email Service Record'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GasServiceRecord;
