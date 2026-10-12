import React, { useState, useCallback } from 'react';
import { Globe3D } from './components/Globe3D';
import { WebcamTracker } from './components/WebcamTracker';
import { HandStatusCard } from './components/HandStatusCard';
import { GestureGuide } from './components/GestureGuide';
import { ControlsPanel } from './components/ControlsPanel';
import { HudOverlay } from './components/HudOverlay';
import { HandData, GestureDetectionResult, GlobeSettings, CityMarker } from './types';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

export default function App() {
  // Gesture Detection State
  const [gestureResult, setGestureResult] = useState<GestureDetectionResult | null>(null);
  const [hands, setHands] = useState<HandData[]>([]);
  const [isGestureControlsEnabled, setIsGestureControlsEnabled] = useState(true);
  const [selectedCity, setSelectedCity] = useState<CityMarker | null>(null);

  // Left sidebar visibility on mobile/desktop
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // 3D Globe Visual and Behavioral Settings
  const [settings, setSettings] = useState<GlobeSettings>({
    autoRotate: true,
    autoRotateSpeed: 0.12,
    showClouds: true,
    showAtmosphere: true,
    showGrid: true,
    showMarkers: true,
    gestureSensitivity: 1.0,
  });

  // Handle Gesture Detection from WebcamTracker
  const handleGestureDetected = useCallback((result: GestureDetectionResult) => {
    setGestureResult(result);
  }, []);

  // Handle Hands Update
  const handleHandsUpdated = useCallback((updatedHands: HandData[]) => {
    setHands(updatedHands);
  }, []);

  // Trigger Globe Reset
  const handleResetGlobe = () => {
    if ((window as any).__auraResetGlobe) {
      (window as any).__auraResetGlobe();
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans flex flex-col select-none">
      {/* Background Cyber Grid Lines */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.06)_0%,rgba(15,23,42,0)_70%)] pointer-events-none" />

      {/* Main Container */}
      <div className="relative flex-1 flex w-full h-full overflow-hidden">
        {/* Left Control Panel / Sidebar */}
        <aside
          className={`absolute lg:relative z-20 inset-y-0 left-0 w-full sm:w-[380px] lg:w-[410px] h-full flex flex-col bg-slate-950/90 lg:bg-slate-950/75 backdrop-blur-2xl border-r border-cyan-500/20 transition-all duration-300 transform ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:-translate-x-full'
          }`}
        >
          {/* Sidebar Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {/* 1. Camera Sensor & Live Tracking Canvas */}
            <WebcamTracker
              onGestureDetected={handleGestureDetected}
              onHandsUpdated={handleHandsUpdated}
              isGestureControlsEnabled={isGestureControlsEnabled}
              sensitivity={settings.gestureSensitivity}
            />

            {/* 2. Biometric Hand Status (0, 1, 2 hands telemetry) */}
            <HandStatusCard
              hands={hands}
              isGestureControlsEnabled={isGestureControlsEnabled}
            />

            {/* 3. Gesture Guide Matrix (Dynamic HUD status lights) */}
            <GestureGuide
              activeGesture={gestureResult?.activeGesture || 'none'}
              resetProgress={gestureResult?.resetProgress || 0}
              isPaused={gestureResult?.isPaused || false}
            />

            {/* 4. Controls, Sensitivity & Layer Toggles */}
            <ControlsPanel
              settings={settings}
              onUpdateSettings={setSettings}
              onResetGlobe={handleResetGlobe}
            />
          </div>

          {/* Sidebar Footer Bar */}
          <div className="p-3 bg-slate-950/90 border-t border-cyan-500/15 flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              MEDIAPIPE VISION ENGINE
            </span>
            <span>THREE.JS WEBGL</span>
          </div>
        </aside>

        {/* Sidebar Toggle Floating Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          title={isSidebarOpen ? 'Collapse Left Panel' : 'Expand Left Panel'}
          className={`absolute top-4 z-30 p-2.5 rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-cyan-500/30 text-cyan-300 hover:text-white shadow-xl transition-all cursor-pointer ${
            isSidebarOpen
              ? 'left-[calc(100%-3.5rem)] sm:left-[390px] lg:left-[420px]'
              : 'left-4'
          }`}
        >
          {isSidebarOpen ? (
            <PanelLeftClose className="w-4 h-4" />
          ) : (
            <PanelLeftOpen className="w-4 h-4" />
          )}
        </button>

        {/* Center / Right Viewport: 3D Globe & HUD Overlay */}
        <main className="relative flex-1 h-full w-full overflow-hidden bg-slate-950">
          {/* Interactive 3D Earth Globe Canvas */}
          <Globe3D
            gestureResult={gestureResult}
            settings={settings}
            selectedCity={selectedCity}
            onSelectCity={setSelectedCity}
          />

          {/* Futuristic HUD Telemetry Overlay */}
          <HudOverlay
            gestureResult={gestureResult}
            onResetGlobe={handleResetGlobe}
            selectedCity={selectedCity}
            onSelectCity={setSelectedCity}
            isGestureControlsEnabled={isGestureControlsEnabled}
            onToggleGestureControls={() =>
              setIsGestureControlsEnabled(!isGestureControlsEnabled)
            }
          />
        </main>
      </div>
    </div>
  );
}
