import React, { useState } from 'react';

/**
 * KnowledgeManagement Component
 * Admin interface for managing knowledge base content
 */
const KnowledgeManagement = () => {
  const [activeTab, setActiveTab] = useState('manuals');
  const [searchTerm, setSearchTerm] = useState('');

  const mockManuals = [
    { id: 1, name: 'Ideal Logic Combi 24', manufacturer: 'Ideal', status: 'active' },
    { id: 2, name: 'Worcester Greenstar 25i', manufacturer: 'Worcester', status: 'active' },
    { id: 3, name: 'Vaillant EcoTEC Plus', manufacturer: 'Vaillant', status: 'pending' }
  ];

  const mockFaultCodes = [
    { id: 1, code: 'F22', manufacturer: 'Ideal', description: 'Low water pressure', status: 'active' },
    { id: 2, code: 'E9', manufacturer: 'Worcester', description: 'Ignition failure', status: 'active' },
    { id: 3, code: 'F75', manufacturer: 'Vaillant', description: 'Pump fault', status: 'active' }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'inactive': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const renderManuals = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Boiler Manuals</h3>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Add Manual
        </button>
      </div>
      <div className="grid gap-4">
        {mockManuals.map((manual) => (
          <div key={manual.id} className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-medium">{manual.name}</h4>
                <p className="text-sm text-gray-600">{manual.manufacturer}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(manual.status)}`}>
                {manual.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderFaultCodes = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Fault Codes</h3>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Add Fault Code
        </button>
      </div>
      <div className="grid gap-4">
        {mockFaultCodes.map((fault) => (
          <div key={fault.id} className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-medium">{fault.code} - {fault.manufacturer}</h4>
                <p className="text-sm text-gray-600">{fault.description}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(fault.status)}`}>
                {fault.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Knowledge Management</h2>
      
      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search knowledge base..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('manuals')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'manuals'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Manuals
        </button>
        <button
          onClick={() => setActiveTab('faultcodes')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'faultcodes'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Fault Codes
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'analytics'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Analytics
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-gray-50 rounded-lg p-6">
        {activeTab === 'manuals' && renderManuals()}
        {activeTab === 'faultcodes' && renderFaultCodes()}
        {activeTab === 'analytics' && (
          <div className="text-center py-8 text-gray-500">
            <p>Analytics dashboard coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeManagement;
