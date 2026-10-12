import React, { useState, useCallback } from 'react';
import { CameraTracker } from './components/CameraTracker';
import { ARHologramCanvas } from './components/ARHologramCanvas';
import { HologramSelector } from './components/HologramSelector';
import { ARHudOverlay } from './components/ARHudOverlay';
import { OfflineIndicator } from './components/OfflineIndicator';
import { HologramType, HandTrackingState, AppSettings } from './types';

export default function App() {
  // Active AR Hologram Selection (Default Earth)
  const [activeHologram, setActiveHologram] = useState<HologramType>('earth');
  const [isInspecting, setIsInspecting] = useState(false);

  // Hand Tracking State Stream
  const [trackingState, setTrackingState] = useState<HandTrackingState>({
    hands: [],
    anchorPoint: null,
    handCount: 0,
    activeGesture: 'none',
    gestureDescription: 'Standby',
    zoomScale: 1.0,
    rotationDelta: { x: 0, y: 0, z: 0 },
    isPinching: false,
    resetProgress: 0,
  });

  // App Settings
  const [settings, setSettings] = useState<AppSettings>({
    soundEnabled: true,
    showSkeleton: true,
    showEnergyPedestal: true,
    hologramBrightness: 1.0,
    gestureSensitivity: 1.0,
    mirrorCamera: true,
  });

  const handleTrackingUpdated = useCallback((state: HandTrackingState) => {
    setTrackingState(state);
  }, []);

  const handleReset = () => {
    if ((window as any).__auraResetGlobe) {
      (window as any).__auraResetGlobe();
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 1. Full-Screen Front Webcam Feed & MediaPipe Hand Landmark Tracker */}
      <CameraTracker
        onTrackingUpdated={handleTrackingUpdated}
        showSkeleton={settings.showSkeleton}
        sensitivity={settings.gestureSensitivity}
      />

      {/* 2. Three.js AR 3D Hologram (Anchored to User's Palm) */}
      <ARHologramCanvas
        hologramType={activeHologram}
        anchorPoint={trackingState.anchorPoint}
        palmRoll={trackingState.hands[0]?.palmRoll || 0}
        scaleMultiplier={trackingState.zoomScale}
        isPinching={trackingState.isPinching}
        brightness={settings.hologramBrightness}
        showEnergyPedestal={settings.showEnergyPedestal}
      />

      {/* 3. Top Cyber HUD Overlay */}
      <ARHudOverlay
        trackingState={trackingState}
        soundEnabled={settings.soundEnabled}
        onToggleSound={() =>
          setSettings((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }))
        }
        showSkeleton={settings.showSkeleton}
        onToggleSkeleton={() =>
          setSettings((prev) => ({ ...prev, showSkeleton: !prev.showSkeleton }))
        }
        showPedestal={settings.showEnergyPedestal}
        onTogglePedestal={() =>
          setSettings((prev) => ({
            ...prev,
            showEnergyPedestal: !prev.showEnergyPedestal,
          }))
        }
        onReset={handleReset}
      />

      {/* 4. Bottom AR Hologram Selector Bar (Earth, Moon, Galaxy, Sun, Mars, Universe) */}
      <HologramSelector
        activeType={activeHologram}
        onSelectType={setActiveHologram}
        isInspecting={isInspecting}
        onToggleInspect={() => setIsInspecting(!isInspecting)}
      />

      {/* 5. Offline Connectivity Indicator */}
      <OfflineIndicator />
    </div>
  );
}
