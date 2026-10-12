export type HandPosture = 'open_palm' | 'fist' | 'pinch' | 'pointing' | 'neutral';

export interface HandData {
  handedness: 'Left' | 'Right' | 'Unknown';
  score: number;
  landmarks: Array<{ x: number; y: number; z: number }>;
  center: { x: number; y: number; z: number };
  posture: HandPosture;
  isOpenPalm: boolean;
  isFist: boolean;
}

export type ActiveGestureType =
  | 'none'
  | 'pan'
  | 'zoom_in'
  | 'zoom_out'
  | 'rotate'
  | 'reset_hold'
  | 'paused_fist';

export interface GestureDetectionResult {
  activeGesture: ActiveGestureType;
  gestureDescription: string;
  panDelta: { x: number; y: number };
  zoomDelta: number; // positive = zoom in, negative = zoom out
  rotationDelta: { x: number; y: number; roll: number };
  resetProgress: number; // 0 to 1
  isPaused: boolean;
  handCount: number;
  confidence: number;
}

export type SatelliteLayerMode =
  | 'blue_marble'       // NASA Blue Marble true-color optical satellite composite
  | 'black_marble_night'// NASA VIIRS Black Marble Earth at night lights
  | 'topography'        // Global topographic relief & tectonic satellite
  | 'galaxy_milkyway';  // Deep space galactic panorama & constellations

export interface SatelliteEntity {
  id: string;
  name: string;
  code: string;
  altitudeKm: number;
  speedKmh: number;
  inclination: number; // degrees
  mission: string;
  agency: string;
  orbitRadius: number; // 3D units relative to Earth radius
  orbitSpeed: number;
  color: string;
  category: 'Space Station' | 'Observatory' | 'Earth Observation' | 'Deep Space';
}

export interface CityMarker {
  name: string;
  country: string;
  lat: number;
  lng: number;
  description: string;
  region: string;
}

export interface CelestialTarget {
  id: string;
  name: string;
  constellation: string;
  distanceLightYears: string;
  description: string;
  direction: [number, number, number];
}

export interface GlobeSettings {
  satelliteLayer: SatelliteLayerMode;
  autoRotate: boolean;
  autoRotateSpeed: number;
  showClouds: boolean;
  showAtmosphere: boolean;
  showGrid: boolean;
  showMarkers: boolean;
  showSatellites: boolean;
  showNebula: boolean;
  gestureSensitivity: number; // 0.5 to 2.5
}
