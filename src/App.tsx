import React, { useState, useCallback } from 'react';
import { ARHologramView } from './components/ARHologramView';
import { CameraHandTracker } from './components/CameraHandTracker';
import { HandStatusCard } from './components/HandStatusCard';
import { GestureGuide } from './components/GestureGuide';
import { ControlsPanel } from './components/ControlsPanel';
import { HudOverlay } from './components/HudOverlay';
import { LiveSpaceDashboard } from './components/LiveSpaceDashboard';
import { CelestialExplorer } from './components/CelestialExplorer';
import { DeepZoomMap } from './components/DeepZoomMap';
import { OfflineIndicator } from './components/OfflineIndicator';
import { CELESTIAL_CATALOG, CelestialObjectData } from './data/celestialObjects';
import {
  HandData,
  GestureDetectionResult,
  GlobeSettings,
  CityMarker,
  SatelliteEntity,
  SatelliteLayerMode,
} from './types';
import { REAL_SATELLITES, CITIES } from './components/Globe3D';
import { PanelLeftClose, PanelLeftOpen, HandMetal, Eye } from 'lucide-react';

export default function App() {
  // Hand Tracking & Gesture State
  const [gestureResult, setGestureResult] = useState<GestureDetectionResult | null>(null);
  const [hands, setHands] = useState<HandData[]>([]);
  const [handMidpoint, setHandMidpoint] = useState<{ x: number; y: number } | null>(null);
  const [handDistance, setHandDistance] = useState<number | null>(null);
  const [isPinching, setIsPinching] = useState(false);
  const [isGestureControlsEnabled, setIsGestureControlsEnabled] = useState(true);

  // Camera & AR Mode
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [isARAnchorMode, setIsARAnchorMode] = useState(true); // Anchors 3D hologram to hands!

  // Active Celestial Object (Earth, Moon, Mars, Sun, etc.)
  const [activeObject, setActiveObject] = useState<CelestialObjectData>(CELESTIAL_CATALOG[0]);

  // Selected Target City & Satellite
  const [selectedCity, setSelectedCity] = useState<CityMarker | null>(CITIES[0]);
  const [selectedSatellite, setSelectedSatellite] = useState<SatelliteEntity | null>(REAL_SATELLITES[0]);

  // Deep Ground Map View State (For deep zoom from Universe -> Earth -> Tamil Nadu -> Street)
  const [groundMapState, setGroundMapState] = useState<{
    isOpen: boolean;
    lat: number;
    lng: number;
    zoom: number;
    placeName: string;
  }>({
    isOpen: false,
    lat: 13.0827,
    lng: 80.2707,
    zoom: 12,
    placeName: 'Chennai, Tamil Nadu',
  });

  // Sidebar Visibility
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Space World Settings (STRICT MANUAL CONTROLS: autoRotate is FALSE by default!)
  const [settings, setSettings] = useState<GlobeSettings>({
    satelliteLayer: 'blue_marble',
    autoRotate: false, // Default is OFF: When user stops moving, globe stops moving!
    autoRotateSpeed: 0.12,
    showClouds: true,
    showAtmosphere: true,
    showGrid: true,
    showMarkers: true,
    showSatellites: true,
    showNebula: true,
    gestureSensitivity: 1.0,
  });

  // Callbacks
  const handleGestureDetected = useCallback((result: GestureDetectionResult) => {
    setGestureResult(result);
  }, []);

  const handleHandsUpdated = useCallback((updatedHands: HandData[]) => {
    setHands(updatedHands);
  }, []);

  const handleHandAnchoringUpdated = useCallback(
    (midpoint: { x: number; y: number } | null, distance: number | null, pinching: boolean) => {
      setHandMidpoint(midpoint);
      setHandDistance(distance);
      setIsPinching(pinching);
    },
    []
  );

  const handleResetGlobe = () => {
    if ((window as any).__auraResetGlobe) {
      (window as any).__auraResetGlobe();
    }
  };

  const handleSelectLayer = (layer: SatelliteLayerMode) => {
    setSettings((prev) => ({ ...prev, satelliteLayer: layer }));
  };

  // Fly to Location on Globe
  const handleNavigateToLocation = (lat: number, lng: number, placeName: string, zoom: number) => {
    setSelectedCity({
      name: placeName,
      country: 'India',
      lat,
      lng,
      description: `Location at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      region: 'Custom',
    });
  };

  // Open Ground Aerial Map
  const handleEnterGroundMap = (lat: number, lng: number, placeName: string, zoom: number) => {
    setGroundMapState({
      isOpen: true,
      lat,
      lng,
      zoom,
      placeName,
    });
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans flex flex-col select-none">
      {/* 1. Full-Screen Front Webcam & Real-Time MediaPipe Hand Tracking Overlay */}
      <CameraHandTracker
        onGestureDetected={handleGestureDetected}
        onHandsUpdated={handleHandsUpdated}
        onHandAnchoringUpdated={handleHandAnchoringUpdated}
        isGestureControlsEnabled={isGestureControlsEnabled}
        sensitivity={settings.gestureSensitivity}
        isCameraActive={isCameraActive}
        onToggleCamera={setIsCameraActive}
      />

      {/* 2. Central AR 3D Hologram (Visually Anchored Above User's Hands) */}
      <ARHologramView
        gestureResult={gestureResult}
        settings={settings}
        activeObject={activeObject}
        isARAnchorMode={isARAnchorMode}
        handMidpoint={handMidpoint}
        handDistance={handDistance}
        isPinching={isPinching}
        selectedCity={selectedCity}
        selectedSatellite={selectedSatellite}
      />

      {/* 3. Deep Zoom Ground Map (Transitions when zooming to street/city locality) */}
      {groundMapState.isOpen && (
        <DeepZoomMap
          lat={groundMapState.lat}
          lng={groundMapState.lng}
          zoom={groundMapState.zoom}
          placeName={groundMapState.placeName}
          onBackToGlobe={() => setGroundMapState((prev) => ({ ...prev, isOpen: false }))}
          onLocationChanged={(lat, lng, placeName) =>
            setGroundMapState((prev) => ({ ...prev, lat, lng, placeName }))
          }
        />
      )}

      {/* 4. Futuristic HUD Overlay (Top & Bottom Bar Controls) */}
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
        onToggleGestureControls={() => setIsGestureControlsEnabled(!isGestureControlsEnabled)}
      />

      {/* Floating AR Anchoring Switch Pill */}
      <div className="absolute top-20 left-4 lg:left-[430px] z-20 pointer-events-auto">
        <button
          onClick={() => setIsARAnchorMode(!isARAnchorMode)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border backdrop-blur-xl transition shadow-xl cursor-pointer ${
            isARAnchorMode
              ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-[0_0_12px_#00f0ff]'
              : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
          title="Anchors the 3D hologram directly between your hands"
        >
          <HandMetal className="w-3.5 h-3.5 text-cyan-400" />
          <span>Hand Anchor AR: {isARAnchorMode ? 'LOCKED ON HANDS' : 'FLOATING'}</span>
        </button>
      </div>

      {/* 5. Left Telemetry & Space Control Sidebar */}
      <aside
        className={`absolute z-30 inset-y-0 left-0 w-full sm:w-[390px] lg:w-[420px] h-full flex flex-col bg-slate-950/95 backdrop-blur-3xl border-r border-cyan-500/20 transition-all duration-300 transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {/* Biometric Telemetry */}
          <HandStatusCard hands={hands} isGestureControlsEnabled={isGestureControlsEnabled} />

          {/* Spatial Gesture Guide Matrix */}
          <GestureGuide
            activeGesture={gestureResult?.activeGesture || 'none'}
            resetProgress={gestureResult?.resetProgress || 0}
            isPaused={gestureResult?.isPaused || false}
          />

          {/* Deep Zoom Hierarchy Explorer (Universe -> Milky Way -> Earth -> Tamil Nadu -> City) */}
          <CelestialExplorer
            activeObject={activeObject}
            onSelectObject={setActiveObject}
            onNavigateToLocation={handleNavigateToLocation}
            onEnterGroundMap={handleEnterGroundMap}
          />

          {/* Free Live Space Telemetry (ISS, NOAA Space Weather, NASA Asteroids, NASA APOD) */}
          <LiveSpaceDashboard
            onFocusISS={(lat, lng) => {
              handleNavigateToLocation(lat, lng, 'ISS Sub-Satellite Point', 4);
            }}
          />

          {/* System & Visual Controls */}
          <ControlsPanel
            settings={settings}
            onUpdateSettings={setSettings}
            onResetGlobe={handleResetGlobe}
            selectedSatellite={selectedSatellite}
          />
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 bg-slate-950 border-t border-cyan-500/15 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            AURAVERSE-UNI AR ENGINE
          </span>
          <span className="text-violet-400">100% FREE APIS</span>
        </div>
      </aside>

      {/* Sidebar Toggle Floating Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        title={isSidebarOpen ? 'Collapse Navigation Panel' : 'Expand Navigation Panel'}
        className={`absolute top-4 z-40 p-2.5 rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-cyan-500/30 text-cyan-300 hover:text-white shadow-2xl transition-all cursor-pointer ${
          isSidebarOpen
            ? 'left-[calc(100%-3.5rem)] sm:left-[400px] lg:left-[430px]'
            : 'left-4'
        }`}
      >
        {isSidebarOpen ? (
          <PanelLeftClose className="w-4 h-4" />
        ) : (
          <PanelLeftOpen className="w-4 h-4" />
        )}
      </button>

      {/* Offline Status Badge */}
      <OfflineIndicator />
    </div>
  );
}
