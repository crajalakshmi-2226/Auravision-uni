import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { HologramType } from '../types';
import {
  createEarthCanvasTexture,
  createMoonCanvasTexture,
  createSunCanvasTexture,
  createMarsCanvasTexture,
  createSpiralGalaxyParticles,
  createCosmicWebParticles,
} from '../utils/hologramTextures';

interface ARHologramCanvasProps {
  hologramType: HologramType;
  anchorPoint: { x: number; y: number; z: number } | null;
  palmRoll: number;
  scaleMultiplier: number;
  isPinching: boolean;
  brightness: number;
  showEnergyPedestal: boolean;
}

export const ARHologramCanvas: React.FC<ARHologramCanvasProps> = ({
  hologramType,
  anchorPoint,
  palmRoll,
  scaleMultiplier,
  isPinching,
  brightness,
  showEnergyPedestal,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Three.js instances
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // Group containing the hologram anchored to the hand
  const hologramRootGroup = useRef<THREE.Group | null>(null);
  const celestialBodyGroup = useRef<THREE.Group | null>(null);
  const pedestalGroup = useRef<THREE.Group | null>(null);

  // Specific meshes/objects
  const primaryMeshRef = useRef<THREE.Mesh | null>(null);
  const cloudsMeshRef = useRef<THREE.Mesh | null>(null);
  const atmosphereMeshRef = useRef<THREE.Mesh | null>(null);
  const galaxyPointsRef = useRef<THREE.Points | null>(null);
  const universePointsRef = useRef<THREE.Points | null>(null);

  // Tracking position & rotation smoothly
  const currentPos = useRef(new THREE.Vector3(0, 0.2, 0));
  const currentRot = useRef(new THREE.Euler(0.2, 0, 0));
  const currentScale = useRef(1.0);

  // Mouse fallback drag
  const isPointerDown = useRef(false);
  const pointerStart = useRef({ x: 0, y: 0 });

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
    camera.position.set(0, 0, 4.8);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true, // Transparent for front camera AR overlay
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // Dynamic Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(6, 4, 6);
    scene.add(keyLight);

    const cyanRim = new THREE.DirectionalLight(0x00f0ff, 1.2);
    cyanRim.position.set(-6, -3, 3);
    scene.add(cyanRim);

    const violetRim = new THREE.DirectionalLight(0xa855f7, 0.9);
    violetRim.position.set(0, 6, -4);
    scene.add(violetRim);

    // Root Hologram Group (Anchored to user's hand)
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);
    hologramRootGroup.current = rootGroup;

    // Pedestal Emitter Under The Hand
    const pedestal = new THREE.Group();
    rootGroup.add(pedestal);
    pedestalGroup.current = pedestal;

    // Glowing Hologram Base Rings (Pedestal)
    const emitterRing1 = new THREE.RingGeometry(0.85, 0.92, 48);
    const emitterMat1 = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    const ring1 = new THREE.Mesh(emitterRing1, emitterMat1);
    ring1.rotation.x = Math.PI / 2;
    ring1.position.y = -1.5;
    pedestal.add(ring1);

    const emitterRing2 = new THREE.RingGeometry(1.2, 1.25, 48);
    const ring2 = new THREE.Mesh(emitterRing2, emitterMat1.clone());
    ring2.rotation.x = Math.PI / 2;
    ring2.position.y = -1.52;
    pedestal.add(ring2);

    // Upward Vertical Holo-Beam Cylinder
    const beamGeo = new THREE.CylinderGeometry(0.8, 1.25, 1.5, 32, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = -0.75;
    pedestal.add(beam);

    // Celestial Body Container Group
    const bodyGroup = new THREE.Group();
    rootGroup.add(bodyGroup);
    celestialBodyGroup.current = bodyGroup;

    // Base Sphere Mesh (Earth by default)
    const sphereGeo = new THREE.SphereGeometry(1.35, 64, 64);
    const sphereMat = new THREE.MeshStandardMaterial({
      map: createEarthCanvasTexture(),
      roughness: 0.6,
      metalness: 0.2,
    });
    const primaryMesh = new THREE.Mesh(sphereGeo, sphereMat);
    bodyGroup.add(primaryMesh);
    primaryMeshRef.current = primaryMesh;

    // Clouds Sphere
    const cloudsGeo = new THREE.SphereGeometry(1.37, 48, 48);
    const cloudsMat = new THREE.MeshStandardMaterial({
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat);
    bodyGroup.add(cloudsMesh);
    cloudsMeshRef.current = cloudsMesh;

    // Atmosphere Glow Shader Sphere
    const atmoGeo = new THREE.SphereGeometry(1.55, 48, 48);
    const atmoMat = new THREE.ShaderMaterial({
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
          float intensity = pow(0.7 - dot(vNormal, vec3(0, 0, 1.0)), 2.2);
          gl_FragColor = vec4(0.0, 0.85, 1.0, 1.0) * intensity * 0.95;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    const atmosphereMesh = new THREE.Mesh(atmoGeo, atmoMat);
    bodyGroup.add(atmosphereMesh);
    atmosphereMeshRef.current = atmosphereMesh;

    // Resize Handler
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let lastTime = performance.now();
    const animate = (time: number) => {
      animFrameId.current = requestAnimationFrame(animate);
      const dt = Math.min(0.1, (time - lastTime) / 1000);
      lastTime = time;

      // Smoothly update root hologram position to match user's hand
      if (hologramRootGroup.current) {
        hologramRootGroup.current.position.copy(currentPos.current);
        hologramRootGroup.current.rotation.x = currentRot.current.x;
        hologramRootGroup.current.rotation.y = currentRot.current.y;
        hologramRootGroup.current.rotation.z = currentRot.current.z;
        hologramRootGroup.current.scale.set(
          currentScale.current,
          currentScale.current,
          currentScale.current
        );
      }

      // Rotate celestial body slowly when hovering
      if (celestialBodyGroup.current) {
        // Subtle idle planetary rotation
        currentRot.current.y += 0.15 * dt;
      }

      // Rotate clouds
      if (cloudsMeshRef.current) {
        cloudsMeshRef.current.rotation.y += 0.05 * dt;
      }

      // Spin pedestal rings
      if (pedestalGroup.current) {
        pedestalGroup.current.children[0].rotation.z += 0.4 * dt;
        pedestalGroup.current.children[1].rotation.z -= 0.3 * dt;
      }

      // Spin spiral galaxy / cosmic web if active
      if (galaxyPointsRef.current) {
        galaxyPointsRef.current.rotation.y += 0.25 * dt;
      }
      if (universePointsRef.current) {
        universePointsRef.current.rotation.y += 0.1 * dt;
        universePointsRef.current.rotation.x += 0.04 * dt;
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

  // 2. Switch Between the 6 Hologram Types
  useEffect(() => {
    if (!celestialBodyGroup.current || !primaryMeshRef.current) return;
    const group = celestialBodyGroup.current;
    const mesh = primaryMeshRef.current;

    // Clean up dynamic particle objects
    if (galaxyPointsRef.current) {
      group.remove(galaxyPointsRef.current);
      galaxyPointsRef.current = null;
    }
    if (universePointsRef.current) {
      group.remove(universePointsRef.current);
      universePointsRef.current = null;
    }

    // Default visibility
    mesh.visible = true;
    if (cloudsMeshRef.current) cloudsMeshRef.current.visible = false;
    if (atmosphereMeshRef.current) atmosphereMeshRef.current.visible = false;

    if (hologramType === 'earth') {
      mesh.geometry = new THREE.SphereGeometry(1.35, 64, 64);
      (mesh.material as THREE.MeshStandardMaterial).map = createEarthCanvasTexture();
      (mesh.material as THREE.MeshStandardMaterial).color.set(0xffffff);
      (mesh.material as THREE.MeshStandardMaterial).emissive.set(0x000000);
      if (cloudsMeshRef.current) cloudsMeshRef.current.visible = true;
      if (atmosphereMeshRef.current) {
        atmosphereMeshRef.current.visible = true;
        // Cyan Rayleigh glow
        const mat = atmosphereMeshRef.current.material as THREE.ShaderMaterial;
        mat.fragmentShader = `
          varying vec3 vNormal;
          void main() {
            float intensity = pow(0.7 - dot(vNormal, vec3(0, 0, 1.0)), 2.2);
            gl_FragColor = vec4(0.0, 0.85, 1.0, 1.0) * intensity * 0.95;
          }
        `;
        mat.needsUpdate = true;
      }
    } else if (hologramType === 'moon') {
      mesh.geometry = new THREE.SphereGeometry(1.15, 64, 64);
      (mesh.material as THREE.MeshStandardMaterial).map = createMoonCanvasTexture();
      (mesh.material as THREE.MeshStandardMaterial).color.set(0xffffff);
      (mesh.material as THREE.MeshStandardMaterial).emissive.set(0x000000);
      if (atmosphereMeshRef.current) {
        atmosphereMeshRef.current.visible = true;
        // Silver lunar glow
        const mat = atmosphereMeshRef.current.material as THREE.ShaderMaterial;
        mat.fragmentShader = `
          varying vec3 vNormal;
          void main() {
            float intensity = pow(0.65 - dot(vNormal, vec3(0, 0, 1.0)), 2.5);
            gl_FragColor = vec4(0.8, 0.85, 0.95, 1.0) * intensity * 0.8;
          }
        `;
        mat.needsUpdate = true;
      }
    } else if (hologramType === 'sun') {
      mesh.geometry = new THREE.SphereGeometry(1.4, 64, 64);
      (mesh.material as THREE.MeshStandardMaterial).map = createSunCanvasTexture();
      (mesh.material as THREE.MeshStandardMaterial).color.set(0xffffff);
      (mesh.material as THREE.MeshStandardMaterial).emissive.set(0xf59e0b);
      (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.8;
      if (atmosphereMeshRef.current) {
        atmosphereMeshRef.current.visible = true;
        // Blazing solar corona shader
        const mat = atmosphereMeshRef.current.material as THREE.ShaderMaterial;
        mat.fragmentShader = `
          varying vec3 vNormal;
          void main() {
            float intensity = pow(0.68 - dot(vNormal, vec3(0, 0, 1.0)), 1.8);
            gl_FragColor = vec4(1.0, 0.65, 0.05, 1.0) * intensity * 1.2;
          }
        `;
        mat.needsUpdate = true;
      }
    } else if (hologramType === 'mars') {
      mesh.geometry = new THREE.SphereGeometry(1.2, 64, 64);
      (mesh.material as THREE.MeshStandardMaterial).map = createMarsCanvasTexture();
      (mesh.material as THREE.MeshStandardMaterial).color.set(0xffffff);
      (mesh.material as THREE.MeshStandardMaterial).emissive.set(0x431407);
      (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.2;
      if (atmosphereMeshRef.current) {
        atmosphereMeshRef.current.visible = true;
        // Subtle reddish dust haze
        const mat = atmosphereMeshRef.current.material as THREE.ShaderMaterial;
        mat.fragmentShader = `
          varying vec3 vNormal;
          void main() {
            float intensity = pow(0.65 - dot(vNormal, vec3(0, 0, 1.0)), 2.6);
            gl_FragColor = vec4(1.0, 0.35, 0.1, 1.0) * intensity * 0.7;
          }
        `;
        mat.needsUpdate = true;
      }
    } else if (hologramType === 'galaxy') {
      // Swirling Spiral Galaxy (Milky Way)
      mesh.visible = false;
      const galaxy = createSpiralGalaxyParticles(3400);
      group.add(galaxy);
      galaxyPointsRef.current = galaxy;
    } else if (hologramType === 'universe') {
      // The Whole Observable Universe (Cosmic Web)
      mesh.visible = false;
      const cosmicWeb = createCosmicWebParticles(4200);
      group.add(cosmicWeb);
      universePointsRef.current = cosmicWeb;
    }

    (mesh.material as THREE.MeshStandardMaterial).needsUpdate = true;
  }, [hologramType]);

  // 3. Hand-Anchored Spatial Tracking ("Hologram in / under my hands")
  useEffect(() => {
    if (anchorPoint) {
      // Camera is mirrored horizontally:
      // anchorPoint.x in [0, 1]: 0 is right of screen, 1 is left of screen
      // Map to Three.js view: (0.5 - anchorPoint.x) * 4.8
      const targetX = (0.5 - anchorPoint.x) * 5.2;
      // anchorPoint.y in [0, 1]: 0 is top, 1 is bottom
      // Hologram hovers right above/in palm (so y offset is slightly above palm)
      const targetY = (0.5 - anchorPoint.y) * 4.2 + 0.35;
      const targetZ = (anchorPoint.z || 0) * -2.5;

      // Smooth interpolation for natural tactile tracking
      currentPos.current.x += (targetX - currentPos.current.x) * 0.28;
      currentPos.current.y += (targetY - currentPos.current.y) * 0.28;
      currentPos.current.z += (targetZ - currentPos.current.z) * 0.28;

      // Hand roll directly rotates the hologram!
      currentRot.current.z = palmRoll * -0.8;
    }
  }, [anchorPoint, palmRoll]);

  // 4. Update Scale Multiplier & Brightness
  useEffect(() => {
    currentScale.current = Math.max(0.4, Math.min(2.8, scaleMultiplier));
  }, [scaleMultiplier]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.toneMappingExposure = 1.35 * brightness;
    }
  }, [brightness]);

  useEffect(() => {
    if (pedestalGroup.current) {
      pedestalGroup.current.visible = showEnergyPedestal;
    }
  }, [showEnergyPedestal]);

  // 5. Manual Mouse / Touch Drag Fallback
  const handlePointerDown = (e: React.PointerEvent) => {
    isPointerDown.current = true;
    pointerStart.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPointerDown.current) return;
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    pointerStart.current = { x: e.clientX, y: e.clientY };

    if (e.shiftKey || e.button === 2) {
      currentPos.current.x += dx * 0.005;
      currentPos.current.y -= dy * 0.005;
    } else {
      currentRot.current.y += dx * 0.008;
      currentRot.current.x += dy * 0.008;
    }
  };

  const handlePointerUp = () => {
    isPointerDown.current = false;
  };

  return (
    <div
      ref={mountRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
      className="absolute inset-0 z-10 w-full h-full cursor-grab active:cursor-grabbing overflow-hidden select-none pointer-events-auto"
    />
  );
};
