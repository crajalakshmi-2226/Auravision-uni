export type HologramType =
  | 'earth'
  | 'moon'
  | 'galaxy'
  | 'sun'
  | 'mars'
  | 'universe';

export interface HologramDefinition {
  id: HologramType;
  name: string;
  tagline: string;
  category: string;
  color: string;
  glowColor: string;
  realRadius: string;
  realDistance: string;
  temperature: string;
  description: string;
}

export type HandPosture = 'open_palm' | 'fist' | 'pinch' | 'pointing' | 'neutral';

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface HandData {
  handedness: 'Left' | 'Right' | 'Unknown';
  score: number;
  landmarks: HandLandmark[];
  center: { x: number; y: number; z: number };
  palmCenter?: { x: number; y: number; z: number };
  palmNormal?: { x: number; y: number; z: number };
  palmRoll?: number; // in radians
  palmPitch?: number;
  posture: HandPosture;
  isOpenPalm: boolean;
  isFist: boolean;
  isPinching?: boolean;
}

export type ActiveGesture =
  | 'none'
  | 'palm_hover'
  | 'pinch_grab'
  | 'dual_hand_zoom'
  | 'dual_hand_spin'
  | 'fist_stasis'
  | 'point_select'
  | 'reset_hold';

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
  zoomDelta: number;
  rotationDelta: { x: number; y: number; roll: number };
  resetProgress: number;
  isPaused: boolean;
  handCount: number;
  confidence: number;
}

export interface HandTrackingState {
  hands: HandData[];
  anchorPoint: { x: number; y: number; z: number } | null;
  handCount: number;
  activeGesture: ActiveGesture;
  gestureDescription: string;
  zoomScale: number;
  rotationDelta: { x: number; y: number; z: number };
  isPinching: boolean;
  resetProgress: number;
}

export interface AppSettings {
  soundEnabled: boolean;
  showSkeleton: boolean;
  showEnergyPedestal: boolean;
  hologramBrightness: number;
  gestureSensitivity: number;
  mirrorCamera: boolean;
}

export type SatelliteLayerMode =
  | 'blue_marble'
  | 'black_marble_night'
  | 'topography'
  | 'galaxy_milkyway';

export interface SatelliteEntity {
  id: string;
  name: string;
  code: string;
  altitudeKm: number;
  speedKmh: number;
  inclination: number;
  mission: string;
  agency: string;
  orbitRadius: number;
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
  gestureSensitivity: number;
}
