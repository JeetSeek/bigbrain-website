import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Phone, MapPin, Clock, Shield } from 'lucide-react';

/**
 * Enhanced Safety Alert Modal Component
 * Prominent emergency warnings with acknowledgment requirement
 * Designed for critical safety situations in boiler diagnostics
 */
const EnhancedSafetyAlertModal = ({
  isOpen,
  onClose,
  onAcknowledge,
  alert = {},
  className = ""
}) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30); // 30 second countdown

  // Auto-close countdown for non-critical alerts
  useEffect(() => {
    if (!isOpen || alert.critical) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, alert.critical]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setAcknowledged(false);
      setTimeRemaining(alert.critical ? 0 : 30);
    }
  }, [isOpen, alert.critical]);

  const handleAcknowledge = () => {
    setAcknowledged(true);
    onAcknowledge?.(alert);
    // Keep modal open briefly to show acknowledgment
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const handleDismiss = () => {
    if (!alert.critical || acknowledged) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const alertType = alert.type || 'warning';
  const isCritical = alert.critical || alertType === 'emergency';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75 backdrop-blur-sm">
      {/* Animated background pulse for critical alerts */}
      {isCritical && (
        <div className="absolute inset-0 bg-red-600 opacity-20 animate-pulse" />
      )}

      <div className={`relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-4 ${
        isCritical ? 'border-red-500' : 'border-yellow-500'
      } ${className}`}>

        {/* Emergency Header */}
        <div className={`p-6 text-center ${
          isCritical
            ? 'bg-red-600 text-white'
            : 'bg-yellow-500 text-yellow-900 dark:bg-yellow-600 dark:text-yellow-100'
        } rounded-t-2xl`}>
          <div className="flex items-center justify-center gap-3 mb-2">
            <AlertTriangle className={`w-8 h-8 ${isCritical ? 'animate-bounce' : ''}`} />
            <h2 className="text-xl font-bold">
              {isCritical ? '🚨 EMERGENCY ALERT' : '⚠️ Safety Warning'}
            </h2>
          </div>

          {alert.title && (
            <p className="text-lg font-semibold">{alert.title}</p>
          )}
        </div>

        {/* Alert Content */}
        <div className="p-6">
          {/* Main Message */}
          <div className="mb-6">
            <p className="text-gray-900 dark:text-gray-100 text-center text-lg leading-relaxed">
              {alert.message || 'A safety-critical situation has been detected.'}
            </p>
          </div>

          {/* Emergency Contacts */}
          {(alert.contacts || isCritical) && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <h3 className="text-red-800 dark:text-red-200 font-semibold mb-3 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Emergency Contacts
              </h3>

              <div className="space-y-2">
                {(alert.contacts || [
                  { name: 'Gas Safe Emergency', phone: '0800 408 5500', available: '24/7' },
                  { name: 'National Gas Emergency', phone: '0800 111 999', available: '24/7' }
                ]).map((contact, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded border border-red-100 dark:border-red-700">
                    <div>
                      <div className="font-medium text-red-800 dark:text-red-200">
                        {contact.name}
                      </div>
                      {contact.available && (
                        <div className="text-xs text-red-600 dark:text-red-300">
                          {contact.available}
                        </div>
                      )}
                    </div>
                    <a
                      href={`tel:${contact.phone}`}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors"
                    >
                      {contact.phone}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Information */}
          {alert.details && (
            <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Additional Information:
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {alert.details}
              </p>
            </div>
          )}

          {/* Timestamp */}
          {alert.timestamp && (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-4">
              <Clock className="w-3 h-3" />
              <span>
                Alert triggered: {new Date(alert.timestamp).toLocaleString()}
              </span>
            </div>
          )}

          {/* Acknowledgment Section */}
          <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
            {isCritical && !acknowledged && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center gap-2 text-red-800 dark:text-red-200 mb-2">
                  <Shield className="w-4 h-4" />
                  <span className="font-medium">Acknowledgment Required</span>
                </div>
                <p className="text-sm text-red-700 dark:text-red-300">
                  You must acknowledge this emergency alert before continuing.
                </p>
              </div>
            )}

            <div className="flex items-center gap-3">
              {/* Acknowledgment Checkbox (for critical alerts) */}
              {isCritical && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                    className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 dark:focus:ring-red-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    I acknowledge this emergency situation
                  </span>
                </label>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 ml-auto">
                {!isCritical && (
                  <button
                    onClick={handleDismiss}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  >
                    Dismiss ({timeRemaining}s)
                  </button>
                )}

                <button
                  onClick={handleAcknowledge}
                  disabled={isCritical && !acknowledged}
                  className={`px-6 py-2 rounded-md font-medium transition-colors ${
                    acknowledged || !isCritical
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {acknowledged ? 'Acknowledged ✓' : 'Acknowledge'}
                </button>
              </div>
            </div>
          </div>

          {/* Safety Disclaimer */}
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              <strong>Safety First:</strong> If this involves gas or carbon monoxide, evacuate the area immediately and call emergency services.
            </p>
          </div>
        </div>

        {/* Close button for non-critical alerts */}
        {!isCritical && (
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
            aria-label="Close alert"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Safety Alert Banner Component
 * Non-modal alerts for less critical situations
 */
const SafetyAlertBanner = ({
  alert = {},
  onDismiss,
  className = ""
}) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.(alert);
  };

  const alertType = alert.type || 'info';
  const isUrgent = alertType === 'emergency' || alertType === 'warning';

  const bannerStyles = {
    emergency: 'bg-red-600 text-white border-red-700',
    warning: 'bg-yellow-500 text-yellow-900 border-yellow-600',
    info: 'bg-blue-500 text-blue-900 border-blue-600',
    success: 'bg-green-500 text-green-900 border-green-600'
  };

  return (
    <div className={`safety-alert-banner border-l-4 p-4 ${bannerStyles[alertType]} ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <AlertTriangle className={`w-5 h-5 ${alertType === 'emergency' ? 'animate-pulse' : ''}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">
              {alert.title || 'Safety Alert'}
            </h4>

            {onDismiss && (
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 ml-2 p-1 hover:bg-black/10 rounded transition-colors"
                aria-label="Dismiss alert"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <p className="text-sm mt-1 leading-relaxed">
            {alert.message}
          </p>

          {alert.action && (
            <div className="mt-3">
              <button
                onClick={alert.action.onClick}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm font-medium transition-colors"
              >
                {alert.action.label}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { EnhancedSafetyAlertModal, SafetyAlertBanner };
