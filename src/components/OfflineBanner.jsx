import React, { useEffect, useState } from 'react';

/**
 * OfflineBanner — thin top-of-screen banner that appears when the browser
 * goes offline and the user is mid-session. Added per walkthrough
 * 2026-04-21 (P3): users were reporting "the app just froze" when they
 * lost signal in a basement and background fetches started failing without
 * surfacing a reason. A small persistent banner reassures them this is a
 * network problem, not a crash.
 *
 * Uses the standard browser `online` / `offline` events. No polling. We
 * also listen for `visibilitychange` because Safari sometimes suppresses
 * `online` events in backgrounded tabs — re-checking navigator.onLine when
 * the tab becomes visible catches that.
 */
const OfflineBanner = () => {
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' && navigator.onLine === false
  );

  useEffect(() => {
    const syncOnline = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', syncOnline);
    window.addEventListener('offline', syncOnline);
    document.addEventListener('visibilitychange', syncOnline);
    return () => {
      window.removeEventListener('online', syncOnline);
      window.removeEventListener('offline', syncOnline);
      document.removeEventListener('visibilitychange', syncOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 'env(safe-area-inset-top, 0px)',
        left: 0,
        right: 0,
        zIndex: 60,
        background: '#B45309',
        color: '#fff',
        padding: '6px 12px',
        fontSize: 12,
        fontWeight: 600,
        textAlign: 'center',
        letterSpacing: '-0.01em',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      You\u2019re offline \u2014 changes will save locally and sync when you\u2019re back.
    </div>
  );
};

export default OfflineBanner;
