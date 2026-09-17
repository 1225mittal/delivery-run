import { useEffect, useRef, useState } from 'react';
import { LocateFixed, MapPin, ExternalLink, Loader2 } from 'lucide-react';

export default function LiveMap() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('GPS not supported on this device.');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setError(null);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setError('Location permission denied. Enable GPS to see your position.');
        } else {
          setError('Could not get your location.');
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-lg flex items-center justify-center bg-slate-900" style={{ height: '320px' }}>
        <p className="text-red-400 text-sm text-center px-6">{error}</p>
      </div>
    );
  }

  if (!coords) {
    return (
      <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-lg flex flex-col items-center justify-center gap-3 bg-slate-900" style={{ height: '320px' }}>
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
        <p className="text-slate-300 text-sm font-medium">Locating your position...</p>
        <p className="text-slate-500 text-xs">Waiting for GPS signal</p>
      </div>
    );
  }

  const { lat, lng } = coords;
  const embedSrc = `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
  const gmapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-lg" style={{ height: '320px' }}>
      <iframe
        src={embedSrc}
        title="Live location map"
        className="w-full h-full border-0"
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
      />

      {/* Live GPS badge */}
      <div className="absolute top-3 left-3 z-10 bg-slate-900/90 backdrop-blur-sm text-emerald-400 text-xs font-medium rounded-lg px-3 py-1.5 border border-emerald-500/30 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        Live GPS
      </div>

      {/* Coordinates card */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex items-stretch gap-2">
        <div className="flex-1 bg-slate-900/90 backdrop-blur-sm rounded-xl px-3 py-2 border border-slate-700 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-sky-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-slate-500 text-[10px] uppercase tracking-wide font-semibold leading-none">Your Location</p>
            <p className="text-slate-200 text-xs font-mono mt-1 truncate">
              {lat.toFixed(6)}, {lng.toFixed(6)}
            </p>
          </div>
        </div>
        <a
          href={gmapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold rounded-xl px-3.5 transition-colors active:scale-95"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">Google Maps</span>
        </a>
      </div>

      {/* Auto-tracking indicator */}
      <div className="absolute top-3 right-3 z-10 bg-slate-900/90 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-slate-700 flex items-center gap-1.5">
        <LocateFixed className="w-3.5 h-3.5 text-sky-400" />
        <span className="text-slate-300 text-xs font-medium">Auto-tracking</span>
      </div>
    </div>
  );
}
