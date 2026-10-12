import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Layers, Crosshair, ArrowLeft, ZoomIn, ZoomOut, MapPin, Globe } from 'lucide-react';

interface DeepZoomMapProps {
  lat: number;
  lng: number;
  zoom: number;
  placeName: string;
  onBackToGlobe: () => void;
  onLocationChanged?: (lat: number, lng: number, placeName: string) => void;
}

export type MapTileProvider = 'osm' | 'nasa_satellite' | 'topo';

export const DeepZoomMap: React.FC<DeepZoomMapProps> = ({
  lat,
  lng,
  zoom,
  placeName,
  onBackToGlobe,
  onLocationChanged,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [activeProvider, setActiveProvider] = useState<MapTileProvider>('osm');
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [coords, setCoords] = useState({ lat, lng });

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: Math.min(18, Math.max(3, zoom)),
      zoomControl: false,
    });
    mapInstanceRef.current = map;

    // Custom Cyan-Violet Glowing Map Marker
    const icon = L.divIcon({
      className: 'custom-ar-marker',
      html: `
        <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; inset: 0; border-radius: 50%; background: rgba(6, 182, 212, 0.3); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 14px; height: 14px; border-radius: 50%; background: #00f0ff; border: 2px solid #ffffff; box-shadow: 0 0 10px #00f0ff;"></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const marker = L.marker([lat, lng], { icon }).addTo(map);
    markerRef.current = marker;

    // Track map movement
    map.on('move', () => {
      const c = map.getCenter();
      setCoords({ lat: c.lat, lng: c.lng });
      setCurrentZoom(map.getZoom());
    });

    map.on('click', (e) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      marker.setLatLng([clickLat, clickLng]);
      setCoords({ lat: clickLat, lng: clickLng });
      if (onLocationChanged) {
        onLocationChanged(clickLat, clickLng, `${clickLat.toFixed(4)}, ${clickLng.toFixed(4)}`);
      }
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update center when props change
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], Math.min(18, Math.max(3, zoom)), {
        animate: true,
      });
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      }
      setCoords({ lat, lng });
    }
  }, [lat, lng, zoom]);

  // Handle Tile Provider Switching
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let url = '';
    let attribution = '';
    let maxZoom = 19;

    if (activeProvider === 'osm') {
      url = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
      attribution = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors';
      maxZoom = 19;
    } else if (activeProvider === 'nasa_satellite') {
      // Free public ESRI World Imagery satellite tiles (public free access tier with attribution)
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      attribution = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
      maxZoom = 18;
    } else if (activeProvider === 'topo') {
      url = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
      attribution = 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>';
      maxZoom = 17;
    }

    const layer = L.tileLayer(url, {
      attribution,
      maxZoom,
      subdomains: 'abc',
    });
    layer.addTo(map);
    tileLayerRef.current = layer;
  }, [activeProvider]);

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-slate-950 overflow-hidden select-none animate-fadeIn">
      {/* Top Map HUD Bar */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Left: Return to Orbit Button & Location Pill */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onBackToGlobe}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950/90 backdrop-blur-xl border border-cyan-500/40 text-cyan-300 hover:text-white hover:bg-cyan-950/80 transition text-xs font-mono font-bold shadow-2xl cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            <span>Ascend to Orbit</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950/90 backdrop-blur-xl border border-cyan-500/30 text-xs font-mono text-slate-200 shadow-2xl">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold text-cyan-200">{placeName}</span>
            <span className="text-[10px] text-slate-400">
              ({coords.lat.toFixed(4)}°, {coords.lng.toFixed(4)}°)
            </span>
          </div>
        </div>

        {/* Right: Layer Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/90 backdrop-blur-xl border border-cyan-500/30 pointer-events-auto shadow-2xl">
          <button
            onClick={() => setActiveProvider('osm')}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer border ${
              activeProvider === 'osm'
                ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 font-bold shadow-[0_0_8px_#00f0ff]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            OpenStreetMap
          </button>
          <button
            onClick={() => setActiveProvider('nasa_satellite')}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer border ${
              activeProvider === 'nasa_satellite'
                ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 font-bold shadow-[0_0_8px_#00f0ff]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Satellite Aerial
          </button>
          <button
            onClick={() => setActiveProvider('topo')}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer border ${
              activeProvider === 'topo'
                ? 'bg-violet-500/30 border-violet-400 text-violet-200 font-bold shadow-[0_0_8px_#c084fc]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Topographic
          </button>
        </div>
      </div>

      {/* Map Viewport Container */}
      <div ref={mapContainerRef} className="w-full h-full relative" />

      {/* Floating Zoom & Crosshair Controls */}
      <div className="absolute bottom-6 right-6 z-[1000] flex flex-col items-center gap-2 pointer-events-auto">
        <button
          onClick={() => mapInstanceRef.current?.zoomIn()}
          className="w-10 h-10 rounded-xl bg-slate-950/90 backdrop-blur-xl border border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/80 flex items-center justify-center transition cursor-pointer shadow-xl"
          title="Zoom In"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={() => mapInstanceRef.current?.zoomOut()}
          className="w-10 h-10 rounded-xl bg-slate-950/90 backdrop-blur-xl border border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/80 flex items-center justify-center transition cursor-pointer shadow-xl"
          title="Zoom Out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          onClick={() => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.setView([lat, lng], 14);
            }
          }}
          className="w-10 h-10 rounded-xl bg-slate-950/90 backdrop-blur-xl border border-violet-500/40 text-violet-300 hover:bg-violet-950/80 flex items-center justify-center transition cursor-pointer shadow-xl"
          title="Center Location"
        >
          <Crosshair className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom Status / Attribution Note */}
      <div className="absolute bottom-3 left-4 z-[1000] pointer-events-none text-[10px] font-mono text-slate-400/90 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-800">
        Click anywhere on map to inspect coordinates • Free geographic data with attribution
      </div>
    </div>
  );
};
