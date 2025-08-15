import React from 'react';

/**
 * PaymentHistory Component
 * Displays a table of the user's payment transactions
 *
 * @component
 * @param {Object} props - Component props
 * @param {Array<Object>} props.history - List of payment transactions
 * @param {string} props.history[].date - Payment date
 * @param {number} props.history[].amount - Payment amount
 * @param {string} props.history[].status - Payment status
 * @returns {React.ReactElement} Payment history table
 */
export function PaymentHistory({ history }) {
  return (
    <div className="bg-white/10 rounded-xl shadow p-6 mt-6 border border-ai-blue/30">
      <h2 className="text-2xl font-futuristic font-bold mb-4 text-ai-blue">Payment History</h2>
      {history.length === 0 ? (
        <div className="text-white/70">No payment history available.</div>
      ) : (
        <table className="min-w-full text-white/90">
          <thead>
            <tr>
              <th className="text-left py-2">Date</th>
              <th className="text-left py-2">Amount</th>
              <th className="text-left py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {history.map((p, i) => (
              <tr key={i} className="border-t border-ai-blue/20">
                <td className="py-2">{p.date}</td>
                <td className="py-2">${p.amount}</td>
                <td className="py-2">{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// Default export for backward compatibility
export default PaymentHistory;
