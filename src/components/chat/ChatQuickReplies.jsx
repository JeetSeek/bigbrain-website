import React from 'react';
import { Wrench, BookOpen, Calculator, AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * Chat Quick Replies Component
 * Features:
 * - Pre-defined quick reply buttons for common boiler technician queries
 * - Voice command integration
 * - Emergency response shortcuts
 * - Manufacturer-specific quick replies
 * - Mobile-optimized touch targets
 */
const ChatQuickReplies = ({
  onQuickReply,
  disabled = false,
  className = "",
  recentManufacturers = ['Ideal', 'Worcester', 'Vaillant', 'Baxi']
}) => {
  // Quick reply categories
  const quickReplies = {
    diagnostics: [
      { text: "Check fault code", icon: <Wrench className="w-4 h-4" />, category: "diagnostics" },
      { text: "Gas leak emergency", icon: <AlertTriangle className="w-4 h-4" />, category: "emergency", urgent: true },
      { text: "CO detector beeping", icon: <AlertTriangle className="w-4 h-4" />, category: "emergency", urgent: true },
      { text: "No hot water", icon: <Wrench className="w-4 h-4" />, category: "diagnostics" },
      { text: "Boiler not firing", icon: <Wrench className="w-4 h-4" />, category: "diagnostics" }
    ],

    manuals: [
      { text: "Find installation manual", icon: <BookOpen className="w-4 h-4" />, category: "manuals" },
      { text: "Service instructions", icon: <BookOpen className="w-4 h-4" />, category: "manuals" },
      { text: "Wiring diagram", icon: <BookOpen className="w-4 h-4" />, category: "manuals" },
      { text: "Parts list", icon: <BookOpen className="w-4 h-4" />, category: "manuals" }
    ],

    calculations: [
      { text: "Gas rate calculation", icon: <Calculator className="w-4 h-4" />, category: "calculations" },
      { text: "BTU requirements", icon: <Calculator className="w-4 h-4" />, category: "calculations" },
      { text: "Pipe sizing", icon: <Calculator className="w-4 h-4" />, category: "calculations" }
    ],

    general: [
      { text: "Start new session", icon: <RotateCcw className="w-4 h-4" />, category: "general" },
      { text: "Emergency contacts", icon: <AlertTriangle className="w-4 h-4" />, category: "general" }
    ]
  };

  /**
   * Handle quick reply selection
   */
  const handleQuickReply = (reply) => {
    if (disabled) return;

    let message = reply.text;

    // Add context based on category
    switch (reply.category) {
      case 'emergency':
        message = `🚨 EMERGENCY: ${message}. Please help immediately!`;
        break;
      case 'diagnostics':
        message = `I'm experiencing: ${message}. Can you help diagnose this?`;
        break;
      case 'manuals':
        message = `I need to find: ${message}. Can you help me locate this?`;
        break;
      case 'calculations':
        message = `I need help with: ${message}. Can you guide me through this?`;
        break;
      default:
        break;
    }

    onQuickReply(message);
  };

  /**
   * Generate manufacturer-specific quick replies
   */
  const getManufacturerReplies = () => {
    return recentManufacturers.slice(0, 3).map(manufacturer => ({
      text: `${manufacturer} fault code`,
      icon: <Wrench className="w-4 h-4" />,
      category: "manufacturer",
      manufacturer
    }));
  };

  /**
   * Get button styling based on category and urgency
   */
  const getButtonClasses = (reply) => {
    let baseClasses = "quick-reply-btn flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-full transition-all duration-200 border ";

    if (reply.urgent) {
      baseClasses += "bg-red-50 hover:bg-red-100 border-red-200 text-red-700 hover:text-red-800 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:border-red-800 dark:text-red-300";
    } else {
      baseClasses += "bg-white hover:bg-gray-50 border-gray-200 text-gray-700 hover:text-gray-900 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:text-gray-100";
    }

    if (disabled) {
      baseClasses += " opacity-50 cursor-not-allowed";
    } else {
      baseClasses += " cursor-pointer hover:shadow-md active:scale-95";
    }

    return baseClasses;
  };

  /**
   * Render category section
   */
  const renderCategory = (title, replies, showIcon = true) => (
    <div key={title} className="quick-reply-category mb-4">
      <h4 className="category-title text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
        {title}
      </h4>
      <div className="category-buttons flex flex-wrap gap-2">
        {replies.map((reply, index) => (
          <button
            key={`${title}-${index}`}
            onClick={() => handleQuickReply(reply)}
            disabled={disabled}
            className={getButtonClasses(reply)}
            title={reply.text}
          >
            {showIcon && reply.icon}
            <span className="button-text">{reply.text}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className={`chat-quick-replies p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Emergency Section - Always at top */}
      {renderCategory("🚨 Emergency", quickReplies.diagnostics.filter(r => r.urgent))}

      {/* Manufacturer Quick Access */}
      {recentManufacturers.length > 0 && (
        renderCategory("Recent Manufacturers", getManufacturerReplies())
      )}

      {/* Main Categories */}
      {renderCategory("🔧 Diagnostics", quickReplies.diagnostics.filter(r => !r.urgent))}
      {renderCategory("📚 Manuals", quickReplies.manuals)}
      {renderCategory("🧮 Calculations", quickReplies.calculations)}
      {renderCategory("⚙️ General", quickReplies.general)}

      {/* Help Text */}
      <div className="help-text mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-xs text-blue-800 dark:text-blue-200 mb-1 font-medium">
          💡 Quick Tips:
        </p>
        <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
          <li>• Tap buttons above for common queries</li>
          <li>• Use voice commands like "check fault code" or "find manual"</li>
          <li>• For emergencies, use the red emergency buttons</li>
          <li>• Try "start new session" to reset the conversation</li>
        </ul>
      </div>
    </div>
  );
};

export default ChatQuickReplies;
