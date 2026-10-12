import React, { useState } from 'react';
import {
  Search,
  MapPin,
  Crosshair,
  ChevronRight,
  Globe,
  Sparkles,
  Info,
  Layers,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { CELESTIAL_CATALOG, CelestialObjectData } from '../data/celestialObjects';
import { HIERARCHY_STEPS, TAMIL_NADU_CITIES, HierarchyStep } from '../data/hierarchyLevels';
import { searchPlaceNominatim, reverseGeocodeNominatim } from '../services/spaceData';

interface CelestialExplorerProps {
  activeObject: CelestialObjectData;
  onSelectObject: (obj: CelestialObjectData) => void;
  onNavigateToLocation: (lat: number, lng: number, placeName: string, zoom: number) => void;
  onEnterGroundMap: (lat: number, lng: number, placeName: string, zoom: number) => void;
}

export const CelestialExplorer: React.FC<CelestialExplorerProps> = ({
  activeObject,
  onSelectObject,
  onNavigateToLocation,
  onEnterGroundMap,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ displayName: string; lat: number; lng: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(3); // Earth is index 3
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Handle Search Submission with free Nominatim
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await searchPlaceNominatim(searchQuery);
      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  };

  // Select Search Result
  const handleSelectResult = (item: { displayName: string; lat: number; lng: number }) => {
    setSearchResults([]);
    setSearchQuery(item.displayName.split(',')[0]);
    onNavigateToLocation(item.lat, item.lng, item.displayName.split(',')[0], 12);
    onEnterGroundMap(item.lat, item.lng, item.displayName.split(',')[0], 12);
  };

  // Handle "My Location" Browser Geolocation
  const handleMyLocation = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const geocoded = await reverseGeocodeNominatim(latitude, longitude);
          const name = geocoded?.city
            ? `${geocoded.city}, ${geocoded.state || geocoded.country || ''}`
            : 'My Current Location';
          setIsLocating(false);
          onNavigateToLocation(latitude, longitude, name, 13);
          onEnterGroundMap(latitude, longitude, name, 13);
        } catch {
          setIsLocating(false);
          onNavigateToLocation(latitude, longitude, 'My Location', 13);
          onEnterGroundMap(latitude, longitude, 'My Location', 13);
        }
      },
      (err) => {
        setIsLocating(false);
        if (err.code === 1) {
          setLocationError('Location permission denied. You can manually search any city above.');
        } else {
          setLocationError('Unable to retrieve current coordinates.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Handle Hierarchy Step Click
  const handleStepClick = (step: HierarchyStep, index: number) => {
    setCurrentStepIndex(index);
    if (step.lat !== undefined && step.lng !== undefined) {
      if (step.zoomLevel >= 11) {
        onEnterGroundMap(step.lat, step.lng, step.name, step.zoomLevel);
      } else {
        onNavigateToLocation(step.lat, step.lng, step.name, step.zoomLevel);
      }
    }
  };

  return (
    <div className="bg-slate-950/85 backdrop-blur-2xl border border-cyan-500/25 rounded-2xl p-4 shadow-2xl space-y-4">
      {/* 1. Deep Zoom Breadcrumb Bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
            Cosmic Hierarchy Journey:
          </span>
          <span className="text-[9px] font-mono text-slate-500">Universe to Locality</span>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px] font-mono custom-scrollbar">
          {HIERARCHY_STEPS.map((step, idx) => (
            <React.Fragment key={step.id}>
              <button
                onClick={() => handleStepClick(step, idx)}
                className={`px-2 py-0.5 rounded-lg whitespace-nowrap transition cursor-pointer border ${
                  idx === currentStepIndex
                    ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 font-bold shadow-[0_0_8px_#00f0ff]'
                    : idx < currentStepIndex
                    ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    : 'bg-slate-950/60 border-slate-900 text-slate-600'
                }`}
              >
                {step.name}
              </button>
              {idx < HIERARCHY_STEPS.length - 1 && (
                <ChevronRight className="w-3 h-3 text-slate-700 shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 2. Free Location Search & "My Location" Button */}
      <div className="space-y-2">
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search planet, country, city, street..."
              className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs font-mono text-slate-200 focus:border-cyan-400 focus:outline-none placeholder:text-slate-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSearching}
            className="px-3 py-1.5 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/80 transition text-xs font-mono font-bold cursor-pointer disabled:opacity-50"
          >
            {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
          </button>

          <button
            type="button"
            onClick={handleMyLocation}
            disabled={isLocating}
            title="Locate me using browser geolocation"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-950 border border-violet-500/40 text-violet-300 hover:bg-violet-900/80 transition text-xs font-mono font-bold cursor-pointer disabled:opacity-50"
          >
            {isLocating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Crosshair className="w-3.5 h-3.5 text-violet-400" />
            )}
            <span className="hidden sm:inline">My Location</span>
          </button>
        </form>

        {/* Location Error alert if any */}
        {locationError && (
          <p className="text-[10px] font-mono text-amber-300 bg-amber-950/40 p-2 rounded-lg border border-amber-500/30">
            {locationError}
          </p>
        )}

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="bg-slate-900 border border-cyan-500/30 rounded-xl p-1 space-y-1 max-h-48 overflow-y-auto">
            {searchResults.map((res, i) => (
              <button
                key={i}
                onClick={() => handleSelectResult(res)}
                className="w-full text-left p-2 rounded-lg hover:bg-cyan-950/60 text-xs font-mono text-slate-200 transition flex items-center justify-between cursor-pointer"
              >
                <span className="truncate pr-2">{res.displayName}</span>
                <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Tamil Nadu Fast Jump Pill Bar (Example from prompt) */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-mono text-slate-400 font-semibold">
          Tamil Nadu City Presets (Earth → India → Tamil Nadu):
        </span>
        <div className="flex flex-wrap gap-1.5">
          {TAMIL_NADU_CITIES.map((city) => (
            <button
              key={city.name}
              onClick={() => {
                onNavigateToLocation(city.lat, city.lng, city.name, 12);
                onEnterGroundMap(city.lat, city.lng, city.name, 12);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-900/70 border border-slate-800 text-[10px] font-mono text-cyan-300 hover:border-cyan-500/50 hover:bg-cyan-950/60 transition cursor-pointer"
            >
              {city.name}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Interactive 3D Celestial Hologram Switcher */}
      <div className="space-y-2 pt-2 border-t border-cyan-500/15">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase font-mono tracking-wider text-violet-300 font-bold">
            Cosmic Hologram Target:
          </span>
          <span className="text-[9px] font-mono text-slate-500">Hold in your hands</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {CELESTIAL_CATALOG.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectObject(item)}
              className={`p-2 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                activeObject.id === item.id
                  ? 'bg-gradient-to-br from-cyan-950/70 to-violet-950/70 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <span className="text-[11px] font-mono font-bold truncate">{item.name.split(' ')[0]}</span>
              <span className="text-[9px] font-mono opacity-70 mt-0.5">{item.category}</span>
            </button>
          ))}
        </div>

        {/* Selected Celestial Body Educational Scientific Card */}
        <div className="p-3 bg-slate-900/80 rounded-xl border border-cyan-500/25 space-y-1.5 text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="font-bold text-cyan-300">{activeObject.name}</span>
            <span className="text-[10px] px-2 py-0.2 rounded bg-violet-950 border border-violet-500/40 text-violet-300">
              {activeObject.classification}
            </span>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">{activeObject.description}</p>

          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1.5 border-t border-slate-800">
            <div>
              <span className="text-slate-500">RADIUS: </span>
              <span className="text-slate-300">{activeObject.radiusKm}</span>
            </div>
            <div>
              <span className="text-slate-500">DISTANCE: </span>
              <span className="text-slate-300">{activeObject.distanceFromEarth}</span>
            </div>
            <div>
              <span className="text-slate-500">GRAVITY: </span>
              <span className="text-slate-300">{activeObject.gravity}</span>
            </div>
            <div>
              <span className="text-slate-500">TEMP: </span>
              <span className="text-slate-300">{activeObject.surfaceTemp}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
