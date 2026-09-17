import { useState, useEffect, useCallback } from 'react';
import { Clock, LogIn, LogOut, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { StoredAgent } from '@/context/AuthContext';

const STORAGE_KEY_PREFIX = 'delivery_run_duty_';

interface Props {
  agent: StoredAgent;
}

interface DutyState {
  onDuty: boolean;
  punchedAt: string | null;
  lat: number | null;
  lng: number | null;
}

function getTodayKey(agentId: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `${STORAGE_KEY_PREFIX}${agentId}_${today}`;
}

function loadDutyState(agentId: string): DutyState {
  try {
    const raw = localStorage.getItem(getTodayKey(agentId));
    if (raw) return JSON.parse(raw) as DutyState;
  } catch {
    // fall through
  }
  return { onDuty: false, punchedAt: null, lat: null, lng: null };
}

function saveDutyState(agentId: string, state: DutyState) {
  try {
    localStorage.setItem(getTodayKey(agentId), JSON.stringify(state));
  } catch {
    // ignore
  }
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default function AttendanceBar({ agent }: Props) {
  const [duty, setDuty] = useState<DutyState>(() => loadDutyState(agent.id));
  const [punching, setPunching] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Re-check duty state when agent changes (e.g. fresh login)
  useEffect(() => {
    setDuty(loadDutyState(agent.id));
  }, [agent.id]);

  // Auto-dismiss banner after 4 seconds
  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), 4000);
    return () => clearTimeout(timer);
  }, [banner]);

  const handlePunch = useCallback(async () => {
    setPunching(true);
    setError(null);
    const punchType = duty.onDuty ? 'punch_out' : 'punch_in';

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const recordedAt = new Date().toISOString();

      const { error: insertError } = await supabase.from('attendance').insert({
        delivery_boy_id: agent.id,
        punch_type: punchType,
        latitude: lat,
        longitude: lng,
        recorded_at: recordedAt,
      });

      if (insertError) throw insertError;

      const newDuty: DutyState = {
        onDuty: !duty.onDuty,
        punchedAt: recordedAt,
        lat,
        lng,
      };
      setDuty(newDuty);
      saveDutyState(agent.id, newDuty);

      const action = punchType === 'punch_in' ? 'Punched In' : 'Punched Out';
      setBanner(`${action} at ${formatTime(recordedAt)} near ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    } catch (err) {
      if (err instanceof GeolocationPositionError || (err as GeolocationPositionError).code !== undefined) {
        setError('Could not get your location. Check GPS permissions and try again.');
      } else {
        setError('Failed to record attendance. Please try again.');
      }
    } finally {
      setPunching(false);
    }
  }, [duty.onDuty, agent.id]);

  return (
    <div className="space-y-2">
      {/* Attendance bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                duty.onDuty
                  ? 'bg-emerald-500/15'
                  : 'bg-slate-800'
              }`}
            >
              <Clock
                className={`w-5 h-5 ${
                  duty.onDuty ? 'text-emerald-400' : 'text-slate-500'
                }`}
              />
            </div>
            <div className="min-w-0">
              <p className="text-slate-400 text-xs font-medium leading-none">Attendance</p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`text-sm font-bold ${
                    duty.onDuty ? 'text-emerald-400' : 'text-slate-300'
                  }`}
                >
                  {duty.onDuty ? 'On Duty' : 'Off Duty'}
                </span>
                {duty.onDuty && duty.punchedAt && (
                  <span className="text-slate-500 text-xs">
                    since {formatTime(duty.punchedAt)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handlePunch}
            disabled={punching}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all active:scale-95 disabled:opacity-60 flex-shrink-0 ${
              duty.onDuty
                ? 'bg-red-500/15 text-red-400 border border-red-500/40 hover:bg-red-500/25'
                : 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-md shadow-emerald-500/20'
            }`}
          >
            {punching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Locating...</span>
              </>
            ) : duty.onDuty ? (
              <>
                <LogOut className="w-4 h-4" />
                <span>Punch Out</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Punch In</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Confirmation banner */}
      {banner && (
        <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <p className="text-sm text-emerald-300 flex-1">{banner}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          <p className="text-sm text-red-300 flex-1">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-400 text-xs font-medium"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
