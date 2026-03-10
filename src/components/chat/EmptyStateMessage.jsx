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
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 mb-4 shadow-sm">
        <img src="/brain-icon-nBG.png" alt="BoilerBrain" className="w-10 h-10 drop-shadow-md" 
          onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span style="font-size:2rem">🧠</span>'; }} />
      </div>
      
      <h3 className="text-lg font-bold text-gray-800 mb-1">BoilerBrain Diagnostics</h3>
      <p className="text-sm text-gray-500 mb-5 max-w-sm">
        Your AI diagnostic partner. Like having a master engineer on call 24/7.
      </p>
      
      <div className="bg-white rounded-xl border border-gray-100 p-4 w-full max-w-sm shadow-sm">
        <h4 className="font-semibold text-gray-700 mb-3 text-sm">Tell me what you're working on:</h4>
        <div className="text-sm text-left space-y-2.5">
          <div className="flex items-start gap-2.5">
            <span className="bg-blue-600 text-white rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">1</span>
            <span className="text-gray-700"><span className="font-semibold text-gray-800">Make & model</span> — e.g. Worcester Greenstar 30i</span>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="bg-blue-600 text-white rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">2</span>
            <span className="text-gray-700"><span className="font-semibold text-gray-800">Type</span> — combi, system, or heat-only</span>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="bg-blue-600 text-white rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">3</span>
            <span className="text-gray-700"><span className="font-semibold text-gray-800">Fault code or symptom</span> — F.28, no hot water, etc.</span>
          </div>
        </div>
      </div>
      
      <p className="text-xs text-gray-400 mt-5 italic">
        "Vaillant ecoTEC Plus 832 combi, showing F.28"
      </p>
    </div>
  );
};

export default EmptyStateMessage;
