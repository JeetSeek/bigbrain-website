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
        className="flex items-center gap-2 px-4 py-2.5 min-h-[44px]
                   bg-[#007AFF] hover:bg-[#0051D5] active:scale-[0.98]
                   text-white rounded-[10px] transition-all duration-200 text-[15px] font-semibold
                   shadow-[0_2px_8px_rgba(0,122,255,0.3)]"
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}
        aria-label="Install BoilerBrain App"
      >
        <FiDownload className="w-4 h-4" />
        <span className="hidden sm:inline">Install App</span>
      </button>

      {/* iOS Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1C1C1E] rounded-[22px] max-w-sm w-full p-6 shadow-2xl border border-[#38383A]" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[20px] font-semibold text-white tracking-tight">Install BoilerBrain</h2>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-[#2C2C2E] rounded-full transition-colors"
              >
                <FiX className="w-5 h-5 text-[#8E8E93]" />
              </button>
            </div>

            {/* Instructions */}
            <div className="space-y-4">
              <p className="text-[#EBEBF5]/60 text-[15px]">
                Install this app on your iPhone for quick access and offline use:
              </p>

              {/* Step 1 */}
              <div className="flex items-start gap-3 p-4 bg-[#2C2C2E] rounded-[12px]">
                <div className="flex-shrink-0 w-8 h-8 bg-[#007AFF] rounded-full flex items-center justify-center text-white font-semibold text-[15px]">
                  1
                </div>
                <div>
                  <p className="text-white font-semibold text-[17px]">Tap the Share button</p>
                  <p className="text-[#8E8E93] text-[15px] flex items-center gap-1.5 mt-0.5">
                    Look for <FiShare className="w-4 h-4 text-[#007AFF]" /> at the bottom of Safari
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3 p-4 bg-[#2C2C2E] rounded-[12px]">
                <div className="flex-shrink-0 w-8 h-8 bg-[#007AFF] rounded-full flex items-center justify-center text-white font-semibold text-[15px]">
                  2
                </div>
                <div>
                  <p className="text-white font-semibold text-[17px]">Scroll down and tap</p>
                  <p className="text-[#8E8E93] text-[15px] flex items-center gap-1.5 mt-0.5">
                    <FiPlusSquare className="w-4 h-4 text-[#007AFF]" /> "Add to Home Screen"
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3 p-4 bg-[#2C2C2E] rounded-[12px]">
                <div className="flex-shrink-0 w-8 h-8 bg-[#007AFF] rounded-full flex items-center justify-center text-white font-semibold text-[15px]">
                  3
                </div>
                <div>
                  <p className="text-white font-semibold text-[17px]">Tap "Add"</p>
                  <p className="text-[#8E8E93] text-[15px] mt-0.5">
                    The app icon will appear on your home screen
                  </p>
                </div>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full mt-6 py-3.5 min-h-[50px] bg-[#007AFF] hover:bg-[#0051D5] active:scale-[0.98]
                         text-white rounded-[12px] font-semibold text-[17px] transition-all duration-200"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
