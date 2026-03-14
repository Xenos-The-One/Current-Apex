import { useEffect, useState } from "react";

/**
 * AppLaunchScreen — shown for ~600ms on cold start in standalone mode.
 * Prevents the white flash and gives a branded launch feel.
 */
export function AppLaunchScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 500);
    const hideTimer = setTimeout(() => setVisible(false), 800);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`app-launch-screen ${fading ? "app-launch-screen-fade" : ""}`}
      aria-hidden="true"
    >
      <div className="app-launch-logo">
        <div className="app-launch-icon">
          <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-10 w-10">
            <rect width="40" height="40" rx="10" fill="white" fillOpacity="0.15" />
            <path d="M20 8L32 14V26L20 32L8 26V14L20 8Z" stroke="white" strokeWidth="2" fill="none" />
            <path d="M20 14L26 17V23L20 26L14 23V17L20 14Z" fill="white" fillOpacity="0.8" />
          </svg>
        </div>
        <span className="app-launch-name">Agency CRM</span>
      </div>
      <div className="app-launch-spinner" />
    </div>
  );
}
