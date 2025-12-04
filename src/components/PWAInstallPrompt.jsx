/**
 * PWA Install Prompt Component
 * Shows install button with iOS instructions popup or Android auto-install
 */
import { useState, useEffect } from 'react';
import { FiDownload, FiX, FiShare, FiPlusSquare } from 'react-icons/fi';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    // Check if already installed as PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
      || window.navigator.standalone 
      || document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    // Show button if not already installed
    if (!standalone) {
      setShowButton(true);
    }

    // Listen for Android/Chrome install prompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Hide button after successful install
    window.addEventListener('appinstalled', () => {
      setShowButton(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      // Show iOS instructions modal
      setShowIOSModal(true);
    } else if (deferredPrompt) {
      // Trigger Android/Chrome install prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowButton(false);
      }
      setDeferredPrompt(null);
    }
  };

  // Don't show if already installed
  if (isStandalone || !showButton) {
    return null;
  }

  return (
    <>
      {/* Install Button */}
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 
                   text-white rounded-lg transition-colors text-sm font-medium
                   shadow-lg hover:shadow-xl"
        aria-label="Install BoilerBrain App"
      >
        <FiDownload className="w-4 h-4" />
        <span className="hidden sm:inline">Install App</span>
      </button>

      {/* iOS Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Install BoilerBrain</h2>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-2 hover:bg-gray-800 rounded-full transition-colors"
              >
                <FiX className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Instructions */}
            <div className="space-y-4">
              <p className="text-gray-300 text-sm">
                Install this app on your iPhone for quick access and offline use:
              </p>

              {/* Step 1 */}
              <div className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  1
                </div>
                <div>
                  <p className="text-white font-medium">Tap the Share button</p>
                  <p className="text-gray-400 text-sm flex items-center gap-1">
                    Look for <FiShare className="w-4 h-4 text-blue-400" /> at the bottom of Safari
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  2
                </div>
                <div>
                  <p className="text-white font-medium">Scroll down and tap</p>
                  <p className="text-gray-400 text-sm flex items-center gap-1">
                    <FiPlusSquare className="w-4 h-4 text-blue-400" /> "Add to Home Screen"
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  3
                </div>
                <div>
                  <p className="text-white font-medium">Tap "Add"</p>
                  <p className="text-gray-400 text-sm">
                    The app icon will appear on your home screen
                  </p>
                </div>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 text-white 
                         rounded-lg font-medium transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
