import React, { useState } from 'react';
import SignaturePad from './SignaturePad';

/**
 * Gas Warning Notice Form
 * For unsafe appliances: ID (Immediately Dangerous), AR (At Risk), NCS (Not to Current Standards)
 */
const WarningNotice = () => {
  const [formData, setFormData] = useState({
    // Classification
    classification: '', // ID, AR, NCS
    
    // Property
    propertyAddress: '',
    propertyPostcode: '',
    
    // Responsible Person
    responsiblePerson: '',
    responsiblePersonEmail: '',
    responsiblePersonPhone: '',
    
    // Appliance Details
    applianceLocation: '',
    applianceType: '',
    applianceMake: '',
    applianceModel: '',
    
    // Fault Details
    faultDescription: '',
    actionTaken: '',
    
    // Gas Supply
    gasSupplyIsolated: null,
    gasSupplyLocation: '',
    
    // Warning Labels
    warningLabelsAttached: null,
    labelLocation: '',
    
    // Engineer Details
    engineerName: '',
    engineerGasSafeId: '',
    companyName: '',
    companyPhone: '',
    
    // Date/Time
    dateTime: new Date().toISOString().slice(0, 16),
  });

  const [engineerSignature, setEngineerSignature] = useState(null);
  const [customerSignature, setCustomerSignature] = useState(null);
  const [customerRefused, setCustomerRefused] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const classificationInfo = {
    ID: {
      label: 'Immediately Dangerous',
      color: 'red',
      description: 'Appliance poses an immediate danger to life. Gas supply MUST be disconnected.',
      action: 'Gas supply disconnected. Do not attempt to use until repaired by Gas Safe engineer.',
    },
    AR: {
      label: 'At Risk',
      color: 'yellow',
      description: 'Appliance is not immediately dangerous but could become so if not addressed.',
      action: 'Appliance should not be used until repaired. Risk of becoming dangerous.',
    },
    NCS: {
      label: 'Not to Current Standards',
      color: 'blue',
      description: 'Appliance is not dangerous but does not meet current installation standards.',
      action: 'Appliance may continue to be used but should be upgraded when possible.',
    },
  };

  const handleEmail = async () => {
    if (!formData.responsiblePersonEmail) {
      alert('Please enter customer email address');
      return;
    }

    setSending(true);
    
    const classification = classificationInfo[formData.classification];
    const subject = `⚠️ GAS WARNING NOTICE - ${formData.classification} - ${formData.propertyAddress}`;
    
    const body = `
⚠️ GAS WARNING/DEFECT NOTICE ⚠️

CLASSIFICATION: ${formData.classification} - ${classification?.label || ''}
${classification?.description || ''}

PROPERTY: ${formData.propertyAddress}, ${formData.propertyPostcode}
DATE/TIME: ${new Date(formData.dateTime).toLocaleString()}

RESPONSIBLE PERSON: ${formData.responsiblePerson}

APPLIANCE DETAILS:
Location: ${formData.applianceLocation}
Type: ${formData.applianceType}
Make/Model: ${formData.applianceMake} ${formData.applianceModel}

FAULT DESCRIPTION:
${formData.faultDescription}

ACTION TAKEN:
${formData.actionTaken}

GAS SUPPLY: ${formData.gasSupplyIsolated ? 'ISOLATED at ' + formData.gasSupplyLocation : 'Not isolated'}
WARNING LABELS: ${formData.warningLabelsAttached ? 'Attached at ' + formData.labelLocation : 'Not attached'}

ENGINEER DETAILS:
Name: ${formData.engineerName}
Gas Safe ID: ${formData.engineerGasSafeId}
Company: ${formData.companyName}
Phone: ${formData.companyPhone}

${classification?.action || ''}

---
IMPORTANT: ${formData.classification === 'ID' ? 
  'DO NOT ATTEMPT TO RECONNECT OR USE THIS APPLIANCE. Contact a Gas Safe registered engineer.' :
  'This appliance requires attention from a Gas Safe registered engineer.'}

This notice was issued by a Gas Safe registered engineer.
A signed copy will be provided separately.
    `.trim();

    window.location.href = `mailto:${formData.responsiblePersonEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    setTimeout(() => {
      setSending(false);
      setSent(true);
    }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-5 text-white ${
          formData.classification === 'ID' ? 'bg-gradient-to-r from-red-600 to-red-700' :
          formData.classification === 'AR' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
          formData.classification === 'NCS' ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
          'bg-gradient-to-r from-gray-600 to-gray-700'
        }`}>
          <h1 className="text-2xl font-bold">⚠️ Warning Notice</h1>
          <p className="text-white/80 text-sm mt-1">Gas Unsafe Situation Report</p>
        </div>

        <div className="p-5 space-y-6">
          {/* Classification */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 mb-3">CLASSIFICATION</h2>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(classificationInfo).map(([code, info]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => updateField('classification', code)}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
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
              <div className={`mt-3 p-3 rounded-lg text-sm ${
                formData.classification === 'ID' ? 'bg-red-50 text-red-700' :
                formData.classification === 'AR' ? 'bg-yellow-50 text-yellow-700' :
                'bg-blue-50 text-blue-700'
              }`}>
                {classificationInfo[formData.classification].description}
              </div>
            )}
          </section>

          {/* Property & Person */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 mb-3">PROPERTY & RESPONSIBLE PERSON</h2>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Property Address"
                value={formData.propertyAddress}
                onChange={(e) => updateField('propertyAddress', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
              <input
                type="text"
                placeholder="Postcode"
                value={formData.propertyPostcode}
                onChange={(e) => updateField('propertyPostcode', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
              <input
                type="text"
                placeholder="Responsible Person Name"
                value={formData.responsiblePerson}
                onChange={(e) => updateField('responsiblePerson', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.responsiblePersonEmail}
                onChange={(e) => updateField('responsiblePersonEmail', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
            </div>
          </section>

          {/* Appliance */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 mb-3">APPLIANCE DETAILS</h2>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Location (e.g., Kitchen)"
                value={formData.applianceLocation}
                onChange={(e) => updateField('applianceLocation', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
              <select
                value={formData.applianceType}
                onChange={(e) => updateField('applianceType', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
              >
                <option value="">Appliance Type...</option>
                <option value="Boiler">Boiler</option>
                <option value="Gas Fire">Gas Fire</option>
                <option value="Cooker">Cooker</option>
                <option value="Hob">Hob</option>
                <option value="Water Heater">Water Heater</option>
                <option value="Other">Other</option>
              </select>
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
            </div>
          </section>

          {/* Fault Details */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 mb-3">FAULT DETAILS</h2>
            <textarea
              placeholder="Describe the fault/defect found..."
              value={formData.faultDescription}
              onChange={(e) => updateField('faultDescription', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 mb-3"
              rows={3}
            />
            <textarea
              placeholder="Action taken..."
              value={formData.actionTaken}
              onChange={(e) => updateField('actionTaken', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              rows={2}
            />
          </section>

          {/* Gas Supply & Labels */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 mb-3">GAS SUPPLY & WARNING LABELS</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 w-40">Gas Supply Isolated:</span>
                <button
                  type="button"
                  onClick={() => updateField('gasSupplyIsolated', true)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    formData.gasSupplyIsolated === true 
                      ? 'bg-red-500 text-white' 
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => updateField('gasSupplyIsolated', false)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    formData.gasSupplyIsolated === false 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  No
                </button>
                {formData.gasSupplyIsolated && (
                  <input
                    type="text"
                    placeholder="Where?"
                    value={formData.gasSupplyLocation}
                    onChange={(e) => updateField('gasSupplyLocation', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                  />
                )}
              </div>

              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 w-40">Warning Labels:</span>
                <button
                  type="button"
                  onClick={() => updateField('warningLabelsAttached', true)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    formData.warningLabelsAttached === true 
                      ? 'bg-yellow-500 text-white' 
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Attached
                </button>
                <button
                  type="button"
                  onClick={() => updateField('warningLabelsAttached', false)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    formData.warningLabelsAttached === false 
                      ? 'bg-gray-500 text-white' 
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Not Attached
                </button>
                {formData.warningLabelsAttached && (
                  <input
                    type="text"
                    placeholder="Where?"
                    value={formData.labelLocation}
                    onChange={(e) => updateField('labelLocation', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                  />
                )}
              </div>
            </div>
          </section>

          {/* Engineer Details */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 mb-3">ENGINEER DETAILS</h2>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Engineer Name"
                value={formData.engineerName}
                onChange={(e) => updateField('engineerName', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
              <input
                type="text"
                placeholder="Gas Safe ID"
                value={formData.engineerGasSafeId}
                onChange={(e) => updateField('engineerGasSafeId', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
              <input
                type="text"
                placeholder="Company Name"
                value={formData.companyName}
                onChange={(e) => updateField('companyName', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
              <input
                type="tel"
                placeholder="Company Phone"
                value={formData.companyPhone}
                onChange={(e) => updateField('companyPhone', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
            </div>
            <div className="mt-3">
              <label className="block text-xs text-gray-500 mb-1">Date & Time</label>
              <input
                type="datetime-local"
                value={formData.dateTime}
                onChange={(e) => updateField('dateTime', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              />
            </div>
          </section>

          {/* Signatures */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 mb-3">SIGNATURES</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SignaturePad
                label="Engineer Signature"
                onSignatureChange={setEngineerSignature}
              />
              <div>
                <SignaturePad
                  label="Customer Signature"
                  onSignatureChange={setCustomerSignature}
                  disabled={customerRefused}
                />
                <label className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={customerRefused}
                    onChange={(e) => setCustomerRefused(e.target.checked)}
                    className="rounded"
                  />
                  Customer refused to sign
                </label>
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={handleEmail}
              disabled={sending || !formData.classification}
              className={`flex-1 py-3 font-semibold rounded-xl transition-colors disabled:opacity-50 ${
                formData.classification === 'ID' ? 'bg-red-600 hover:bg-red-700 text-white' :
                formData.classification === 'AR' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' :
                'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {sending ? 'Opening Email...' : sent ? '✓ Email Opened' : '📧 Email Warning Notice'}
            </button>
          </div>

          {sent && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
              Email client opened. Please review and send the warning notice.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WarningNotice;
