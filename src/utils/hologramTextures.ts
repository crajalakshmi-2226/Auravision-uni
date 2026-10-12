import * as THREE from 'three';

/**
 * 1. Earth Texture Generator
 */
export function createEarthCanvasTexture(): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Ocean
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#04132b');
  grad.addColorStop(0.5, '#0a2f64');
  grad.addColorStop(1, '#04132b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Continental landmasses
  ctx.fillStyle = '#1b4d3e';
  // North America
  ctx.beginPath();
  ctx.ellipse(width * 0.22, height * 0.32, width * 0.1, height * 0.16, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // South America
  ctx.beginPath();
  ctx.ellipse(width * 0.27, height * 0.65, width * 0.07, height * 0.18, 0.2, 0, Math.PI * 2);
  ctx.fill();
  // Eurasia
  ctx.beginPath();
  ctx.ellipse(width * 0.64, height * 0.30, width * 0.22, height * 0.16, 0.1, 0, Math.PI * 2);
  ctx.fill();
  // Africa
  ctx.fillStyle = '#4d4e28';
  ctx.beginPath();
  ctx.ellipse(width * 0.52, height * 0.52, width * 0.09, height * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  // Australia
  ctx.fillStyle = '#5c4524';
  ctx.beginPath();
  ctx.ellipse(width * 0.82, height * 0.68, width * 0.07, height * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();

  // Polar ice caps
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, 0, width, height * 0.1);
  ctx.fillRect(0, height * 0.9, width, height * 0.1);

  // Holographic graticule lines
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.18)';
  ctx.lineWidth = 1;
  for (let lat = 1; lat < 8; lat++) {
    const y = (lat / 8) * height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  for (let lon = 0; lon < 16; lon++) {
    const x = (lon / 16) * width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * 2. Moon Texture Generator
 */
export function createMoonCanvasTexture(): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Grey regolith base
  ctx.fillStyle = '#8f96a3';
  ctx.fillRect(0, 0, width, height);

  // Dark basaltic Lunar Maria (Sea of Tranquility, Oceanus Procellarum)
  ctx.fillStyle = '#4c525d';
  ctx.beginPath();
  ctx.ellipse(width * 0.38, height * 0.36, width * 0.14, height * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(width * 0.52, height * 0.44, width * 0.12, height * 0.18, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(width * 0.65, height * 0.34, width * 0.08, height * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();

  // Impact craters
  for (let i = 0; i < 90; i++) {
    const cx = Math.random() * width;
    const cy = Math.random() * height;
    const r = 4 + Math.random() * 22;

    // Rim highlight
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Crater shadow
    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.75, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * 3. Sun Solar Surface Texture Generator
 */
export function createSunCanvasTexture(): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Blazing amber base
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(0, 0, width, height);

  // Convective granulation plasma cells
  for (let i = 0; i < 350; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const r = 6 + Math.random() * 24;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(0.4, '#f59e0b');
    grad.addColorStop(1, 'rgba(180, 83, 9, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Sunspots
  ctx.fillStyle = '#451a03';
  for (let i = 0; i < 8; i++) {
    const sx = Math.random() * width;
    const sy = height * 0.3 + Math.random() * height * 0.4;
    ctx.beginPath();
    ctx.arc(sx, sy, 5 + Math.random() * 9, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * 4. Mars Texture Generator
 */
export function createMarsCanvasTexture(): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Rust red ferric oxide
  ctx.fillStyle = '#c2410c';
  ctx.fillRect(0, 0, width, height);

  // Dark volcanic plains (Syrtis Major)
  ctx.fillStyle = '#7c2d12';
  ctx.beginPath();
  ctx.ellipse(width * 0.45, height * 0.48, width * 0.12, height * 0.16, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Valles Marineris canyon scar
  ctx.strokeStyle = '#431407';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(width * 0.25, height * 0.52);
  ctx.bezierCurveTo(width * 0.35, height * 0.54, width * 0.45, height * 0.50, width * 0.55, height * 0.53);
  ctx.stroke();

  // Olympus Mons volcano
  ctx.fillStyle = '#9a3412';
  ctx.beginPath();
  ctx.arc(width * 0.22, height * 0.42, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#431407';
  ctx.beginPath();
  ctx.arc(width * 0.22, height * 0.42, 7, 0, Math.PI * 2);
  ctx.fill();

  // Polar ice caps (dry ice / carbon dioxide & water frost)
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, width, height * 0.08);
  ctx.fillRect(0, height * 0.92, width, height * 0.08);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * 5. 3D Swirling Spiral Galaxy Particle Generator (Milky Way)
 */
export function createSpiralGalaxyParticles(count = 3200): THREE.Points {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  const coreColor = new THREE.Color(0xfef08a); // Yellow/White Core
  const innerColor = new THREE.Color(0xa855f7); // Violet
  const outerColor = new THREE.Color(0x00f0ff); // Cyan Arms

  const arms = 2; // Two main spiral arms
  const maxRadius = 3.2;

  for (let i = 0; i < count; i++) {
    // Distance from galactic core
    const r = Math.pow(Math.random(), 1.6) * maxRadius;
    const armAngle = ((i % arms) * (2 * Math.PI)) / arms;
    // Logarithmic spiral angle
    const spiralAngle = r * 2.8 + armAngle;

    // Random star scattering
    const spreadX = (Math.random() - 0.5) * (0.2 + r * 0.25);
    const spreadY = (Math.random() - 0.5) * (0.15 + (maxRadius - r) * 0.15); // Flatter disk
    const spreadZ = (Math.random() - 0.5) * (0.2 + r * 0.25);

    const x = Math.cos(spiralAngle) * r + spreadX;
    const y = spreadY;
    const z = Math.sin(spiralAngle) * r + spreadZ;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    // Interpolate color from core outward
    const t = r / maxRadius;
    const col = t < 0.25 ? coreColor : t < 0.65 ? innerColor : outerColor;

    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.05,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  return new THREE.Points(geo, mat);
}

/**
 * 6. The Whole Universe Cosmic Web Particle Generator
 */
export function createCosmicWebParticles(count = 3800): THREE.Points {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  const cyan = new THREE.Color(0x38bdf8);
  const magenta = new THREE.Color(0xec4899);
  const violet = new THREE.Color(0xa855f7);
  const yellow = new THREE.Color(0xfef08a);

  // Large-scale cosmic filament web
  for (let i = 0; i < count; i++) {
    // Generate cluster nodes & filament bridges
    const nodeIndex = i % 18;
    const nodeAngle = (nodeIndex / 18) * Math.PI * 2;
    const nodeR = 1.4 + (nodeIndex % 3) * 0.8;
    const nodeX = Math.cos(nodeAngle) * nodeR;
    const nodeY = Math.sin(nodeAngle * 1.5) * 1.0;
    const nodeZ = Math.sin(nodeAngle) * nodeR;

    const r = Math.pow(Math.random(), 0.5) * 0.9;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i * 3] = nodeX + r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = nodeY + r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = nodeZ + r * Math.cos(phi);

    const rand = Math.random();
    const col = rand > 0.75 ? cyan : rand > 0.45 ? violet : rand > 0.2 ? magenta : yellow;

    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.045,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  return new THREE.Points(geo, mat);
}
