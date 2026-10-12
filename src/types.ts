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

export interface CityMarker {
  name: string;
  country: string;
  lat: number;
  lng: number;
  description: string;
}

export interface GlobeSettings {
  autoRotate: boolean;
  autoRotateSpeed: number;
  showClouds: boolean;
  showAtmosphere: boolean;
  showGrid: boolean;
  showMarkers: boolean;
  gestureSensitivity: number; // 0.5 to 2.0
}
