import React from 'react';
import PropTypes from 'prop-types';

/**
 * ResultCard Component
 * Displays the results of gas rate calculations
 * 
 * @component
 */
const ResultCard = ({ result, gasTypeName, onShare, className = '' }) => {
  if (!result) return null;
  
  return (
    <div className={`bg-gray-50 p-6 rounded-lg ${className}`}>
      <h3 className="text-lg font-semibold mb-4">Results</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded shadow-sm">
          <div className="text-sm text-gray-500">Gross Heat Input</div>
          <div className="text-xl font-semibold">{result.grossKW} kW</div>
        </div>
        <div className="bg-white p-4 rounded shadow-sm">
          <div className="text-sm text-gray-500">Net Heat Input</div>
          <div className="text-xl font-semibold">{result.netKW} kW</div>
        </div>
        <div className="bg-white p-4 rounded shadow-sm">
          <div className="text-sm text-gray-500">BTU per Hour</div>
          <div className="text-xl font-semibold">{result.btuPerHour}</div>
        </div>
        <div className="bg-white p-4 rounded shadow-sm">
          <div className="text-sm text-gray-500">Gas Flow Rate</div>
          <div className="text-xl font-semibold">{result.cubicMetersPerHour} m³/h</div>
        </div>
      </div>
      
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Gas Type: <span className="font-medium">{gasTypeName}</span>
        </div>
        <button
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md flex items-center"
          onClick={onShare}
        >
          <span className="mr-2">Share</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5zm-8.5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm11 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />
          </svg>
        </button>
      </div>
      
      <div className="mt-4 text-xs text-gray-500 bg-gray-100 p-2 rounded">
        <p>Net kW is ~90% of gross kW to account for latent heat loss in flue gases.</p>
      </div>
    </div>
  );
};

ResultCard.propTypes = {
  result: PropTypes.shape({
    grossKW: PropTypes.string.isRequired,
    netKW: PropTypes.string.isRequired,
    btuPerHour: PropTypes.string.isRequired,
    cubicMetersPerHour: PropTypes.string.isRequired
  }),
  gasTypeName: PropTypes.string.isRequired,
  onShare: PropTypes.func.isRequired,
  className: PropTypes.string
};

export default ResultCard;
