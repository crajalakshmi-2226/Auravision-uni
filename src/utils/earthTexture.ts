import * as THREE from 'three';
import { SatelliteLayerMode } from '../types';

/**
 * Creates high quality procedural Blue Marble daytime Earth texture.
 */
export function createProceduralEarthTexture(): THREE.CanvasTexture {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return new THREE.CanvasTexture(canvas);

  const oceanGradient = ctx.createLinearGradient(0, 0, 0, height);
  oceanGradient.addColorStop(0, '#04132b');
  oceanGradient.addColorStop(0.3, '#062045');
  oceanGradient.addColorStop(0.5, '#0a2f64');
  oceanGradient.addColorStop(0.7, '#062045');
  oceanGradient.addColorStop(1, '#04132b');
  ctx.fillStyle = oceanGradient;
  ctx.fillRect(0, 0, width, height);

  const context = ctx;

  const landmasses = getLandmassPolygons(width, height);

  // Draw continental shelf glow
  context.filter = 'blur(12px)';
  for (const land of landmasses) {
    drawPolygon(context, land.points, land.shelfColor || '#0e5272');
  }
  context.filter = 'none';

  // Draw continents
  for (const land of landmasses) {
    drawPolygon(context, land.points, land.color, '#3d7853', 2);
  }

  // Terrain noise & biomes
  addTerrainNoise(context, width, height);

  // Polar ice
  drawPolarIce(context, width, height);

  // Subtle graticule grid
  drawGraticule(context, width, height, 'rgba(6, 182, 212, 0.1)');

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * Creates high-fidelity NASA Black Marble night lights satellite texture.
 * Features realistic global city clusters glowing in warm amber and neon cyan.
 */
export function createProceduralNightLightsTexture(): THREE.CanvasTexture {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Pitch black deep oceans & unlit land
  ctx.fillStyle = '#02040a';
  ctx.fillRect(0, 0, width, height);

  // Faint continental silhouettes
  const landmasses = getLandmassPolygons(width, height);
  for (const land of landmasses) {
    drawPolygon(ctx, land.points, '#050a18', '#081226', 1);
  }

  // Major global metropolitan clusters coordinates [xNorm, yNorm, radius, intensity]
  const cityClusters: Array<[number, number, number, number]> = [
    // US East Coast (NYC, DC, Boston)
    [0.26, 0.35, 32, 1.0],
    [0.24, 0.38, 22, 0.9],
    // US West Coast (LA, SF, Seattle)
    [0.17, 0.38, 24, 0.9],
    [0.16, 0.35, 20, 0.85],
    // US Midwest / Chicago
    [0.22, 0.34, 25, 0.88],
    // Western Europe (London, Paris, Berlin, Benelux)
    [0.49, 0.28, 40, 1.0],
    [0.53, 0.30, 30, 0.9],
    [0.47, 0.36, 25, 0.85],
    // East Asia (Tokyo, Osaka)
    [0.86, 0.36, 35, 1.0],
    [0.84, 0.38, 25, 0.95],
    // China Coastal (Shanghai, Beijing, Pearl River Delta)
    [0.80, 0.38, 45, 1.0],
    [0.78, 0.32, 35, 0.9],
    [0.77, 0.44, 30, 0.95],
    // India (Delhi, Mumbai, Bengaluru)
    [0.68, 0.42, 38, 0.95],
    [0.66, 0.46, 30, 0.9],
    // Middle East (Dubai, Gulf Coast)
    [0.61, 0.42, 28, 0.9],
    // South America (São Paulo, Rio, Buenos Aires)
    [0.32, 0.72, 30, 0.85],
    [0.28, 0.76, 22, 0.8],
    // Australia (Sydney, Melbourne)
    [0.86, 0.73, 22, 0.85],
    // Nile River Delta
    [0.54, 0.41, 20, 0.85],
    // Moscow & St Petersburg
    [0.56, 0.25, 26, 0.88],
  ];

  // Draw glowing city light clusters
  for (const [xN, yN, rad, intensity] of cityClusters) {
    const cx = xN * width;
    const cy = yN * height;

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    grad.addColorStop(0, `rgba(255, 235, 160, ${intensity})`);
    grad.addColorStop(0.3, `rgba(255, 180, 70, ${intensity * 0.7})`);
    grad.addColorStop(0.7, `rgba(230, 120, 30, ${intensity * 0.3})`);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();

    // Dense inner nodes (individual skyscrapers & lights)
    for (let i = 0; i < 28; i++) {
      const px = cx + (Math.random() - 0.5) * rad * 1.3;
      const py = cy + (Math.random() - 0.5) * rad * 1.3;
      ctx.fillStyle = Math.random() > 0.4 ? '#ffffff' : '#ffd782';
      ctx.fillRect(px, py, 1.5, 1.5);
    }
  }

  // Highway arteries / coastal light trails
  ctx.strokeStyle = 'rgba(255, 200, 110, 0.25)';
  ctx.lineWidth = 1.2;
  ctx.filter = 'blur(1px)';
  ctx.beginPath();
  // US I-95 corridor
  ctx.moveTo(0.24 * width, 0.38 * height);
  ctx.lineTo(0.27 * width, 0.33 * height);
  // Trans-Europe corridor
  ctx.moveTo(0.48 * width, 0.32 * height);
  ctx.lineTo(0.55 * width, 0.29 * height);
  // Tokyo-Osaka Tokaido corridor
  ctx.moveTo(0.84 * width, 0.38 * height);
  ctx.lineTo(0.87 * width, 0.35 * height);
  ctx.stroke();
  ctx.filter = 'none';

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * Creates Global Topographic Relief satellite texture.
 */
export function createProceduralTopographyTexture(): THREE.CanvasTexture {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Bathymetric deep ocean with mid-ocean ridge highlights
  ctx.fillStyle = '#0a1d37';
  ctx.fillRect(0, 0, width, height);

  // Draw oceanic ridges (Mid-Atlantic ridge, Pacific ring)
  ctx.strokeStyle = 'rgba(30, 80, 140, 0.4)';
  ctx.lineWidth = 14;
  ctx.filter = 'blur(8px)';
  ctx.beginPath();
  ctx.moveTo(0.40 * width, 0.15 * height);
  ctx.quadraticCurveTo(0.38 * width, 0.50 * height, 0.42 * width, 0.85 * height);
  ctx.stroke();
  ctx.filter = 'none';

  const landmasses = getLandmassPolygons(width, height);

  // Draw hypsometric tinted elevations
  for (const land of landmasses) {
    drawPolygon(ctx, land.points, '#3d6e35', '#2a4d25', 2);
  }

  // Mountain ranges (Himalayas, Rockies, Andes, Alps)
  const mountainChains = [
    // Himalayas
    [[0.66 * width, 0.38 * height], [0.74 * width, 0.37 * height]],
    // Andes
    [[0.24 * width, 0.52 * height], [0.26 * width, 0.80 * height]],
    // Rockies
    [[0.17 * width, 0.22 * height], [0.20 * width, 0.40 * height]],
    // Alps
    [[0.48 * width, 0.31 * height], [0.52 * width, 0.31 * height]],
  ];

  ctx.strokeStyle = '#c9b897';
  ctx.lineWidth = 10;
  ctx.filter = 'blur(4px)';
  for (const [start, end] of mountainChains) {
    ctx.beginPath();
    ctx.moveTo(start[0], start[1]);
    ctx.lineTo(end[0], end[1]);
    ctx.stroke();
  }
  ctx.filter = 'none';

  drawPolarIce(ctx, width, height);
  drawGraticule(ctx, width, height, 'rgba(168, 85, 247, 0.15)');

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * Creates Deep Space Celestial Galaxy / Milky Way panorama texture.
 */
export function createGalaxyMilkyWayTexture(): THREE.CanvasTexture {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Deep cosmic void
  ctx.fillStyle = '#02040c';
  ctx.fillRect(0, 0, width, height);

  // Milky Way Galactic Plane Diagonal Sweep
  const galacticGrad = ctx.createLinearGradient(0, height * 0.2, width, height * 0.8);
  galacticGrad.addColorStop(0, 'rgba(88, 28, 135, 0.4)');
  galacticGrad.addColorStop(0.35, 'rgba(6, 182, 212, 0.3)');
  galacticGrad.addColorStop(0.5, 'rgba(236, 72, 153, 0.45)');
  galacticGrad.addColorStop(0.65, 'rgba(99, 102, 241, 0.35)');
  galacticGrad.addColorStop(1, 'rgba(147, 51, 234, 0.4)');

  ctx.filter = 'blur(40px)';
  ctx.fillStyle = galacticGrad;
  ctx.beginPath();
  ctx.ellipse(width * 0.5, height * 0.5, width * 0.6, height * 0.3, -Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.filter = 'none';

  // Cosmic Dust Lanes & Molecular Clouds
  ctx.fillStyle = 'rgba(2, 4, 12, 0.6)';
  ctx.filter = 'blur(20px)';
  for (let i = 0; i < 18; i++) {
    const x = Math.random() * width;
    const y = height * 0.3 + Math.random() * height * 0.4;
    ctx.beginPath();
    ctx.ellipse(x, y, 90 + Math.random() * 120, 20 + Math.random() * 40, -Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.filter = 'none';

  // Stellar dense core
  const coreGrad = ctx.createRadialGradient(width * 0.52, height * 0.48, 0, width * 0.52, height * 0.48, 160);
  coreGrad.addColorStop(0, '#ffffff');
  coreGrad.addColorStop(0.2, '#fde047');
  coreGrad.addColorStop(0.6, 'rgba(244, 114, 182, 0.4)');
  coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(width * 0.52, height * 0.48, 160, 0, Math.PI * 2);
  ctx.fill();

  // 1,800 Point Stars on texture
  for (let i = 0; i < 1800; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = Math.random() < 0.95 ? 1 : Math.random() < 0.98 ? 2 : 3;
    const colors = ['#ffffff', '#a5f3fc', '#fbcfe8', '#c4b5fd', '#fef08a'];
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
    ctx.fillRect(x, y, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * Procedural atmospheric clouds
 */
export function createProceduralCloudsTexture(): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  for (let i = 0; i < 75; i++) {
    const x = Math.random() * width;
    const y = (0.15 + Math.random() * 0.7) * height;
    const radiusX = 35 + Math.random() * 95;
    const radiusY = 16 + Math.random() * 38;
    const rot = (Math.random() - 0.5) * 0.5;

    ctx.beginPath();
    ctx.ellipse(x, y, radiusX, radiusY, rot, 0, Math.PI * 2);
    ctx.fill();

    if (x - radiusX < 0) {
      ctx.beginPath();
      ctx.ellipse(x + width, y, radiusX, radiusY, rot, 0, Math.PI * 2);
      ctx.fill();
    } else if (x + radiusX > width) {
      ctx.beginPath();
      ctx.ellipse(x - width, y, radiusX, radiusY, rot, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.filter = 'blur(8px)';
  ctx.drawImage(canvas, 0, 0);
  ctx.filter = 'none';

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * Satellite Texture Manager that serves textures for all modes
 * and progressively loads official satellite composites with fallback.
 */
export class SatelliteTextureManager {
  private textures: Map<SatelliteLayerMode, THREE.CanvasTexture> = new Map();
  private cloudsTexture: THREE.CanvasTexture;

  constructor() {
    this.textures.set('blue_marble', createProceduralEarthTexture());
    this.textures.set('black_marble_night', createProceduralNightLightsTexture());
    this.textures.set('topography', createProceduralTopographyTexture());
    this.textures.set('galaxy_milkyway', createGalaxyMilkyWayTexture());
    this.cloudsTexture = createProceduralCloudsTexture();

    // Try upgrading to high-res NASA satellite assets
    this.attemptSatelliteImageryUpgrade();
  }

  public getTexture(mode: SatelliteLayerMode): THREE.Texture {
    return this.textures.get(mode) || this.textures.get('blue_marble')!;
  }

  public getCloudsTexture(): THREE.Texture {
    return this.cloudsTexture;
  }

  private attemptSatelliteImageryUpgrade() {
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';

    // Upgrade Blue Marble
    const blueMarbleUrls = [
      'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg',
      'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
    ];

    const tryLoadBlue = (idx: number) => {
      if (idx >= blueMarbleUrls.length) return;
      loader.load(
        blueMarbleUrls[idx],
        (tex) => {
          const target = this.textures.get('blue_marble');
          if (target && target.image instanceof HTMLCanvasElement) {
            const ctx = target.image.getContext('2d');
            if (ctx) {
              ctx.drawImage(tex.image, 0, 0, target.image.width, target.image.height);
              target.needsUpdate = true;
            }
          }
        },
        undefined,
        () => tryLoadBlue(idx + 1)
      );
    };
    tryLoadBlue(0);

    // Upgrade Night Lights
    const nightUrls = [
      'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_lights_2048.png',
      'https://unpkg.com/three-globe/example/img/earth-night.jpg',
    ];
    const tryLoadNight = (idx: number) => {
      if (idx >= nightUrls.length) return;
      loader.load(
        nightUrls[idx],
        (tex) => {
          const target = this.textures.get('black_marble_night');
          if (target && target.image instanceof HTMLCanvasElement) {
            const ctx = target.image.getContext('2d');
            if (ctx) {
              ctx.drawImage(tex.image, 0, 0, target.image.width, target.image.height);
              target.needsUpdate = true;
            }
          }
        },
        undefined,
        () => tryLoadNight(idx + 1)
      );
    };
    tryLoadNight(0);
  }
}

// ----------------- Helper math & geometry functions -----------------

function getLandmassPolygons(width: number, height: number) {
  return [
    // North America
    {
      points: [
        [0.12 * width, 0.22 * height],
        [0.18 * width, 0.18 * height],
        [0.28 * width, 0.18 * height],
        [0.32 * width, 0.25 * height],
        [0.28 * width, 0.38 * height],
        [0.25 * width, 0.44 * height],
        [0.22 * width, 0.48 * height],
        [0.18 * width, 0.42 * height],
        [0.15 * width, 0.35 * height],
        [0.10 * width, 0.28 * height],
      ] as Array<[number, number]>,
      color: '#1b4d3e',
      shelfColor: '#0e5272',
    },
    // South America
    {
      points: [
        [0.24 * width, 0.49 * height],
        [0.28 * width, 0.52 * height],
        [0.33 * width, 0.58 * height],
        [0.30 * width, 0.70 * height],
        [0.26 * width, 0.82 * height],
        [0.24 * width, 0.75 * height],
        [0.22 * width, 0.60 * height],
        [0.22 * width, 0.52 * height],
      ] as Array<[number, number]>,
      color: '#215c38',
      shelfColor: '#0e5272',
    },
    // Eurasia
    {
      points: [
        [0.45 * width, 0.25 * height],
        [0.55 * width, 0.18 * height],
        [0.68 * width, 0.16 * height],
        [0.82 * width, 0.20 * height],
        [0.88 * width, 0.26 * height],
        [0.86 * width, 0.38 * height],
        [0.78 * width, 0.45 * height],
        [0.72 * width, 0.42 * height],
        [0.68 * width, 0.50 * height],
        [0.62 * width, 0.40 * height],
        [0.54 * width, 0.42 * height],
        [0.48 * width, 0.38 * height],
        [0.44 * width, 0.32 * height],
      ] as Array<[number, number]>,
      color: '#2a5a3c',
      shelfColor: '#0d4b68',
    },
    // Africa
    {
      points: [
        [0.46 * width, 0.40 * height],
        [0.56 * width, 0.40 * height],
        [0.58 * width, 0.48 * height],
        [0.55 * width, 0.62 * height],
        [0.52 * width, 0.72 * height],
        [0.48 * width, 0.68 * height],
        [0.45 * width, 0.55 * height],
        [0.43 * width, 0.46 * height],
      ] as Array<[number, number]>,
      color: '#52542a',
      shelfColor: '#0d4b68',
    },
    // Australia
    {
      points: [
        [0.78 * width, 0.62 * height],
        [0.85 * width, 0.60 * height],
        [0.88 * width, 0.68 * height],
        [0.85 * width, 0.76 * height],
        [0.78 * width, 0.74 * height],
        [0.75 * width, 0.66 * height],
      ] as Array<[number, number]>,
      color: '#5a4628',
      shelfColor: '#0e5272',
    },
    // Greenland
    {
      points: [
        [0.34 * width, 0.12 * height],
        [0.40 * width, 0.12 * height],
        [0.38 * width, 0.22 * height],
        [0.33 * width, 0.20 * height],
      ] as Array<[number, number]>,
      color: '#d6e6f2',
      shelfColor: '#175676',
    },
  ];
}

function drawPolygon(
  c: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  fillColor: string,
  strokeColor?: string,
  lineWidth = 1
) {
  if (points.length < 3) return;
  c.beginPath();
  c.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    c.lineTo(points[i][0], points[i][1]);
  }
  c.closePath();
  c.fillStyle = fillColor;
  c.fill();
  if (strokeColor) {
    c.strokeStyle = strokeColor;
    c.lineWidth = lineWidth;
    c.stroke();
  }
}

function addTerrainNoise(c: CanvasRenderingContext2D, width: number, height: number) {
  const imgData = c.getImageData(0, 0, width, height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const isLand = data[i + 1] > data[i + 2] && data[i + 1] > 40;
    if (isLand) {
      const n = (Math.random() - 0.5) * 22;
      data[i] = Math.min(255, Math.max(0, data[i] + n * 0.8));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n * 0.6));
    }
  }
  c.putImageData(imgData, 0, 0);
}

function drawPolarIce(c: CanvasRenderingContext2D, width: number, height: number) {
  const northIce = c.createLinearGradient(0, 0, 0, height * 0.12);
  northIce.addColorStop(0, '#eaf4fc');
  northIce.addColorStop(0.7, '#c2dff2');
  northIce.addColorStop(1, 'rgba(194, 223, 242, 0)');
  c.fillStyle = northIce;
  c.fillRect(0, 0, width, height * 0.12);

  const southIce = c.createLinearGradient(0, height * 0.88, 0, height);
  southIce.addColorStop(0, 'rgba(194, 223, 242, 0)');
  southIce.addColorStop(0.3, '#c2dff2');
  southIce.addColorStop(1, '#eaf4fc');
  c.fillStyle = southIce;
  c.fillRect(0, height * 0.88, width, height * 0.12);
}

function drawGraticule(c: CanvasRenderingContext2D, width: number, height: number, stroke: string) {
  c.strokeStyle = stroke;
  c.lineWidth = 1;
  for (let lat = 1; lat < 12; lat++) {
    const y = (lat / 12) * height;
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(width, y);
    c.stroke();
  }
  for (let lon = 0; lon < 24; lon++) {
    const x = (lon / 24) * width;
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, height);
    c.stroke();
  }
}
