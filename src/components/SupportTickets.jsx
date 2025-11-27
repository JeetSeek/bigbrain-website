import React, { useState } from 'react';

/**
 * SupportTickets Component
 * Displays and manages user support tickets
 */
const SupportTickets = ({ supportTickets = [] }) => {
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newTicket, setNewTicket] = useState({ title: '', description: '' });
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);

  const handleCreateTicket = () => {
    if (!newTicket.title.trim() || !newTicket.description.trim()) return;
    
    // In a real app, this would make an API call
    console.log('Creating new ticket:', newTicket);
    
    // Reset form
    setNewTicket({ title: '', description: '' });
    setShowNewTicketForm(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'text-red-600 bg-red-100';
      case 'in_progress': return 'text-yellow-600 bg-yellow-100';
      case 'closed': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Support Tickets</h2>
        <button
          onClick={() => setShowNewTicketForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          New Ticket
        </button>
      </div>

      {/* New Ticket Form */}
      {showNewTicketForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border">
          <h3 className="text-lg font-semibold mb-4">Create New Support Ticket</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                value={newTicket.title}
                onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description of the issue"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={newTicket.description}
                onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Detailed description of the issue"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateTicket}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Create Ticket
              </button>
              <button
                onClick={() => setShowNewTicketForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tickets List */}
      <div className="space-y-4">
        {supportTickets.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No support tickets found.</p>
            <p className="text-sm">Create your first ticket to get help with any issues.</p>
          </div>
        ) : (
          supportTickets.map((ticket) => (
            <div
              key={ticket.id}
              className="bg-white rounded-lg shadow-md p-6 border hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedTicket(selectedTicket === ticket.id ? null : ticket.id)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    {ticket.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-2">
                    Created: {new Date(ticket.date).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                  {ticket.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              
              {selectedTicket === ticket.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-800 mb-2">Description:</h4>
                  <p className="text-gray-600">{ticket.description}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SupportTickets;
