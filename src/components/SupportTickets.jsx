import React, { useState } from 'react';

/**
 * Support Center Component
 * Comprehensive help center with UI guides and direct messaging
 *
 * @component
 * @param {Object} props - Component props
 * @returns {React.ReactElement} Support center interface
 */
export function SupportTickets({ supportTickets }) {
  const [activeSection, setActiveSection] = useState('guides');
  const [messageForm, setMessageForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    priority: 'normal'
  });

  const uiGuides = [
    {
      title: "Getting Started with Chat Diagnostics",
      description: "Learn how to use the AI chat for boiler fault finding",
      icon: "💬",
      steps: [
        "Click on the Chat tab in the sidebar",
        "Describe your boiler issue (make, model, fault codes)",
        "Follow the AI's diagnostic questions",
        "Get step-by-step troubleshooting guidance"
      ]
    },
    {
      title: "Finding Boiler Manuals",
      description: "How to search and download boiler manuals",
      icon: "📚",
      steps: [
        "Go to the Manuals tab",
        "Enter boiler make and model",
        "Browse available manuals",
        "Download PDF manuals directly"
      ]
    },
    {
      title: "Using Gas Rate Calculator",
      description: "Calculate gas rates for different boiler types",
      icon: "🔥",
      steps: [
        "Navigate to Gas Rate tab",
        "Select your boiler type",
        "Enter gas meter readings",
        "Get accurate gas rate calculations"
      ]
    },
    {
      title: "Room BTU Calculator",
      description: "Calculate heating requirements for rooms",
      icon: "🏠",
      steps: [
        "Open Room BTU tab",
        "Enter room dimensions",
        "Select insulation type",
        "Get BTU requirements"
      ]
    }
  ];

  const handleInputChange = (e) => {
    setMessageForm({
      ...messageForm,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmitMessage = (e) => {
    e.preventDefault();
    // TODO: Implement actual message sending to support
    alert('Message sent! We\'ll get back to you within 24 hours.');
    setMessageForm({
      name: '',
      email: '',
      subject: '',
      message: '',
      priority: 'normal'
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Support Center</h1>
        <p className="text-gray-300">Get help with Boiler Brain features or contact our support team</p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveSection('guides')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            activeSection === 'guides'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          📖 User Guides
        </button>
        <button
          onClick={() => setActiveSection('contact')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            activeSection === 'contact'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          💬 Contact Support
        </button>
      </div>

      {/* UI Guides Section */}
      {activeSection === 'guides' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-white mb-4">How to Use Boiler Brain</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {uiGuides.map((guide, index) => (
              <div key={index} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-3">{guide.icon}</span>
                  <h3 className="text-xl font-semibold text-white">{guide.title}</h3>
                </div>
                <p className="text-gray-300 mb-4">{guide.description}</p>
                <div className="space-y-2">
                  <h4 className="font-medium text-white">Steps:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-gray-300">
                    {guide.steps.map((step, stepIndex) => (
                      <li key={stepIndex} className="text-sm">{step}</li>
                    ))}
                  </ol>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact Support Section */}
      {activeSection === 'contact' && (
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold text-white mb-6">Contact Support</h2>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <form onSubmit={handleSubmitMessage} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={messageForm.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={messageForm.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Subject</label>
                <input
                  type="text"
                  name="subject"
                  value={messageForm.subject}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                <select
                  name="priority"
                  value={messageForm.priority}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low - General inquiry</option>
                  <option value="normal">Normal - Standard support</option>
                  <option value="high">High - Urgent issue</option>
                  <option value="critical">Critical - System down</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
                <textarea
                  name="message"
                  value={messageForm.message}
                  onChange={handleInputChange}
                  required
                  rows={6}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe your issue or question in detail..."
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                Send Message
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-700">
              <h3 className="text-lg font-medium text-white mb-3">Other Ways to Reach Us</h3>
              <div className="space-y-2 text-gray-300">
                <p>📧 Email: support@boilerbrain.com</p>
                <p>📞 Phone: +44 (0) 123 456 7890</p>
                <p>⏰ Support Hours: Mon-Fri 9AM-6PM GMT</p>
                <p>🚨 Emergency: 24/7 for critical system issues</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Default export for backward compatibility
export default SupportTickets;
