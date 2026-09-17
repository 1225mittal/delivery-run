import { useState, useEffect, useCallback } from 'react';
import { Calendar, Users, Loader2, LogIn, LogOut, MapPin, AlertCircle, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { AttendanceWithBoy, DeliveryBoy } from '@/types';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default function AttendanceLogsTab() {
  const [logs, setLogs] = useState<AttendanceWithBoy[]>([]);
  const [boys, setBoys] = useState<DeliveryBoy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const [filterMode, setFilterMode] = useState<'single' | 'range'>('single');
  const [filterDate, setFilterDate] = useState<string>(today);
  const [filterDateFrom, setFilterDateFrom] = useState<string>(today);
  const [filterDateTo, setFilterDateTo] = useState<string>(today);
  const [filterBoyId, setFilterBoyId] = useState<string>('all');

  const fetchBoys = useCallback(async () => {
    const { data, error: boyError } = await supabase
      .from('delivery_boys')
      .select('id, name, phone, pin, is_active, created_at')
      .order('name', { ascending: true });
    if (!boyError && data) {
      setBoys(data as DeliveryBoy[]);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('attendance')
        .select(
          'id, delivery_boy_id, punch_type, latitude, longitude, recorded_at, delivery_boys(name)'
        )
        .order('recorded_at', { ascending: false });

      if (filterMode === 'single' && filterDate) {
        const start = new Date(`${filterDate}T00:00:00`);
        const end = new Date(`${filterDate}T23:59:59.999`);
        query = query
          .gte('recorded_at', start.toISOString())
          .lte('recorded_at', end.toISOString());
      } else if (filterMode === 'range' && filterDateFrom && filterDateTo) {
        const start = new Date(`${filterDateFrom}T00:00:00`);
        const end = new Date(`${filterDateTo}T23:59:59.999`);
        query = query
          .gte('recorded_at', start.toISOString())
          .lte('recorded_at', end.toISOString());
      }

      if (filterBoyId !== 'all') {
        query = query.eq('delivery_boy_id', filterBoyId);
      }

      const { data, error: queryError } = await query;
      if (queryError) throw queryError;

      const mapped: AttendanceWithBoy[] = (data ?? []).map((row) => {
        const r = row as unknown as {
          id: string;
          delivery_boy_id: string;
          punch_type: 'punch_in' | 'punch_out';
          latitude: number;
          longitude: number;
          recorded_at: string;
          delivery_boys: { name: string } | null;
        };
        return {
          id: r.id,
          delivery_boy_id: r.delivery_boy_id,
          punch_type: r.punch_type,
          latitude: r.latitude,
          longitude: r.longitude,
          recorded_at: r.recorded_at,
          delivery_boy_name: r.delivery_boys?.name ?? 'Unknown',
        };
      });

      setLogs(mapped);
    } catch {
      setError('Failed to load attendance logs.');
    } finally {
      setLoading(false);
    }
  }, [filterMode, filterDate, filterDateFrom, filterDateTo, filterBoyId]);

  useEffect(() => {
    fetchBoys();
  }, [fetchBoys]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const punchInCount = logs.filter((l) => l.punch_type === 'punch_in').length;
  const punchOutCount = logs.filter((l) => l.punch_type === 'punch_out').length;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-slate-300 text-sm font-semibold">
          <Search className="w-4 h-4 text-sky-400" />
          Filter Logs
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilterMode('single')}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
              filterMode === 'single'
                ? 'bg-sky-500/15 text-sky-400 border border-sky-500/40'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            Single Day
          </button>
          <button
            onClick={() => setFilterMode('range')}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
              filterMode === 'range'
                ? 'bg-sky-500/15 text-sky-400 border border-sky-500/40'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            Date Range
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {filterMode === 'single' ? (
            <div className="flex-1">
              <label className="text-slate-500 text-xs font-medium block mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Date
              </label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                max={today}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-sky-500 transition-colors"
              />
            </div>
          ) : (
            <>
              <div className="flex-1">
                <label className="text-slate-500 text-xs font-medium block mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  From
                </label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  max={today}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>
              <div className="flex-1">
                <label className="text-slate-500 text-xs font-medium block mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  To
                </label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  max={today}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>
            </>
          )}

          <div className="flex-1">
            <label className="text-slate-500 text-xs font-medium block mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Delivery Boy
            </label>
            <select
              value={filterBoyId}
              onChange={(e) => setFilterBoyId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-sky-500 transition-colors"
            >
              <option value="all">All Delivery Boys</option>
              {boys.map((boy) => (
                <option key={boy.id} value={boy.id}>
                  {boy.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="flex gap-3">
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
            <LogIn className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-slate-500 text-[10px] uppercase tracking-wide font-semibold leading-none">Punch In</p>
            <p className="text-emerald-400 text-lg font-bold mt-0.5">{punchInCount}</p>
          </div>
        </div>
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
            <LogOut className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="text-slate-500 text-[10px] uppercase tracking-wide font-semibold leading-none">Punch Out</p>
            <p className="text-red-400 text-lg font-bold mt-0.5">{punchOutCount}</p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300 flex-1">{error}</p>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
          <p className="text-slate-400 text-sm">Loading attendance logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Calendar className="w-12 h-12 text-slate-700" />
          <p className="text-slate-400 text-sm font-medium">No attendance records found</p>
          <p className="text-slate-600 text-xs">Try a different date or delivery boy.</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/50">
                  <th className="text-left text-slate-400 text-xs font-semibold uppercase tracking-wide px-4 py-3">Delivery Boy</th>
                  <th className="text-left text-slate-400 text-xs font-semibold uppercase tracking-wide px-4 py-3">Type</th>
                  <th className="text-left text-slate-400 text-xs font-semibold uppercase tracking-wide px-4 py-3">Date & Time</th>
                  <th className="text-left text-slate-400 text-xs font-semibold uppercase tracking-wide px-4 py-3">Location</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="text-slate-200 text-sm font-medium">{log.delivery_boy_name}</span>
                    </td>
                    <td className="px-4 py-3">
                      {log.punch_type === 'punch_in' ? (
                        <span className="inline-flex items-center gap-1.5 bg-emerald-500/15 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-lg">
                          <LogIn className="w-3 h-3" />
                          Punch In
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 bg-red-500/15 text-red-400 text-xs font-bold px-2.5 py-1 rounded-lg">
                          <LogOut className="w-3 h-3" />
                          Punch Out
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-200 text-sm">{formatDate(log.recorded_at)}</div>
                      <div className="text-slate-500 text-xs">{formatTime(log.recorded_at)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`https://www.google.com/maps?q=${log.latitude},${log.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sky-400 hover:text-sky-300 text-xs font-medium transition-colors"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        View on Map
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-slate-800">
            {logs.map((log) => (
              <div key={log.id} className="px-4 py-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-200 text-sm font-medium">{log.delivery_boy_name}</span>
                  {log.punch_type === 'punch_in' ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-400 text-xs font-bold px-2 py-0.5 rounded-lg">
                      <LogIn className="w-3 h-3" />
                      In
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-red-500/15 text-red-400 text-xs font-bold px-2 py-0.5 rounded-lg">
                      <LogOut className="w-3 h-3" />
                      Out
                    </span>
                  )}
                </div>
                <div className="text-slate-500 text-xs">
                  {formatDate(log.recorded_at)} at {formatTime(log.recorded_at)}
                </div>
                <a
                  href={`https://www.google.com/maps?q=${log.latitude},${log.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sky-400 hover:text-sky-300 text-xs font-medium transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  View on Map
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
