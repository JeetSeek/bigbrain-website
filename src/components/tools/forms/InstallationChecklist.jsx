import React, { useState, useCallback } from 'react';
import SignaturePad from './SignaturePad';

/**
 * Gas Installation & Commissioning Checklist
 * Digital form for recording new gas appliance installations
 * Covers pre-installation checks, commissioning, and handover
 */

const CONTRACTOR_KEY = 'bb_install_contractor';
const loadContractor = () => { try { const s = localStorage.getItem(CONTRACTOR_KEY); return s ? JSON.parse(s) : null; } catch { return null; } };
const saveContractorData = (d) => { try { localStorage.setItem(CONTRACTOR_KEY, JSON.stringify(d)); } catch {} };

const manufacturers = [
  'Ideal', 'Worcester Bosch', 'Vaillant', 'Baxi', 'Glow-worm', 'Potterton', 'Main',
  'Viessmann', 'Alpha', 'Ferroli', 'Ravenheat', 'Ariston', 'Intergas', 'Keston',
  'Vokera', 'Biasi', 'Remeha', 'Saunier Duval', 'Halstead', 'Morco', 'Myson',
  'Valor', 'Flavel', 'Robinson Willey', 'Cannon', 'Rangemaster', 'Rinnai', 'Other',
];

const applianceTypes = [
  'Boiler - Combi', 'Boiler - System', 'Boiler - Regular',
  'Gas Fire - Inset', 'Gas Fire - Outset', 'Gas Fire - Decorative',
  'Cooker', 'Cooker - Range', 'Hob', 'Oven',
  'Water Heater - Instantaneous', 'Water Heater - Storage',
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
  return `INS-${d}-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`;
};

const InstallationChecklist = () => {
  const saved = loadContractor();
  const [step, setStep] = useState(1);
  const totalSteps = 6;
  const [engineerSig, setEngineerSig] = useState(null);
  const [customerSig, setCustomerSig] = useState(null);
  const [sending, setSending] = useState(false);

  const [form, setForm] = useState({
    refNumber: generateRef(),
    installDate: new Date().toISOString().split('T')[0],
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
    // Old appliance
    oldApplianceRemoved: '', // yes / no / N/A
    oldMake: '',
    oldModel: '',
    oldDecommissioned: '', // yes / no
    // New appliance
    applianceType: '',
    manufacturer: '',
    model: '',
    serialNo: '',
    gcNumber: '',
    location: '',
    flueType: '',
    flueLength: '',
    flueBends: '',
    // Pre-installation checks
    meterLocation: '',
    emergencyControlValve: '', // accessible / not accessible
    existingPipework: '', // adequate / requires upgrade
    pipeworkUpgradeDetails: '',
    bonding: '', // satisfactory / unsatisfactory
    ventilation: '', // adequate / inadequate / N/A
    ventDetails: '',
    // Installation checks
    pipeworkInstalled: false,
    gasTightnessTest: false,
    purgeComplete: false,
    flueInstalled: false,
    condensateInstalled: false,
    electricalConnection: false,
    systemFlushed: false,
    inhibitorAdded: false,
    filterFitted: false,
    controlsInstalled: false,
    // Gas tightness
    tightnessResult: '', // pass / fail
    tightnessPressure: '',
    // Commissioning
    operatingPressure: '',
    burnerPressure: '',
    gasRateKw: '',
    co: '',
    co2: '',
    o2: '',
    flueTemp: '',
    ambientTemp: '',
    ratio: '',
    efficiency: '',
    dhwFlowRate: '',
    dhwTemp: '',
    systemPressure: '',
    expansionVesselCharge: '',
    // Controls & settings
    roomThermostat: '', // fitted / existing / N/A
    programmer: '', // fitted / existing / N/A
    trvs: '', // fitted / existing / N/A
    cylinderStat: '', // fitted / existing / N/A
    weatherComp: '', // fitted / existing / N/A
    // Handover
    benchmarkComplete: false,
    manualLeftWithCustomer: false,
    controlsDemonstrated: false,
    warrantyRegistered: false,
    notifiedBuildingControl: false,
    gasSafeNotified: false,
    // Notes
    additionalNotes: '',
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
    const subject = `Installation Record - ${form.refNumber} - ${form.customerAddress || 'No Address'}`;

    const checks = [
      form.pipeworkInstalled ? '✓ Pipework installed' : '',
      form.gasTightnessTest ? '✓ Gas tightness test' : '',
      form.purgeComplete ? '✓ Purge complete' : '',
      form.flueInstalled ? '✓ Flue installed' : '',
      form.condensateInstalled ? '✓ Condensate installed' : '',
      form.electricalConnection ? '✓ Electrical connection' : '',
      form.systemFlushed ? '✓ System flushed' : '',
      form.inhibitorAdded ? '✓ Inhibitor added' : '',
      form.filterFitted ? '✓ System filter fitted' : '',
      form.controlsInstalled ? '✓ Controls installed' : '',
    ].filter(Boolean).join('\n');

    const handover = [
      form.benchmarkComplete ? '✓ Benchmark checklist complete' : '',
      form.manualLeftWithCustomer ? '✓ Manual left with customer' : '',
      form.controlsDemonstrated ? '✓ Controls demonstrated' : '',
      form.warrantyRegistered ? '✓ Warranty registered' : '',
      form.notifiedBuildingControl ? '✓ Building control notified' : '',
      form.gasSafeNotified ? '✓ Gas Safe notified' : '',
    ].filter(Boolean).join('\n');

    const body = [
      `GAS INSTALLATION & COMMISSIONING RECORD`,
      `Reference: ${form.refNumber}`,
      `Date: ${form.installDate}`,
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
      form.oldApplianceRemoved === 'yes' ? `OLD APPLIANCE REMOVED\nMake: ${form.oldMake} ${form.oldModel}\nDecommissioned: ${form.oldDecommissioned}\n` : '',
      `NEW APPLIANCE`,
      `Type: ${form.applianceType}`,
      `Make: ${form.manufacturer} ${form.model}`,
      `Serial: ${form.serialNo}  GC: ${form.gcNumber}`,
      `Location: ${form.location}  Flue: ${form.flueType}`,
      `Flue Length: ${form.flueLength}m  Bends: ${form.flueBends}`,
      ``,
      `PRE-INSTALLATION`,
      `ECV: ${form.emergencyControlValve}`,
      `Existing Pipework: ${form.existingPipework}`,
      `Bonding: ${form.bonding}`,
      `Ventilation: ${form.ventilation}`,
      ``,
      `INSTALLATION CHECKS`,
      checks,
      `Gas Tightness: ${form.tightnessResult} @ ${form.tightnessPressure} mbar`,
      ``,
      `COMMISSIONING READINGS`,
      `Operating Pressure: ${form.operatingPressure} mbar`,
      `Burner Pressure: ${form.burnerPressure} mbar`,
      `Gas Rate: ${form.gasRateKw} kW`,
      `CO: ${form.co} ppm  CO2: ${form.co2}%  O2: ${form.o2}%`,
      `Flue Temp: ${form.flueTemp}°C  Ambient: ${form.ambientTemp}°C`,
      `Ratio: ${form.ratio}  Efficiency: ${form.efficiency}%`,
      `DHW Flow: ${form.dhwFlowRate} l/min @ ${form.dhwTemp}°C`,
      `System Pressure: ${form.systemPressure} bar`,
      `Expansion Vessel: ${form.expansionVesselCharge} bar`,
      ``,
      `CONTROLS`,
      `Room Thermostat: ${form.roomThermostat}`,
      `Programmer: ${form.programmer}`,
      `TRVs: ${form.trvs}`,
      `Cylinder Stat: ${form.cylinderStat}`,
      ``,
      `HANDOVER`,
      handover,
      form.additionalNotes ? `\nNotes: ${form.additionalNotes}` : '',
      ``,
      `Engineer: ${form.engineerName}`,
      `Received By: ${form.customerSignedName}`,
    ].filter(l => l !== undefined).join('\n');

    const to = form.customerEmail || '';
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setTimeout(() => setSending(false), 2000);
  }, [form, saveProfile]);

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

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 pb-28">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-4 sm:p-5 mb-4">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3 blur-xl" />
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl flex-shrink-0">
            🏗️
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Installation & Commissioning</h1>
            <p className="text-sm text-white/70 mt-0.5">Ref: {form.refNumber}</p>
          </div>
        </div>
        <div className="flex gap-1.5 mt-4">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < step ? 'bg-white' : 'bg-white/25'}`} />
          ))}
        </div>
        <p className="text-[11px] text-white/60 mt-2">
          Step {step} of {totalSteps}: {['Details', 'Appliance', 'Pre-Install', 'Install Checks', 'Commissioning', 'Handover'][step - 1]}
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
            <div>
              <label className={labelClass}>Installation Date *</label>
              <input type="date" value={form.installDate} onChange={e => updateField('installDate', e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>
      )}

      {/* ═══ STEP 2: Appliance Details ═══ */}
      {step === 2 && (
        <div className="space-y-3">
          <h3 className={sectionClass}>Old Appliance</h3>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 shadow-sm">
            <div>
              <label className={labelClass}>Old Appliance Removed?</label>
              <RadioGroup field="oldApplianceRemoved" options={[
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' },
                { value: 'N/A', label: 'N/A (New Install)' },
              ]} cols={3} />
            </div>
            {form.oldApplianceRemoved === 'yes' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Old Make</label>
                    <input type="text" value={form.oldMake} onChange={e => updateField('oldMake', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Old Model</label>
                    <input type="text" value={form.oldModel} onChange={e => updateField('oldModel', e.target.value)} className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Properly Decommissioned?</label>
                  <RadioGroup field="oldDecommissioned" options={[
                    { value: 'yes', label: 'Yes', color: 'bg-emerald-600 text-white border-emerald-600' },
                    { value: 'no', label: 'No', color: 'bg-red-600 text-white border-red-600' },
                  ]} />
                </div>
              </>
            )}
          </div>

          <h3 className={sectionClass}>New Appliance</h3>
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
                <label className={labelClass}>Model *</label>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Flue Length (m)</label>
                <input type="number" step="0.1" inputMode="decimal" value={form.flueLength}
                  onChange={e => updateField('flueLength', e.target.value)} placeholder="e.g. 2.5" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Number of Bends</label>
                <input type="number" inputMode="numeric" value={form.flueBends}
                  onChange={e => updateField('flueBends', e.target.value)} placeholder="e.g. 2" className={inputClass} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ STEP 3: Pre-Installation ═══ */}
      {step === 3 && (
        <div className="space-y-3">
          <h3 className={sectionClass}>Pre-Installation Checks</h3>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4 shadow-sm">
            <div>
              <label className={labelClass}>Meter Location</label>
              <input type="text" value={form.meterLocation} onChange={e => updateField('meterLocation', e.target.value)}
                placeholder="e.g. External meter box, left side" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Emergency Control Valve (ECV)</label>
              <RadioGroup field="emergencyControlValve" options={[
                { value: 'accessible', label: 'Accessible', color: 'bg-emerald-600 text-white border-emerald-600' },
                { value: 'not accessible', label: 'Not Accessible', color: 'bg-red-600 text-white border-red-600' },
              ]} />
            </div>
            <div>
              <label className={labelClass}>Existing Pipework</label>
              <RadioGroup field="existingPipework" options={[
                { value: 'adequate', label: 'Adequate', color: 'bg-emerald-600 text-white border-emerald-600' },
                { value: 'requires upgrade', label: 'Requires Upgrade', color: 'bg-orange-500 text-white border-orange-500' },
              ]} />
            </div>
            {form.existingPipework === 'requires upgrade' && (
              <div>
                <label className={labelClass}>Upgrade Details</label>
                <textarea value={form.pipeworkUpgradeDetails} onChange={e => updateField('pipeworkUpgradeDetails', e.target.value)}
                  placeholder="Describe pipework changes..." rows={2} className={inputClass + ' resize-none'} />
              </div>
            )}
            <div>
              <label className={labelClass}>Equipotential Bonding</label>
              <RadioGroup field="bonding" options={[
                { value: 'satisfactory', label: 'Satisfactory', color: 'bg-emerald-600 text-white border-emerald-600' },
                { value: 'unsatisfactory', label: 'Unsatisfactory', color: 'bg-red-600 text-white border-red-600' },
              ]} />
            </div>
            <div>
              <label className={labelClass}>Ventilation</label>
              <RadioGroup field="ventilation" options={[
                { value: 'adequate', label: 'Adequate', color: 'bg-emerald-600 text-white border-emerald-600' },
                { value: 'inadequate', label: 'Inadequate', color: 'bg-red-600 text-white border-red-600' },
                { value: 'N/A', label: 'N/A (Room Sealed)' },
              ]} cols={3} />
            </div>
            {form.ventilation === 'adequate' && (
              <div>
                <label className={labelClass}>Ventilation Details</label>
                <input type="text" value={form.ventDetails} onChange={e => updateField('ventDetails', e.target.value)}
                  placeholder="e.g. 100cm² air brick to external" className={inputClass} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ STEP 4: Installation Checks ═══ */}
      {step === 4 && (
        <div className="space-y-3">
          <h3 className={sectionClass}>Installation Checklist</h3>
          <div className="bg-white rounded-2xl border border-gray-100 p-3 space-y-2 shadow-sm">
            {[
              { key: 'pipeworkInstalled', label: 'Gas pipework installed to BS 6891' },
              { key: 'gasTightnessTest', label: 'Gas tightness test carried out' },
              { key: 'purgeComplete', label: 'Purge of pipework complete' },
              { key: 'flueInstalled', label: 'Flue system installed per manufacturer instructions' },
              { key: 'condensateInstalled', label: 'Condensate discharge installed (where applicable)' },
              { key: 'electricalConnection', label: 'Electrical connection complete & safe' },
              { key: 'systemFlushed', label: 'System flushed / power flushed' },
              { key: 'inhibitorAdded', label: 'System inhibitor added' },
              { key: 'filterFitted', label: 'System filter fitted (e.g. MagnaClean)' },
              { key: 'controlsInstalled', label: 'Controls & thermostats installed' },
            ].map(item => (
              <button key={item.key} type="button" onClick={() => toggleCheck(item.key)} className={checkClass}>
                <span className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  form[item.key] ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 bg-white'
                }`}>
                  {form[item.key] && <span className="text-sm">✓</span>}
                </span>
                <span className="text-sm text-gray-700">{item.label}</span>
              </button>
            ))}
          </div>

          <h3 className={sectionClass}>Gas Tightness Test Result</h3>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 shadow-sm">
            <RadioGroup field="tightnessResult" options={[
              { value: 'pass', label: 'Pass', color: 'bg-emerald-600 text-white border-emerald-600' },
              { value: 'fail', label: 'Fail', color: 'bg-red-600 text-white border-red-600' },
            ]} />
            <div>
              <label className={labelClass}>Test Pressure (mbar)</label>
              <input type="number" step="0.1" inputMode="decimal" value={form.tightnessPressure}
                onChange={e => updateField('tightnessPressure', e.target.value)} placeholder="e.g. 20.0" className={inputClass} />
            </div>
          </div>
        </div>
      )}

      {/* ═══ STEP 5: Commissioning ═══ */}
      {step === 5 && (
        <div className="space-y-3">
          <h3 className={sectionClass}>Commissioning Readings</h3>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { key: 'operatingPressure', label: 'Operating Pressure (mbar)', ph: 'e.g. 20.0' },
                { key: 'burnerPressure', label: 'Burner Pressure (mbar)', ph: 'e.g. 12.5' },
                { key: 'gasRateKw', label: 'Gas Rate (kW)', ph: 'e.g. 30.2' },
                { key: 'co', label: 'CO (ppm)', ph: 'e.g. 42' },
                { key: 'co2', label: 'CO₂ (%)', ph: 'e.g. 9.2' },
                { key: 'o2', label: 'O₂ (%)', ph: 'e.g. 5.1' },
                { key: 'flueTemp', label: 'Flue Temp (°C)', ph: 'e.g. 127' },
                { key: 'ambientTemp', label: 'Ambient (°C)', ph: 'e.g. 21' },
                { key: 'ratio', label: 'CO/CO₂ Ratio', ph: 'e.g. 0.0042' },
                { key: 'efficiency', label: 'Efficiency (%)', ph: 'e.g. 92.3' },
              ].map(f => (
                <div key={f.key}>
                  <label className={labelClass}>{f.label}</label>
                  <input type="number" step="any" inputMode="decimal" value={form[f.key]}
                    onChange={e => updateField(f.key, e.target.value)} placeholder={f.ph} className={inputClass} />
                </div>
              ))}
            </div>
          </div>

          <h3 className={sectionClass}>System Performance</h3>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 shadow-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>DHW Flow Rate (l/min)</label>
                <input type="number" step="0.1" inputMode="decimal" value={form.dhwFlowRate}
                  onChange={e => updateField('dhwFlowRate', e.target.value)} placeholder="e.g. 12.5" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>DHW Temperature (°C)</label>
                <input type="number" step="0.1" inputMode="decimal" value={form.dhwTemp}
                  onChange={e => updateField('dhwTemp', e.target.value)} placeholder="e.g. 55" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>System Pressure (bar)</label>
                <input type="number" step="0.1" inputMode="decimal" value={form.systemPressure}
                  onChange={e => updateField('systemPressure', e.target.value)} placeholder="e.g. 1.5" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Expansion Vessel (bar)</label>
                <input type="number" step="0.1" inputMode="decimal" value={form.expansionVesselCharge}
                  onChange={e => updateField('expansionVesselCharge', e.target.value)} placeholder="e.g. 0.75" className={inputClass} />
              </div>
            </div>
          </div>

          <h3 className={sectionClass}>Controls Fitted</h3>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 shadow-sm">
            {[
              { key: 'roomThermostat', label: 'Room Thermostat' },
              { key: 'programmer', label: 'Programmer / Timer' },
              { key: 'trvs', label: 'TRVs' },
              { key: 'cylinderStat', label: 'Cylinder Thermostat' },
              { key: 'weatherComp', label: 'Weather Compensation' },
            ].map(item => (
              <div key={item.key}>
                <label className={labelClass}>{item.label}</label>
                <RadioGroup field={item.key} options={[
                  { value: 'fitted', label: 'Fitted (New)' },
                  { value: 'existing', label: 'Existing' },
                  { value: 'N/A', label: 'N/A' },
                ]} cols={3} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ STEP 6: Handover & Signatures ═══ */}
      {step === 6 && (
        <div className="space-y-3">
          <h3 className={sectionClass}>Handover Checklist</h3>
          <div className="bg-white rounded-2xl border border-gray-100 p-3 space-y-2 shadow-sm">
            {[
              { key: 'benchmarkComplete', label: 'Benchmark commissioning checklist completed' },
              { key: 'manualLeftWithCustomer', label: 'User manual left with customer' },
              { key: 'controlsDemonstrated', label: 'Controls & operation demonstrated to customer' },
              { key: 'warrantyRegistered', label: 'Warranty registered with manufacturer' },
              { key: 'notifiedBuildingControl', label: 'Building control notified (where required)' },
              { key: 'gasSafeNotified', label: 'Gas Safe Register notification submitted' },
            ].map(item => (
              <button key={item.key} type="button" onClick={() => toggleCheck(item.key)} className={checkClass}>
                <span className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  form[item.key] ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 bg-white'
                }`}>
                  {form[item.key] && <span className="text-sm">✓</span>}
                </span>
                <span className="text-sm text-gray-700">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <label className={labelClass}>Additional Notes</label>
            <textarea value={form.additionalNotes} onChange={e => updateField('additionalNotes', e.target.value)}
              placeholder="Any other observations or notes..." rows={3} className={inputClass + ' resize-none'} />
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
            <button onClick={() => setStep(step + 1)} className="flex-1 min-h-[48px] py-3 bg-blue-600 text-white font-bold rounded-xl active:scale-[0.98] transition-transform shadow-sm">
              Next
            </button>
          ) : (
            <button onClick={handleEmail} disabled={sending}
              className="flex-1 min-h-[48px] py-3 bg-blue-600 text-white font-bold rounded-xl active:scale-[0.98] transition-transform shadow-sm disabled:opacity-50">
              {sending ? 'Opening...' : '📧 Email Installation Record'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstallationChecklist;
