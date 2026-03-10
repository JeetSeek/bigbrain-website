import React, { useState, useCallback } from 'react';
import SignaturePad from './SignaturePad';

/**
 * Boiler Benchmark Commissioning Checklist
 * Required for ALL new boiler installations to validate manufacturer warranty
 * Based on the official Benchmark Scheme checklist format
 */

const CONTRACTOR_KEY = 'bb_benchmark_contractor';
const loadContractor = () => { try { const s = localStorage.getItem(CONTRACTOR_KEY); return s ? JSON.parse(s) : null; } catch { return null; } };
const saveContractor = (d) => { try { localStorage.setItem(CONTRACTOR_KEY, JSON.stringify(d)); } catch {} };

const manufacturers = [
  'Ideal', 'Worcester Bosch', 'Vaillant', 'Baxi', 'Glow-worm', 'Potterton', 'Main',
  'Viessmann', 'Alpha', 'Ferroli', 'Ravenheat', 'Ariston', 'Intergas', 'Keston',
  'Vokera', 'Biasi', 'Remeha', 'Saunier Duval', 'Navien', 'Daikin', 'Other',
];

const fluetypes = ['Room Sealed Horizontal', 'Room Sealed Vertical', 'Open Flue', 'Fanned Draught', 'Shared Flue / Se-Duct'];
const boilerTypes = ['Combi', 'System', 'Regular (Heat Only)', 'Back Boiler'];
const fuelTypes = ['Natural Gas', 'LPG (Propane)', 'LPG (Butane)', 'Oil'];
const condensateRoutes = ['Internal waste pipe', 'External drain', 'Soakaway', 'Condensate pump', 'Internal soil stack'];

const generateRef = () => {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `BMK-${d}-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`;
};

const BenchmarkChecklist = () => {
  const saved = loadContractor();
  const [step, setStep] = useState(1);
  const totalSteps = 6;
  const [engineerSig, setEngineerSig] = useState(null);
  const [customerSig, setCustomerSig] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

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
    // Boiler details
    manufacturer: '',
    model: '',
    serialNo: '',
    gcNumber: '',
    boilerType: '',
    fuelType: 'Natural Gas',
    flueType: '',
    outputKw: '',
    location: '',
    // System
    systemType: '', // sealed / open vented
    expansionVessel: '', // yes / no / existing
    magneticFilter: '', // yes / no
    filterMake: '',
    inhibitorUsed: '',
    inhibitorMake: '',
    condensateRoute: '',
    condensateTermination: '',
    // Pre-commissioning checks
    gasSupplyPressure: '',
    gasTightnessTest: '', // pass / fail
    waterTightnessTest: '', // pass / fail
    flueIntegrityTest: '', // pass / fail
    spillageTest: '', // pass / fail / n/a
    systemFlushed: '', // yes / no
    flushMethod: '',
    // Commissioning readings
    burnerPressure: '',
    gasRateMax: '',
    gasRateMin: '',
    dhwFlowRate: '',
    dhwTempRise: '',
    flueTempMax: '',
    flueTempMin: '',
    coMax: '',
    coMin: '',
    co2Max: '',
    co2Min: '',
    coRatioMax: '',
    coRatioMin: '',
    // System checks
    chFlowTemp: '',
    chReturnTemp: '',
    dhwTemp: '',
    systemPressureCold: '',
    systemPressureHot: '',
    expansionVesselCharge: '',
    // Controls
    thermostatType: '',
    thermostatLocation: '',
    trvsFitted: '', // yes / no
    programmingExplained: '', // yes / no
    // Completion
    benchmarkRegistered: '', // yes / no
    buildingRegsNotified: '', // yes / no
    notificationNumber: '',
    userInstructed: '', // yes / no
    documentsLeftOnSite: '', // yes / no
    notes: '',
  });

  const u = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  // Save contractor details when moving past step 1
  const nextStep = () => {
    if (step === 1) {
      saveContractor({
        contractorName: form.contractorName,
        contractorAddress: form.contractorAddress,
        contractorPhone: form.contractorPhone,
        gasSafeNo: form.gasSafeNo,
        idCardNo: form.idCardNo,
      });
    }
    setStep(s => Math.min(s + 1, totalSteps));
  };

  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const Input = ({ label, field, type = 'text', placeholder, className = '', ...props }) => (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        inputMode={type === 'number' ? 'decimal' : undefined}
        value={form[field]}
        onChange={(e) => u(field, e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 min-h-[44px] border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        {...props}
      />
    </div>
  );

  const Select = ({ label, field, options, className = '' }) => (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <select
        value={form[field]}
        onChange={(e) => u(field, e.target.value)}
        className="w-full px-3 py-2.5 min-h-[44px] border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Select...</option>
        {options.map(o => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  const YesNo = ({ label, field }) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex gap-1">
        {['Yes', 'No', 'N/A'].map(v => (
          <button
            key={v}
            type="button"
            onClick={() => u(field, v.toLowerCase())}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              form[field] === v.toLowerCase()
                ? v === 'Yes' ? 'bg-green-500 text-white' : v === 'No' ? 'bg-red-500 text-white' : 'bg-gray-500 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );

  const PassFail = ({ label, field }) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex gap-1">
        {['Pass', 'Fail'].map(v => (
          <button
            key={v}
            type="button"
            onClick={() => u(field, v.toLowerCase())}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              form[field] === v.toLowerCase()
                ? v === 'Pass' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );

  const ReadingRow = ({ label, maxField, minField, unit }) => (
    <div className="flex items-center gap-2 py-1.5">
      <span className="text-sm text-gray-700 flex-1 min-w-0">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          inputMode="decimal"
          value={form[maxField]}
          onChange={(e) => u(maxField, e.target.value)}
          placeholder="Max"
          className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-center text-gray-900"
        />
        <input
          type="number"
          inputMode="decimal"
          value={form[minField]}
          onChange={(e) => u(minField, e.target.value)}
          placeholder="Min"
          className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-center text-gray-900"
        />
        <span className="text-xs text-gray-400 w-10">{unit}</span>
      </div>
    </div>
  );

  const handleEmail = () => {
    const subject = `Benchmark Commissioning Checklist — ${form.refNumber} — ${form.customerAddress}`;
    const body = `BENCHMARK COMMISSIONING CHECKLIST\nRef: ${form.refNumber}\nDate: ${form.installDate}\n\nCONTRACTOR: ${form.contractorName}\nGas Safe: ${form.gasSafeNo}\n\nCUSTOMER: ${form.customerName}\n${form.customerAddress}, ${form.customerPostcode}\n\nBOILER: ${form.manufacturer} ${form.model}\nSerial: ${form.serialNo}  GC: ${form.gcNumber}\nType: ${form.boilerType}  Fuel: ${form.fuelType}\nOutput: ${form.outputKw}kW  Flue: ${form.flueType}\n\nPRE-COMMISSIONING:\nGas supply: ${form.gasSupplyPressure}mbar\nTightness test: ${form.gasTightnessTest}\nWater tightness: ${form.waterTightnessTest}\nFlue integrity: ${form.flueIntegrityTest}\nSpillage test: ${form.spillageTest}\nSystem flushed: ${form.systemFlushed} (${form.flushMethod})\nInhibitor: ${form.inhibitorMake}\n\nCOMMISSIONING READINGS:\nBurner pressure: ${form.burnerPressure}mbar\nGas rate: ${form.gasRateMax}/${form.gasRateMin} kW\nFlue temp: ${form.flueTempMax}/${form.flueTempMin}°C\nCO: ${form.coMax}/${form.coMin} ppm\nCO₂: ${form.co2Max}/${form.co2Min}%\nCO/CO₂ ratio: ${form.coRatioMax}/${form.coRatioMin}\n\nSYSTEM:\nCH flow/return: ${form.chFlowTemp}/${form.chReturnTemp}°C\nDHW temp: ${form.dhwTemp}°C\nSystem pressure (cold): ${form.systemPressureCold} bar\nSystem pressure (hot): ${form.systemPressureHot} bar\nExpansion vessel: ${form.expansionVesselCharge} bar\n\nCOMPLETION:\nBenchmark registered: ${form.benchmarkRegistered}\nBuilding regs notified: ${form.buildingRegsNotified}\nUser instructed: ${form.userInstructed}\nDocuments left: ${form.documentsLeftOnSite}\n\nNotes: ${form.notes}`;

    window.location.href = `mailto:${form.customerEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="max-w-3xl mx-auto p-3 sm:p-4 pb-8">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Hero Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-700 px-4 sm:px-5 py-4 sm:py-5 text-white">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3 blur-xl" />
          <div className="relative flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl flex-shrink-0">
              ✅
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-white">Benchmark Checklist</h1>
              <p className="text-sm text-white/70 mt-0.5">Commissioning record for warranty registration</p>
            </div>
            <div className="text-xs font-bold text-white/60 bg-white/15 px-2 py-1 rounded-lg">
              {step}/{totalSteps}
            </div>
          </div>
          {/* Progress bar */}
          <div className="relative mt-4 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Step 1: Contractor & Customer */}
          {step === 1 && (
            <>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Contractor Details</h2>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Business Name" field="contractorName" className="col-span-2" />
                <Input label="Address" field="contractorAddress" />
                <Input label="Phone" field="contractorPhone" type="tel" />
                <Input label="Gas Safe No" field="gasSafeNo" />
                <Input label="ID Card No" field="idCardNo" />
              </div>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider pt-3">Customer Details</h2>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Customer Name" field="customerName" className="col-span-2" />
                <Input label="Address" field="customerAddress" />
                <Input label="Postcode" field="customerPostcode" />
                <Input label="Phone" field="customerPhone" type="tel" />
                <Input label="Email" field="customerEmail" type="email" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Installation Date" field="installDate" type="date" />
                <Input label="Reference" field="refNumber" />
              </div>
            </>
          )}

          {/* Step 2: Boiler & System */}
          {step === 2 && (
            <>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Boiler Details</h2>
              <div className="grid grid-cols-2 gap-3">
                <Select label="Manufacturer" field="manufacturer" options={manufacturers} />
                <Input label="Model" field="model" />
                <Input label="Serial Number" field="serialNo" />
                <Input label="GC Number" field="gcNumber" />
                <Select label="Boiler Type" field="boilerType" options={boilerTypes} />
                <Select label="Fuel Type" field="fuelType" options={fuelTypes} />
                <Select label="Flue Type" field="flueType" options={fluetypes} />
                <Input label="Output (kW)" field="outputKw" type="number" />
                <Input label="Location" field="location" className="col-span-2" placeholder="e.g. Kitchen, Utility Room" />
              </div>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider pt-3">System Details</h2>
              <div className="grid grid-cols-2 gap-3">
                <Select label="System Type" field="systemType" options={[{ value: 'sealed', label: 'Sealed System' }, { value: 'open', label: 'Open Vented' }]} />
                <Select label="Condensate Route" field="condensateRoute" options={condensateRoutes} />
              </div>
              <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                <YesNo label="Expansion vessel fitted/checked" field="expansionVessel" />
                <YesNo label="Magnetic filter fitted" field="magneticFilter" />
                {form.magneticFilter === 'yes' && (
                  <Input label="Filter make/model" field="filterMake" className="mt-2" />
                )}
              </div>
            </>
          )}

          {/* Step 3: Pre-Commissioning */}
          {step === 3 && (
            <>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pre-Commissioning Checks</h2>
              <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                <PassFail label="Gas tightness test" field="gasTightnessTest" />
                <PassFail label="Water tightness test" field="waterTightnessTest" />
                <PassFail label="Flue integrity check (visual)" field="flueIntegrityTest" />
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-700">Spillage test (open flue — N/A if room sealed)</span>
                  <div className="flex gap-1">
                    {['Pass', 'Fail', 'N/A'].map(v => (
                      <button key={v} type="button" onClick={() => u('spillageTest', v.toLowerCase())}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          form.spillageTest === v.toLowerCase()
                            ? v === 'Pass' ? 'bg-green-500 text-white' : v === 'Fail' ? 'bg-red-500 text-white' : 'bg-gray-500 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}>{v}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Gas supply pressure (mbar)" field="gasSupplyPressure" type="number" placeholder="e.g. 21" />
                <Input label="Burner pressure (mbar)" field="burnerPressure" type="number" placeholder="e.g. 12" />
              </div>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider pt-3">System Preparation</h2>
              <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                <YesNo label="System flushed" field="systemFlushed" />
                {form.systemFlushed === 'yes' && (
                  <Select label="Flush method" field="flushMethod" options={['Powerflush', 'Magnacleanse', 'Chemical flush (gravity)', 'Mains flush']} className="mt-2" />
                )}
                <YesNo label="Inhibitor added" field="inhibitorUsed" />
                {form.inhibitorUsed === 'yes' && (
                  <Input label="Inhibitor make/product" field="inhibitorMake" className="mt-2" placeholder="e.g. Sentinel X100" />
                )}
              </div>
            </>
          )}

          {/* Step 4: Commissioning Readings */}
          {step === 4 && (
            <>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Commissioning Readings</h2>
              <p className="text-xs text-gray-400 mb-2">Record at maximum and minimum rate</p>
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 mb-2">
                <p className="font-semibold">Safe limits (undiluted flue gas):</p>
                <p>CO/CO₂ ratio <strong>&lt;0.004</strong> (0.4%) — investigate if ≥0.004. CO &lt;200ppm typical for a well-tuned boiler.</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                <div className="flex items-center gap-2 py-1 text-xs font-semibold text-gray-500">
                  <span className="flex-1">Reading</span>
                  <span className="w-16 text-center">Max</span>
                  <span className="w-16 text-center">Min</span>
                  <span className="w-10">Unit</span>
                </div>
                <ReadingRow label="Gas rate" maxField="gasRateMax" minField="gasRateMin" unit="kW" />
                <ReadingRow label="Flue temp" maxField="flueTempMax" minField="flueTempMin" unit="°C" />
                <ReadingRow label="CO" maxField="coMax" minField="coMin" unit="ppm" />
                <ReadingRow label="CO₂" maxField="co2Max" minField="co2Min" unit="%" />
                <ReadingRow label="CO/CO₂ ratio" maxField="coRatioMax" minField="coRatioMin" unit="" />
              </div>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider pt-3">DHW Readings (Combi only)</h2>
              <div className="grid grid-cols-2 gap-3">
                <Input label="DHW flow rate (l/min)" field="dhwFlowRate" type="number" />
                <Input label="DHW temp rise (°C)" field="dhwTempRise" type="number" placeholder="e.g. 35" />
              </div>
            </>
          )}

          {/* Step 5: System Checks & Controls */}
          {step === 5 && (
            <>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">System Temperatures & Pressures</h2>
              <div className="grid grid-cols-2 gap-3">
                <Input label="CH flow temp (°C)" field="chFlowTemp" type="number" />
                <Input label="CH return temp (°C)" field="chReturnTemp" type="number" />
                <Input label="DHW delivery temp (°C)" field="dhwTemp" type="number" />
                <Input label="System pressure cold (bar)" field="systemPressureCold" type="number" placeholder="e.g. 1.0" />
                <Input label="System pressure hot (bar)" field="systemPressureHot" type="number" placeholder="e.g. 1.5" />
                <Input label="Exp vessel pre-charge (bar)" field="expansionVesselCharge" type="number" placeholder="e.g. 0.75" />
              </div>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider pt-3">Controls & Handover</h2>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Thermostat type" field="thermostatType" placeholder="e.g. Nest, Hive, Honeywell" />
                <Input label="Thermostat location" field="thermostatLocation" placeholder="e.g. Hallway" />
              </div>
              <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                <YesNo label="TRVs fitted to all radiators" field="trvsFitted" />
                <YesNo label="Controls programming explained" field="programmingExplained" />
                <YesNo label="User instructed on boiler operation" field="userInstructed" />
                <YesNo label="Documents left on site" field="documentsLeftOnSite" />
              </div>
            </>
          )}

          {/* Step 6: Registration & Signatures */}
          {step === 6 && (
            <>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Registration</h2>
              <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                <YesNo label="Benchmark registered online" field="benchmarkRegistered" />
                <YesNo label="Building regs notified" field="buildingRegsNotified" />
                {form.buildingRegsNotified === 'yes' && (
                  <Input label="Notification number" field="notificationNumber" className="mt-2" />
                )}
              </div>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider pt-3">Notes</h2>
              <textarea
                value={form.notes}
                onChange={(e) => u('notes', e.target.value)}
                placeholder="Any additional notes..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider pt-3">Signatures</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SignaturePad label="Engineer Signature" onSignatureChange={setEngineerSig} />
                <SignaturePad label="Customer Signature" onSignatureChange={setCustomerSig} />
              </div>
            </>
          )}

          {/* Navigation */}
          <div className="flex gap-3 pt-4 border-t">
            {step > 1 && (
              <button
                onClick={prevStep}
                className="flex-1 py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 active:scale-[0.97] transition-all"
              >
                ← Back
              </button>
            )}
            {step < totalSteps ? (
              <button
                onClick={nextStep}
                className="flex-1 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 active:scale-[0.97] transition-all"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleEmail}
                className="flex-1 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 active:scale-[0.97] transition-all"
              >
                📧 Email Checklist
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BenchmarkChecklist;
