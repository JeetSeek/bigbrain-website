import React, { useState, useRef } from 'react';
import SignaturePad from './SignaturePad';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Move these outside the component to prevent re-creation
const applianceTypes = [
  'Boiler - Combi', 'Boiler - System', 'Boiler - Regular',
  'Gas Fire - Inset', 'Gas Fire - Outset', 'Cooker', 'Hob', 'Oven',
  'Water Heater - Instantaneous', 'Water Heater - Storage', 'Warm Air Unit', 'Other',
];

const locations = [
  'Kitchen', 'Utility Room', 'Airing Cupboard', 'Bedroom 1', 'Bedroom 2', 'Bedroom 3',
  'Living Room', 'Dining Room', 'Bathroom', 'En-Suite', 'Garage', 'Loft', 'Cellar', 'Hallway', 'Other',
];

const manufacturers = [
  'Ideal', 'Worcester Bosch', 'Vaillant', 'Baxi', 'Glow-worm', 'Potterton', 'Main',
  'Viessmann', 'Alpha', 'Ferroli', 'Ravenheat', 'Ariston', 'Intergas', 'Keston', 'Other',
];

const flueTypes = ['Room sealed (RS)', 'Flueless (FL)', 'Open Flued (OF)'];

const CP12Form = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    contractorName: '', contractorAddress: '', contractorPhone: '', contractorGasSafeNo: '',
    installAddress: '', installPostcode: '',
    clientName: '', clientAddress: '', clientPostcode: '', clientPhone: '', clientEmail: '',
    inspectionDate: new Date().toISOString().split('T')[0], nextInspectionDate: '',
    appliances: [],
    emergencyControlAccessible: null, emergencyControlLocation: '', pipeworkCondition: null, gasTightnessTest: null,
    coAlarmTest: null, smokeAlarmTest: null, additionalComments: '',
    engineerName: '', customerName: '',
  });
  const [engineerSignature, setEngineerSignature] = useState(null);
  const [customerSignature, setCustomerSignature] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [generating, setGenerating] = useState(false);
  const certificateRef = useRef(null);

  const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  
  const createEmptyAppliance = () => ({
    id: Date.now(), type: '', location: '', make: '', model: '', ownedBy: 'Landlord',
    servicedRecently: null, flueType: '', inspectedTested: null,
    lowRatio: '', highRatio: '', operatingPressure: '', heatInput: '', heatInputUnit: 'kW/h',
    safetyDeviceOperation: null, ventilation: null, fluePerformance: null,
    visualConditionFlue: null, applianceSafe: null, defects: '', remedialAction: '', labelledWarningIssued: null,
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
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
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
      const filename = `CP12_${formData.installAddress.replace(/[^a-zA-Z0-9]/g, '_')}_${formData.inspectionDate}.pdf`;
      pdf.save(filename);
    }
  };

  const handleEmailWithPDF = async () => {
    if (!formData.clientEmail) { alert('Please enter client email'); return; }
    // First download the PDF
    await downloadPDF();
    // Then open email
    const subject = `CP12 Gas Safety Record - ${formData.installAddress}`;
    const body = `Dear ${formData.clientName},\n\nPlease find attached your Landlord Gas Safety Record (CP12).\n\nProperty: ${formData.installAddress}, ${formData.installPostcode}\nInspection Date: ${formData.inspectionDate}\nNext Inspection Due: ${formData.nextInspectionDate}\n\nContractor: ${formData.contractorName}\nGas Safe Registration: ${formData.contractorGasSafeNo}\nPhone: ${formData.contractorPhone}\n\nPlease attach the downloaded PDF to this email before sending.\n\nKind regards,\n${formData.engineerName}`;
    window.location.href = `mailto:${formData.clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Inline styles for inputs
  const inputClass = "w-full px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent";
  const selectClass = "w-full px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500";
  const labelClass = "block text-sm font-medium text-gray-700 mb-2";
  const sectionClass = "text-lg font-semibold text-emerald-600 mb-4";

  // Button group renderer
  const renderButtonGroup = (options, value, onChange) => (
    <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => onChange(opt)}
          className={`py-3 px-2 rounded-lg text-sm font-medium border transition-all ${
            value === opt ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-gray-600 border-gray-200'
          }`}>{opt}</button>
      ))}
    </div>
  );

  // Step indicator
  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-4 px-2">
      {[1, 2, 3, 4, 5].map((s, i) => (
        <React.Fragment key={s}>
          <button onClick={() => setStep(s)}
            className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${
              step === s ? 'bg-emerald-500 text-white' : step > s ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'
            }`}>{s}</button>
          {i < 4 && <div className={`w-6 h-1 ${step > s ? 'bg-emerald-300' : 'bg-gray-200'}`} />}
        </React.Fragment>
      ))}
    </div>
  );

  // Preview Component
  const Preview = () => (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 overflow-auto">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[95vh] overflow-auto shadow-2xl">
        {/* Preview Header */}
        <div className="sticky top-0 bg-slate-700 text-white px-4 py-3 flex justify-between items-center z-10 rounded-t-xl">
          <h2 className="font-bold">CP12 Certificate Preview</h2>
          <button onClick={() => setShowPreview(false)} className="w-8 h-8 bg-white/20 rounded-full text-lg">×</button>
        </div>
        
        {/* Certificate Content */}
        <div className="p-4 bg-gray-100">
          <div ref={certificateRef} className="bg-white border-2 border-gray-400 shadow-sm">
            {/* Header */}
            <div className="border-b-2 border-gray-400 p-3 flex justify-between items-start bg-gradient-to-r from-yellow-50 to-white">
              <div className="text-xs text-gray-700 max-w-[50%]">
                Registered Gas/Engineer details can be verified at www.gassaferegister.co.uk or by calling 0800 408 5577
              </div>
              <div className="text-right">
                <div className="bg-yellow-400 text-black px-3 py-2 font-bold text-sm inline-block rounded">
                  Landlord Gas Safety Record
                </div>
                <div className="mt-1 bg-yellow-400 text-black px-2 py-0.5 text-xs font-bold inline-block rounded">
                  Gas Safe
                </div>
              </div>
            </div>

            {/* Record Info */}
            <div className="grid grid-cols-3 text-sm border-b-2 border-gray-400">
              <div className="p-2 border-r border-gray-300">
                <span className="text-gray-600 text-xs font-medium">Record issued for:</span>
                <div className="font-bold text-black">Gas Safety Check</div>
              </div>
              <div className="p-2 border-r border-gray-300">
                <span className="text-gray-600 text-xs font-medium">Date:</span>
                <div className="font-bold text-black">{formData.inspectionDate}</div>
              </div>
              <div className="p-2">
                <span className="text-gray-600 text-xs font-medium">Next inspection:</span>
                <div className="font-bold text-black">{formData.nextInspectionDate}</div>
              </div>
            </div>

            {/* Addresses */}
            <div className="grid grid-cols-3 border-b-2 border-gray-400">
              <div className="p-3 border-r border-gray-300 bg-yellow-50">
                <div className="text-xs font-bold text-gray-800 mb-2 bg-yellow-300 px-2 py-0.5 inline-block rounded">Contractor</div>
                <div className="text-xs space-y-1 text-gray-900">
                  <div className="font-bold">{formData.contractorName || '-'}</div>
                  <div>{formData.contractorAddress || '-'}</div>
                  <div>Tel: {formData.contractorPhone || '-'}</div>
                  <div className="font-bold">Gas Safe: {formData.contractorGasSafeNo || '-'}</div>
                </div>
              </div>
              <div className="p-3 border-r border-gray-300 bg-yellow-50">
                <div className="text-xs font-bold text-gray-800 mb-2 bg-yellow-300 px-2 py-0.5 inline-block rounded">Installation Address</div>
                <div className="text-xs space-y-1 text-gray-900">
                  <div className="font-bold">{formData.installAddress || '-'}</div>
                  <div className="font-medium">{formData.installPostcode || '-'}</div>
                </div>
              </div>
              <div className="p-3 bg-yellow-50">
                <div className="text-xs font-bold text-gray-800 mb-2 bg-yellow-300 px-2 py-0.5 inline-block rounded">Client/Landlord</div>
                <div className="text-xs space-y-1 text-gray-900">
                  <div className="font-bold">{formData.clientName || '-'}</div>
                  <div>{formData.clientAddress || '-'}</div>
                  <div>{formData.clientPostcode || '-'}</div>
                </div>
              </div>
            </div>

            {/* Appliances */}
            <div className="border-b-2 border-gray-400">
              <div className="bg-gray-200 px-3 py-2 text-xs font-bold text-gray-900 border-b border-gray-300">Appliances Inspected</div>
              {formData.appliances.length === 0 ? (
                <div className="p-3 text-center text-gray-400 text-sm">No appliances added</div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 text-left border-b-2 border-r border-gray-300 text-gray-900 font-bold">#</th>
                      <th className="p-2 text-left border-b-2 border-r border-gray-300 text-gray-900 font-bold">Location</th>
                      <th className="p-2 text-left border-b-2 border-r border-gray-300 text-gray-900 font-bold">Type</th>
                      <th className="p-2 text-left border-b-2 border-r border-gray-300 text-gray-900 font-bold">Make/Model</th>
                      <th className="p-2 text-center border-b-2 border-r border-gray-300 text-gray-900 font-bold">Flue</th>
                      <th className="p-2 text-center border-b-2 border-r border-gray-300 text-gray-900 font-bold">Pressure</th>
                      <th className="p-2 text-center border-b-2 border-gray-300 text-gray-900 font-bold">Safe?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.appliances.map((app, i) => (
                      <tr key={app.id} className="border-b border-gray-300">
                        <td className="p-2 border-r border-gray-200 font-bold text-gray-900">{i + 1}</td>
                        <td className="p-2 border-r border-gray-200 text-gray-900">{app.location || '-'}</td>
                        <td className="p-2 border-r border-gray-200 text-gray-900">{app.type || '-'}</td>
                        <td className="p-2 border-r border-gray-200 text-gray-900 font-medium">{app.make} {app.model}</td>
                        <td className="p-2 border-r border-gray-200 text-center text-gray-900">{app.flueType?.match(/\(([^)]+)\)/)?.[1] || '-'}</td>
                        <td className="p-2 border-r border-gray-200 text-center text-gray-900">{app.operatingPressure || '-'}</td>
                        <td className={`p-2 text-center font-bold ${app.applianceSafe === 'Pass' ? 'text-green-700 bg-green-100' : app.applianceSafe === 'Fail' ? 'text-red-700 bg-red-100' : 'text-gray-900'}`}>
                          {app.applianceSafe === 'Pass' ? '✓ Yes' : app.applianceSafe === 'Fail' ? '✗ No' : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Safety Results */}
            {formData.appliances.length > 0 && (
              <div className="border-b-2 border-gray-400">
                <div className="bg-gray-200 px-3 py-2 text-xs font-bold text-gray-900 border-b border-gray-300">Safety Check Results</div>
                <table className="w-full text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 text-center border-b-2 border-r border-gray-300 text-gray-900 font-bold">#</th>
                      <th className="p-2 text-center border-b-2 border-r border-gray-300 text-gray-900 font-bold">Safety Dev</th>
                      <th className="p-2 text-center border-b-2 border-r border-gray-300 text-gray-900 font-bold">Vent</th>
                      <th className="p-2 text-center border-b-2 border-r border-gray-300 text-gray-900 font-bold">Flue Perf</th>
                      <th className="p-2 text-center border-b-2 border-r border-gray-300 text-gray-900 font-bold">Flue Cond</th>
                      <th className="p-2 text-left border-b-2 border-gray-300 text-gray-900 font-bold">Defects</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.appliances.map((app, i) => (
                      <tr key={app.id} className="border-b border-gray-300">
                        <td className="p-2 text-center border-r border-gray-200 font-bold text-gray-900">{i + 1}</td>
                        <td className={`p-2 text-center border-r border-gray-200 font-bold ${app.safetyDeviceOperation === 'Pass' ? 'text-green-700' : app.safetyDeviceOperation === 'Fail' ? 'text-red-700' : 'text-gray-900'}`}>
                          {app.safetyDeviceOperation === 'Pass' ? '✓' : app.safetyDeviceOperation === 'Fail' ? '✗' : '-'}
                        </td>
                        <td className={`p-2 text-center border-r border-gray-200 font-bold ${app.ventilation === 'Pass' ? 'text-green-700' : app.ventilation === 'Fail' ? 'text-red-700' : 'text-gray-900'}`}>
                          {app.ventilation === 'Pass' ? '✓' : app.ventilation === 'Fail' ? '✗' : '-'}
                        </td>
                        <td className={`p-2 text-center border-r border-gray-200 font-bold ${app.fluePerformance === 'Pass' ? 'text-green-700' : app.fluePerformance === 'Fail' ? 'text-red-700' : 'text-gray-900'}`}>
                          {app.fluePerformance === 'Pass' ? '✓' : app.fluePerformance === 'Fail' ? '✗' : '-'}
                        </td>
                        <td className={`p-2 text-center border-r border-gray-200 font-bold ${app.visualConditionFlue === 'Pass' ? 'text-green-700' : app.visualConditionFlue === 'Fail' ? 'text-red-700' : 'text-gray-900'}`}>
                          {app.visualConditionFlue === 'Pass' ? '✓' : app.visualConditionFlue === 'Fail' ? '✗' : '-'}
                        </td>
                        <td className="p-2 text-red-700 font-medium">{app.defects || 'None'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Gas Supply & Safety */}
            <div className="grid grid-cols-2 border-b-2 border-gray-400">
              <div className="p-3 border-r border-gray-300 bg-yellow-50">
                <div className="text-xs font-bold text-gray-800 mb-2 bg-yellow-300 px-2 py-0.5 inline-block rounded">Gas Supply & Pipework</div>
                <div className="text-xs space-y-1 text-gray-900">
                  <div className="flex justify-between"><span>Emergency control:</span><span className="font-bold">{formData.emergencyControlAccessible || '-'}</span></div>
                  <div className="flex justify-between"><span>Pipework condition:</span><span className="font-bold">{formData.pipeworkCondition || '-'}</span></div>
                  <div className="flex justify-between"><span>Tightness test:</span><span className="font-bold">{formData.gasTightnessTest || '-'}</span></div>
                </div>
              </div>
              <div className="p-3 bg-yellow-50">
                <div className="text-xs font-bold text-gray-800 mb-2 bg-yellow-300 px-2 py-0.5 inline-block rounded">Safety Devices</div>
                <div className="text-xs space-y-1 text-gray-900">
                  <div className="flex justify-between"><span>CO Alarm:</span><span className="font-bold">{formData.coAlarmTest || '-'}</span></div>
                  <div className="flex justify-between"><span>Smoke Alarm:</span><span className="font-bold">{formData.smokeAlarmTest || '-'}</span></div>
                </div>
              </div>
            </div>

            {/* Comments */}
            {formData.additionalComments && (
              <div className="p-3 border-b-2 border-gray-400 text-xs">
                <div className="font-bold text-gray-900 mb-1">Additional Comments:</div>
                <div className="text-gray-900">{formData.additionalComments}</div>
              </div>
            )}

            {/* Signatures */}
            <div className="grid grid-cols-2">
              <div className="p-3 border-r border-gray-300">
                <div className="text-xs text-gray-700 mb-1 font-medium">Engineer: <span className="font-bold text-black">{formData.engineerName || '-'}</span></div>
                {engineerSignature ? (
                  <img src={engineerSignature} alt="Engineer signature" className="h-14 max-w-full" />
                ) : (
                  <div className="h-14 border-b-2 border-gray-500 border-dashed" />
                )}
              </div>
              <div className="p-3">
                <div className="text-xs text-gray-700 mb-1 font-medium">Received by: <span className="font-bold text-black">{formData.customerName || '-'}</span></div>
                {customerSignature ? (
                  <img src={customerSignature} alt="Customer signature" className="h-14 max-w-full" />
                ) : (
                  <div className="h-14 border-b-2 border-gray-500 border-dashed" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-white border-t p-3 space-y-2 rounded-b-xl">
          <div className="flex gap-2">
            <button onClick={() => setShowPreview(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg">
              Edit
            </button>
            <button onClick={downloadPDF} disabled={generating} className="flex-1 py-3 bg-blue-500 text-white font-medium rounded-lg flex items-center justify-center gap-2 disabled:opacity-50">
              {generating ? 'Generating...' : '📄 Download PDF'}
            </button>
          </div>
          <button onClick={handleEmailWithPDF} disabled={generating} className="w-full py-3 bg-emerald-500 text-white font-medium rounded-lg flex items-center justify-center gap-2 disabled:opacity-50">
            <span>📧</span> Download & Email
          </button>
          <p className="text-xs text-gray-500 text-center">PDF will download first, then attach to your email</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto bg-gray-50 min-h-screen pb-24">
      {showPreview && <Preview />}

      {/* Header */}
      <div className="bg-slate-700 text-white px-4 py-3 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <button onClick={() => step > 1 && setStep(step - 1)} disabled={step === 1}
            className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center disabled:opacity-40">
            <span className="text-xl">←</span>
          </button>
          <h1 className="text-lg font-medium">CP12 Gas Safety</h1>
          <div className="flex gap-2">
            <button onClick={() => setShowPreview(true)} className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
              👁️
            </button>
            <button onClick={() => step < 5 && setStep(step + 1)} disabled={step === 5}
              className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center disabled:opacity-40">
              <span className="text-xl">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="bg-white py-3 border-b">
        <StepIndicator />
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Step 1: Contractor */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className={sectionClass}>Contractor Details</h3>
            <div>
              <label className={labelClass}>Business Name <span className="text-red-500">*</span></label>
              <input type="text" value={formData.contractorName} onChange={(e) => updateField('contractorName', e.target.value)}
                placeholder="Enter business name" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Address <span className="text-red-500">*</span></label>
              <input type="text" value={formData.contractorAddress} onChange={(e) => updateField('contractorAddress', e.target.value)}
                placeholder="Enter business address" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Phone <span className="text-red-500">*</span></label>
              <input type="tel" value={formData.contractorPhone} onChange={(e) => updateField('contractorPhone', e.target.value)}
                placeholder="Enter phone number" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Gas Safe Licence Number <span className="text-red-500">*</span></label>
              <input type="text" value={formData.contractorGasSafeNo} onChange={(e) => updateField('contractorGasSafeNo', e.target.value)}
                placeholder="Enter Gas Safe number" className={inputClass} />
            </div>
          </div>
        )}

        {/* Step 2: Property & Client */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className={sectionClass}>Installation Address</h3>
            <div>
              <label className={labelClass}>Property Address <span className="text-red-500">*</span></label>
              <input type="text" value={formData.installAddress} onChange={(e) => updateField('installAddress', e.target.value)}
                placeholder="Enter property address" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Postcode <span className="text-red-500">*</span></label>
              <input type="text" value={formData.installPostcode} onChange={(e) => updateField('installPostcode', e.target.value)}
                placeholder="Enter postcode" className={inputClass} />
            </div>

            <h3 className={sectionClass}>Client/Landlord Details</h3>
            <div>
              <label className={labelClass}>Client Name <span className="text-red-500">*</span></label>
              <input type="text" value={formData.clientName} onChange={(e) => updateField('clientName', e.target.value)}
                placeholder="Enter client name" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Client Address</label>
              <input type="text" value={formData.clientAddress} onChange={(e) => updateField('clientAddress', e.target.value)}
                placeholder="Enter client address (if different)" className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Postcode</label>
                <input type="text" value={formData.clientPostcode} onChange={(e) => updateField('clientPostcode', e.target.value)}
                  placeholder="Postcode" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input type="tel" value={formData.clientPhone} onChange={(e) => updateField('clientPhone', e.target.value)}
                  placeholder="Phone" className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Email <span className="text-red-500">*</span></label>
              <input type="email" value={formData.clientEmail} onChange={(e) => updateField('clientEmail', e.target.value)}
                placeholder="Enter email for certificate" className={inputClass} />
            </div>

            <h3 className={sectionClass}>Inspection Dates</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Date of Inspection <span className="text-red-500">*</span></label>
                <input type="date" value={formData.inspectionDate} onChange={(e) => updateField('inspectionDate', e.target.value)}
                  className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Next Due <span className="text-red-500">*</span></label>
                <input type="date" value={formData.nextInspectionDate} onChange={(e) => updateField('nextInspectionDate', e.target.value)}
                  className={inputClass} />
              </div>
            </div>
            <button type="button" onClick={calculateNextInspection}
              className="w-full py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium">
              + Set to 1 Year from Inspection
            </button>
          </div>
        )}

        {/* Step 3: Appliances & Gas Supply */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className={sectionClass}>Gas Supply and Pipe Work</h3>
            <div className="bg-white rounded-xl p-4 space-y-4 border border-gray-200">
              <div>
                <label className={labelClass}>Emergency control accessible <span className="text-red-500">*</span></label>
                {renderButtonGroup(['Yes', 'No'], formData.emergencyControlAccessible, (v) => updateField('emergencyControlAccessible', v))}
              </div>
              {formData.emergencyControlAccessible === 'Yes' && (
                <div>
                  <label className={labelClass}>Location</label>
                  <select value={formData.emergencyControlLocation} onChange={(e) => updateField('emergencyControlLocation', e.target.value)} className={selectClass}>
                    <option value="">Select location</option>
                    <option>Meter box</option><option>Under stairs</option><option>Kitchen</option><option>Utility</option><option>External</option><option>Other</option>
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
            </div>

            <h3 className={sectionClass}>Appliances</h3>
            <p className="text-sm text-gray-500">Add up to four appliances.</p>

            {formData.appliances.map((app, idx) => (
              <div key={app.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-emerald-50 px-4 py-3 flex justify-between items-center border-b border-emerald-100">
                  <span className="font-medium text-emerald-700">Appliance {idx + 1}</span>
                  <button type="button" onClick={() => removeAppliance(app.id)} className="text-red-500 text-sm font-medium">Remove</button>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <label className={labelClass}>Appliance type <span className="text-red-500">*</span></label>
                    <select value={app.type} onChange={(e) => updateAppliance(app.id, 'type', e.target.value)} className={selectClass}>
                      <option value="">Please select appliance type</option>
                      {applianceTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Location <span className="text-red-500">*</span></label>
                    <select value={app.location} onChange={(e) => updateAppliance(app.id, 'location', e.target.value)} className={selectClass}>
                      <option value="">Select location</option>
                      {locations.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Make <span className="text-red-500">*</span></label>
                    <select value={app.make} onChange={(e) => updateAppliance(app.id, 'make', e.target.value)} className={selectClass}>
                      <option value="">Select manufacturer</option>
                      {manufacturers.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Model <span className="text-red-500">*</span></label>
                    <input type="text" value={app.model} onChange={(e) => updateAppliance(app.id, 'model', e.target.value)}
                      placeholder="Enter model" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Owned by <span className="text-red-500">*</span></label>
                    {renderButtonGroup(['Landlord', 'Tenant'], app.ownedBy, (v) => updateAppliance(app.id, 'ownedBy', v))}
                  </div>
                  <div>
                    <label className={labelClass}>Appliance serviced?</label>
                    {renderButtonGroup(['Yes', 'No', 'N/A'], app.servicedRecently, (v) => updateAppliance(app.id, 'servicedRecently', v))}
                  </div>
                  <div>
                    <label className={labelClass}>Flue type <span className="text-red-500">*</span></label>
                    {renderButtonGroup(flueTypes, app.flueType, (v) => updateAppliance(app.id, 'flueType', v))}
                  </div>
                  <div>
                    <label className={labelClass}>Inspected and tested <span className="text-red-500">*</span></label>
                    {renderButtonGroup(['Yes', 'No'], app.inspectedTested, (v) => updateAppliance(app.id, 'inspectedTested', v))}
                  </div>

                  {/* Readings */}
                  <div className="pt-2 border-t border-gray-200">
                    <h4 className="text-emerald-600 font-medium mb-3">Combustion Readings</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Operating pressure (mb)</label>
                        <input type="text" value={app.operatingPressure} onChange={(e) => updateAppliance(app.id, 'operatingPressure', e.target.value)}
                          placeholder="e.g. 12.5" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Heat input</label>
                        <input type="text" value={app.heatInput} onChange={(e) => updateAppliance(app.id, 'heatInput', e.target.value)}
                          placeholder="e.g. 30" className={inputClass} />
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className={labelClass}>Unit of measure <span className="text-red-500">*</span></label>
                      {renderButtonGroup(['kW/h', 'Btu/h'], app.heatInputUnit, (v) => updateAppliance(app.id, 'heatInputUnit', v))}
                    </div>
                  </div>

                  {/* Safety Checks */}
                  <div className="pt-2 border-t border-gray-200 space-y-3">
                    <div>
                      <label className={labelClass}>Safety device operation <span className="text-red-500">*</span></label>
                      {renderButtonGroup(['Pass', 'Fail', 'N/A'], app.safetyDeviceOperation, (v) => updateAppliance(app.id, 'safetyDeviceOperation', v))}
                    </div>
                    <div>
                      <label className={labelClass}>Ventilation <span className="text-red-500">*</span></label>
                      {renderButtonGroup(['Pass', 'Fail', 'N/A'], app.ventilation, (v) => updateAppliance(app.id, 'ventilation', v))}
                    </div>
                    <div>
                      <label className={labelClass}>Flue performance <span className="text-red-500">*</span></label>
                      {renderButtonGroup(['Pass', 'Fail', 'N/A'], app.fluePerformance, (v) => updateAppliance(app.id, 'fluePerformance', v))}
                    </div>
                    <div>
                      <label className={labelClass}>Visual condition of flue <span className="text-red-500">*</span></label>
                      {renderButtonGroup(['Pass', 'Fail', 'N/A'], app.visualConditionFlue, (v) => updateAppliance(app.id, 'visualConditionFlue', v))}
                    </div>
                    <div>
                      <label className={labelClass}>Appliance Safe <span className="text-red-500">*</span></label>
                      {renderButtonGroup(['Pass', 'Fail', 'N/A'], app.applianceSafe, (v) => updateAppliance(app.id, 'applianceSafe', v))}
                    </div>
                    <div>
                      <label className={labelClass}>Details of any defects</label>
                      <textarea value={app.defects} onChange={(e) => updateAppliance(app.id, 'defects', e.target.value)}
                        placeholder="None" rows={2} className={inputClass + " resize-none"} />
                    </div>
                    <div>
                      <label className={labelClass}>Remedial action taken</label>
                      <textarea value={app.remedialAction} onChange={(e) => updateAppliance(app.id, 'remedialAction', e.target.value)}
                        placeholder="None" rows={2} className={inputClass + " resize-none"} />
                    </div>
                    <div>
                      <label className={labelClass}>Labelled and warning notice issued <span className="text-red-500">*</span></label>
                      {renderButtonGroup(['Yes', 'No'], app.labelledWarningIssued, (v) => updateAppliance(app.id, 'labelledWarningIssued', v))}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button type="button" onClick={addAppliance} disabled={formData.appliances.length >= 4}
              className="w-full py-3 bg-emerald-500 text-white rounded-lg font-medium disabled:opacity-50">
              + Add New Appliance
            </button>
          </div>
        )}

        {/* Step 4: Safety Devices */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className={sectionClass}>Safety Devices</h3>
            <div className="bg-white rounded-xl p-4 space-y-4 border border-gray-200">
              <div>
                <label className={labelClass}>CO Alarm Test</label>
                {renderButtonGroup(['Pass', 'Fail', 'N/A'], formData.coAlarmTest, (v) => updateField('coAlarmTest', v))}
              </div>
              <div>
                <label className={labelClass}>Smoke Alarm Test</label>
                {renderButtonGroup(['Pass', 'Fail', 'N/A'], formData.smokeAlarmTest, (v) => updateField('smokeAlarmTest', v))}
              </div>
            </div>

            <h3 className={sectionClass}>Additional comments / Work</h3>
            <textarea value={formData.additionalComments} onChange={(e) => updateField('additionalComments', e.target.value)}
              placeholder="Enter any additional comments or work carried out" rows={4} className={inputClass + " resize-none"} />
          </div>
        )}

        {/* Step 5: Declaration */}
        {step === 5 && (
          <div className="space-y-4">
            <h3 className={sectionClass}>Declaration</h3>
            <div>
              <label className={labelClass}>Engineer name <span className="text-red-500">*</span></label>
              <input type="text" value={formData.engineerName} onChange={(e) => updateField('engineerName', e.target.value)}
                placeholder="Enter your name" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Customer name <span className="text-red-500">*</span></label>
              <input type="text" value={formData.customerName} onChange={(e) => updateField('customerName', e.target.value)}
                placeholder="Enter customer name" className={inputClass} />
            </div>

            <h3 className={sectionClass}>Engineer signature</h3>
            <SignaturePad label="" onSignatureChange={setEngineerSignature} />

            <h3 className={sectionClass}>Received by</h3>
            <SignaturePad label="" onSignatureChange={setCustomerSignature} />
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-10">
        <div className="max-w-lg mx-auto flex gap-3">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg">
              Previous
            </button>
          )}
          {step < 5 ? (
            <button onClick={() => setStep(step + 1)} className="flex-1 py-3 bg-emerald-500 text-white font-medium rounded-lg">
              Next
            </button>
          ) : (
            <button onClick={() => setShowPreview(true)} className="flex-1 py-3 bg-emerald-500 text-white font-medium rounded-lg">
              Preview & Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CP12Form;
