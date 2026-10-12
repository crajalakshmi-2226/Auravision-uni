import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { SatelliteTextureManager } from '../utils/earthTexture';
import {
  GestureDetectionResult,
  CityMarker,
  GlobeSettings,
  SatelliteEntity,
} from '../types';
import { CelestialObjectData } from '../data/celestialObjects';
import { REAL_SATELLITES, CITIES } from './Globe3D';

interface ARHologramViewProps {
  gestureResult: GestureDetectionResult | null;
  settings: GlobeSettings;
  activeObject: CelestialObjectData;
  isARAnchorMode: boolean; // Anchors hologram between user's real hands
  handMidpoint: { x: number; y: number } | null;
  handDistance: number | null;
  isPinching: boolean;
  selectedCity?: CityMarker | null;
  onSelectCity?: (city: CityMarker | null) => void;
  selectedSatellite?: SatelliteEntity | null;
  onSelectSatellite?: (sat: SatelliteEntity | null) => void;
  onResetComplete?: () => void;
}

export const ARHologramView: React.FC<ARHologramViewProps> = ({
  gestureResult,
  settings,
  activeObject,
  isARAnchorMode,
  handMidpoint,
  handDistance,
  isPinching,
  selectedCity,
  selectedSatellite,
  onResetComplete,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Three.js Instances
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const hologramGroupRef = useRef<THREE.Group | null>(null);
  const primaryMeshRef = useRef<THREE.Mesh | null>(null);
  const cloudsMeshRef = useRef<THREE.Mesh | null>(null);
  const atmosphereMeshRef = useRef<THREE.Mesh | null>(null);
  const ringsMeshRef = useRef<THREE.Mesh | null>(null);
  const energyFieldRef = useRef<THREE.Mesh | null>(null);
  const textureManagerRef = useRef<SatelliteTextureManager | null>(null);

  // Position, Rotation & Scale state
  const hologramPos = useRef(new THREE.Vector3(0, 0, 0));
  const hologramRot = useRef(new THREE.Euler(0.2, 0, 0));
  const hologramScale = useRef(1.0);
  const cameraDistance = useRef(4.6);
  const isResetting = useRef(false);

  // Pointer drag state for manual fallback
  const isPointerDown = useRef(false);
  const pointerStart = useRef({ x: 0, y: 0 });
  const dragMode = useRef<'rotate' | 'pan'>('rotate');

  const animFrameId = useRef<number | null>(null);

  // 1. Initial Three.js Scene Setup
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, cameraDistance.current);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true, // Transparent so webcam AR feed shows underneath!
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // Dynamic Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.4);
    sunLight.position.set(8, 4, 6);
    scene.add(sunLight);

    // Cyan & Violet AR Holographic Rim Lighting
    const cyanRim = new THREE.DirectionalLight(0x00f0ff, 1.2);
    cyanRim.position.set(-6, -4, 4);
    scene.add(cyanRim);

    const violetRim = new THREE.DirectionalLight(0xa855f7, 0.9);
    violetRim.position.set(0, 8, -4);
    scene.add(violetRim);

    // Central Hologram Pivot Group
    const hologramGroup = new THREE.Group();
    scene.add(hologramGroup);
    hologramGroupRef.current = hologramGroup;

    // Outer Holographic Energy Aura / Containment Field
    const energyGeo = new THREE.SphereGeometry(2.15, 32, 32);
    const energyMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
    });
    const energyField = new THREE.Mesh(energyGeo, energyMat);
    hologramGroup.add(energyField);
    energyFieldRef.current = energyField;

    // Atmospheric Glow Shader
    const atmosphereGeo = new THREE.SphereGeometry(2.05, 48, 48);
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
          float intensity = pow(0.68 - dot(vNormal, vec3(0, 0, 1.0)), 2.2);
          gl_FragColor = vec4(0.0, 0.9, 1.0, 1.0) * intensity * 0.9;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    hologramGroup.add(atmosphereMesh);
    atmosphereMeshRef.current = atmosphereMesh;

    // Texture Manager
    const textureManager = new SatelliteTextureManager();
    textureManagerRef.current = textureManager;

    // Base Sphere Mesh (Earth by default)
    const baseGeo = new THREE.SphereGeometry(1.8, 64, 64);
    const baseMat = new THREE.MeshStandardMaterial({
      map: textureManager.getTexture(settings.satelliteLayer),
      roughness: 0.65,
      metalness: 0.2,
    });
    const primaryMesh = new THREE.Mesh(baseGeo, baseMat);
    hologramGroup.add(primaryMesh);
    primaryMeshRef.current = primaryMesh;

    // Clouds Layer
    const cloudsGeo = new THREE.SphereGeometry(1.82, 64, 64);
    const cloudsMat = new THREE.MeshStandardMaterial({
      map: textureManager.getCloudsTexture(),
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat);
    hologramGroup.add(cloudsMesh);
    cloudsMeshRef.current = cloudsMesh;

    // Resize Listener
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Render Animation Loop
    let lastTime = performance.now();
    const animate = (currentTime: number) => {
      animFrameId.current = requestAnimationFrame(animate);
      const dt = Math.min(0.1, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      // Handle Smooth Reset
      if (isResetting.current) {
        hologramRot.current.x += (0.2 - hologramRot.current.x) * 0.08;
        hologramRot.current.y += (0 - hologramRot.current.y) * 0.08;
        hologramRot.current.z += (0 - hologramRot.current.z) * 0.08;
        hologramPos.current.x += (0 - hologramPos.current.x) * 0.08;
        hologramPos.current.y += (0 - hologramPos.current.y) * 0.08;
        hologramScale.current += (1.0 - hologramScale.current) * 0.08;
        cameraDistance.current += (4.6 - cameraDistance.current) * 0.08;

        const isNearDefault =
          Math.abs(hologramRot.current.x - 0.2) < 0.01 &&
          Math.abs(hologramRot.current.y) < 0.01 &&
          Math.abs(hologramPos.current.x) < 0.01 &&
          Math.abs(cameraDistance.current - 4.6) < 0.02;

        if (isNearDefault) {
          hologramRot.current.set(0.2, 0, 0);
          hologramPos.current.set(0, 0, 0);
          hologramScale.current = 1.0;
          cameraDistance.current = 4.6;
          isResetting.current = false;
          if (onResetComplete) onResetComplete();
        }
      } else if (settings.autoRotate && (!gestureResult || gestureResult.activeGesture === 'none')) {
        // Auto-rotate ONLY if user explicitly enabled it in settings!
        // (Default is false per prompt requirement: "The Earth must NOT spin automatically by default")
        hologramRot.current.y += settings.autoRotateSpeed * dt * 0.25;
      }

      // Energy Field Pulse
      if (energyFieldRef.current) {
        energyFieldRef.current.rotation.y += 0.003;
        energyFieldRef.current.rotation.x += 0.001;
        const pulse = 1 + Math.sin(currentTime * 0.003) * 0.04;
        energyFieldRef.current.scale.set(pulse, pulse, pulse);
      }

      // Apply transforms to Hologram Group
      if (hologramGroupRef.current) {
        hologramGroupRef.current.position.copy(hologramPos.current);
        hologramGroupRef.current.rotation.copy(hologramRot.current);
        hologramGroupRef.current.scale.set(
          hologramScale.current,
          hologramScale.current,
          hologramScale.current
        );
      }

      // Clouds independent drift
      if (cloudsMeshRef.current && primaryMeshRef.current) {
        cloudsMeshRef.current.rotation.y = hologramRot.current.y * 1.04 + currentTime * 0.00003;
      }

      // Camera view update
      if (cameraRef.current) {
        cameraRef.current.position.z = cameraDistance.current;
        cameraRef.current.lookAt(0, 0, 0);
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

  // 2. Switch Active Celestial Object (Earth / Moon / Mars / Sun / Jupiter / Saturn / Black Hole / etc.)
  useEffect(() => {
    if (!primaryMeshRef.current || !hologramGroupRef.current) return;

    // Reset optional layers
    if (ringsMeshRef.current) {
      hologramGroupRef.current.remove(ringsMeshRef.current);
      ringsMeshRef.current = null;
    }

    const obj = activeObject;
    const mesh = primaryMeshRef.current;
    const isEarth = obj.id === 'earth';

    if (cloudsMeshRef.current) cloudsMeshRef.current.visible = isEarth && settings.showClouds;
    if (atmosphereMeshRef.current) atmosphereMeshRef.current.visible = obj.hasAtmosphere && settings.showAtmosphere;

    // Set scale according to celestial body relative size
    const baseScale = obj.scaleFactor || 1.0;
    hologramScale.current = baseScale;

    if (isEarth) {
      // Use Satellite Texture Layer
      if (textureManagerRef.current) {
        (mesh.material as THREE.MeshStandardMaterial).map = textureManagerRef.current.getTexture(
          settings.satelliteLayer
        );
        (mesh.material as THREE.MeshStandardMaterial).color.set(0xffffff);
        (mesh.material as THREE.MeshStandardMaterial).emissive.set(0x000000);
      }
    } else if (obj.id === 'sun') {
      // Glowing star shader / high emissive
      (mesh.material as THREE.MeshStandardMaterial).map = null;
      (mesh.material as THREE.MeshStandardMaterial).color.set(0xffd700);
      (mesh.material as THREE.MeshStandardMaterial).emissive.set(0xff8800);
      (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.9;
    } else if (obj.id === 'moon') {
      (mesh.material as THREE.MeshStandardMaterial).map = null;
      (mesh.material as THREE.MeshStandardMaterial).color.set(0xd1d5db);
      (mesh.material as THREE.MeshStandardMaterial).emissive.set(0x000000);
    } else if (obj.id === 'mars') {
      (mesh.material as THREE.MeshStandardMaterial).map = null;
      (mesh.material as THREE.MeshStandardMaterial).color.set(0xea580c);
      (mesh.material as THREE.MeshStandardMaterial).emissive.set(0x3b0700);
      (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.2;
    } else if (obj.id === 'jupiter') {
      (mesh.material as THREE.MeshStandardMaterial).map = null;
      (mesh.material as THREE.MeshStandardMaterial).color.set(0xd97706);
      (mesh.material as THREE.MeshStandardMaterial).emissive.set(0x000000);
    } else if (obj.id === 'saturn') {
      (mesh.material as THREE.MeshStandardMaterial).map = null;
      (mesh.material as THREE.MeshStandardMaterial).color.set(0xfbbf24);
      (mesh.material as THREE.MeshStandardMaterial).emissive.set(0x000000);

      // Add Saturn Rings
      const ringGeo = new THREE.RingGeometry(2.2, 3.6, 64);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0xecd599,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2.3;
      hologramGroupRef.current.add(ringMesh);
      ringsMeshRef.current = ringMesh;
    } else if (obj.id === 'black_hole') {
      (mesh.material as THREE.MeshStandardMaterial).map = null;
      (mesh.material as THREE.MeshStandardMaterial).color.set(0x000000);
      (mesh.material as THREE.MeshStandardMaterial).emissive.set(0x000000);

      // Add Accretion Disk
      const diskGeo = new THREE.RingGeometry(1.9, 3.8, 64);
      const diskMat = new THREE.MeshBasicMaterial({
        color: 0xf43f5e,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
      });
      const diskMesh = new THREE.Mesh(diskGeo, diskMat);
      diskMesh.rotation.x = Math.PI / 2.4;
      hologramGroupRef.current.add(diskMesh);
      ringsMeshRef.current = diskMesh;
    } else {
      (mesh.material as THREE.MeshStandardMaterial).map = null;
      (mesh.material as THREE.MeshStandardMaterial).color.set(obj.color || 0x00f0ff);
      (mesh.material as THREE.MeshStandardMaterial).emissive.set(0x000000);
    }

    (mesh.material as THREE.MeshStandardMaterial).needsUpdate = true;
  }, [activeObject, settings.satelliteLayer, settings.showClouds, settings.showAtmosphere]);

  // 3. Hand-Anchored Hologram Spatial Tracking
  useEffect(() => {
    if (!isARAnchorMode || isResetting.current) return;

    if (handMidpoint) {
      // Map normalized camera hand midpoint (0..1) to Three.js view coordinates
      // Video is mirrored: handMidpoint.x = 0 (left of mirror) -> Three.js -2.5
      const targetX = (handMidpoint.x - 0.5) * -5.0;
      const targetY = (0.5 - handMidpoint.y) * 3.8;

      // Smooth interpolation so hologram glides naturally
      hologramPos.current.x += (targetX - hologramPos.current.x) * 0.25;
      hologramPos.current.y += (targetY - hologramPos.current.y) * 0.25;
    }

    // Hand separation scales the miniature universe
    if (handDistance !== null && handDistance > 0.05) {
      const normalizedScale = THREE.MathUtils.clamp(handDistance * 3.2, 0.45, 2.2);
      hologramScale.current += (normalizedScale - hologramScale.current) * 0.2;
    }
  }, [isARAnchorMode, handMidpoint, handDistance]);

  // 4. Process Manual 2-Hand Gesture Stream
  useEffect(() => {
    if (!gestureResult || gestureResult.isPaused || isResetting.current) return;

    // Reset hold triggered
    if (gestureResult.activeGesture === 'reset_hold' && gestureResult.resetProgress >= 0.99) {
      isResetting.current = true;
      return;
    }

    // A. Zoom Delta (Hands moving apart = zoom in, closer = zoom out)
    if (Math.abs(gestureResult.zoomDelta) > 0.001) {
      cameraDistance.current = THREE.MathUtils.clamp(
        cameraDistance.current - gestureResult.zoomDelta * 0.75,
        2.2,
        8.5
      );
    }

    // B. Pan Delta (Hands moving together)
    if (gestureResult.activeGesture === 'pan' && !isARAnchorMode) {
      const speed = 0.45;
      hologramPos.current.x = THREE.MathUtils.clamp(
        hologramPos.current.x + gestureResult.panDelta.x * speed,
        -2.5,
        2.5
      );
      hologramPos.current.y = THREE.MathUtils.clamp(
        hologramPos.current.y - gestureResult.panDelta.y * speed,
        -1.8,
        1.8
      );
    }

    // C. Rotate Delta (Hands moving in opposite directions)
    if (gestureResult.activeGesture === 'rotate') {
      const rotSpeed = 0.55;
      hologramRot.current.y += gestureResult.rotationDelta.y * rotSpeed;
      hologramRot.current.x = THREE.MathUtils.clamp(
        hologramRot.current.x + gestureResult.rotationDelta.x * rotSpeed,
        -Math.PI / 2.1,
        Math.PI / 2.1
      );
      hologramRot.current.z += gestureResult.rotationDelta.roll * 0.2;
    }
  }, [gestureResult, isARAnchorMode]);

  // Expose reset to window
  useEffect(() => {
    (window as any).__auraResetGlobe = () => {
      isResetting.current = true;
    };
    return () => {
      delete (window as any).__auraResetGlobe;
    };
  }, []);

  // 5. Manual Mouse & Touch Controls (Fallback)
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
      hologramPos.current.x = THREE.MathUtils.clamp(
        hologramPos.current.x + dx * 0.005,
        -2.5,
        2.5
      );
      hologramPos.current.y = THREE.MathUtils.clamp(
        hologramPos.current.y - dy * 0.005,
        -1.8,
        1.8
      );
    } else {
      hologramRot.current.y += dx * 0.007;
      hologramRot.current.x = THREE.MathUtils.clamp(
        hologramRot.current.x + dy * 0.007,
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
      cameraDistance.current + e.deltaY * 0.0025,
      2.2,
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
      className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing overflow-hidden select-none touch-none"
    />
  );
};
