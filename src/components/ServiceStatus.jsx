import React from 'react';

/**
 * ServiceStatus Component
 * Displays the current service status information
 *
 * @component
 * @param {Object} props - Component props
 * @param {string} props.serviceStatus - Current service status
 * @returns {React.ReactElement} Service status display element
 */
export function ServiceStatus({ serviceStatus }) {
  if (!serviceStatus) return <div>Loading service status...</div>;
  const status = serviceStatus;
  return (
    <div className="bg-white/10 rounded-xl shadow p-6 border border-ai-blue/30">
      <h2 className="text-2xl font-futuristic font-bold mb-4 text-ai-blue">Service Status</h2>
      <div className="text-lg font-mono text-white/90">{status}</div>
    </div>
  );
}

// Default export for backward compatibility
export default ServiceStatus;
