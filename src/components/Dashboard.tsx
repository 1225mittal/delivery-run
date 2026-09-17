import { useState, useCallback, useEffect, useRef } from 'react';
import {
  MapPin, Navigation, Package, IndianRupee, LogOut, Loader2,
  RefreshCw, CheckCircle2, AlertCircle, Crosshair, Truck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Delivery } from '@/types';
import CompletionModal from '@/components/CompletionModal';
import LiveMap from '@/components/LiveMap';
import AttendanceBar from '@/components/AttendanceBar';
import { playNewOrderPing, requestNotificationPermission } from '@/lib/pingSound';

export default function Dashboard() {
  const { agent, logout } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [pinningId, setPinningId] = useState<string | null>(null);
  const knownDeliveryIds = useRef<Set<string>>(new Set());
  const isFirstFetch = useRef(true);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const fetchDeliveries = useCallback(async (silent = false) => {
    if (!agent) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_assigned_deliveries', {
        p_delivery_boy_id: agent.id,
      });
      if (rpcError) throw rpcError;
      const fetched = (data ?? []) as Delivery[];

      if (isFirstFetch.current) {
        knownDeliveryIds.current = new Set(fetched.map((d) => d.id));
        isFirstFetch.current = false;
      } else {
        const newOrders = fetched.filter((d) => !knownDeliveryIds.current.has(d.id));
        if (newOrders.length > 0) {
          for (const d of newOrders) knownDeliveryIds.current.add(d.id);
          playNewOrderPing(newOrders.length);
        }
        const fetchedIds = new Set(fetched.map((d) => d.id));
        knownDeliveryIds.current = fetchedIds;
      }

      setDeliveries(fetched);
    } catch {
      setError('Failed to load deliveries. Pull to refresh.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [agent]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  // Supabase Realtime: refetch on any delivery change for this driver
  useEffect(() => {
    if (!agent) return;
    const channel = supabase
      .channel('deliveries-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'deliveries' },
        (payload) => {
          const updated = payload.new as { id: string; status: string; assigned_to: string | null };
          if (updated.assigned_to === agent.id && updated.status === 'closed') {
            setDeliveries((prev) => prev.filter((d) => d.id !== updated.id));
            knownDeliveryIds.current.delete(updated.id);
          } else {
            fetchDeliveries(true);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'deliveries' },
        () => {
          fetchDeliveries(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agent, fetchDeliveries]);

  const handlePinLocation = useCallback(async (delivery: Delivery) => {
    setPinningId(delivery.id);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });

      const { error: updateError } = await supabase
        .from('deliveries')
        .update({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        .eq('id', delivery.id);

      if (updateError) throw updateError;

      // Also persist to the address book so future orders reuse this location
      if (delivery.address_id) {
        await supabase
          .from('addresses')
          .update({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
          .eq('id', delivery.address_id);
      }

      setDeliveries((prev) =>
        prev.map((d) =>
          d.id === delivery.id
            ? { ...d, latitude: position.coords.latitude, longitude: position.coords.longitude }
            : d
        )
      );
    } catch {
      setError('Could not get your location. Check GPS permissions and try again.');
    } finally {
      setPinningId(null);
    }
  }, []);

  const handleDeliveryCompleted = useCallback((deliveryId: string) => {
    fetchDeliveries();
    setSelectedDelivery(null);
  }, [fetchDeliveries]);

  const mapsUrl = (lat: number, lng: number) =>
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  const activeCount = deliveries.length;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-5 pt-6 pb-4 safe-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">Delivery Run</h1>
              <p className="text-slate-400 text-xs">Welcome, {agent?.name ?? 'Agent'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors active:scale-95"
            aria-label="Sign out"
          >
            <LogOut className="w-5 h-5 text-slate-300" />
          </button>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-3 mt-4">
          <div className="flex-1 bg-slate-800/60 rounded-xl px-4 py-2.5 flex items-center gap-2.5">
            <Package className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-300 text-sm font-medium">{activeCount} active</span>
          </div>
          <button
            onClick={() => fetchDeliveries()}
            disabled={loading}
            className="bg-slate-800/60 hover:bg-slate-700 rounded-xl px-4 py-2.5 flex items-center gap-2 transition-colors active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-slate-300 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-slate-300 text-sm font-medium">Refresh</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-5 py-5 space-y-4">
        {/* Attendance */}
        {agent && <AttendanceBar agent={agent} />}

        {/* Live Map */}
        <LiveMap />

        {error && (
          <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300 flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 text-xs font-medium ml-2">
              Dismiss
            </button>
          </div>
        )}

        {loading && deliveries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <p className="text-slate-400 text-sm">Loading your deliveries...</p>
          </div>
        ) : deliveries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <CheckCircle2 className="w-16 h-16 text-emerald-500/40" />
            <p className="text-slate-300 text-lg font-semibold">All caught up!</p>
            <p className="text-slate-500 text-sm">No active deliveries assigned to you.</p>
          </div>
        ) : (
          deliveries.map((delivery) => {
            const hasCoords = delivery.latitude != null && delivery.longitude != null;
            const isPinning = pinningId === delivery.id;
            return (
              <div
                key={delivery.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition-all hover:border-slate-700"
              >
                {/* Card header */}
                <div className="px-5 pt-4 pb-3 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-500/15 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-lg font-mono">
                      {delivery.bill_no ?? delivery.order_number}
                    </span>
                    {delivery.status === 'delivered' && (
                      <span className="bg-emerald-500/10 text-emerald-400/80 text-xs font-semibold px-2 py-0.5 rounded-lg border border-emerald-500/20">
                        Delivered — Awaiting Close
                      </span>
                    )}
                    <span className="bg-slate-800 text-slate-400 text-xs font-medium px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      {delivery.packets_count} pkt
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1 rounded-lg">
                    <IndianRupee className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-amber-300 font-bold text-sm">
                      {Number(delivery.bill_amount).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>

                {/* Address */}
                <div className="px-5 pb-3">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                    <div>
                      {delivery.flat_house_no && (
                        <p className="text-white text-sm font-semibold leading-relaxed">{delivery.flat_house_no}</p>
                      )}
                      {delivery.address ? (
                        <p className={`${delivery.flat_house_no ? 'text-slate-300 text-sm' : 'text-white text-sm font-medium'} leading-relaxed`}>{delivery.address}</p>
                      ) : !delivery.flat_house_no ? (
                        <p className="text-slate-500 text-sm italic">No address on file</p>
                      ) : null}
                      {delivery.landmark && (
                        <p className="text-slate-400 text-xs mt-1">
                          <span className="text-slate-500">Landmark:</span> {delivery.landmark}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="px-5 pb-4 pt-1 space-y-2.5">
                  {hasCoords ? (
                    <a
                      href={mapsUrl(delivery.latitude!, delivery.longitude!)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm rounded-xl py-3 flex items-center justify-center gap-2 hover:from-emerald-400 hover:to-teal-500 active:scale-[0.98] transition-all shadow-md shadow-emerald-500/20"
                    >
                      <Navigation className="w-4.5 h-4.5" />
                      Open in Google Maps
                    </a>
                  ) : (
                    <button
                      onClick={() => handlePinLocation(delivery)}
                      disabled={isPinning}
                      className="w-full bg-slate-800 text-slate-200 font-semibold text-sm rounded-xl py-3 flex items-center justify-center gap-2 hover:bg-slate-700 active:scale-[0.98] transition-all disabled:opacity-60 border border-slate-700"
                    >
                      {isPinning ? (
                        <>
                          <Loader2 className="w-4.5 h-4.5 animate-spin" />
                          Getting location...
                        </>
                      ) : (
                        <>
                          <Crosshair className="w-4.5 h-4.5 text-emerald-400" />
                          Pin & Save Current Location
                        </>
                      )}
                    </button>
                  )}

                  {delivery.status === 'assigned' && (
                    <button
                      onClick={() => setSelectedDelivery(delivery)}
                      className="w-full bg-slate-800/60 text-slate-200 font-semibold text-sm rounded-xl py-3 flex items-center justify-center gap-2 hover:bg-slate-700 active:scale-[0.98] transition-all border border-slate-700"
                    >
                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />
                      Complete Delivery
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* Completion Modal */}
      {selectedDelivery && (
        <CompletionModal
          delivery={selectedDelivery}
          onClose={() => setSelectedDelivery(null)}
          onCompleted={handleDeliveryCompleted}
        />
      )}
    </div>
  );
}
