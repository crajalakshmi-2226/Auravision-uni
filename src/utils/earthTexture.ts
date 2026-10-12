import * as THREE from 'three';

/**
 * Creates a high quality procedural Earth texture on an HTML5 canvas.
 * This guarantees the 3D globe looks detailed, futuristic, and realistic
 * even if external network image CDNs are blocked, offline, or fail CORS.
 */
export function createProceduralEarthTexture(): THREE.CanvasTexture {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  // 1. Deep Ocean Base with realistic gradient
  const oceanGradient = ctx.createLinearGradient(0, 0, 0, height);
  oceanGradient.addColorStop(0, '#04132b');
  oceanGradient.addColorStop(0.3, '#062045');
  oceanGradient.addColorStop(0.5, '#0a2f64');
  oceanGradient.addColorStop(0.7, '#062045');
  oceanGradient.addColorStop(1, '#04132b');
  ctx.fillStyle = oceanGradient;
  ctx.fillRect(0, 0, width, height);

  // 2. Continental Shelf / Shallow Water Glow
  ctx.fillStyle = '#0f4880';

  const context = ctx;

  // Major continental landmass approximations (Equirectangular projection x: 0..width, y: 0..height)
  // [xCenter, yCenter, rx, ry, rotation]
  const landmasses: Array<{
    points: Array<[number, number]>;
    color: string;
    shelfColor?: string;
  }> = [
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
      ],
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
      ],
      color: '#215c38',
      shelfColor: '#0e5272',
    },
    // Eurasia (Europe + Asia)
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
      ],
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
      ],
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
      ],
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
      ],
      color: '#d6e6f2',
      shelfColor: '#175676',
    },
  ];

  // Helper to draw smooth polygon
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

  // Draw shelves first
  context.filter = 'blur(12px)';
  for (const land of landmasses) {
    drawPolygon(context, land.points, land.shelfColor || '#0e5272');
  }
  context.filter = 'none';

  // Draw detailed landmasses with varied biome colors
  for (const land of landmasses) {
    drawPolygon(context, land.points, land.color, '#3d7853', 2);
  }

  // Add terrain noise & topography variations
  const imgData = ctx.getImageData(0, 0, width, height);
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
  ctx.putImageData(imgData, 0, 0);

  // Polar ice caps (North & South)
  const northIce = ctx.createLinearGradient(0, 0, 0, height * 0.12);
  northIce.addColorStop(0, '#eaf4fc');
  northIce.addColorStop(0.7, '#c2dff2');
  northIce.addColorStop(1, 'rgba(194, 223, 242, 0)');
  ctx.fillStyle = northIce;
  ctx.fillRect(0, 0, width, height * 0.12);

  const southIce = ctx.createLinearGradient(0, height * 0.88, 0, height);
  southIce.addColorStop(0, 'rgba(194, 223, 242, 0)');
  southIce.addColorStop(0.3, '#c2dff2');
  southIce.addColorStop(1, '#eaf4fc');
  ctx.fillStyle = southIce;
  ctx.fillRect(0, height * 0.88, width, height * 0.12);

  // Futuristic cyber graticule lines (subtle sci-fi latitude/longitude grid)
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.12)';
  ctx.lineWidth = 1;

  // Latitude lines
  for (let lat = 1; lat < 12; lat++) {
    const y = (lat / 12) * height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Longitude lines
  for (let lon = 0; lon < 24; lon++) {
    const x = (lon / 24) * width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Equator line with slight neon cyan glow
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();

  // Prime meridian line
  ctx.strokeStyle = 'rgba(168, 85, 247, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(width / 2, 0);
  ctx.lineTo(width / 2, height);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * Creates procedural clouds texture with semi-transparent whisps
 */
export function createProceduralCloudsTexture(): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  ctx.clearRect(0, 0, width, height);

  // Generate multi-octave cloud patterns
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * width;
    const y = (0.2 + Math.random() * 0.6) * height;
    const radiusX = 30 + Math.random() * 90;
    const radiusY = 15 + Math.random() * 35;
    const rot = (Math.random() - 0.5) * 0.4;

    ctx.beginPath();
    ctx.ellipse(x, y, radiusX, radiusY, rot, 0, Math.PI * 2);
    ctx.fill();

    // Wrap around horizontal edges
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

  // Soft blur
  ctx.filter = 'blur(8px)';
  ctx.drawImage(canvas, 0, 0);
  ctx.filter = 'none';

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * Loads Earth texture from reliable external assets with automatic fallback
 * to the procedural canvas texture if network fails or takes too long.
 */
export function loadEarthTextureWithFallback(
  onLoaded?: () => void
): {
  earthTexture: THREE.Texture;
  cloudsTexture: THREE.Texture;
} {
  const proceduralEarth = createProceduralEarthTexture();
  const proceduralClouds = createProceduralCloudsTexture();

  // Primary texture candidate URLs (high-reliability CDN mirrors)
  const candidateUrls = [
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg',
    'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
  ];

  const textureLoader = new THREE.TextureLoader();
  textureLoader.crossOrigin = 'anonymous';

  // Try loading high-res satellite texture, fallback gracefully if fails
  const tryLoad = (index: number) => {
    if (index >= candidateUrls.length) {
      if (onLoaded) onLoaded();
      return;
    }

    textureLoader.load(
      candidateUrls[index],
      (loadedTexture) => {
        loadedTexture.wrapS = THREE.RepeatWrapping;
        loadedTexture.wrapT = THREE.ClampToEdgeWrapping;
        const canvas = proceduralEarth.image as HTMLCanvasElement;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(loadedTexture.image, 0, 0, canvas.width, canvas.height);
          proceduralEarth.needsUpdate = true;
        }
        if (onLoaded) onLoaded();
      },
      undefined,
      () => {
        // Try next candidate or stay with procedural
        tryLoad(index + 1);
      }
    );
  };

  tryLoad(0);

  return {
    earthTexture: proceduralEarth,
    cloudsTexture: proceduralClouds,
  };
}
