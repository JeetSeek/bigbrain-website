import React from 'react';

/**
 * ServiceStatus Component
 * Displays the current status of various services
 */
const ServiceStatus = () => {
  const services = [
    { name: 'API Server', status: 'online', uptime: '99.9%' },
    { name: 'Database', status: 'online', uptime: '99.8%' },
    { name: 'Chat Service', status: 'online', uptime: '99.7%' },
    { name: 'Manual Search', status: 'online', uptime: '99.9%' }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'text-green-600 bg-green-100';
      case 'offline': return 'text-red-600 bg-red-100';
      case 'maintenance': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Service Status</h2>
      
      <div className="grid gap-4 md:grid-cols-2">
        {services.map((service, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6 border">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-800">{service.name}</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(service.status)}`}>
                {service.status.toUpperCase()}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              <p>Uptime: {service.uptime}</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">System Health</h3>
        <p className="text-blue-700">All systems operational. No known issues at this time.</p>
      </div>
    </div>
  );
};

export default ServiceStatus;
