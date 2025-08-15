import React from 'react';
import { formatNumber, calculateRadiatorSize } from './calc';

/**
 * Results Display Component
 * Shows calculation results with radiator size recommendations for standard wet systems
 * Mobile-friendly simplified design focused on standard wet system radiators (e.g., Stelrad)
 */
const ResultsDisplay = ({ result, unit }) => {
  if (!result) return null;
  
  const { btu, kilowatts, breakdown } = result;
  
  // Get radiator recommendations based on BTU requirement
  const radiatorRecommendation = calculateRadiatorSize(btu);
  
  return (
    <div className="bg-white rounded-lg p-4 shadow-md">
      <h3 className="text-lg font-bold mb-3 text-center text-gray-900">
        Room Heating Requirements
      </h3>
      
      {/* Main BTU and kW Result */}
      <div className="flex flex-col items-center mb-4 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <div className="text-sm font-medium mb-1 text-gray-800">Required Heating</div>
        <div className="text-3xl font-bold text-gray-900 mb-1">{formatNumber(btu)} BTU</div>
        <div className="text-base font-medium text-gray-700 mb-2">({kilowatts.toFixed(2)} kW)</div>
        <div className="text-xs text-gray-500">Based on a room of {result.cubicMeters?.toFixed(2) || '0'} m³</div>
      </div>

      {/* Standard Radiator Recommendations */}
      <h4 className="font-bold text-gray-800 mb-2">Recommended Radiators (Stelrad or similar)</h4>
      
      {radiatorRecommendation.recommendations.map((recGroup, groupIndex) => (
        <div key={groupIndex} className="mb-4 border border-gray-200 rounded-lg">
          <div className="bg-gray-100 px-3 py-2 border-b border-gray-200 rounded-t-lg">
            <h5 className="font-medium text-gray-800">{recGroup.title}</h5>
          </div>
          
          <div className="p-3">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-xs uppercase bg-gray-50">
                  <tr>
                    <th className="px-2 py-1">Qty</th>
                    <th className="px-2 py-1">Size (H×W)</th>
                    <th className="px-2 py-1">BTU Each</th>
                    <th className="px-2 py-1">BTU Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recGroup.radiators.map((rad, radIndex) => (
                    <tr key={radIndex} className="border-b">
                      <td className="px-2 py-2 font-bold text-gray-900">{rad.quantity}</td>
                      <td className="px-2 py-2 text-gray-900">{rad.height}×{rad.width}mm</td>
                      <td className="px-2 py-2 text-gray-600">{formatNumber(rad.btuEach)}</td>
                      <td className="px-2 py-2 text-gray-900 font-medium">{formatNumber(rad.btuTotal)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50">
                    <td colSpan="3" className="px-2 py-2 text-right font-medium">Total BTU:</td>
                    <td className="px-2 py-2 font-bold text-gray-900">{formatNumber(recGroup.totalBtu)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="text-xs text-gray-500 mt-2 px-2">
              {recGroup.totalBtu >= btu ? 
                "✓ These radiators will adequately heat this room" : 
                "⚠️ These radiators fall short of the required BTU - consider adding more radiators or using taller/wider ones"}
            </div>
          </div>
        </div>
      ))}
      
      {/* Optional calculation breakdown if available */}
      {breakdown && (
        <div className="mb-4 border border-gray-200 rounded-lg">
          <div className="bg-gray-100 px-3 py-2 border-b border-gray-200 rounded-t-lg">
            <h5 className="font-medium text-gray-800 flex items-center">
              <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Calculation Details
            </h5>
          </div>
          <div className="p-3">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <tbody>
                  {breakdown.insulationAdjustment !== 0 && (
                    <tr className="border-b">
                      <td className="px-2 py-1.5 text-gray-900">Insulation adjustment</td>
                      <td className={`px-2 py-1.5 text-right ${breakdown.insulationAdjustment > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {breakdown.insulationAdjustment > 0 ? '+' : ''}{formatNumber(breakdown.insulationAdjustment)} BTU
                      </td>
                    </tr>
                  )}
                  
                  {breakdown.climateAdjustment !== 0 && (
                    <tr className="border-b">
                      <td className="px-2 py-1.5 text-gray-900">Climate zone adjustment</td>
                      <td className={`px-2 py-1.5 text-right ${breakdown.climateAdjustment > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {breakdown.climateAdjustment > 0 ? '+' : ''}{formatNumber(breakdown.climateAdjustment)} BTU
                      </td>
                    </tr>
                  )}
                  
                  {breakdown.exteriorWallsAdjustment !== 0 && (
                    <tr className="border-b">
                      <td className="px-2 py-1.5 text-gray-900">Exterior walls adjustment</td>
                      <td className={`px-2 py-1.5 text-right ${breakdown.exteriorWallsAdjustment > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {breakdown.exteriorWallsAdjustment > 0 ? '+' : ''}{formatNumber(breakdown.exteriorWallsAdjustment)} BTU
                      </td>
                    </tr>
                  )}
                  
                  {breakdown.windowAdjustment !== 0 && (
                    <tr className="border-b">
                      <td className="px-2 py-1.5 text-gray-900">Window heat loss</td>
                      <td className={`px-2 py-1.5 text-right ${breakdown.windowAdjustment > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {breakdown.windowAdjustment > 0 ? '+' : ''}{formatNumber(breakdown.windowAdjustment)} BTU
                      </td>
                    </tr>
                  )}
                  
                  {breakdown.doorAdjustment !== 0 && (
                    <tr className="border-b">
                      <td className="px-2 py-1.5 text-gray-900">Door heat loss</td>
                      <td className={`px-2 py-1.5 text-right ${breakdown.doorAdjustment > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {breakdown.doorAdjustment > 0 ? '+' : ''}{formatNumber(breakdown.doorAdjustment)} BTU
                      </td>
                    </tr>
                  )}
                  
                  {breakdown.patioDoorAdjustment !== 0 && (
                    <tr className="border-b">
                      <td className="px-2 py-1.5 text-gray-900">Patio door heat loss</td>
                      <td className={`px-2 py-1.5 text-right ${breakdown.patioDoorAdjustment > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {breakdown.patioDoorAdjustment > 0 ? '+' : ''}{formatNumber(breakdown.patioDoorAdjustment)} BTU
                      </td>
                    </tr>
                  )}
                  
                  <tr className="bg-blue-50">
                    <td className="px-2 py-2 font-bold text-gray-900">Total BTU Required</td>
                    <td className="px-2 py-2 font-bold text-right text-blue-900">{formatNumber(btu)} BTU</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-blue-50 rounded-lg p-3 mb-4 text-sm">
        <div className="font-medium text-blue-800 mb-1">Installation Notes:</div>
        <ul className="list-disc list-inside text-blue-700 space-y-1 text-sm">
          <li>Standard radiator values based on a Delta T of 50°C</li>
          <li>For best heat distribution, position radiators under windows where possible</li>
          <li>TRVs (Thermostatic Radiator Valves) are recommended for temperature control</li>
        </ul>
      </div>
      
      <div className="flex justify-center mt-4">
        <button 
          className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-6 rounded-full shadow-md"
          onClick={() => window.print()}
        >
          Save these results
        </button>
      </div>
    </div>
  );
};

export default ResultsDisplay;
