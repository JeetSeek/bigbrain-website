import React from 'react';

/**
 * Empty state component for chat with professional guidance
 * 
 * @component
 * @returns {React.ReactElement} Empty state UI with helpful instructions
 */
const EmptyStateMessage = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-5 text-center">
      <div className="bg-blue-50 rounded-full p-3 mb-4">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L4 6V18L12 22L20 18V6L12 2Z" fill="#0057b7" />
          <path d="M12 6L7 8.5V15.5L12 18L17 15.5V8.5L12 6Z" fill="white" />
          <path d="M10 11C10 10.4477 10.4477 10 11 10H13C13.5523 10 14 10.4477 14 11V14C14 14.5523 13.5523 15 13 15H11C10.4477 15 10 14.5523 10 14V11Z" fill="#0057b7" />
        </svg>
      </div>
      
      <h3 className="text-lg font-bold text-gray-800 mb-2">Gas Safe Diagnostic Assistant</h3>
      <p className="text-sm text-gray-600 mb-6 max-w-md">
        I'm designed to help Gas Safe engineers diagnose and troubleshoot boiler faults efficiently.
      </p>
      
      <div className="bg-white rounded-lg border border-gray-200 p-4 w-full max-w-md shadow-sm">
        <h4 className="font-semibold text-gray-700 mb-2 text-sm">For best results, please provide:</h4>
        <ul className="text-sm text-left space-y-2">
          <li className="flex items-start">
            <span className="bg-blue-100 text-blue-700 rounded-full h-5 w-5 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">1</span>
            <span className="text-gray-800 font-medium">Heating system type (combi/system/heat-only/back boiler)</span>
          </li>
          <li className="flex items-start">
            <span className="bg-blue-100 text-blue-700 rounded-full h-5 w-5 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">2</span>
            <span className="text-gray-800 font-medium">Make and model of the boiler (with GC number if available)</span>
          </li>
          <li className="flex items-start">
            <span className="bg-blue-100 text-blue-700 rounded-full h-5 w-5 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">3</span>
            <span className="text-gray-800 font-medium">Any fault codes or flashing light patterns you're seeing</span>
          </li>
        </ul>
      </div>
      
      <div className="text-xs text-gray-500 mt-6">
        Professional diagnostic tool for Gas Safe registered engineers
      </div>
    </div>
  );
};

export default EmptyStateMessage;
