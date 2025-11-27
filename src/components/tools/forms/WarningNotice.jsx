import React, { useState } from 'react';
import SignaturePad from './SignaturePad';

/**
 * Gas Warning Notice
 * Based on Gas Safe Register official format
 * For ID (Immediately Dangerous), AR (At Risk), NCS (Not to Current Standards)
 */
const WarningNotice = () => {
  const [formData, setFormData] = useState({
    // Contractor Details
    contractorName: '',
    contractorAddress: '',
    contractorPhone: '',
    contractorGasSafeNo: '',
    
    // Dates
    inspectionDate: new Date().toISOString().split('T')[0],
    
    // Installation Address
    installAddress: '',
    installPostcode: '',
    
    // Client Address
    clientName: '',
    clientAddress: '',
    clientPostcode: '',
    clientPhone: '',
    clientEmail: '',
    
    // Appliance Details
    applianceMake: '',
    applianceModel: '',
    applianceType: '',
    applianceSerialNo: '',
    applianceLocation: '',
    
    // RIDDOR Situations
    riddorReportable: null,
    riddorReason: '',
    riddorReference: '',
    
    // Classification & Details
    classification: '', // ID, AR, NCS
    faultDescription: '',
    rectifyAction: '',
    
    // Actions Taken
    actionsTaken: [
      { id: 1, action: '', notified: '' }
    ],
    
    // Gas Supply
    gasSupplyTurnedOff: null,
    gasSupplyLocation: '',
    warningLabelAttached: null,
    warningLabelLocation: '',
    
    // Witness
    witnessName: '',
  });

  const [engineerSignature, setEngineerSignature] = useState(null);
  const [witnessSignature, setWitnessSignature] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const classifications = {
    ID: {
      label: 'Immediately Dangerous',
      description: 'If operated or left connected could cause injury, loss of life, or damage to property',
      color: 'red',
      action: 'DO NOT USE - Gas supply has been disconnected',
    },
    AR: {
      label: 'At Risk',
      description: 'Not immediately dangerous but could become so if not addressed',
      color: 'yellow',
      action: 'DO NOT USE until repaired by Gas Safe registered engineer',
    },
    NCS: {
      label: 'Not to Current Standards',
      description: 'Does not meet current installation standards but is not an immediate safety risk',
      color: 'blue',
      action: 'Recommend upgrade when convenient - safe to use with awareness',
    },
  };

  const addAction = () => {
    setFormData(prev => ({
      ...prev,
      actionsTaken: [...prev.actionsTaken, { id: Date.now(), action: '', notified: '' }]
    }));
  };

  const updateAction = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      actionsTaken: prev.actionsTaken.map(a => a.id === id ? { ...a, [field]: value } : a)
    }));
  };

  const removeAction = (id) => {
    if (formData.actionsTaken.length > 1) {
      setFormData(prev => ({
        ...prev,
        actionsTaken: prev.actionsTaken.filter(a => a.id !== id)
      }));
    }
  };

  const handleEmail = async () => {
    if (!formData.clientEmail) {
      alert('Please enter client email address');
      return;
    }
    setSending(true);
    
    const subject = `⚠️ GAS WARNING NOTICE (${formData.classification}) - ${formData.installAddress}`;
    const body = generateEmailBody();
    
    window.location.href = `mailto:${formData.clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    setTimeout(() => {
      setSending(false);
      setSent(true);
    }, 1000);
  };

  const generateEmailBody = () => {
    const classInfo = classifications[formData.classification] || {};
    const actions = formData.actionsTaken.map((a, i) => 
      `${i + 1}. ${a.action}${a.notified ? ` (Notified: ${a.notified})` : ''}`
    ).join('\n');

    return `
═══════════════════════════════════════════════════
⚠️⚠️⚠️  GAS WARNING NOTICE  ⚠️⚠️⚠️
═══════════════════════════════════════════════════

CLASSIFICATION: ${formData.classification} - ${classInfo.label}
${classInfo.description}

CONTRACTOR DETAILS
─────────────────────────────────────────────────────
Name: ${formData.contractorName}
Address: ${formData.contractorAddress}
Phone: ${formData.contractorPhone}
Gas Safe No: ${formData.contractorGasSafeNo}

DATE: ${formData.inspectionDate}

INSTALLATION ADDRESS
─────────────────────────────────────────────────────
${formData.installAddress}
${formData.installPostcode}

CLIENT DETAILS
─────────────────────────────────────────────────────
Name: ${formData.clientName}
Address: ${formData.clientAddress}, ${formData.clientPostcode}
Phone: ${formData.clientPhone}

APPLIANCE DETAILS
─────────────────────────────────────────────────────
Type: ${formData.applianceType}
Make: ${formData.applianceMake}
Model: ${formData.applianceModel}
Serial No: ${formData.applianceSerialNo}
Location: ${formData.applianceLocation}

FAULT DESCRIPTION
─────────────────────────────────────────────────────
${formData.faultDescription}

WHAT IS REQUIRED TO RECTIFY
─────────────────────────────────────────────────────
${formData.rectifyAction}

ACTIONS TAKEN
─────────────────────────────────────────────────────
${actions}

Gas Supply Turned Off: ${formData.gasSupplyTurnedOff ? 'YES' : 'NO'}
${formData.gasSupplyLocation ? `Location: ${formData.gasSupplyLocation}` : ''}
Warning Label Attached: ${formData.warningLabelAttached ? 'YES' : 'NO'}
${formData.warningLabelLocation ? `Location: ${formData.warningLabelLocation}` : ''}

${formData.riddorReportable ? `
RIDDOR REPORTABLE: YES
Reason: ${formData.riddorReason}
Reference: ${formData.riddorReference}
` : ''}

═══════════════════════════════════════════════════
⚠️ ${classInfo.action}
═══════════════════════════════════════════════════

IMPORTANT CONTACT NUMBERS:
• Gas Emergency: 0800 111 999
• Gas Safe Register: 0800 408 5500

A printed copy of this notice must be presented to
the person responsible for the property.

This notice was issued by a Gas Safe registered engineer.
Verify registration at www.gassaferegister.co.uk
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
  const Preview = () => {
    const classInfo = classifications[formData.classification] || {};
    const bgColor = formData.classification === 'ID' ? 'bg-red-600' : 
                    formData.classification === 'AR' ? 'bg-yellow-500' : 'bg-blue-600';
    
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
            <h2 className="font-bold text-lg">Warning Notice Preview</h2>
            <button onClick={() => setShowPreview(false)} className="text-gray-500 text-2xl">&times;</button>
          </div>
          
          <div className="p-4">
            {/* Header */}
            <div className={`${bgColor} rounded-lg p-4 mb-4 text-white`}>
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-bold">⚠️ Gas Warning Notice</h1>
                  <p className="text-sm opacity-90 mt-1">{classInfo.label}</p>
                </div>
                <div className="bg-white text-yellow-600 px-3 py-1 rounded font-bold text-sm">
                  Gas Safe
                </div>
              </div>
              <div className="mt-3 text-4xl font-bold text-center">{formData.classification}</div>
              <p className="text-sm text-center mt-2 opacity-90">{classInfo.description}</p>
            </div>

            {/* Contractor & Addresses */}
            <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
              <div className="border rounded p-2">
                <div className="font-bold text-gray-600 mb-1">Contractor</div>
                <div>{formData.contractorName}</div>
                <div>{formData.contractorAddress}</div>
                <div>Tel: {formData.contractorPhone}</div>
                <div>Gas Safe: {formData.contractorGasSafeNo}</div>
              </div>
              <div className="border rounded p-2">
                <div className="font-bold text-gray-600 mb-1">Installation</div>
                <div>{formData.installAddress}</div>
                <div>{formData.installPostcode}</div>
              </div>
              <div className="border rounded p-2">
                <div className="font-bold text-gray-600 mb-1">Client</div>
                <div>{formData.clientName}</div>
                <div>{formData.clientAddress}</div>
                <div>{formData.clientPostcode}</div>
              </div>
            </div>

            {/* Appliance */}
            <div className="border rounded p-3 mb-4">
              <div className="font-bold text-gray-600 mb-2 text-sm">Appliance Details</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-gray-500">Type:</span> {formData.applianceType}</div>
                <div><span className="text-gray-500">Make:</span> {formData.applianceMake}</div>
                <div><span className="text-gray-500">Model:</span> {formData.applianceModel}</div>
                <div><span className="text-gray-500">Location:</span> {formData.applianceLocation}</div>
              </div>
            </div>

            {/* Fault */}
            <div className="border rounded p-3 mb-4 bg-red-50">
              <div className="font-bold text-red-700 mb-2 text-sm">Fault Description</div>
              <p className="text-sm">{formData.faultDescription}</p>
            </div>

            {/* Action Required */}
            <div className="border rounded p-3 mb-4 bg-yellow-50">
              <div className="font-bold text-yellow-700 mb-2 text-sm">Action Required</div>
              <p className="text-sm">{formData.rectifyAction}</p>
            </div>

            {/* Gas Supply Status */}
            <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
              <div className={`rounded p-3 ${formData.gasSupplyTurnedOff ? 'bg-red-100 border-red-300' : 'bg-green-100 border-green-300'} border`}>
                <div className="font-bold">Gas Supply</div>
                <div>{formData.gasSupplyTurnedOff ? '⛔ TURNED OFF' : '✓ Left On'}</div>
                {formData.gasSupplyLocation && <div className="text-xs text-gray-600">at {formData.gasSupplyLocation}</div>}
              </div>
              <div className={`rounded p-3 ${formData.warningLabelAttached ? 'bg-yellow-100 border-yellow-300' : 'bg-gray-100 border-gray-300'} border`}>
                <div className="font-bold">Warning Label</div>
                <div>{formData.warningLabelAttached ? '⚠️ ATTACHED' : 'Not Attached'}</div>
                {formData.warningLabelLocation && <div className="text-xs text-gray-600">at {formData.warningLabelLocation}</div>}
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
                <div className="text-xs text-gray-500 mb-1">Witness: {formData.witnessName || '(none)'}</div>
                {witnessSignature ? (
                  <img src={witnessSignature} alt="Witness signature" className="h-12 border rounded" />
                ) : (
                  <div className="h-12 border rounded bg-gray-50 flex items-center justify-center text-xs text-gray-400">Not signed</div>
                )}
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="mt-4 p-3 bg-gray-100 rounded text-center text-sm">
              <div className="font-bold">Gas Emergency: 0800 111 999</div>
              <div className="text-xs text-gray-600">Gas Safe Register: 0800 408 5500</div>
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
              className={`flex-1 py-3 text-white font-semibold rounded-xl ${bgColor}`}
            >
              📧 Send Warning Notice
            </button>
          </div>
        </div>
      </div>
    );
  };

  const classInfo = classifications[formData.classification] || {};
  const headerBg = formData.classification === 'ID' ? 'from-red-600 to-red-700' : 
                   formData.classification === 'AR' ? 'from-yellow-500 to-orange-500' : 
                   formData.classification === 'NCS' ? 'from-blue-500 to-blue-600' : 'from-gray-600 to-gray-700';

  return (
    <div className="max-w-4xl mx-auto p-4">
      {showPreview && <Preview />}
      
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className={`bg-gradient-to-r ${headerBg} px-6 py-5 text-white`}>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">⚠️ Warning Notice</h1>
              <p className="text-white/80 text-sm mt-1">Gas Unsafe Situation Report</p>
            </div>
            <div className="bg-white text-yellow-600 px-3 py-1 rounded font-bold text-sm">
              Gas Safe
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Classification */}
          <section>
            <h2 className="text-xs font-semibold text-gray-500 mb-3">CLASSIFICATION</h2>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(classifications).map(([code, info]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => updateField('classification', code)}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    formData.classification === code
                      ? code === 'ID' ? 'border-red-500 bg-red-50' :
                        code === 'AR' ? 'border-yellow-500 bg-yellow-50' :
                        'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`text-2xl font-bold ${
                    code === 'ID' ? 'text-red-600' :
                    code === 'AR' ? 'text-yellow-600' :
                    'text-blue-600'
                  }`}>{code}</div>
                  <div className="text-xs text-gray-600 mt-1">{info.label}</div>
                </button>
              ))}
            </div>
            {formData.classification && (
              <p className={`mt-2 p-2 rounded text-xs ${
                formData.classification === 'ID' ? 'bg-red-50 text-red-700' :
                formData.classification === 'AR' ? 'bg-yellow-50 text-yellow-700' :
                'bg-blue-50 text-blue-700'
              }`}>
                {classInfo.description}
              </p>
            )}
          </section>

          {/* Contractor Details */}
          <section>
            <h2 className="text-xs font-semibold text-gray-500 mb-3">CONTRACTOR DETAILS</h2>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Business Name"
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
                placeholder="Gas Safe Licence No"
                value={formData.contractorGasSafeNo}
                onChange={(e) => updateField('contractorGasSafeNo', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
              <input
                type="date"
                value={formData.inspectionDate}
                onChange={(e) => updateField('inspectionDate', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
            </div>
          </section>

          {/* Installation Address */}
          <section>
            <h2 className="text-xs font-semibold text-gray-500 mb-3">INSTALLATION ADDRESS</h2>
            <div className="grid grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Address"
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
            <h2 className="text-xs font-semibold text-gray-500 mb-3">CLIENT DETAILS</h2>
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

          {/* Appliance Details */}
          <section>
            <h2 className="text-xs font-semibold text-gray-500 mb-3">APPLIANCE DETAILS</h2>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={formData.applianceType}
                onChange={(e) => updateField('applianceType', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
              >
                <option value="">Type...</option>
                <option value="Boiler">Boiler</option>
                <option value="Gas Fire">Gas Fire</option>
                <option value="Cooker">Cooker</option>
                <option value="Hob">Hob</option>
                <option value="Water Heater">Water Heater</option>
                <option value="Other">Other</option>
              </select>
              <input
                type="text"
                placeholder="Location"
                value={formData.applianceLocation}
                onChange={(e) => updateField('applianceLocation', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
              <input
                type="text"
                placeholder="Make"
                value={formData.applianceMake}
                onChange={(e) => updateField('applianceMake', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
              <input
                type="text"
                placeholder="Model"
                value={formData.applianceModel}
                onChange={(e) => updateField('applianceModel', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
              <input
                type="text"
                placeholder="Serial Number"
                value={formData.applianceSerialNo}
                onChange={(e) => updateField('applianceSerialNo', e.target.value)}
                className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
            </div>
          </section>

          {/* RIDDOR */}
          <section>
            <h2 className="text-xs font-semibold text-gray-500 mb-3">RIDDOR REPORTING</h2>
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">RIDDOR Reportable</span>
                <YesNoButton value={formData.riddorReportable} onChange={(v) => updateField('riddorReportable', v)} />
              </div>
              {formData.riddorReportable && (
                <>
                  <input
                    type="text"
                    placeholder="Reason for report"
                    value={formData.riddorReason}
                    onChange={(e) => updateField('riddorReason', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                  />
                  <input
                    type="text"
                    placeholder="RIDDOR Reference Number"
                    value={formData.riddorReference}
                    onChange={(e) => updateField('riddorReference', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                  />
                </>
              )}
            </div>
          </section>

          {/* Fault Description */}
          <section>
            <h2 className="text-xs font-semibold text-gray-500 mb-3">FAULT DESCRIPTION</h2>
            <textarea
              placeholder="Describe the fault/unsafe situation..."
              value={formData.faultDescription}
              onChange={(e) => updateField('faultDescription', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              rows={3}
            />
          </section>

          {/* What is Required to Rectify */}
          <section>
            <h2 className="text-xs font-semibold text-gray-500 mb-3">WHAT IS REQUIRED TO RECTIFY</h2>
            <textarea
              placeholder="Describe what work is needed to fix the issue..."
              value={formData.rectifyAction}
              onChange={(e) => updateField('rectifyAction', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              rows={3}
            />
          </section>

          {/* Actions Taken */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-gray-500">ACTIONS TAKEN</h2>
              <button type="button" onClick={addAction} className="text-xs text-blue-600 font-medium">
                + Add Action
              </button>
            </div>
            <div className="space-y-2">
              {formData.actionsTaken.map((action, idx) => (
                <div key={action.id} className="flex gap-2">
                  <span className="text-sm text-gray-500 pt-2">{idx + 1}.</span>
                  <input
                    type="text"
                    placeholder="Action taken..."
                    value={action.action}
                    onChange={(e) => updateAction(action.id, 'action', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                  />
                  <input
                    type="text"
                    placeholder="Who notified"
                    value={action.notified}
                    onChange={(e) => updateAction(action.id, 'notified', e.target.value)}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                  />
                  {formData.actionsTaken.length > 1 && (
                    <button type="button" onClick={() => removeAction(action.id)} className="text-red-500 px-2">×</button>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Gas Supply & Warning Labels */}
          <section>
            <h2 className="text-xs font-semibold text-gray-500 mb-3">GAS SUPPLY & WARNING LABELS</h2>
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Gas Supply Turned Off</span>
                <YesNoButton value={formData.gasSupplyTurnedOff} onChange={(v) => updateField('gasSupplyTurnedOff', v)} />
              </div>
              {formData.gasSupplyTurnedOff && (
                <input
                  type="text"
                  placeholder="Where was it turned off?"
                  value={formData.gasSupplyLocation}
                  onChange={(e) => updateField('gasSupplyLocation', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                />
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Warning Label Attached</span>
                <YesNoButton value={formData.warningLabelAttached} onChange={(v) => updateField('warningLabelAttached', v)} />
              </div>
              {formData.warningLabelAttached && (
                <input
                  type="text"
                  placeholder="Where was label attached?"
                  value={formData.warningLabelLocation}
                  onChange={(e) => updateField('warningLabelLocation', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                />
              )}
            </div>
          </section>

          {/* Signatures */}
          <section>
            <h2 className="text-xs font-semibold text-gray-500 mb-3">SIGNATURES</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SignaturePad label="Engineer Signature" onSignatureChange={setEngineerSignature} />
              <div>
                <input
                  type="text"
                  placeholder="Witness Name"
                  value={formData.witnessName}
                  onChange={(e) => updateField('witnessName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 mb-2"
                />
                <SignaturePad label="Witness/Customer Signature" onSignatureChange={setWitnessSignature} />
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={() => setShowPreview(true)}
              disabled={!formData.classification}
              className="flex-1 py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 disabled:opacity-50"
            >
              👁️ Preview
            </button>
            <button
              onClick={handleEmail}
              disabled={sending || !formData.classification}
              className={`flex-1 py-3 text-white font-semibold rounded-xl disabled:opacity-50 ${
                formData.classification === 'ID' ? 'bg-red-600 hover:bg-red-700' :
                formData.classification === 'AR' ? 'bg-yellow-500 hover:bg-yellow-600' :
                'bg-blue-600 hover:bg-blue-700'
              }`}
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

export default WarningNotice;
