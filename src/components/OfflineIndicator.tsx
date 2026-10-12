import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-950/90 border border-amber-500/50 px-3.5 py-2 text-xs font-mono text-amber-300 shadow-2xl backdrop-blur-md">
      <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
      <WifiOff className="w-4 h-4 text-amber-400" />
      <span>Offline Mode — Running from PWA Service Worker Cache</span>
    </div>
  );
};
