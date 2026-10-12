import React, { useState, useCallback } from 'react';
import { Globe3D, REAL_SATELLITES } from './components/Globe3D';
import { WebcamTracker } from './components/WebcamTracker';
import { HandStatusCard } from './components/HandStatusCard';
import { GestureGuide } from './components/GestureGuide';
import { ControlsPanel } from './components/ControlsPanel';
import { HudOverlay } from './components/HudOverlay';
import { OfflineIndicator } from './components/OfflineIndicator';
import {
  HandData,
  GestureDetectionResult,
  GlobeSettings,
  CityMarker,
  SatelliteEntity,
  SatelliteLayerMode,
} from './types';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

export default function App() {
  // Gesture Detection State
  const [gestureResult, setGestureResult] = useState<GestureDetectionResult | null>(null);
  const [hands, setHands] = useState<HandData[]>([]);
  const [isGestureControlsEnabled, setIsGestureControlsEnabled] = useState(true);

  // Targets & Satellite Selection
  const [selectedCity, setSelectedCity] = useState<CityMarker | null>(null);
  const [selectedSatellite, setSelectedSatellite] = useState<SatelliteEntity | null>(
    REAL_SATELLITES[0]
  );

  // Left sidebar visibility on mobile/desktop
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Space World Visual Settings
  const [settings, setSettings] = useState<GlobeSettings>({
    satelliteLayer: 'blue_marble',
    autoRotate: true,
    autoRotateSpeed: 0.12,
    showClouds: true,
    showAtmosphere: true,
    showGrid: true,
    showMarkers: true,
    showSatellites: true,
    showNebula: true,
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

  // Trigger Space View Reset
  const handleResetGlobe = () => {
    if ((window as any).__auraResetGlobe) {
      (window as any).__auraResetGlobe();
    }
  };

  const handleSelectLayer = (layer: SatelliteLayerMode) => {
    setSettings((prev) => ({ ...prev, satelliteLayer: layer }));
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans flex flex-col select-none">
      {/* Deep Space Background Cosmic Gradients & Dust */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(88,28,135,0.12)_0%,rgba(6,182,212,0.06)_40%,rgba(2,6,23,0.95)_100%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#030712_0%,transparent_20%,transparent_80%,#030712_100%)] pointer-events-none" />

      {/* Main Container */}
      <div className="relative flex-1 flex w-full h-full overflow-hidden">
        {/* Left Sensor & Telemetry Sidebar */}
        <aside
          className={`absolute lg:relative z-20 inset-y-0 left-0 w-full sm:w-[380px] lg:w-[410px] h-full flex flex-col bg-slate-950/92 lg:bg-slate-950/80 backdrop-blur-3xl border-r border-cyan-500/20 transition-all duration-300 transform ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:-translate-x-full'
          }`}
        >
          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {/* 1. Camera Sensor with Live MediaPipe Landmarks */}
            <WebcamTracker
              onGestureDetected={handleGestureDetected}
              onHandsUpdated={handleHandsUpdated}
              isGestureControlsEnabled={isGestureControlsEnabled}
              sensitivity={settings.gestureSensitivity}
            />

            {/* 2. Biometric Hand Telemetry Card */}
            <HandStatusCard
              hands={hands}
              isGestureControlsEnabled={isGestureControlsEnabled}
            />

            {/* 3. Spatial Gesture Guide Matrix with Live Lights */}
            <GestureGuide
              activeGesture={gestureResult?.activeGesture || 'none'}
              resetProgress={gestureResult?.resetProgress || 0}
              isPaused={gestureResult?.isPaused || false}
            />

            {/* 4. Orbital Controls, Satellite Card & Layer Toggles */}
            <ControlsPanel
              settings={settings}
              onUpdateSettings={setSettings}
              onResetGlobe={handleResetGlobe}
              selectedSatellite={selectedSatellite}
            />
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 bg-slate-950/95 border-t border-cyan-500/15 flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              AURAVERSE-UNI CORE
            </span>
            <span className="text-violet-400">PWA READY</span>
          </div>
        </aside>

        {/* Sidebar Toggle Floating Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          title={isSidebarOpen ? 'Collapse Left Panel' : 'Expand Left Panel'}
          className={`absolute top-4 z-30 p-2.5 rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-cyan-500/30 text-cyan-300 hover:text-white shadow-2xl transition-all cursor-pointer ${
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

        {/* Main Viewport: Interactive Satellite View & Telemetry HUD */}
        <main className="relative flex-1 h-full w-full overflow-hidden bg-slate-950">
          {/* 3D Earth / Galaxy Satellite View */}
          <Globe3D
            gestureResult={gestureResult}
            settings={settings}
            selectedCity={selectedCity}
            onSelectCity={setSelectedCity}
            selectedSatellite={selectedSatellite}
            onSelectSatellite={setSelectedSatellite}
          />

          {/* Space HUD Overlay */}
          <HudOverlay
            gestureResult={gestureResult}
            onResetGlobe={handleResetGlobe}
            selectedCity={selectedCity}
            onSelectCity={setSelectedCity}
            selectedSatellite={selectedSatellite}
            onSelectSatellite={setSelectedSatellite}
            satelliteLayer={settings.satelliteLayer}
            onSelectLayer={handleSelectLayer}
            isGestureControlsEnabled={isGestureControlsEnabled}
            onToggleGestureControls={() =>
              setIsGestureControlsEnabled(!isGestureControlsEnabled)
            }
          />
        </main>
      </div>

      {/* Offline Status Badge */}
      <OfflineIndicator />
    </div>
  );
}
