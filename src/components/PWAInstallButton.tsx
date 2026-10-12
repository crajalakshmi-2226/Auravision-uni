import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share2, X, Smartphone, CheckCircle2 } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return (
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>INSTALLED PWA</span>
      </div>
    );
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={async () => {
          setIsInstalling(true);
          try {
            await install();
          } finally {
            setIsInstalling(false);
          }
        }}
        disabled={isInstalling}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white text-xs font-mono font-semibold transition shadow-lg shadow-cyan-500/20 active:scale-95 cursor-pointer"
        title="Install AURAVERSE-UNI as a desktop or mobile application"
      >
        <Download className="w-3.5 h-3.5 animate-bounce" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-cyan-500/30 text-cyan-300 hover:text-white text-xs font-mono transition cursor-pointer"
          title="Install on iOS"
        >
          <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
          <span>Install iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-cyan-500/40 p-6 shadow-2xl relative text-slate-200">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 mb-3 text-cyan-300">
                <Share2 className="w-5 h-5" />
                <h3 className="font-['Chakra_Petch'] text-base font-bold">
                  Install on iPhone / iPad
                </h3>
              </div>
              <p className="text-xs font-mono text-slate-300 leading-relaxed space-y-2 mb-4">
                1. Tap the <strong className="text-cyan-300">Share</strong> icon in the Safari navigation bar.<br />
                2. Scroll down and choose <strong className="text-violet-300">Add to Home Screen</strong>.<br />
                3. Launch <strong>AURAVERSE-UNI</strong> directly from your home screen in full-screen mode!
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold hover:bg-cyan-900/60 transition cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Default desktop fallback button to test / inform
  return (
    <button
      onClick={() => {
        alert(
          'To install AURAVERSE-UNI, click the Install icon (computer with down arrow) in your browser address bar!'
        );
      }}
      className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/80 border border-slate-700/60 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-300 text-xs font-mono transition cursor-pointer"
      title="Install as Progressive Web App"
    >
      <Download className="w-3.5 h-3.5" />
      <span>Install PWA</span>
    </button>
  );
};
