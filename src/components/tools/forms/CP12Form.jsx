import React, { useState } from 'react';
import SignaturePad from './SignaturePad';

/**
 * CP12 Landlord Gas Safety Record
 * Based on Gas Safe Register official format
 */
const CP12Form = () => {
  const [formData, setFormData] = useState({
    // Contractor Details
    contractorName: '',
    contractorAddress: '',
    contractorPhone: '',
    contractorGasSafeNo: '',
    
    // Installation Address
    installAddress: '',
    installPostcode: '',
    
    // Client/Landlord Address
    clientName: '',
    clientAddress: '',
    clientPostcode: '',
    clientPhone: '',
    clientEmail: '',
    
    // Dates
    inspectionDate: new Date().toISOString().split('T')[0],
    nextInspectionDate: '',
    
    // Appliances
    appliances: [createEmptyAppliance()],
    
    // Gas Supply & Pipework
    emergencyControlAccessible: null,
    emergencyControlLocation: '',
    pipeworkCondition: '',
    gasTightnessTest: null,
    
    // Safety Devices
    coAlarmFitted: null,
    coAlarmTest: null,
    smokeAlarmTest: null,
  });

  const [engineerSignature, setEngineerSignature] = useState(null);
  const [tenantSignature, setTenantSignature] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  function createEmptyAppliance() {
    return {
      id: Date.now(),
      location: '',
      type: '',
      make: '',
      model: '',
      ownedBy: 'LL',
      flueType: '',
      landlordApproval: null,
      co2Reading: '',
      operatingPressure: '',
      visualCondition: null,
      safetyDevices: null,
      ventilation: null,
      flueTerminal: null,
      operationSafety: null,
      safeToUse: null,
      defects: '',
      landlordInformed: null,
    };
  }

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateAppliance = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      appliances: prev.appliances.map(a => a.id === id ? { ...a, [field]: value } : a)
    }));
  };

  const addAppliance = () => {
    setFormData(prev => ({
      ...prev,
      appliances: [...prev.appliances, createEmptyAppliance()]
    }));
  };

  const removeAppliance = (id) => {
    if (formData.appliances.length > 1) {
      setFormData(prev => ({
        ...prev,
        appliances: prev.appliances.filter(a => a.id !== id)
      }));
    }
  };

  const calculateNextInspection = () => {
    const inspection = new Date(formData.inspectionDate);
    inspection.setFullYear(inspection.getFullYear() + 1);
    updateField('nextInspectionDate', inspection.toISOString().split('T')[0]);
  };

  const handleEmail = async () => {
    if (!formData.clientEmail) {
      alert('Please enter client email address');
      return;
    }
    setSending(true);
    
    const subject = `CP12 Landlord Gas Safety Record - ${formData.installAddress}`;
    const body = generateEmailBody();
    
    window.location.href = `mailto:${formData.clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    setTimeout(() => {
      setSending(false);
      setSent(true);
    }, 1000);
  };

  const generateEmailBody = () => {
    const applianceList = formData.appliances.map((a, i) => 
      `Appliance ${i + 1}: ${a.type} - ${a.make} ${a.model}
   Location: ${a.location}
   Flue Type: ${a.flueType}
   Safe to Use: ${a.safeToUse === true ? 'YES' : a.safeToUse === false ? 'NO' : 'N/A'}
   ${a.defects ? `Defects: ${a.defects}` : ''}`
    ).join('\n\n');

    return `
═══════════════════════════════════════════════════
        LANDLORD GAS SAFETY RECORD (CP12)
═══════════════════════════════════════════════════

CONTRACTOR DETAILS
─────────────────────────────────────────────────────
Name: ${formData.contractorName}
Address: ${formData.contractorAddress}
Phone: ${formData.contractorPhone}
Gas Safe No: ${formData.contractorGasSafeNo}

INSTALLATION ADDRESS
─────────────────────────────────────────────────────
${formData.installAddress}
${formData.installPostcode}

CLIENT/LANDLORD
─────────────────────────────────────────────────────
Name: ${formData.clientName}
Address: ${formData.clientAddress}, ${formData.clientPostcode}
Phone: ${formData.clientPhone}

INSPECTION DATES
─────────────────────────────────────────────────────
Date of Inspection: ${formData.inspectionDate}
Next Inspection Due: ${formData.nextInspectionDate}

APPLIANCES INSPECTED
─────────────────────────────────────────────────────
${applianceList}

GAS SUPPLY & PIPEWORK
─────────────────────────────────────────────────────
Emergency Control Accessible: ${formData.emergencyControlAccessible ? 'YES' : 'NO'}
${formData.emergencyControlLocation ? `Location: ${formData.emergencyControlLocation}` : ''}
Pipework Condition: ${formData.pipeworkCondition}
Gas Tightness Test: ${formData.gasTightnessTest ? 'SATISFACTORY' : formData.gasTightnessTest === false ? 'UNSATISFACTORY' : 'N/A'}

SAFETY DEVICES
─────────────────────────────────────────────────────
CO Alarm Fitted: ${formData.coAlarmFitted ? 'YES' : 'NO'}
CO Alarm Test: ${formData.coAlarmTest ? 'PASS' : formData.coAlarmTest === false ? 'FAIL' : 'N/A'}
Smoke Alarm Test: ${formData.smokeAlarmTest ? 'PASS' : formData.smokeAlarmTest === false ? 'FAIL' : 'N/A'}

═══════════════════════════════════════════════════
This record was issued by a Gas Safe registered engineer.
Verify registration at www.gassaferegister.co.uk
═══════════════════════════════════════════════════
    `.trim();
  };

  const YesNoButton = ({ value, onChange, yesLabel = 'Yes', noLabel = 'No' }) => (
    <div className="flex gap-1">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`px-2 py-1 rounded text-xs font-medium ${value === true ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}
      >
        {yesLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`px-2 py-1 rounded text-xs font-medium ${value === false ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'}`}
      >
        {noLabel}
      </button>
    </div>
  );

  // Preview Component
  const Preview = () => (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="font-bold text-lg">CP12 Preview</h2>
          <button onClick={() => setShowPreview(false)} className="text-gray-500 text-2xl">&times;</button>
        </div>
        
        <div className="p-4">
          {/* Header */}
          <div className="border-2 border-yellow-500 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-xl font-bold text-gray-800">Landlord Gas Safety Record</h1>
                <p className="text-xs text-gray-500">Gas Safe Register</p>
              </div>
              <div className="bg-yellow-400 text-black px-3 py-1 rounded font-bold text-sm">
                Gas Safe
              </div>
            </div>
          </div>

          {/* Contractor & Addresses */}
          <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
            <div className="border rounded p-2">
              <div className="font-bold text-gray-600 mb-1">Contractor Details</div>
              <div>{formData.contractorName}</div>
              <div>{formData.contractorAddress}</div>
              <div>Tel: {formData.contractorPhone}</div>
              <div>Gas Safe: {formData.contractorGasSafeNo}</div>
            </div>
            <div className="border rounded p-2">
              <div className="font-bold text-gray-600 mb-1">Installation Address</div>
              <div>{formData.installAddress}</div>
              <div>{formData.installPostcode}</div>
            </div>
            <div className="border rounded p-2">
              <div className="font-bold text-gray-600 mb-1">Client Address</div>
              <div>{formData.clientName}</div>
              <div>{formData.clientAddress}</div>
              <div>{formData.clientPostcode}</div>
            </div>
          </div>

          {/* Dates */}
          <div className="flex gap-4 mb-4 text-sm">
            <div className="border rounded px-3 py-2">
              <span className="text-gray-500">Inspection Date: </span>
              <span className="font-bold">{formData.inspectionDate}</span>
            </div>
            <div className="border rounded px-3 py-2">
              <span className="text-gray-500">Next Due: </span>
              <span className="font-bold">{formData.nextInspectionDate}</span>
            </div>
          </div>

          {/* Appliances Table */}
          <div className="border rounded mb-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left border-r">#</th>
                  <th className="p-2 text-left border-r">Location</th>
                  <th className="p-2 text-left border-r">Type</th>
                  <th className="p-2 text-left border-r">Make/Model</th>
                  <th className="p-2 text-left border-r">Flue</th>
                  <th className="p-2 text-center border-r">Safe</th>
                  <th className="p-2 text-left">Defects</th>
                </tr>
              </thead>
              <tbody>
                {formData.appliances.map((a, i) => (
                  <tr key={a.id} className="border-t">
                    <td className="p-2 border-r">{i + 1}</td>
                    <td className="p-2 border-r">{a.location}</td>
                    <td className="p-2 border-r">{a.type}</td>
                    <td className="p-2 border-r">{a.make} {a.model}</td>
                    <td className="p-2 border-r">{a.flueType}</td>
                    <td className={`p-2 border-r text-center font-bold ${a.safeToUse === true ? 'text-green-600' : a.safeToUse === false ? 'text-red-600' : ''}`}>
                      {a.safeToUse === true ? '✓' : a.safeToUse === false ? '✗' : '-'}
                    </td>
                    <td className="p-2 text-red-600">{a.defects || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Gas Supply */}
          <div className="border rounded p-3 mb-4 text-sm">
            <div className="font-bold text-gray-600 mb-2">Gas Supply & Pipework</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>Emergency Control: {formData.emergencyControlAccessible ? '✓ Accessible' : '✗ Not Accessible'}</div>
              <div>Gas Tightness: {formData.gasTightnessTest ? '✓ Satisfactory' : formData.gasTightnessTest === false ? '✗ Unsatisfactory' : 'N/A'}</div>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-4 border rounded p-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">Engineer Signature</div>
              {engineerSignature ? (
                <img src={engineerSignature} alt="Engineer signature" className="h-12 border rounded" />
              ) : (
                <div className="h-12 border rounded bg-gray-50 flex items-center justify-center text-xs text-gray-400">Not signed</div>
              )}
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Tenant/Responsible Person</div>
              {tenantSignature ? (
                <img src={tenantSignature} alt="Tenant signature" className="h-12 border rounded" />
              ) : (
                <div className="h-12 border rounded bg-gray-50 flex items-center justify-center text-xs text-gray-400">Not signed</div>
              )}
            </div>
          </div>
        </div>

        {/* Preview Actions */}
        <div className="sticky bottom-0 bg-white border-t p-4 flex gap-3">
          <button
            onClick={() => setShowPreview(false)}
            className="flex-1 py-3 bg-gray-200 text-gray-700 font-medium rounded-xl"
          >
            Edit Form
          </button>
          <button
            onClick={() => { setShowPreview(false); handleEmail(); }}
            className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl"
          >
            📧 Send Email
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4">
      {showPreview && <Preview />}
      
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 px-6 py-5 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">CP12 Gas Safety Record</h1>
              <p className="text-yellow-100 text-sm mt-1">Landlord Gas Safety Record</p>
            </div>
            <div className="bg-white text-yellow-600 px-3 py-1 rounded font-bold text-sm">
              Gas Safe
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Contractor Details */}
          <section>
            <h2 className="text-xs font-semibold text-gray-500 mb-3">CONTRACTOR DETAILS</h2>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Business/Contractor Name"
                value={formData.contractorName}
                onChange={(e) => updateField('contractorName', e.target.value)}
                className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
              <input
                type="text"
                placeholder="Address"
                value={formData.contractorAddress}
                onChange={(e) => updateField('contractorAddress', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
              <input
                type="tel"
                placeholder="Phone"
                value={formData.contractorPhone}
                onChange={(e) => updateField('contractorPhone', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
              <input
                type="text"
                placeholder="Gas Safe Licence Number"
                value={formData.contractorGasSafeNo}
                onChange={(e) => updateField('contractorGasSafeNo', e.target.value)}
                className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
            </div>
          </section>

          {/* Installation Address */}
          <section>
            <h2 className="text-xs font-semibold text-gray-500 mb-3">INSTALLATION ADDRESS</h2>
            <div className="grid grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Property Address"
                value={formData.installAddress}
                onChange={(e) => updateField('installAddress', e.target.value)}
                className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
              <input
                type="text"
                placeholder="Postcode"
                value={formData.installPostcode}
                onChange={(e) => updateField('installPostcode', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
            </div>
          </section>

          {/* Client Details */}
          <section>
            <h2 className="text-xs font-semibold text-gray-500 mb-3">CLIENT/LANDLORD DETAILS</h2>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Client Name"
                value={formData.clientName}
                onChange={(e) => updateField('clientName', e.target.value)}
                className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
              <input
                type="text"
                placeholder="Address"
                value={formData.clientAddress}
                onChange={(e) => updateField('clientAddress', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
              <input
                type="text"
                placeholder="Postcode"
                value={formData.clientPostcode}
                onChange={(e) => updateField('clientPostcode', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
              <input
                type="tel"
                placeholder="Phone"
                value={formData.clientPhone}
                onChange={(e) => updateField('clientPhone', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.clientEmail}
                onChange={(e) => updateField('clientEmail', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
            </div>
          </section>

          {/* Dates */}
          <section>
            <h2 className="text-xs font-semibold text-gray-500 mb-3">INSPECTION DATES</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Date of Inspection</label>
                <input
                  type="date"
                  value={formData.inspectionDate}
                  onChange={(e) => updateField('inspectionDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Next Inspection Due</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={formData.nextInspectionDate}
                    onChange={(e) => updateField('nextInspectionDate', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                  />
                  <button
                    type="button"
                    onClick={calculateNextInspection}
                    className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-medium whitespace-nowrap"
                  >
                    +1 Year
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Appliances */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-gray-500">APPLIANCES</h2>
              <button type="button" onClick={addAppliance} className="text-xs text-yellow-600 font-medium">
                + Add Appliance
              </button>
            </div>
            
            {formData.appliances.map((app, idx) => (
              <div key={app.id} className="bg-gray-50 rounded-xl p-4 mb-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">Appliance {idx + 1}</span>
                  {formData.appliances.length > 1 && (
                    <button type="button" onClick={() => removeAppliance(app.id)} className="text-xs text-red-500">
                      Remove
                    </button>
                  )}
                </div>
                
                {/* Appliance Details */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="Location"
                    value={app.location}
                    onChange={(e) => updateAppliance(app.id, 'location', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                  />
                  <select
                    value={app.type}
                    onChange={(e) => updateAppliance(app.id, 'type', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
                  >
                    <option value="">Type...</option>
                    <option value="Boiler">Boiler</option>
                    <option value="Fire">Gas Fire</option>
                    <option value="Cooker">Cooker</option>
                    <option value="Hob">Hob</option>
                    <option value="Water Heater">Water Heater</option>
                    <option value="Other">Other</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Make"
                    value={app.make}
                    onChange={(e) => updateAppliance(app.id, 'make', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                  />
                  <input
                    type="text"
                    placeholder="Model"
                    value={app.model}
                    onChange={(e) => updateAppliance(app.id, 'model', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                  />
                  <select
                    value={app.flueType}
                    onChange={(e) => updateAppliance(app.id, 'flueType', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
                  >
                    <option value="">Flue Type...</option>
                    <option value="OF">Open Flue (OF)</option>
                    <option value="RS">Room Sealed (RS)</option>
                    <option value="FL">Flueless (FL)</option>
                    <option value="N/A">N/A</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Operating Pressure (mbar)"
                    value={app.operatingPressure}
                    onChange={(e) => updateAppliance(app.id, 'operatingPressure', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                  />
                </div>

                {/* Safety Checks */}
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="flex items-center justify-between bg-white rounded p-2">
                    <span className="text-xs text-gray-600">Visual</span>
                    <YesNoButton value={app.visualCondition} onChange={(v) => updateAppliance(app.id, 'visualCondition', v)} yesLabel="✓" noLabel="✗" />
                  </div>
                  <div className="flex items-center justify-between bg-white rounded p-2">
                    <span className="text-xs text-gray-600">Ventilation</span>
                    <YesNoButton value={app.ventilation} onChange={(v) => updateAppliance(app.id, 'ventilation', v)} yesLabel="✓" noLabel="✗" />
                  </div>
                  <div className="flex items-center justify-between bg-white rounded p-2">
                    <span className="text-xs text-gray-600">Flue/Terminal</span>
                    <YesNoButton value={app.flueTerminal} onChange={(v) => updateAppliance(app.id, 'flueTerminal', v)} yesLabel="✓" noLabel="✗" />
                  </div>
                  <div className="flex items-center justify-between bg-white rounded p-2">
                    <span className="text-xs text-gray-600">Safety Devices</span>
                    <YesNoButton value={app.safetyDevices} onChange={(v) => updateAppliance(app.id, 'safetyDevices', v)} yesLabel="✓" noLabel="✗" />
                  </div>
                  <div className="flex items-center justify-between bg-white rounded p-2">
                    <span className="text-xs text-gray-600">Operation</span>
                    <YesNoButton value={app.operationSafety} onChange={(v) => updateAppliance(app.id, 'operationSafety', v)} yesLabel="✓" noLabel="✗" />
                  </div>
                  <div className="flex items-center justify-between bg-white rounded p-2">
                    <span className="text-xs text-gray-600">LL Informed</span>
                    <YesNoButton value={app.landlordInformed} onChange={(v) => updateAppliance(app.id, 'landlordInformed', v)} />
                  </div>
                </div>

                {/* Safe to Use */}
                <div className="flex items-center gap-4 mb-3 bg-white rounded p-3">
                  <span className="text-sm font-medium text-gray-700">Safe to Use:</span>
                  <button
                    type="button"
                    onClick={() => updateAppliance(app.id, 'safeToUse', true)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold ${app.safeToUse === true ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}
                  >
                    ✓ YES
                  </button>
                  <button
                    type="button"
                    onClick={() => updateAppliance(app.id, 'safeToUse', false)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold ${app.safeToUse === false ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'}`}
                  >
                    ✗ NO
                  </button>
                </div>

                {/* Defects */}
                <textarea
                  placeholder="Defects identified (if any)"
                  value={app.defects}
                  onChange={(e) => updateAppliance(app.id, 'defects', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                  rows={2}
                />
              </div>
            ))}
          </section>

          {/* Gas Supply & Pipework */}
          <section>
            <h2 className="text-xs font-semibold text-gray-500 mb-3">GAS SUPPLY & PIPEWORK</h2>
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Emergency Control Accessible</span>
                <YesNoButton value={formData.emergencyControlAccessible} onChange={(v) => updateField('emergencyControlAccessible', v)} />
              </div>
              {formData.emergencyControlAccessible && (
                <input
                  type="text"
                  placeholder="Location of emergency control"
                  value={formData.emergencyControlLocation}
                  onChange={(e) => updateField('emergencyControlLocation', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                />
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Gas Tightness Test</span>
                <YesNoButton value={formData.gasTightnessTest} onChange={(v) => updateField('gasTightnessTest', v)} yesLabel="Sat" noLabel="Unsat" />
              </div>
              <input
                type="text"
                placeholder="Pipework condition notes"
                value={formData.pipeworkCondition}
                onChange={(e) => updateField('pipeworkCondition', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
            </div>
          </section>

          {/* Safety Devices */}
          <section>
            <h2 className="text-xs font-semibold text-gray-500 mb-3">SAFETY DEVICES</h2>
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">CO Alarm Fitted</span>
                <YesNoButton value={formData.coAlarmFitted} onChange={(v) => updateField('coAlarmFitted', v)} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">CO Alarm Test</span>
                <YesNoButton value={formData.coAlarmTest} onChange={(v) => updateField('coAlarmTest', v)} yesLabel="Pass" noLabel="Fail" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Smoke Alarm Test</span>
                <YesNoButton value={formData.smokeAlarmTest} onChange={(v) => updateField('smokeAlarmTest', v)} yesLabel="Pass" noLabel="Fail" />
              </div>
            </div>
          </section>

          {/* Signatures */}
          <section>
            <h2 className="text-xs font-semibold text-gray-500 mb-3">SIGNATURES</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SignaturePad label="Engineer Signature" onSignatureChange={setEngineerSignature} />
              <SignaturePad label="Tenant/Responsible Person" onSignatureChange={setTenantSignature} />
            </div>
          </section>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={() => setShowPreview(true)}
              className="flex-1 py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300"
            >
              👁️ Preview
            </button>
            <button
              onClick={handleEmail}
              disabled={sending}
              className="flex-1 py-3 bg-yellow-500 text-white font-semibold rounded-xl hover:bg-yellow-600 disabled:opacity-50"
            >
              {sending ? 'Opening...' : sent ? '✓ Sent' : '📧 Email'}
            </button>
          </div>

          {sent && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
              Email client opened. Please review and send.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CP12Form;
