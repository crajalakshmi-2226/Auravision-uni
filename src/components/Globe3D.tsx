import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { SatelliteTextureManager } from '../utils/earthTexture';
import {
  GestureDetectionResult,
  CityMarker,
  GlobeSettings,
  SatelliteEntity,
  SatelliteLayerMode,
} from '../types';

interface Globe3DProps {
  gestureResult: GestureDetectionResult | null;
  settings: GlobeSettings;
  onResetComplete?: () => void;
  selectedCity?: CityMarker | null;
  onSelectCity?: (city: CityMarker | null) => void;
  selectedSatellite?: SatelliteEntity | null;
  onSelectSatellite?: (sat: SatelliteEntity | null) => void;
}

export const REAL_SATELLITES: SatelliteEntity[] = [
  {
    id: 'iss',
    name: 'International Space Station (ISS)',
    code: 'ISS-ZARYA',
    altitudeKm: 420,
    speedKmh: 27580,
    inclination: 51.6,
    mission: 'Habited microgravity orbital laboratory',
    agency: 'NASA / ESA / JAXA / CSA / Roscosmos',
    orbitRadius: 2.15,
    orbitSpeed: 0.45,
    color: '#00f0ff',
    category: 'Space Station',
  },
  {
    id: 'hubble',
    name: 'Hubble Space Telescope (HST)',
    code: 'HST-1990',
    altitudeKm: 540,
    speedKmh: 27300,
    inclination: 28.5,
    mission: 'Deep cosmic optical & UV astrophysics',
    agency: 'NASA / ESA',
    orbitRadius: 2.26,
    orbitSpeed: 0.38,
    color: '#c084fc',
    category: 'Observatory',
  },
  {
    id: 'landsat9',
    name: 'Landsat 9 Earth Observer',
    code: 'LANDSAT-9',
    altitudeKm: 705,
    speedKmh: 26800,
    inclination: 98.2,
    mission: 'Multispectral planetary surface monitoring',
    agency: 'NASA / USGS',
    orbitRadius: 2.38,
    orbitSpeed: 0.32,
    color: '#34d399',
    category: 'Earth Observation',
  },
  {
    id: 'jwst',
    name: 'James Webb Space Telescope (JWST)',
    code: 'JWST-L2',
    altitudeKm: 1500000,
    speedKmh: 1100,
    inclination: 5.2,
    mission: 'Deep cosmic infrared universe observatory',
    agency: 'NASA / ESA / CSA',
    orbitRadius: 3.1,
    orbitSpeed: 0.12,
    color: '#facc15',
    category: 'Deep Space',
  },
];

export const CITIES: CityMarker[] = [
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503, description: 'Cyberpunk metropolis & AI tech hub', region: 'Asia-Pacific' },
  { name: 'London', country: 'United Kingdom', lat: 51.5074, lng: -0.1278, description: 'Prime meridian & global financial center', region: 'Europe' },
  { name: 'New York', country: 'United States', lat: 40.7128, lng: -74.006, description: 'Global cultural epicenter', region: 'North America' },
  { name: 'San Francisco', country: 'United States', lat: 37.7749, lng: -122.4194, description: 'Silicon Valley space & AI innovation', region: 'North America' },
  { name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093, description: 'Pacific harbor & Southern cross', region: 'Oceania' },
  { name: 'Cairo', country: 'Egypt', lat: 30.0444, lng: 31.2357, description: 'Ancient cradle on the River Nile', region: 'Africa' },
  { name: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198, description: 'Futuristic equatorial city-state', region: 'Asia-Pacific' },
  { name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522, description: 'City of light & European Space Agency center', region: 'Europe' },
  { name: 'Rio de Janeiro', country: 'Brazil', lat: -22.9068, lng: -43.1729, description: 'Iconic South Atlantic coastal metropolis', region: 'South America' },
];

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

export const Globe3D: React.FC<Globe3DProps> = ({
  gestureResult,
  settings,
  onResetComplete,
  selectedCity,
  onSelectCity,
  selectedSatellite,
  onSelectSatellite,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Three.js instances
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const earthMeshRef = useRef<THREE.Mesh | null>(null);
  const cloudsMeshRef = useRef<THREE.Mesh | null>(null);
  const atmosphereMeshRef = useRef<THREE.Mesh | null>(null);
  const gridMeshRef = useRef<THREE.Mesh | null>(null);
  const markersGroupRef = useRef<THREE.Group | null>(null);
  const satellitesGroupRef = useRef<THREE.Group | null>(null);
  const nebulaGroupRef = useRef<THREE.Group | null>(null);
  const textureManagerRef = useRef<SatelliteTextureManager | null>(null);

  // Camera & Globe Transforms
  const globeRotation = useRef({ x: 0.2, y: 0, z: 0 });
  const cameraTarget = useRef({ x: 0, y: 0, z: 0 });
  const cameraDistance = useRef(4.6);
  const isResetting = useRef(false);

  // Manual pointer controls
  const isPointerDown = useRef(false);
  const pointerStart = useRef({ x: 0, y: 0 });
  const dragMode = useRef<'rotate' | 'pan'>('rotate');

  const animFrameId = useRef<number | null>(null);

  // Initialize Three.js Space World
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(0x020617, 0.012);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1200);
    camera.position.set(0, 0, cameraDistance.current);
    cameraRef.current = camera;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // 4. Lighting System
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    // Primary Solar Directional Light
    const sunLight = new THREE.DirectionalLight(0xfffaed, 2.2);
    sunLight.position.set(12, 5, 8);
    scene.add(sunLight);

    // Cyber space fill light
    const cosmicFill = new THREE.DirectionalLight(0x00f0ff, 0.6);
    cosmicFill.position.set(-10, -6, -6);
    scene.add(cosmicFill);

    const violetRim = new THREE.DirectionalLight(0xa855f7, 0.5);
    violetRim.position.set(0, 10, -8);
    scene.add(violetRim);

    // 5. Cosmic Nebulae & Deep Space Dust
    const nebulaGroup = new THREE.Group();
    scene.add(nebulaGroup);
    nebulaGroupRef.current = nebulaGroup;

    // Add multi-layered cosmic nebula dust clouds
    const nebulaColors = [0x06b6d4, 0x8b5cf6, 0xec4899, 0x3b82f6];
    for (let i = 0; i < 40; i++) {
      const radius = 60 + Math.random() * 80;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      const geo = new THREE.SphereGeometry(14 + Math.random() * 26, 12, 12);
      const mat = new THREE.MeshBasicMaterial({
        color: nebulaColors[i % nebulaColors.length],
        transparent: true,
        opacity: 0.035 + Math.random() * 0.04,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const cloud = new THREE.Mesh(geo, mat);
      cloud.position.set(x, y, z);
      nebulaGroup.add(cloud);
    }

    // 6. 2,600 Starfield with realistic stellar temperatures
    const starCount = 2600;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    const starColorPalette = [
      new THREE.Color(0xa5f3fc), // O/B Cyan-Blue
      new THREE.Color(0xffffff), // A White
      new THREE.Color(0xfef08a), // G Solar Yellow
      new THREE.Color(0xfbcfe8), // M Warm Red/Pink
      new THREE.Color(0xc4b5fd), // Violet
    ];

    for (let i = 0; i < starCount; i++) {
      const radius = 70 + Math.random() * 90;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = radius * Math.cos(phi);

      const col = starColorPalette[Math.floor(Math.random() * starColorPalette.length)];
      starColors[i * 3] = col.r;
      starColors[i * 3 + 1] = col.g;
      starColors[i * 3 + 2] = col.b;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.6,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // 7. Initialize Satellite Texture Manager
    const textureManager = new SatelliteTextureManager();
    textureManagerRef.current = textureManager;

    // 8. Earth Sphere
    const earthRadius = 1.8;
    const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 64);
    const earthMat = new THREE.MeshStandardMaterial({
      map: textureManager.getTexture(settings.satelliteLayer),
      roughness: 0.65,
      metalness: 0.15,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earthMesh);
    earthMeshRef.current = earthMesh;

    // 9. Clouds Layer
    const cloudsGeo = new THREE.SphereGeometry(earthRadius * 1.012, 64, 64);
    const cloudsMat = new THREE.MeshStandardMaterial({
      map: textureManager.getCloudsTexture(),
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat);
    scene.add(cloudsMesh);
    cloudsMeshRef.current = cloudsMesh;

    // 10. Atmospheric Fresnel Shader Glow
    const atmosphereGeo = new THREE.SphereGeometry(earthRadius * 1.15, 64, 64);
    const atmosphereMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
          gl_FragColor = vec4(0.0, 0.85, 1.0, 1.0) * intensity * 0.95;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    scene.add(atmosphereMesh);
    atmosphereMeshRef.current = atmosphereMesh;

    // 11. Holographic Cyber Coordinate Grid
    const gridGeo = new THREE.SphereGeometry(earthRadius * 1.025, 24, 24);
    const gridMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    });
    const gridMesh = new THREE.Mesh(gridGeo, gridMat);
    scene.add(gridMesh);
    gridMeshRef.current = gridMesh;

    // 12. City Markers Group
    const markersGroup = new THREE.Group();
    scene.add(markersGroup);
    markersGroupRef.current = markersGroup;

    CITIES.forEach((city) => {
      const pos = latLngToVector3(city.lat, city.lng, earthRadius * 1.015);

      const pinGeo = new THREE.SphereGeometry(0.032, 16, 16);
      const pinMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
      const pinMesh = new THREE.Mesh(pinGeo, pinMat);
      pinMesh.position.copy(pos);

      const ringGeo = new THREE.RingGeometry(0.045, 0.065, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xa855f7,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.copy(pos);
      ringMesh.lookAt(new THREE.Vector3(0, 0, 0));

      const normal = pos.clone().normalize();
      const pillarGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.15, 8);
      const pillarMat = new THREE.MeshBasicMaterial({
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.7,
      });
      const pillarMesh = new THREE.Mesh(pillarGeo, pillarMat);
      pillarMesh.position.copy(pos.clone().add(normal.clone().multiplyScalar(0.075)));
      pillarMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

      const markerObj = new THREE.Group();
      markerObj.add(pinMesh);
      markerObj.add(ringMesh);
      markerObj.add(pillarMesh);
      (markerObj as any).userData = { city };

      markersGroup.add(markerObj);
    });

    // 13. Orbiting Real Satellites Group
    const satellitesGroup = new THREE.Group();
    scene.add(satellitesGroup);
    satellitesGroupRef.current = satellitesGroup;

    REAL_SATELLITES.forEach((sat) => {
      const satContainer = new THREE.Group();
      (satContainer as any).userData = { sat, currentAngle: Math.random() * Math.PI * 2 };

      // Orbit Trajectory Ring
      const orbitCurve = new THREE.EllipseCurve(0, 0, sat.orbitRadius, sat.orbitRadius, 0, 2 * Math.PI, false, 0);
      const orbitPoints = orbitCurve.getPoints(90);
      const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints.map((p) => new THREE.Vector3(p.x, 0, p.y)));
      const orbitMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(sat.color),
        transparent: true,
        opacity: 0.35,
      });
      const orbitLine = new THREE.Line(orbitGeo, orbitMat);

      // Tilt orbit according to inclination
      const inclinationRad = (sat.inclination * Math.PI) / 180;
      orbitLine.rotation.x = inclinationRad;
      satContainer.add(orbitLine);

      // Satellite Craft Body
      const craftGroup = new THREE.Group();

      // Main core
      const bodyGeo = new THREE.BoxGeometry(0.05, 0.05, 0.08);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0xdddddd,
        metalness: 0.8,
        roughness: 0.2,
      });
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      craftGroup.add(bodyMesh);

      // Solar Panels
      const panelGeo = new THREE.BoxGeometry(0.18, 0.005, 0.06);
      const panelMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        metalness: 0.9,
        roughness: 0.1,
      });
      const panelMesh = new THREE.Mesh(panelGeo, panelMat);
      craftGroup.add(panelMesh);

      // Glowing Beacon Light
      const beaconGeo = new THREE.SphereGeometry(0.02, 12, 12);
      const beaconMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(sat.color) });
      const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
      beaconMesh.position.y = 0.04;
      craftGroup.add(beaconMesh);

      // Positioning helper
      (craftGroup as any).userData = { sat, inclinationRad };
      satContainer.add(craftGroup);

      satellitesGroup.add(satContainer);
    });

    // 14. Responsive Resize
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 15. Animation Loop
    let lastTime = performance.now();
    const animate = (currentTime: number) => {
      animFrameId.current = requestAnimationFrame(animate);
      const dt = Math.min(0.1, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      // Handle Smooth Reset
      if (isResetting.current) {
        globeRotation.current.x += (0.2 - globeRotation.current.x) * 0.08;
        globeRotation.current.y += (0 - globeRotation.current.y) * 0.08;
        globeRotation.current.z += (0 - globeRotation.current.z) * 0.08;
        cameraTarget.current.x += (0 - cameraTarget.current.x) * 0.08;
        cameraTarget.current.y += (0 - cameraTarget.current.y) * 0.08;
        cameraDistance.current += (4.6 - cameraDistance.current) * 0.08;

        const isNearDefault =
          Math.abs(globeRotation.current.x - 0.2) < 0.01 &&
          Math.abs(globeRotation.current.y) < 0.01 &&
          Math.abs(cameraDistance.current - 4.6) < 0.02;

        if (isNearDefault) {
          globeRotation.current.x = 0.2;
          globeRotation.current.y = 0;
          globeRotation.current.z = 0;
          cameraTarget.current.x = 0;
          cameraTarget.current.y = 0;
          cameraDistance.current = 4.6;
          isResetting.current = false;
          if (onResetComplete) onResetComplete();
        }
      } else if (settings.autoRotate && (!gestureResult || gestureResult.activeGesture === 'none')) {
        globeRotation.current.y += settings.autoRotateSpeed * dt * 0.25;
      }

      // Rotate Earth & Layers
      if (earthMeshRef.current) {
        earthMeshRef.current.rotation.x = globeRotation.current.x;
        earthMeshRef.current.rotation.y = globeRotation.current.y;
        earthMeshRef.current.rotation.z = globeRotation.current.z;
      }

      if (cloudsMeshRef.current && earthMeshRef.current) {
        cloudsMeshRef.current.rotation.x = globeRotation.current.x;
        cloudsMeshRef.current.rotation.y = globeRotation.current.y * 1.05 + currentTime * 0.00004;
        cloudsMeshRef.current.rotation.z = globeRotation.current.z;
      }

      if (gridMeshRef.current && earthMeshRef.current) {
        gridMeshRef.current.rotation.x = globeRotation.current.x;
        gridMeshRef.current.rotation.y = globeRotation.current.y;
        gridMeshRef.current.rotation.z = globeRotation.current.z;
      }

      if (markersGroupRef.current) {
        markersGroupRef.current.rotation.x = globeRotation.current.x;
        markersGroupRef.current.rotation.y = globeRotation.current.y;
        markersGroupRef.current.rotation.z = globeRotation.current.z;

        const pulse = 1 + Math.sin(currentTime * 0.004) * 0.25;
        markersGroupRef.current.children.forEach((child) => {
          const ring = child.children[1];
          if (ring) ring.scale.set(pulse, pulse, 1);
        });
      }

      // Animate Satellites along their 3D orbital planes
      if (satellitesGroupRef.current) {
        satellitesGroupRef.current.children.forEach((satCont) => {
          const data = (satCont as any).userData;
          if (!data) return;
          data.currentAngle += data.sat.orbitSpeed * dt * 0.4;
          const r = data.sat.orbitRadius;
          const craftGroup = satCont.children[1];
          if (craftGroup) {
            const inc = (craftGroup as any).userData.inclinationRad;
            // Orbit position with inclination tilt
            const ox = r * Math.cos(data.currentAngle);
            const oz = r * Math.sin(data.currentAngle) * Math.cos(inc);
            const oy = r * Math.sin(data.currentAngle) * Math.sin(inc);

            craftGroup.position.set(ox, oy, oz);
            craftGroup.rotation.y += 0.02;
          }
        });
      }

      // Nebula slow rotation
      if (nebulaGroupRef.current) {
        nebulaGroupRef.current.rotation.y += 0.00005;
      }

      // Camera position with pan offset & zoom
      if (cameraRef.current) {
        cameraRef.current.position.x = cameraTarget.current.x;
        cameraRef.current.position.y = cameraTarget.current.y;
        cameraRef.current.position.z = cameraDistance.current;
        cameraRef.current.lookAt(cameraTarget.current.x, cameraTarget.current.y, 0);
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animFrameId.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      if (rendererRef.current && rendererRef.current.domElement) {
        container.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, []);

  // Update Satellite Texture Layer Mode (Blue Marble / Night Lights / Topography / Galaxy)
  useEffect(() => {
    if (!earthMeshRef.current || !textureManagerRef.current) return;
    const newTex = textureManagerRef.current.getTexture(settings.satelliteLayer);
    (earthMeshRef.current.material as THREE.MeshStandardMaterial).map = newTex;
    (earthMeshRef.current.material as THREE.MeshStandardMaterial).needsUpdate = true;

    // Adjust atmosphere & clouds visibility for galaxy mode
    if (settings.satelliteLayer === 'galaxy_milkyway') {
      if (cloudsMeshRef.current) cloudsMeshRef.current.visible = false;
      if (atmosphereMeshRef.current) atmosphereMeshRef.current.visible = false;
    } else {
      if (cloudsMeshRef.current) cloudsMeshRef.current.visible = settings.showClouds;
      if (atmosphereMeshRef.current) atmosphereMeshRef.current.visible = settings.showAtmosphere;
    }
  }, [settings.satelliteLayer, settings.showClouds, settings.showAtmosphere]);

  // Update Settings Toggles
  useEffect(() => {
    if (gridMeshRef.current) gridMeshRef.current.visible = settings.showGrid;
    if (markersGroupRef.current) markersGroupRef.current.visible = settings.showMarkers;
    if (satellitesGroupRef.current) satellitesGroupRef.current.visible = settings.showSatellites;
    if (nebulaGroupRef.current) nebulaGroupRef.current.visible = settings.showNebula;
  }, [settings.showGrid, settings.showMarkers, settings.showSatellites, settings.showNebula]);

  // Focus City
  useEffect(() => {
    if (!selectedCity) return;
    const targetY = -((selectedCity.lng + 180) * (Math.PI / 180)) + Math.PI / 2;
    const targetX = (selectedCity.lat * (Math.PI / 180)) * 0.5;
    globeRotation.current.y = targetY;
    globeRotation.current.x = targetX;
  }, [selectedCity]);

  // Focus Satellite
  useEffect(() => {
    if (!selectedSatellite) return;
    cameraDistance.current = Math.max(2.6, selectedSatellite.orbitRadius * 1.35);
  }, [selectedSatellite]);

  // Real-time Gesture Control Stream
  useEffect(() => {
    if (!gestureResult || gestureResult.isPaused) return;

    if (gestureResult.activeGesture === 'reset_hold' && gestureResult.resetProgress >= 0.99) {
      isResetting.current = true;
      return;
    }

    if (isResetting.current) return;

    // 1. ZOOM DELTA (Distance change)
    if (Math.abs(gestureResult.zoomDelta) > 0.001) {
      cameraDistance.current = THREE.MathUtils.clamp(
        cameraDistance.current - gestureResult.zoomDelta * 0.75,
        2.1,
        8.5
      );
    }

    // 2. PAN DELTA (Hands moving together)
    if (gestureResult.activeGesture === 'pan') {
      const panSpeed = 0.5;
      cameraTarget.current.x = THREE.MathUtils.clamp(
        cameraTarget.current.x + gestureResult.panDelta.x * panSpeed,
        -2.2,
        2.2
      );
      cameraTarget.current.y = THREE.MathUtils.clamp(
        cameraTarget.current.y - gestureResult.panDelta.y * panSpeed,
        -1.6,
        1.6
      );
    }

    // 3. ROTATION DELTA (Hands moving in opposite directions)
    if (gestureResult.activeGesture === 'rotate') {
      const rotSpeed = 0.6;
      globeRotation.current.y += gestureResult.rotationDelta.y * rotSpeed;
      globeRotation.current.x = THREE.MathUtils.clamp(
        globeRotation.current.x + gestureResult.rotationDelta.x * rotSpeed,
        -Math.PI / 2.1,
        Math.PI / 2.1
      );
      globeRotation.current.z += gestureResult.rotationDelta.roll * 0.25;
    }
  }, [gestureResult]);

  const handleTriggerReset = useCallback(() => {
    isResetting.current = true;
  }, []);

  useEffect(() => {
    (window as any).__auraResetGlobe = handleTriggerReset;
    return () => {
      delete (window as any).__auraResetGlobe;
    };
  }, [handleTriggerReset]);

  // Manual Pointer Controls (Mouse & Touch Fallback)
  const handlePointerDown = (e: React.PointerEvent) => {
    isPointerDown.current = true;
    pointerStart.current = { x: e.clientX, y: e.clientY };
    dragMode.current = e.shiftKey || e.button === 2 ? 'pan' : 'rotate';
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPointerDown.current) return;
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    pointerStart.current = { x: e.clientX, y: e.clientY };

    if (dragMode.current === 'pan') {
      cameraTarget.current.x = THREE.MathUtils.clamp(
        cameraTarget.current.x - dx * 0.004,
        -2.2,
        2.2
      );
      cameraTarget.current.y = THREE.MathUtils.clamp(
        cameraTarget.current.y + dy * 0.004,
        -1.6,
        1.6
      );
    } else {
      globeRotation.current.y += dx * 0.0065;
      globeRotation.current.x = THREE.MathUtils.clamp(
        globeRotation.current.x + dy * 0.0065,
        -Math.PI / 2.1,
        Math.PI / 2.1
      );
    }
  };

  const handlePointerUp = () => {
    isPointerDown.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    cameraDistance.current = THREE.MathUtils.clamp(
      cameraDistance.current + e.deltaY * 0.002,
      2.1,
      8.5
    );
  };

  return (
    <div
      ref={mountRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
      className="relative w-full h-full cursor-grab active:cursor-grabbing overflow-hidden select-none touch-none"
    >
      {/* Sci-Fi Galactic Reticle Center Overlay */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-25">
        <div
          className="w-56 h-56 rounded-full border border-dashed border-cyan-400/40 animate-spin"
          style={{ animationDuration: '45s' }}
        />
        <div className="absolute w-72 h-72 rounded-full border border-violet-500/20" />
        <div className="absolute w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#00f0ff]" />
      </div>
    </div>
  );
};
