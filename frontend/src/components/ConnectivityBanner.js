import React from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Mobile connectivity indicator.
 * - Listens to native `online`/`offline` events.
 * - Shows a sticky bar at the top when the device is offline.
 * - Prevents the app feeling "stuck" on spotty mobile networks.
 */
export default function ConnectivityBanner() {
  const [online, setOnline] = React.useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  React.useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div
      data-testid="offline-banner"
      className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2 py-2 text-white text-sm font-medium"
      style={{
        backgroundColor: '#B91C1C',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      <WifiOff size={16} />
      <span>Geen internetverbinding. We proberen het automatisch opnieuw zodra je terug online bent.</span>
    </div>
  );
}
