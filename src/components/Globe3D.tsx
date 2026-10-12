import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { loadEarthTextureWithFallback } from '../utils/earthTexture';
import { GestureDetectionResult, CityMarker, GlobeSettings } from '../types';

interface Globe3DProps {
  gestureResult: GestureDetectionResult | null;
  settings: GlobeSettings;
  onResetComplete?: () => void;
  selectedCity?: CityMarker | null;
  onSelectCity?: (city: CityMarker | null) => void;
}

export const CITIES: CityMarker[] = [
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503, description: 'Cyberpunk metropolis & tech hub' },
  { name: 'London', country: 'United Kingdom', lat: 51.5074, lng: -0.1278, description: 'Prime meridian & global financial center' },
  { name: 'New York', country: 'United States', lat: 40.7128, lng: -74.006, description: 'The Big Apple & cultural epicenter' },
  { name: 'San Francisco', country: 'United States', lat: 37.7749, lng: -122.4194, description: 'Silicon Valley AI innovation center' },
  { name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093, description: 'Pacific harbor & Southern cross' },
  { name: 'Cairo', country: 'Egypt', lat: 30.0444, lng: 31.2357, description: 'Ancient cradle on the river Nile' },
  { name: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198, description: 'Futuristic island city-state' },
  { name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522, description: 'City of light & global culture' },
  { name: 'Rio de Janeiro', country: 'Brazil', lat: -22.9068, lng: -43.1729, description: 'Iconic coastal metropolis' },
];

// Converts Lat/Long coordinates to 3D Cartesian Vector
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
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Three.js instances refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const earthMeshRef = useRef<THREE.Mesh | null>(null);
  const cloudsMeshRef = useRef<THREE.Mesh | null>(null);
  const atmosphereMeshRef = useRef<THREE.Mesh | null>(null);
  const gridMeshRef = useRef<THREE.Mesh | null>(null);
  const markersGroupRef = useRef<THREE.Group | null>(null);

  // Camera & Globe Transform State
  const globeRotation = useRef({ x: 0.2, y: 0, z: 0 });
  const cameraTarget = useRef({ x: 0, y: 0, z: 0 });
  const cameraDistance = useRef(4.6);
  const isResetting = useRef(false);

  // Manual mouse/touch drag state
  const isPointerDown = useRef(false);
  const pointerStart = useRef({ x: 0, y: 0 });
  const dragMode = useRef<'rotate' | 'pan'>('rotate');

  // Animation frame ref
  const animFrameId = useRef<number | null>(null);

  // Initial Scene Setup
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, cameraDistance.current);
    cameraRef.current = camera;

    // 3. Renderer with antialiasing and high pixel ratio
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.8);
    sunLight.position.set(8, 4, 6);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x06b6d4, 1.2);
    rimLight.position.set(-8, -4, -4);
    scene.add(rimLight);

    // 5. Starfield Background
    const starCount = 1400;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    const cyanColor = new THREE.Color(0x06b6d4);
    const violetColor = new THREE.Color(0xa855f7);
    const whiteColor = new THREE.Color(0xffffff);

    for (let i = 0; i < starCount; i++) {
      const radius = 40 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = radius * Math.cos(phi);

      const rand = Math.random();
      const col = rand > 0.6 ? cyanColor : rand > 0.3 ? violetColor : whiteColor;
      starColors[i * 3] = col.r;
      starColors[i * 3 + 1] = col.g;
      starColors[i * 3 + 2] = col.b;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // 6. Earth Mesh with procedural fallback
    const earthRadius = 1.8;
    const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 64);
    const { earthTexture, cloudsTexture } = loadEarthTextureWithFallback();

    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.7,
      metalness: 0.1,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earthMesh);
    earthMeshRef.current = earthMesh;

    // 7. Clouds Layer
    const cloudsGeo = new THREE.SphereGeometry(earthRadius * 1.012, 64, 64);
    const cloudsMat = new THREE.MeshStandardMaterial({
      map: cloudsTexture,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat);
    scene.add(cloudsMesh);
    cloudsMeshRef.current = cloudsMesh;

    // 8. Cyber Atmospheric Glow
    const atmosphereGeo = new THREE.SphereGeometry(earthRadius * 1.15, 64, 64);
    const atmosphereShader = {
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
          float intensity = pow(0.6 - dot(vNormal, vec3(0, 0, 1.0)), 2.2);
          gl_FragColor = vec4(0.02, 0.72, 0.95, 1.0) * intensity * 0.9;
        }
      `,
    };
    const atmosphereMat = new THREE.ShaderMaterial({
      vertexShader: atmosphereShader.vertexShader,
      fragmentShader: atmosphereShader.fragmentShader,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    scene.add(atmosphereMesh);
    atmosphereMeshRef.current = atmosphereMesh;

    // 9. Cyber Holographic Wireframe Grid
    const gridGeo = new THREE.SphereGeometry(earthRadius * 1.025, 24, 24);
    const gridMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      wireframe: true,
      transparent: true,
      opacity: 0.1,
    });
    const gridMesh = new THREE.Mesh(gridGeo, gridMat);
    scene.add(gridMesh);
    gridMeshRef.current = gridMesh;

    // 10. City Markers Group
    const markersGroup = new THREE.Group();
    scene.add(markersGroup);
    markersGroupRef.current = markersGroup;

    CITIES.forEach((city) => {
      const pos = latLngToVector3(city.lat, city.lng, earthRadius * 1.015);

      // Marker Pin Base
      const pinGeo = new THREE.SphereGeometry(0.032, 16, 16);
      const pinMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
      const pinMesh = new THREE.Mesh(pinGeo, pinMat);
      pinMesh.position.copy(pos);

      // Marker Beacon Ring
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

      // Glow Pillar
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

    // 11. Resize Handler
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 12. Render Animation Loop
    let lastTime = performance.now();
    const animate = (currentTime: number) => {
      animFrameId.current = requestAnimationFrame(animate);
      const dt = Math.min(0.1, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      // Handle Smooth Reset Animation
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
          Math.abs(cameraDistance.current - 4.6) < 0.02 &&
          Math.abs(cameraTarget.current.x) < 0.01;

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
        // Subtle idle rotation when no active gestures
        globeRotation.current.y += settings.autoRotateSpeed * dt * 0.25;
      }

      // Apply rotation to Earth and children
      if (earthMeshRef.current) {
        earthMeshRef.current.rotation.x = globeRotation.current.x;
        earthMeshRef.current.rotation.y = globeRotation.current.y;
        earthMeshRef.current.rotation.z = globeRotation.current.z;
      }

      // Clouds rotate slightly faster for realism
      if (cloudsMeshRef.current && earthMeshRef.current) {
        cloudsMeshRef.current.rotation.x = globeRotation.current.x;
        cloudsMeshRef.current.rotation.y = globeRotation.current.y * 1.05 + currentTime * 0.00004;
        cloudsMeshRef.current.rotation.z = globeRotation.current.z;
      }

      // Grid rotation
      if (gridMeshRef.current && earthMeshRef.current) {
        gridMeshRef.current.rotation.x = globeRotation.current.x;
        gridMeshRef.current.rotation.y = globeRotation.current.y;
        gridMeshRef.current.rotation.z = globeRotation.current.z;
      }

      // Markers follow globe rotation
      if (markersGroupRef.current) {
        markersGroupRef.current.rotation.x = globeRotation.current.x;
        markersGroupRef.current.rotation.y = globeRotation.current.y;
        markersGroupRef.current.rotation.z = globeRotation.current.z;

        // Pulse marker rings
        const pulse = 1 + Math.sin(currentTime * 0.004) * 0.25;
        markersGroupRef.current.children.forEach((child) => {
          const ring = child.children[1];
          if (ring) {
            ring.scale.set(pulse, pulse, 1);
          }
        });
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

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      if (rendererRef.current && rendererRef.current.domElement) {
        container.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, []);

  // Update Settings Toggles (Clouds, Atmosphere, Grid, Markers)
  useEffect(() => {
    if (cloudsMeshRef.current) cloudsMeshRef.current.visible = settings.showClouds;
    if (atmosphereMeshRef.current) atmosphereMeshRef.current.visible = settings.showAtmosphere;
    if (gridMeshRef.current) gridMeshRef.current.visible = settings.showGrid;
    if (markersGroupRef.current) markersGroupRef.current.visible = settings.showMarkers;
  }, [settings.showClouds, settings.showAtmosphere, settings.showGrid, settings.showMarkers]);

  // Handle Target City Focus
  useEffect(() => {
    if (!selectedCity) return;
    // Animate rotation to bring selected city to front (facing camera)
    const targetY = -((selectedCity.lng + 180) * (Math.PI / 180)) + Math.PI / 2;
    const targetX = (selectedCity.lat * (Math.PI / 180)) * 0.5;

    globeRotation.current.y = targetY;
    globeRotation.current.x = targetX;
  }, [selectedCity]);

  // Process Gesture Stream from Hand Tracking
  useEffect(() => {
    if (!gestureResult || gestureResult.isPaused) return;

    // Reset hold triggered
    if (gestureResult.activeGesture === 'reset_hold' && gestureResult.resetProgress >= 0.99) {
      isResetting.current = true;
      return;
    }

    if (isResetting.current) return;

    // 1. ZOOM DELTA (Distance change)
    if (Math.abs(gestureResult.zoomDelta) > 0.001) {
      // Zoom in decreases cameraDistance, zoom out increases cameraDistance
      cameraDistance.current = THREE.MathUtils.clamp(
        cameraDistance.current - gestureResult.zoomDelta * 0.7,
        2.2, // min distance (close-up)
        7.5  // max distance (far space)
      );
    }

    // 2. PAN DELTA (Both hands moving in unison)
    if (gestureResult.activeGesture === 'pan') {
      const panSpeed = 0.45;
      cameraTarget.current.x = THREE.MathUtils.clamp(
        cameraTarget.current.x + gestureResult.panDelta.x * panSpeed,
        -1.8,
        1.8
      );
      cameraTarget.current.y = THREE.MathUtils.clamp(
        cameraTarget.current.y - gestureResult.panDelta.y * panSpeed,
        -1.4,
        1.4
      );
    }

    // 3. ROTATION DELTA (Hands moving in opposite directions)
    if (gestureResult.activeGesture === 'rotate') {
      const rotSpeed = 0.55;
      globeRotation.current.y += gestureResult.rotationDelta.y * rotSpeed;
      globeRotation.current.x = THREE.MathUtils.clamp(
        globeRotation.current.x + gestureResult.rotationDelta.x * rotSpeed,
        -Math.PI / 2.2,
        Math.PI / 2.2
      );
      // Subtle roll
      globeRotation.current.z += gestureResult.rotationDelta.roll * 0.2;
    }
  }, [gestureResult]);

  // Trigger smooth reset directly
  const handleTriggerReset = useCallback(() => {
    isResetting.current = true;
  }, []);

  // Expose reset to window or parent if needed
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
        cameraTarget.current.x - dx * 0.0035,
        -1.8,
        1.8
      );
      cameraTarget.current.y = THREE.MathUtils.clamp(
        cameraTarget.current.y + dy * 0.0035,
        -1.4,
        1.4
      );
    } else {
      globeRotation.current.y += dx * 0.006;
      globeRotation.current.x = THREE.MathUtils.clamp(
        globeRotation.current.x + dy * 0.006,
        -Math.PI / 2.2,
        Math.PI / 2.2
      );
    }
  };

  const handlePointerUp = () => {
    isPointerDown.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    cameraDistance.current = THREE.MathUtils.clamp(
      cameraDistance.current + e.deltaY * 0.002,
      2.2,
      7.5
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
      {/* Reticle Overlay / Crosshair */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-30">
        <div className="w-48 h-48 rounded-full border border-dashed border-cyan-500/40 animate-spin" style={{ animationDuration: '40s' }} />
        <div className="absolute w-64 h-64 rounded-full border border-violet-500/20" />
      </div>
    </div>
  );
};
