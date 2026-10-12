import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  RotateCcw,
  Maximize2,
  Minimize2,
  Sparkles,
  Hand,
  Radio,
  Layers,
} from 'lucide-react';
import { ActiveGesture, HandTrackingState } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { soundFx } from '../utils/audioSynth';

interface ARHudOverlayProps {
  trackingState: HandTrackingState;
  soundEnabled: boolean;
  onToggleSound: () => void;
  showSkeleton: boolean;
  onToggleSkeleton: () => void;
  showPedestal: boolean;
  onTogglePedestal: () => void;
  onReset: () => void;
}

export const ARHudOverlay: React.FC<ARHudOverlayProps> = ({
  trackingState,
  soundEnabled,
  onToggleSound,
  showSkeleton,
  onToggleSkeleton,
  showPedestal,
  onTogglePedestal,
  onReset,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const getGestureBadge = () => {
    if (trackingState.handCount === 0) {
      return {
        text: 'RAISE PALM IN CAMERA VIEW',
        subtext: 'Hold hand up to anchor AR hologram',
        style: 'border-slate-800 bg-slate-950/80 text-slate-400',
        dot: 'bg-slate-500',
      };
    }

    switch (trackingState.activeGesture) {
      case 'pinch_grab':
        return {
          text: 'PINCH GRAB ENGAGED',
          subtext: 'Direct 3D rotation & manipulation',
          style: 'border-cyan-400 bg-cyan-950/90 text-cyan-200 shadow-[0_0_20px_rgba(0,240,255,0.4)]',
          dot: 'bg-cyan-300 animate-ping',
        };
      case 'dual_hand_zoom':
        return {
          text: 'DUAL-HAND SCALE',
          subtext: trackingState.gestureDescription,
          style: 'border-violet-400 bg-violet-950/90 text-violet-200 shadow-[0_0_20px_rgba(168,85,247,0.4)]',
          dot: 'bg-violet-300 animate-pulse',
        };
      case 'fist_stasis':
        return {
          text: 'FIST STASIS LOCK',
          subtext: 'Hologram position frozen in place',
          style: 'border-amber-400 bg-amber-950/90 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.4)]',
          dot: 'bg-amber-400',
        };
      case 'reset_hold':
        return {
          text: `RESET CHARGING (${Math.round(trackingState.resetProgress * 100)}%)`,
          subtext: 'Holding open palms towards sensor',
          style: 'border-rose-400 bg-rose-950/90 text-rose-200 shadow-[0_0_25px_rgba(244,63,94,0.5)]',
          dot: 'bg-rose-400 animate-spin',
        };
      case 'palm_hover':
      default:
        return {
          text: trackingState.handCount === 1 ? 'HOLOGRAM ANCHORED IN PALM' : 'UNIVERSE CUPPED IN DUAL HANDS',
          subtext: 'Move hand in 3D space to glide hologram',
          style: 'border-cyan-500/50 bg-slate-950/85 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.25)]',
          dot: 'bg-cyan-400 animate-pulse',
        };
    }
  };

  const badge = getGestureBadge();

  return (
    <div className="absolute inset-0 pointer-events-none p-3 sm:p-4 flex flex-col justify-between z-20 select-none">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pointer-events-auto">
        {/* Brand Branding */}
        <div className="flex items-center gap-3 bg-slate-950/85 backdrop-blur-2xl border border-cyan-500/35 rounded-2xl px-3.5 py-2 shadow-2xl shadow-cyan-950/50">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 via-violet-600 to-fuchsia-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(0,240,255,0.5)]">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-['Chakra_Petch'] text-sm sm:text-base font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-slate-100 to-violet-300">
                AURAVERSE-UNI
              </h1>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                AR PRO
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-400 tracking-wider">
              Hand-Held AR Universe Hologram
            </p>
          </div>
        </div>

        {/* Center Prominent Gesture Recognition Banner */}
        <div
          className={`flex items-center gap-2.5 px-4 py-1.5 rounded-2xl border backdrop-blur-2xl transition-all duration-300 ${badge.style}`}
        >
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${badge.dot}`} />
          <div className="text-left">
            <div className="text-xs font-mono font-bold tracking-wider uppercase">{badge.text}</div>
            <div className="text-[9px] font-mono opacity-80">{badge.subtext}</div>
          </div>
        </div>

        {/* Right Tools HUD */}
        <div className="flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-2xl border border-cyan-500/35 rounded-2xl p-1.5 shadow-2xl">
          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Sound FX Toggle */}
          <button
            onClick={() => {
              soundFx.enabled = !soundEnabled;
              onToggleSound();
            }}
            title={soundEnabled ? 'Mute AR Sound FX' : 'Enable AR Sound FX'}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              soundEnabled
                ? 'bg-cyan-950/70 border-cyan-500/50 text-cyan-300 shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Hand Skeleton Overlay Toggle */}
          <button
            onClick={onToggleSkeleton}
            title={showSkeleton ? 'Hide Hand Skeleton Overlay' : 'Show Hand Skeleton Overlay'}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              showSkeleton
                ? 'bg-cyan-950/70 border-cyan-500/50 text-cyan-300 shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            {showSkeleton ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          {/* Hologram Energy Pedestal Toggle */}
          <button
            onClick={onTogglePedestal}
            title={showPedestal ? 'Hide Energy Pedestal' : 'Show Energy Pedestal'}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              showPedestal
                ? 'bg-violet-950/70 border-violet-500/50 text-violet-300 shadow-[0_0_8px_rgba(168,85,247,0.2)]'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            <Layers className="w-4 h-4" />
          </button>

          {/* Reset Hologram Button */}
          <button
            onClick={() => {
              soundFx.playResetSweep();
              onReset();
            }}
            title="Reset Hologram View"
            className="p-2 rounded-xl bg-violet-950/70 border border-violet-500/40 text-violet-300 hover:bg-violet-900/60 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Floating Instructions Banner (when no hands detected) */}
      {trackingState.handCount === 0 && (
        <div className="self-center p-3.5 bg-slate-950/80 backdrop-blur-xl border border-cyan-500/30 rounded-2xl flex items-center gap-3 shadow-2xl animate-pulse">
          <Hand className="w-6 h-6 text-cyan-400 animate-bounce" />
          <div className="text-left font-mono">
            <p className="text-xs font-bold text-cyan-200">HOLD YOUR PALM IN FRONT OF THE CAMERA</p>
            <p className="text-[10px] text-slate-400">
              The 3D universe hologram will project directly into your hand!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
