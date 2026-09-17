import { useState, useEffect, useCallback } from 'react';
import {
  Loader2, AlertCircle, IndianRupee, MapPin, Navigation, ChevronDown,
  Image as ImageIcon, X, Filter, Calendar, Users, Search, Printer,
  Package, User, Pencil, Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { DeliveryBoy, DeliveryWithSettlement } from '@/types';
import EditOrderModal from '@/components/admin/EditOrderModal';

type SubTab = 'byBoy' | 'byAddress' | 'byDate';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function paymentLabel(method: string | null) {
  switch (method) {
    case 'cash': return 'Cash';
    case 'upi': return 'UPI';
    case 'credit': return 'Credit';
    default: return '—';
  }
}

function getPublicUrl(path: string | null) {
  if (!path) return null;
  const { data } = supabase.storage.from('delivery-proofs').getPublicUrl(path);
  return data.publicUrl;
}

export default function DeliveryHistoryTab() {
  const [subTab, setSubTab] = useState<SubTab>('byBoy');
  const [allDeliveries, setAllDeliveries] = useState<DeliveryWithSettlement[]>([]);
  const [boys, setBoys] = useState<DeliveryBoy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [editDelivery, setEditDelivery] = useState<DeliveryWithSettlement | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // By Boy
  const [selectedBoyId, setSelectedBoyId] = useState('');

  // By Address
  const [addrSearch, setAddrSearch] = useState('');

  // By Date
  const today = new Date().toISOString().slice(0, 10);
  const [filterDate, setFilterDate] = useState(today);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [boysRes, deliveriesRes] = await Promise.all([
        supabase.from('delivery_boys').select('id, name, phone, pin, is_active, created_at').order('name', { ascending: true }),
        supabase
          .from('deliveries')
          .select('id, order_number, bill_no, customer_name, customer_phone, address, landmark, bill_amount, latitude, longitude, status, assigned_to, created_at, flat_house_no, packets_count')
          .order('created_at', { ascending: false }),
      ]);

      if (boysRes.error) throw boysRes.error;
      if (deliveriesRes.error) throw deliveriesRes.error;

      const boysList = boysRes.data ?? [];
      setBoys(boysList);

      const deliveryIds = (deliveriesRes.data ?? []).map((d) => d.id);
      let settlementsMap: Record<string, DeliveryWithSettlement['settlement']> = {};

      if (deliveryIds.length > 0) {
        const { data: settlementsData, error: settlementsError } = await supabase
          .from('settlements')
          .select('id, delivery_id, delivery_boy_id, payment_method, amount_collected, upi_screenshot_path, pod_photo_path, created_at')
          .in('delivery_id', deliveryIds);
        if (settlementsError) throw settlementsError;
        for (const s of settlementsData ?? []) {
          settlementsMap[s.delivery_id] = s;
        }
      }

      const boysById: Record<string, string> = {};
      for (const b of boysList) boysById[b.id] = b.name;

      const combined: DeliveryWithSettlement[] = (deliveriesRes.data ?? []).map((d) => ({
        ...d,
        settlement: settlementsMap[d.id] ?? null,
        delivery_boy_name: d.assigned_to ? boysById[d.assigned_to] ?? null : null,
      }));

      setAllDeliveries(combined);
    } catch {
      setError('Failed to load orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime: auto-refresh when deliveries or settlements change
  useEffect(() => {
    const channel = supabase
      .channel('admin-history-deliveries')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deliveries' },
        () => fetchData(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settlements' },
        () => fetchData(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const statusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'closed': return 'bg-slate-700 text-slate-300 border-slate-600';
      case 'assigned': return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
      case 'failed': return 'bg-red-500/15 text-red-400 border-red-500/30';
      default: return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  // === By Boy ===
  const boyDeliveries = selectedBoyId
    ? allDeliveries.filter((d) => d.assigned_to === selectedBoyId)
    : [];
  const boyCash = boyDeliveries
    .filter((d) => d.settlement?.payment_method === 'cash')
    .reduce((sum, d) => sum + Number(d.settlement!.amount_collected), 0);
  const boyUpi = boyDeliveries
    .filter((d) => d.settlement?.payment_method === 'upi')
    .reduce((sum, d) => sum + Number(d.bill_amount), 0);
  const boyTotalOrders = boyDeliveries.length;

  // === By Address ===
  const addrFiltered = addrSearch.trim()
    ? allDeliveries.filter((d) =>
        (d.flat_house_no ?? '').toLowerCase().includes(addrSearch.toLowerCase()) ||
        d.address.toLowerCase().includes(addrSearch.toLowerCase())
      )
    : [];

  // === By Date ===
  const dateFiltered = filterDate
    ? allDeliveries.filter((d) => {
        const dDate = new Date(d.created_at).toISOString().split('T')[0];
        return dDate === filterDate;
      })
    : [];
  const dateClosed = dateFiltered.filter((d) => d.status === 'closed' || d.status === 'delivered');
  const dateTotalCollection = dateClosed.reduce((sum, d) => {
    if (d.settlement?.payment_method === 'cash') return sum + Number(d.settlement.amount_collected);
    if (d.settlement?.payment_method === 'upi') return sum + Number(d.bill_amount);
    return sum;
  }, 0);
  const dateTotalPackets = dateClosed.reduce((sum, d) => sum + (d.packets_count || 1), 0);

  const handlePrint = () => {
    window.print();
  };

  const handleDelete = async (orderId: string) => {
    if (!window.confirm('Delete this order? This cannot be undone.')) return;
    setDeletingId(orderId);
    try {
      await supabase.from('settlements').delete().eq('delivery_id', orderId);
      const { error: deleteError } = await supabase.from('deliveries').delete().eq('id', orderId);
      if (deleteError) throw deleteError;
      fetchData();
    } catch {
      // silent
    } finally {
      setDeletingId(null);
    }
  };

  const editDeleteButtons = (d: DeliveryWithSettlement) => (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => setEditDelivery(d)}
        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-sky-500/15 text-slate-400 hover:text-sky-400 flex items-center justify-center transition-colors active:scale-95"
        aria-label="Edit order"
      >
        <Pencil className="w-3 h-3" />
      </button>
      <button
        onClick={() => handleDelete(d.id)}
        disabled={deletingId === d.id}
        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-red-500/15 text-slate-400 hover:text-red-400 flex items-center justify-center transition-colors active:scale-95 disabled:opacity-50"
        aria-label="Delete order"
      >
        {deletingId === d.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-2">
        {([
          { id: 'byBoy' as const, label: 'By Delivery Boy' },
          { id: 'byAddress' as const, label: 'By Address' },
          { id: 'byDate' as const, label: 'By Date' },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`flex-1 rounded-xl py-2.5 px-3 text-xs font-semibold transition-all active:scale-[0.98] ${
              subTab === t.id
                ? 'bg-sky-500/15 text-sky-400 border border-sky-500/40'
                : 'bg-slate-800/60 text-slate-400 border border-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
          <p className="text-slate-400 text-sm">Loading orders...</p>
        </div>
      ) : (
        <>
          {/* === BY BOY === */}
          {subTab === 'byBoy' && (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <label className="text-slate-500 text-xs font-medium block mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Select Delivery Boy
                </label>
                <div className="relative">
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <select
                    value={selectedBoyId}
                    onChange={(e) => setSelectedBoyId(e.target.value)}
                    className="w-full appearance-none bg-slate-800/60 text-white text-sm rounded-xl pl-3 pr-9 py-2.5 border border-slate-700 focus:border-sky-500 outline-none"
                  >
                    <option value="">Select a delivery boy...</option>
                    {boys.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedBoyId && (
                <>
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-3 text-center">
                      <p className="text-slate-500 text-[10px] uppercase tracking-wide font-semibold">Orders</p>
                      <p className="text-sky-400 text-xl font-bold mt-1">{boyTotalOrders}</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-3 text-center">
                      <p className="text-slate-500 text-[10px] uppercase tracking-wide font-semibold">Cash</p>
                      <p className="text-emerald-400 text-xl font-bold mt-1">₹{boyCash.toFixed(0)}</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-3 text-center">
                      <p className="text-slate-500 text-[10px] uppercase tracking-wide font-semibold">UPI</p>
                      <p className="text-amber-400 text-xl font-bold mt-1">₹{boyUpi.toFixed(0)}</p>
                    </div>
                  </div>

                  {/* Itemized */}
                  <div className="space-y-2">
                    {boyDeliveries.length === 0 ? (
                      <p className="text-slate-500 text-sm text-center py-6 bg-slate-900 border border-slate-800 rounded-2xl">
                        No orders for this driver.
                      </p>
                    ) : (
                      boyDeliveries.map((d) => (
                        <div key={d.id} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
                          <div className="flex items-center justify-between">
                            <span className="bg-slate-800 text-slate-300 text-xs font-bold px-2.5 py-1 rounded-lg font-mono">
                              {d.bill_no ?? d.order_number}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-semibold px-2 py-1 rounded-lg border ${statusColor(d.status)}`}>
                                {d.status}
                              </span>
                              {editDeleteButtons(d)}
                            </div>
                          </div>
                          <p className="text-white text-sm font-medium mt-2">{d.customer_name}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            <span>{d.packets_count} pkt</span>
                            <span>₹{Number(d.bill_amount).toFixed(0)}</span>
                            <span>{paymentLabel(d.settlement?.payment_method ?? null)}</span>
                            <span>{formatDate(d.created_at)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* === BY ADDRESS === */}
          {subTab === 'byAddress' && (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    value={addrSearch}
                    onChange={(e) => setAddrSearch(e.target.value)}
                    placeholder="Search by flat/house no or address..."
                    className="w-full bg-slate-800/60 text-white text-base rounded-xl pl-11 pr-4 py-3 border border-slate-700 focus:border-sky-500 outline-none transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              {addrSearch.trim() && (
                <div className="space-y-2">
                  {addrFiltered.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-6 bg-slate-900 border border-slate-800 rounded-2xl">
                      No orders found for this address.
                    </p>
                  ) : (
                    addrFiltered.map((d) => (
                      <div key={d.id} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="bg-slate-800 text-slate-300 text-xs font-bold px-2.5 py-1 rounded-lg font-mono">
                              {d.bill_no ?? d.order_number}
                            </span>
                            {d.flat_house_no && (
                              <span className="bg-sky-500/15 text-sky-400 text-xs font-bold px-2 py-0.5 rounded-lg">
                                {d.flat_house_no}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold px-2 py-1 rounded-lg border ${statusColor(d.status)}`}>
                              {d.status}
                            </span>
                            {editDeleteButtons(d)}
                          </div>
                        </div>
                        <p className="text-white text-sm font-medium mt-2">{d.customer_name}</p>
                        <p className="text-slate-400 text-xs mt-1">{d.address}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><Package className="w-3 h-3" />{d.packets_count} pkt</span>
                          <span>₹{Number(d.bill_amount).toFixed(0)}</span>
                          <span>{paymentLabel(d.settlement?.payment_method ?? null)}</span>
                          <span>{formatDate(d.created_at)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* === BY DATE === */}
          {subTab === 'byDate' && (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
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
                <button
                  onClick={handlePrint}
                  className="mt-6 flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl px-4 py-2.5 transition-colors active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-3 text-center">
                  <p className="text-slate-500 text-[10px] uppercase tracking-wide font-semibold">Deliveries</p>
                  <p className="text-sky-400 text-xl font-bold mt-1">{dateClosed.length}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-3 text-center">
                  <p className="text-slate-500 text-[10px] uppercase tracking-wide font-semibold">Collection</p>
                  <p className="text-emerald-400 text-xl font-bold mt-1">₹{dateTotalCollection.toFixed(0)}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-3 text-center">
                  <p className="text-slate-500 text-[10px] uppercase tracking-wide font-semibold">Packets</p>
                  <p className="text-amber-400 text-xl font-bold mt-1">{dateTotalPackets}</p>
                </div>
              </div>

              {/* Orders */}
              <div className="space-y-2">
                {dateFiltered.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-6 bg-slate-900 border border-slate-800 rounded-2xl">
                    No deliveries on this date.
                  </p>
                ) : (
                  dateFiltered.map((d) => (
                    <div key={d.id} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-800 text-slate-300 text-xs font-bold px-2.5 py-1 rounded-lg font-mono">
                            {d.bill_no ?? d.order_number}
                          </span>
                          <span className={`text-xs font-semibold px-2 py-1 rounded-lg border ${statusColor(d.status)}`}>
                            {d.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg">
                            <IndianRupee className="w-3 h-3 text-amber-400" />
                            <span className="text-amber-300 font-bold text-xs">{Number(d.bill_amount).toFixed(0)}</span>
                          </div>
                          {editDeleteButtons(d)}
                        </div>
                      </div>
                      <p className="text-white text-sm font-medium mt-2">{d.customer_name}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span>{d.delivery_boy_name ?? '—'}</span>
                        <span>{d.packets_count} pkt</span>
                        <span>{paymentLabel(d.settlement?.payment_method ?? null)}</span>
                        <span>{formatTime(d.created_at)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit Order Modal */}
      {editDelivery && (
        <EditOrderModal
          delivery={editDelivery}
          onClose={() => setEditDelivery(null)}
          onSaved={fetchData}
        />
      )}

      {/* Image zoom modal */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setZoomImage(null)}
        >
          <button
            className="absolute top-5 right-5 w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors"
            onClick={() => setZoomImage(null)}
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <img
            src={zoomImage}
            alt="Proof document"
            className="max-w-full max-h-full object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
