import React, { useEffect, useState } from 'react';
import {
  Satellite,
  Sun,
  ShieldAlert,
  Image as ImageIcon,
  Radio,
  RefreshCw,
  Pause,
  Play,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  fetchISSTelemetry,
  fetchNASAAPOD,
  fetchNOAASpaceWeather,
  fetchNearEarthAsteroids,
  ISSData,
  NASAAPODData,
  NOAASpaceWeatherAlert,
  NearEarthAsteroid,
} from '../services/spaceData';

interface LiveSpaceDashboardProps {
  onFocusISS?: (lat: number, lng: number) => void;
}

export const LiveSpaceDashboard: React.FC<LiveSpaceDashboardProps> = ({ onFocusISS }) => {
  const [issData, setIssData] = useState<ISSData | null>(null);
  const [apodData, setApodData] = useState<NASAAPODData | null>(null);
  const [weatherAlerts, setWeatherAlerts] = useState<NOAASpaceWeatherAlert[]>([]);
  const [asteroids, setAsteroids] = useState<NearEarthAsteroid[]>([]);

  const [isPollingPaused, setIsPollingPaused] = useState(false);
  const [activeTab, setActiveTab] = useState<'iss' | 'apod' | 'weather' | 'asteroids'>('iss');
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  // Fetch all free space feeds
  const loadData = async () => {
    try {
      const [iss, apod, weather, ast] = await Promise.all([
        fetchISSTelemetry(),
        fetchNASAAPOD(),
        fetchNOAASpaceWeather(),
        fetchNearEarthAsteroids(),
      ]);
      setIssData(iss);
      setApodData(apod);
      setWeatherAlerts(weather);
      setAsteroids(ast);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err) {
      console.warn('Space dashboard load error:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Poll ISS position every 4 seconds unless paused
  useEffect(() => {
    if (isPollingPaused) return;

    const interval = setInterval(async () => {
      const iss = await fetchISSTelemetry();
      setIssData(iss);
      setLastRefreshed(new Date().toLocaleTimeString());
    }, 4000);

    return () => clearInterval(interval);
  }, [isPollingPaused]);

  return (
    <div className="bg-slate-950/85 backdrop-blur-2xl border border-cyan-500/25 rounded-2xl p-3.5 shadow-2xl space-y-3">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-cyan-500/15">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f0ff]" />
          <span className="text-xs uppercase font-mono tracking-wider font-bold text-cyan-300">
            Free Live Space Telemetry
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Pause / Resume Button */}
          <button
            onClick={() => setIsPollingPaused(!isPollingPaused)}
            title={isPollingPaused ? 'Resume Live Telemetry' : 'Pause Live Telemetry'}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-[10px] font-mono text-slate-300 hover:text-cyan-300 transition cursor-pointer"
          >
            {isPollingPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3 text-amber-400" />}
            <span>{isPollingPaused ? 'RESUME' : 'PAUSE'}</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900/60 rounded-xl border border-slate-800 text-[10px] font-mono">
        <button
          onClick={() => setActiveTab('iss')}
          className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer ${
            activeTab === 'iss' ? 'bg-cyan-500/25 text-cyan-300 font-bold border border-cyan-500/40' : 'text-slate-400'
          }`}
        >
          <Satellite className="w-3 h-3" />
          <span>ISS Live</span>
        </button>

        <button
          onClick={() => setActiveTab('weather')}
          className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer ${
            activeTab === 'weather' ? 'bg-amber-500/25 text-amber-300 font-bold border border-amber-500/40' : 'text-slate-400'
          }`}
        >
          <Sun className="w-3 h-3" />
          <span>NOAA SWPC</span>
        </button>

        <button
          onClick={() => setActiveTab('asteroids')}
          className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer ${
            activeTab === 'asteroids' ? 'bg-rose-500/25 text-rose-300 font-bold border border-rose-500/40' : 'text-slate-400'
          }`}
        >
          <ShieldAlert className="w-3 h-3" />
          <span>Asteroids</span>
        </button>

        <button
          onClick={() => setActiveTab('apod')}
          className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer ${
            activeTab === 'apod' ? 'bg-violet-500/25 text-violet-300 font-bold border border-violet-500/40' : 'text-slate-400'
          }`}
        >
          <ImageIcon className="w-3 h-3" />
          <span>NASA APOD</span>
        </button>
      </div>

      {/* 1. ISS Live Telemetry Content */}
      {activeTab === 'iss' && (
        <div className="space-y-2 font-mono text-xs">
          {issData ? (
            <div className="p-3 bg-slate-900/80 rounded-xl border border-cyan-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-200">ISS (NORAD 25544)</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-400 font-bold">
                  {issData.status} FEED
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                <div>
                  <span className="text-slate-500">LATITUDE: </span>
                  <span className="text-cyan-300">{issData.latitude.toFixed(2)}°</span>
                </div>
                <div>
                  <span className="text-slate-500">LONGITUDE: </span>
                  <span className="text-cyan-300">{issData.longitude.toFixed(2)}°</span>
                </div>
                <div>
                  <span className="text-slate-500">ALTITUDE: </span>
                  <span className="text-violet-300">{issData.altitude} km</span>
                </div>
                <div>
                  <span className="text-slate-500">VELOCITY: </span>
                  <span className="text-violet-300">{issData.velocity.toLocaleString()} km/h</span>
                </div>
              </div>

              {onFocusISS && (
                <button
                  onClick={() => onFocusISS(issData.latitude, issData.longitude)}
                  className="w-full mt-1 py-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60 transition text-xs font-bold cursor-pointer"
                >
                  Center Space Station on Globe
                </button>
              )}
            </div>
          ) : (
            <p className="text-slate-500 text-xs">Awaiting ISS telemetry connection...</p>
          )}
          <div className="text-[9px] text-slate-500 flex justify-between">
            <span>Source: WhereTheISS.at Open API</span>
            <span>Refreshed: {lastRefreshed}</span>
          </div>
        </div>
      )}

      {/* 2. NOAA Space Weather Alerts Content */}
      {activeTab === 'weather' && (
        <div className="space-y-2 font-mono text-xs">
          <div className="space-y-1.5">
            {weatherAlerts.slice(0, 2).map((alert, i) => (
              <div key={i} className="p-2.5 rounded-xl bg-slate-900/80 border border-amber-500/20 text-[11px] text-slate-300">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-amber-300">{alert.product_id}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 border border-amber-500/30 text-amber-400">
                    {alert.severity}
                  </span>
                </div>
                <p className="text-slate-400 text-[10px] leading-tight">{alert.summary}</p>
              </div>
            ))}
          </div>
          <div className="text-[9px] text-slate-500 flex justify-between">
            <span>Source: NOAA Space Weather Prediction Center</span>
            <span>Public Open Data</span>
          </div>
        </div>
      )}

      {/* 3. Near-Earth Objects (Asteroids) Content */}
      {activeTab === 'asteroids' && (
        <div className="space-y-2 font-mono text-xs">
          <div className="space-y-1.5">
            {asteroids.slice(0, 2).map((neo) => (
              <div key={neo.id} className="p-2 rounded-xl bg-slate-900/80 border border-rose-500/20 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-300">{neo.name}</span>
                  <span className="text-[9px] text-slate-400">{neo.missDistanceLunar} Lunar Distances</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                  <span>Size: ~{neo.estimatedDiameterMeters.max} m</span>
                  <span>Speed: {neo.relativeVelocityKmh.toLocaleString()} km/h</span>
                </div>
              </div>
            ))}
          </div>
          <div className="text-[9px] text-slate-500 flex justify-between">
            <span>Source: NASA CNEOS / NeoWs</span>
            <span>Planetary Defense Track</span>
          </div>
        </div>
      )}

      {/* 4. NASA APOD Content */}
      {activeTab === 'apod' && (
        <div className="space-y-2 font-mono text-xs">
          {apodData && (
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-violet-500/20 space-y-1.5">
              <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-950">
                <img src={apodData.url} alt={apodData.title} className="w-full h-full object-cover" />
              </div>
              <h4 className="font-bold text-violet-200 text-[11px] leading-tight">{apodData.title}</h4>
              <p className="text-[10px] text-slate-400 line-clamp-2">{apodData.explanation}</p>
            </div>
          )}
          <div className="text-[9px] text-slate-500 flex justify-between">
            <span>Source: NASA APOD Official API</span>
            <span>{apodData?.date}</span>
          </div>
        </div>
      )}
    </div>
  );
};
