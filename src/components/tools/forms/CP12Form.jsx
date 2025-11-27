import React, { useState, useRef } from 'react';
import SignaturePad from './SignaturePad';

/**
 * CP12 Landlord Gas Safety Record
 * Multi-step wizard with official Gas Safe format preview
 */
const CP12Form = () => {
  const [step, setStep] = useState(1);
  const totalSteps = 5;

  // Form Data
  const [formData, setFormData] = useState({
    // Step 1: Contractor Details
    contractorName: '',
    contractorAddress: '',
    contractorPhone: '',
    contractorGasSafeNo: '',
    
    // Step 2: Property & Client
    installAddress: '',
    installPostcode: '',
    clientName: '',
    clientAddress: '',
    clientPostcode: '',
    clientPhone: '',
    clientEmail: '',
    inspectionDate: new Date().toISOString().split('T')[0],
    nextInspectionDate: '',
    
    // Step 3: Appliances & Gas Supply
    appliances: [],
    emergencyControlAccessible: null,
    emergencyControlLocation: '',
    pipeworkCondition: null,
    gasTightnessTest: null,
    
    // Step 4: Safety Devices
    coAlarmTest: null,
    smokeAlarmTest: null,
    additionalComments: '',
    
    // Step 5: Declaration
    engineerName: '',
    customerName: '',
  });

  const [engineerSignature, setEngineerSignature] = useState(null);
  const [customerSignature, setCustomerSignature] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);

  // Appliance types dropdown
  const applianceTypes = [
    'Boiler - Combi',
    'Boiler - System',
    'Boiler - Regular',
    'Gas Fire - Inset',
    'Gas Fire - Outset',
    'Cooker',
    'Hob',
    'Oven',
    'Water Heater - Instantaneous',
    'Water Heater - Storage',
    'Warm Air Unit',
    'Other',
  ];

  const locations = [
    'Kitchen',
    'Utility Room',
    'Airing Cupboard',
    'Bedroom 1',
    'Bedroom 2',
    'Bedroom 3',
    'Living Room',
    'Dining Room',
    'Bathroom',
    'En-Suite',
    'Garage',
    'Loft',
    'Cellar',
    'Hallway',
    'Other',
  ];

  const manufacturers = [
    'Ideal',
    'Worcester Bosch',
    'Vaillant',
    'Baxi',
    'Glow-worm',
    'Potterton',
    'Main',
    'Viessmann',
    'Alpha',
    'Ferroli',
    'Ravenheat',
    'Ariston',
    'Intergas',
    'Keston',
    'Other',
  ];

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const createEmptyAppliance = () => ({
    id: Date.now(),
    type: '',
    location: '',
    make: '',
    model: '',
    ownedBy: 'Landlord',
    servicedRecently: null,
    flueType: '',
    inspectedTested: null,
    // CO2 Readings
    lowRatio: '',
    lowPercentage: '',
    highRatio: '',
    highPercentage: '',
    operatingPressure: '',
    heatInput: '',
    heatInputUnit: 'kW/h',
    // Safety Checks
    safetyDeviceOperation: null,
    ventilation: null,
    fluePerformance: null,
    visualConditionFlue: null,
    applianceSafe: null,
    defects: '',
    remedialAction: '',
    labelledWarningIssued: null,
  });

  const addAppliance = () => {
    setFormData(prev => ({
      ...prev,
      appliances: [...prev.appliances, createEmptyAppliance()]
    }));
  };

  const updateAppliance = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      appliances: prev.appliances.map(a => a.id === id ? { ...a, [field]: value } : a)
    }));
  };

  const removeAppliance = (id) => {
    setFormData(prev => ({
      ...prev,
      appliances: prev.appliances.filter(a => a.id !== id)
    }));
  };

  const calculateNextInspection = () => {
    const date = new Date(formData.inspectionDate);
    date.setFullYear(date.getFullYear() + 1);
    updateField('nextInspectionDate', date.toISOString().split('T')[0]);
  };

  // UI Components
  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      {[1, 2, 3, 4, 5].map((s, i) => (
        <React.Fragment key={s}>
          <button
            onClick={() => setStep(s)}
            className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm transition-all ${
              step === s 
                ? 'bg-emerald-500 text-white' 
                : step > s 
                  ? 'bg-emerald-100 text-emerald-600' 
                  : 'bg-gray-100 text-gray-400'
            }`}
          >
            {s}
          </button>
          {i < 4 && (
            <div className={`w-8 h-1 ${step > s ? 'bg-emerald-300' : 'bg-gray-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const PassFailNA = ({ value, onChange, required }) => (
    <div className="grid grid-cols-3 gap-2">
      {['Pass', 'Fail', 'N/A'].map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`py-3 rounded-lg text-sm font-medium border transition-all ${
            value === opt
              ? 'bg-emerald-500 text-white border-emerald-500'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );

  const YesNoNA = ({ value, onChange }) => (
    <div className="grid grid-cols-3 gap-2">
      {['Yes', 'No', 'N/A'].map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`py-3 rounded-lg text-sm font-medium border transition-all ${
            value === opt
              ? 'bg-emerald-500 text-white border-emerald-500'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );

  const YesNo = ({ value, onChange }) => (
    <div className="grid grid-cols-2 gap-2">
      {['Yes', 'No'].map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`py-3 rounded-lg text-sm font-medium border transition-all ${
            value === opt
              ? 'bg-emerald-500 text-white border-emerald-500'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );

  const ToggleButtons = ({ options, value, onChange }) => (
    <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`py-3 px-2 rounded-lg text-sm font-medium border transition-all ${
            value === opt
              ? 'bg-emerald-500 text-white border-emerald-500'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );

  const Dropdown = ({ value, onChange, options, placeholder }) => (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white appearance-none cursor-pointer"
      >
        <option value="">{placeholder}</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );

  const TextInput = ({ value, onChange, placeholder, type = 'text' }) => (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white"
    />
  );

  const TextArea = ({ value, onChange, placeholder, rows = 3 }) => (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white resize-none"
    />
  );

  const Label = ({ children, required }) => (
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );

  const SectionTitle = ({ children }) => (
    <h3 className="text-lg font-semibold text-emerald-600 mb-4">{children}</h3>
  );

  // Step Content
  const renderStep1 = () => (
    <div className="space-y-4">
      <SectionTitle>Contractor Details</SectionTitle>
      
      <div>
        <Label required>Business Name</Label>
        <TextInput
          value={formData.contractorName}
          onChange={(v) => updateField('contractorName', v)}
          placeholder="Enter business name"
        />
      </div>

      <div>
        <Label required>Address</Label>
        <TextInput
          value={formData.contractorAddress}
          onChange={(v) => updateField('contractorAddress', v)}
          placeholder="Enter business address"
        />
      </div>

      <div>
        <Label required>Phone</Label>
        <TextInput
          value={formData.contractorPhone}
          onChange={(v) => updateField('contractorPhone', v)}
          placeholder="Enter phone number"
          type="tel"
        />
      </div>

      <div>
        <Label required>Gas Safe Licence Number</Label>
        <TextInput
          value={formData.contractorGasSafeNo}
          onChange={(v) => updateField('contractorGasSafeNo', v)}
          placeholder="Enter Gas Safe number"
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <SectionTitle>Installation Address</SectionTitle>
      
      <div>
        <Label required>Property Address</Label>
        <TextInput
          value={formData.installAddress}
          onChange={(v) => updateField('installAddress', v)}
          placeholder="Enter property address"
        />
      </div>

      <div>
        <Label required>Postcode</Label>
        <TextInput
          value={formData.installPostcode}
          onChange={(v) => updateField('installPostcode', v)}
          placeholder="Enter postcode"
        />
      </div>

      <SectionTitle>Client/Landlord Details</SectionTitle>

      <div>
        <Label required>Client Name</Label>
        <TextInput
          value={formData.clientName}
          onChange={(v) => updateField('clientName', v)}
          placeholder="Enter client name"
        />
      </div>

      <div>
        <Label>Client Address</Label>
        <TextInput
          value={formData.clientAddress}
          onChange={(v) => updateField('clientAddress', v)}
          placeholder="Enter client address (if different)"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Postcode</Label>
          <TextInput
            value={formData.clientPostcode}
            onChange={(v) => updateField('clientPostcode', v)}
            placeholder="Postcode"
          />
        </div>
        <div>
          <Label>Phone</Label>
          <TextInput
            value={formData.clientPhone}
            onChange={(v) => updateField('clientPhone', v)}
            placeholder="Phone"
          />
        </div>
      </div>

      <div>
        <Label required>Email</Label>
        <TextInput
          value={formData.clientEmail}
          onChange={(v) => updateField('clientEmail', v)}
          placeholder="Enter email for certificate"
          type="email"
        />
      </div>

      <SectionTitle>Inspection Dates</SectionTitle>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label required>Date of Inspection</Label>
          <TextInput
            value={formData.inspectionDate}
            onChange={(v) => updateField('inspectionDate', v)}
            type="date"
          />
        </div>
        <div>
          <Label required>Next Due</Label>
          <div className="flex gap-2">
            <TextInput
              value={formData.nextInspectionDate}
              onChange={(v) => updateField('nextInspectionDate', v)}
              type="date"
            />
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={calculateNextInspection}
        className="w-full py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium"
      >
        + Set to 1 Year from Inspection
      </button>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <SectionTitle>Gas Supply and Pipe Work</SectionTitle>

      <div className="bg-gray-50 rounded-xl p-4 space-y-4">
        <div>
          <Label required>Emergency control accessible and operable</Label>
          <YesNo
            value={formData.emergencyControlAccessible}
            onChange={(v) => updateField('emergencyControlAccessible', v)}
          />
        </div>

        {formData.emergencyControlAccessible === 'Yes' && (
          <div>
            <Label>Location</Label>
            <Dropdown
              value={formData.emergencyControlLocation}
              onChange={(v) => updateField('emergencyControlLocation', v)}
              options={['Meter box', 'Under stairs', 'Kitchen', 'Utility', 'External', 'Other']}
              placeholder="Select location"
            />
          </div>
        )}

        <div>
          <Label required>Visual condition of pipework</Label>
          <PassFailNA
            value={formData.pipeworkCondition}
            onChange={(v) => updateField('pipeworkCondition', v)}
          />
        </div>

        <div>
          <Label required>Gas tightness test</Label>
          <PassFailNA
            value={formData.gasTightnessTest}
            onChange={(v) => updateField('gasTightnessTest', v)}
          />
        </div>
      </div>

      <SectionTitle>Appliances</SectionTitle>
      <p className="text-sm text-gray-500 mb-3">Add up to four appliances, for additional appliances please add additional pages.</p>

      {formData.appliances.map((app, idx) => (
        <div key={app.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
          <div className="bg-emerald-50 px-4 py-3 flex justify-between items-center">
            <span className="font-medium text-emerald-700">Appliance {idx + 1}</span>
            <button
              type="button"
              onClick={() => removeAppliance(app.id)}
              className="text-red-500 text-sm"
            >
              Remove
            </button>
          </div>
          
          <div className="p-4 space-y-4">
            <div>
              <Label required>Appliance type</Label>
              <Dropdown
                value={app.type}
                onChange={(v) => updateAppliance(app.id, 'type', v)}
                options={applianceTypes}
                placeholder="Please select appliance type"
              />
            </div>

            <div>
              <Label required>Location</Label>
              <Dropdown
                value={app.location}
                onChange={(v) => updateAppliance(app.id, 'location', v)}
                options={locations}
                placeholder="Select location"
              />
            </div>

            <div>
              <Label required>Make</Label>
              <Dropdown
                value={app.make}
                onChange={(v) => updateAppliance(app.id, 'make', v)}
                options={manufacturers}
                placeholder="Select manufacturer"
              />
            </div>

            <div>
              <Label required>Model</Label>
              <TextInput
                value={app.model}
                onChange={(v) => updateAppliance(app.id, 'model', v)}
                placeholder="Enter model"
              />
            </div>

            <div>
              <Label required>Owned by</Label>
              <ToggleButtons
                options={['Landlord', 'Tenant']}
                value={app.ownedBy}
                onChange={(v) => updateAppliance(app.id, 'ownedBy', v)}
              />
            </div>

            <div>
              <Label>Appliance serviced?</Label>
              <YesNoNA
                value={app.servicedRecently}
                onChange={(v) => updateAppliance(app.id, 'servicedRecently', v)}
              />
            </div>

            <div>
              <Label required>Flue type</Label>
              <ToggleButtons
                options={['Room sealed (RS)', 'Flueless (FL)', 'Open Flued (OF)']}
                value={app.flueType}
                onChange={(v) => updateAppliance(app.id, 'flueType', v)}
              />
            </div>

            <div>
              <Label required>Inspected and tested</Label>
              <YesNo
                value={app.inspectedTested}
                onChange={(v) => updateAppliance(app.id, 'inspectedTested', v)}
              />
            </div>

            {/* Combustion Readings */}
            <div className="border-t pt-4">
              <h4 className="text-emerald-600 font-medium mb-3">Combustion Analyser CO2 Reading</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Low Ratio</Label>
                  <TextInput
                    value={app.lowRatio}
                    onChange={(v) => updateAppliance(app.id, 'lowRatio', v)}
                    placeholder="N/A"
                  />
                </div>
                <div>
                  <Label>High Ratio</Label>
                  <TextInput
                    value={app.highRatio}
                    onChange={(v) => updateAppliance(app.id, 'highRatio', v)}
                    placeholder="N/A"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <Label>Operating pressure (mb)</Label>
                  <TextInput
                    value={app.operatingPressure}
                    onChange={(v) => updateAppliance(app.id, 'operatingPressure', v)}
                    placeholder="Enter pressure"
                  />
                </div>
                <div>
                  <Label>Heat input</Label>
                  <TextInput
                    value={app.heatInput}
                    onChange={(v) => updateAppliance(app.id, 'heatInput', v)}
                    placeholder="Enter value"
                  />
                </div>
              </div>

              <div className="mt-3">
                <Label required>Unit of measure of heat input</Label>
                <ToggleButtons
                  options={['kW/h', 'Btu/h']}
                  value={app.heatInputUnit}
                  onChange={(v) => updateAppliance(app.id, 'heatInputUnit', v)}
                />
              </div>
            </div>

            {/* Safety Checks */}
            <div className="border-t pt-4 space-y-3">
              <div>
                <Label required>Safety device operation</Label>
                <PassFailNA
                  value={app.safetyDeviceOperation}
                  onChange={(v) => updateAppliance(app.id, 'safetyDeviceOperation', v)}
                />
              </div>

              <div>
                <Label required>Ventilation</Label>
                <PassFailNA
                  value={app.ventilation}
                  onChange={(v) => updateAppliance(app.id, 'ventilation', v)}
                />
              </div>

              <div>
                <Label required>Flue performance</Label>
                <PassFailNA
                  value={app.fluePerformance}
                  onChange={(v) => updateAppliance(app.id, 'fluePerformance', v)}
                />
              </div>

              <div>
                <Label required>Visual Condition of Flue</Label>
                <PassFailNA
                  value={app.visualConditionFlue}
                  onChange={(v) => updateAppliance(app.id, 'visualConditionFlue', v)}
                />
              </div>

              <div>
                <Label required>Appliance Safe</Label>
                <PassFailNA
                  value={app.applianceSafe}
                  onChange={(v) => updateAppliance(app.id, 'applianceSafe', v)}
                />
              </div>

              <div>
                <Label>Details of any defects identified</Label>
                <TextArea
                  value={app.defects}
                  onChange={(v) => updateAppliance(app.id, 'defects', v)}
                  placeholder="None"
                />
              </div>

              <div>
                <Label>Remedial action taken</Label>
                <TextArea
                  value={app.remedialAction}
                  onChange={(v) => updateAppliance(app.id, 'remedialAction', v)}
                  placeholder="None"
                />
              </div>

              <div>
                <Label required>Labelled and warning notice issued</Label>
                <YesNo
                  value={app.labelledWarningIssued}
                  onChange={(v) => updateAppliance(app.id, 'labelledWarningIssued', v)}
                />
              </div>
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addAppliance}
        disabled={formData.appliances.length >= 4}
        className="w-full py-3 bg-emerald-500 text-white rounded-lg font-medium disabled:opacity-50"
      >
        + Add New
      </button>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <SectionTitle>Safety Devices</SectionTitle>

      <div className="bg-gray-50 rounded-xl p-4 space-y-4">
        <div>
          <Label>CO Alarm Test</Label>
          <PassFailNA
            value={formData.coAlarmTest}
            onChange={(v) => updateField('coAlarmTest', v)}
          />
        </div>

        <div>
          <Label>Smoke Alarm Test</Label>
          <PassFailNA
            value={formData.smokeAlarmTest}
            onChange={(v) => updateField('smokeAlarmTest', v)}
          />
        </div>
      </div>

      <SectionTitle>Additional comments / Work</SectionTitle>
      <TextArea
        value={formData.additionalComments}
        onChange={(v) => updateField('additionalComments', v)}
        placeholder="Enter any additional comments or work carried out"
        rows={4}
      />
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-4">
      <SectionTitle>Declaration</SectionTitle>

      <div>
        <Label required>Engineer name</Label>
        <TextInput
          value={formData.engineerName}
          onChange={(v) => updateField('engineerName', v)}
          placeholder="Enter your name"
        />
      </div>

      <div>
        <Label required>Customer name</Label>
        <TextInput
          value={formData.customerName}
          onChange={(v) => updateField('customerName', v)}
          placeholder="Enter customer name"
        />
      </div>

      <SectionTitle>Engineer signature</SectionTitle>
      <SignaturePad
        label=""
        onSignatureChange={setEngineerSignature}
      />

      <SectionTitle>Received by</SectionTitle>
      <SignaturePad
        label=""
        onSignatureChange={setCustomerSignature}
      />
    </div>
  );

  // Preview - Official Gas Safe format
  const Preview = () => (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[95vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex justify-between items-center z-10">
          <h2 className="font-bold">CP12 Preview</h2>
          <button onClick={() => setShowPreview(false)} className="text-gray-500 text-2xl">&times;</button>
        </div>
        
        <div className="p-3">
          {/* Official Gas Safe Record Layout */}
          <div className="border-2 border-gray-300 text-xs">
            {/* Header */}
            <div className="flex border-b-2 border-gray-300">
              <div className="flex-1 p-2 text-[10px] text-gray-500 border-r border-gray-300">
                Registered Gas/mobile/Engineer details can be checked by www.gassaferegister.co.uk or calling 0800 408 5577
              </div>
              <div className="p-2 text-right">
                <div className="bg-yellow-400 text-black px-2 py-1 inline-block font-bold text-sm">
                  Landlord Gas Safety Record
                </div>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="bg-yellow-400 text-black px-1 text-[10px] font-bold">Gas Safe</span>
                </div>
              </div>
            </div>

            {/* Info Row */}
            <div className="flex border-b border-gray-300 text-[10px]">
              <div className="flex-1 p-1 border-r border-gray-300">
                <span className="text-gray-500">Record issued for: </span>
                <span className="font-medium">GAS04CHECK</span>
              </div>
              <div className="p-1 border-r border-gray-300">
                <span className="text-gray-500">Date: </span>
                <span className="font-medium">{formData.inspectionDate}</span>
              </div>
              <div className="p-1">
                <span className="text-gray-500">Next inspection date: </span>
                <span className="font-medium">{formData.nextInspectionDate}</span>
              </div>
            </div>

            {/* Addresses Row */}
            <div className="flex border-b border-gray-300">
              <div className="flex-1 p-2 border-r border-gray-300">
                <div className="bg-yellow-100 text-[10px] font-bold px-1 mb-1">Contractor Details</div>
                <div className="text-[10px]">
                  <div>{formData.contractorName}</div>
                  <div>{formData.contractorAddress}</div>
                  <div>Phone: {formData.contractorPhone}</div>
                  <div>Gas Safe Licence Number: {formData.contractorGasSafeNo}</div>
                </div>
              </div>
              <div className="flex-1 p-2 border-r border-gray-300">
                <div className="bg-yellow-100 text-[10px] font-bold px-1 mb-1">Installation Address</div>
                <div className="text-[10px]">
                  <div>{formData.installAddress}</div>
                  <div>{formData.installPostcode}</div>
                </div>
              </div>
              <div className="flex-1 p-2">
                <div className="bg-yellow-100 text-[10px] font-bold px-1 mb-1">Client Address</div>
                <div className="text-[10px]">
                  <div>{formData.clientName}</div>
                  <div>{formData.clientAddress}</div>
                  <div>{formData.clientPostcode}</div>
                </div>
              </div>
            </div>

            {/* Appliances Table Header */}
            <div className="bg-gray-100 border-b border-gray-300">
              <div className="text-[10px] font-bold p-1">Appliances</div>
            </div>

            {/* Appliances Table */}
            <table className="w-full text-[9px] border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 p-1 text-left">#</th>
                  <th className="border border-gray-300 p-1 text-left">Location</th>
                  <th className="border border-gray-300 p-1 text-left">Type</th>
                  <th className="border border-gray-300 p-1 text-left">Make</th>
                  <th className="border border-gray-300 p-1 text-left">Model</th>
                  <th className="border border-gray-300 p-1 text-center">Flue</th>
                  <th className="border border-gray-300 p-1 text-center">Op Press</th>
                  <th className="border border-gray-300 p-1 text-center">Safe</th>
                </tr>
              </thead>
              <tbody>
                {formData.appliances.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="border border-gray-300 p-2 text-center text-gray-400">
                      No appliances added
                    </td>
                  </tr>
                ) : (
                  formData.appliances.map((app, i) => (
                    <tr key={app.id}>
                      <td className="border border-gray-300 p-1">{i + 1}</td>
                      <td className="border border-gray-300 p-1">{app.location}</td>
                      <td className="border border-gray-300 p-1">{app.type}</td>
                      <td className="border border-gray-300 p-1">{app.make}</td>
                      <td className="border border-gray-300 p-1">{app.model}</td>
                      <td className="border border-gray-300 p-1 text-center">{app.flueType?.split(' ')[0]}</td>
                      <td className="border border-gray-300 p-1 text-center">{app.operatingPressure || '-'}</td>
                      <td className={`border border-gray-300 p-1 text-center font-bold ${
                        app.applianceSafe === 'Pass' ? 'text-green-600' : 
                        app.applianceSafe === 'Fail' ? 'text-red-600' : ''
                      }`}>
                        {app.applianceSafe === 'Pass' ? '✓' : app.applianceSafe === 'Fail' ? '✗' : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Appliance Results */}
            {formData.appliances.length > 0 && (
              <>
                <div className="bg-gray-100 border-y border-gray-300">
                  <div className="text-[10px] font-bold p-1">Appliance Results</div>
                </div>
                <table className="w-full text-[9px] border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 p-1">#</th>
                      <th className="border border-gray-300 p-1">Visual</th>
                      <th className="border border-gray-300 p-1">Safety Dev</th>
                      <th className="border border-gray-300 p-1">Vent</th>
                      <th className="border border-gray-300 p-1">Flue Cond</th>
                      <th className="border border-gray-300 p-1">Flue Perf</th>
                      <th className="border border-gray-300 p-1">Safe</th>
                      <th className="border border-gray-300 p-1">Defects</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.appliances.map((app, i) => (
                      <tr key={app.id}>
                        <td className="border border-gray-300 p-1 text-center">{i + 1}</td>
                        <td className="border border-gray-300 p-1 text-center">{app.visualConditionFlue === 'Pass' ? '✓' : app.visualConditionFlue === 'Fail' ? '✗' : '-'}</td>
                        <td className="border border-gray-300 p-1 text-center">{app.safetyDeviceOperation === 'Pass' ? '✓' : app.safetyDeviceOperation === 'Fail' ? '✗' : '-'}</td>
                        <td className="border border-gray-300 p-1 text-center">{app.ventilation === 'Pass' ? '✓' : app.ventilation === 'Fail' ? '✗' : '-'}</td>
                        <td className="border border-gray-300 p-1 text-center">{app.visualConditionFlue === 'Pass' ? '✓' : app.visualConditionFlue === 'Fail' ? '✗' : '-'}</td>
                        <td className="border border-gray-300 p-1 text-center">{app.fluePerformance === 'Pass' ? '✓' : app.fluePerformance === 'Fail' ? '✗' : '-'}</td>
                        <td className={`border border-gray-300 p-1 text-center font-bold ${
                          app.applianceSafe === 'Pass' ? 'text-green-600' : 
                          app.applianceSafe === 'Fail' ? 'text-red-600' : ''
                        }`}>
                          {app.applianceSafe === 'Pass' ? '✓ Yes' : app.applianceSafe === 'Fail' ? '✗ No' : '-'}
                        </td>
                        <td className="border border-gray-300 p-1 text-red-600">{app.defects || 'None'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {/* Gas Supply & Safety */}
            <div className="flex border-t border-gray-300">
              <div className="flex-1 p-2 border-r border-gray-300">
                <div className="bg-yellow-100 text-[10px] font-bold px-1 mb-1">Gas Supply and Pipe Work</div>
                <div className="text-[10px] space-y-1">
                  <div className="flex justify-between">
                    <span>Emergency control accessible:</span>
                    <span className="font-medium">{formData.emergencyControlAccessible || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pipework condition:</span>
                    <span className="font-medium">{formData.pipeworkCondition || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gas tightness:</span>
                    <span className="font-medium">{formData.gasTightnessTest || '-'}</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 p-2">
                <div className="bg-yellow-100 text-[10px] font-bold px-1 mb-1">Safety Devices</div>
                <div className="text-[10px] space-y-1">
                  <div className="flex justify-between">
                    <span>CO Alarm:</span>
                    <span className="font-medium">{formData.coAlarmTest || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Smoke Alarm:</span>
                    <span className="font-medium">{formData.smokeAlarmTest || '-'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Signatures */}
            <div className="flex border-t-2 border-gray-300">
              <div className="flex-1 p-2 border-r border-gray-300">
                <div className="text-[10px] mb-1">
                  <span className="text-gray-500">Engineer: </span>
                  <span className="font-medium">{formData.engineerName}</span>
                </div>
                {engineerSignature ? (
                  <img src={engineerSignature} alt="Engineer signature" className="h-10" />
                ) : (
                  <div className="h-10 border-b border-gray-400" />
                )}
              </div>
              <div className="flex-1 p-2">
                <div className="text-[10px] mb-1">
                  <span className="text-gray-500">Received by: </span>
                  <span className="font-medium">{formData.customerName}</span>
                </div>
                {customerSignature ? (
                  <img src={customerSignature} alt="Customer signature" className="h-10" />
                ) : (
                  <div className="h-10 border-b border-gray-400" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-white border-t p-3 flex gap-2">
          <button
            onClick={() => setShowPreview(false)}
            className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg"
          >
            Edit
          </button>
          <button
            onClick={handleEmail}
            className="flex-1 py-3 bg-emerald-500 text-white font-medium rounded-lg"
          >
            📧 Email Certificate
          </button>
        </div>
      </div>
    </div>
  );

  const handleEmail = () => {
    if (!formData.clientEmail) {
      alert('Please enter client email');
      return;
    }
    setSending(true);
    const subject = `CP12 Gas Safety Record - ${formData.installAddress}`;
    const body = `Landlord Gas Safety Record\n\nProperty: ${formData.installAddress}\nDate: ${formData.inspectionDate}\nNext Due: ${formData.nextInspectionDate}\n\nContractor: ${formData.contractorName}\nGas Safe: ${formData.contractorGasSafeNo}\n\nAppliances: ${formData.appliances.length}\n\nThis is a summary. Full certificate attached.`;
    window.location.href = `mailto:${formData.clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setTimeout(() => setSending(false), 1000);
  };

  return (
    <div className="max-w-lg mx-auto bg-gray-50 min-h-screen">
      {showPreview && <Preview />}

      {/* Header */}
      <div className="bg-slate-700 text-white px-4 py-4">
        <div className="flex items-center justify-between">
          <button onClick={() => step > 1 && setStep(step - 1)} className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
            <span className="text-xl">←</span>
          </button>
          <h1 className="text-lg font-medium">CP12 Gas Safety</h1>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowPreview(true)}
              className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center"
            >
              👁️
            </button>
            <button 
              onClick={() => step < 5 && setStep(step + 1)}
              className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center"
            >
              <span className="text-xl">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="bg-white px-4 py-3">
        <StepIndicator />
      </div>

      {/* Content */}
      <div className="p-4">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 max-w-lg mx-auto">
        <div className="flex gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg"
            >
              Previous
            </button>
          )}
          {step < 5 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex-1 py-3 bg-emerald-500 text-white font-medium rounded-lg"
            >
              Next
            </button>
          ) : (
            <button
              onClick={() => setShowPreview(true)}
              className="flex-1 py-3 bg-emerald-500 text-white font-medium rounded-lg"
            >
              Preview & Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CP12Form;
