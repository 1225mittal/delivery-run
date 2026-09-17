import { useState, useEffect, useCallback, type FormEvent } from 'react';
import {
  PackagePlus, Package, Loader2, AlertCircle, CheckCircle2, MapPin,
  IndianRupee, ChevronDown, Handshake, X,
  Image as ImageIcon, Search, Pencil, Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { generateBillNo } from '@/lib/billNo';
import type { DeliveryBoy, Address, DeliveryWithSettlement } from '@/types';
import EditOrderModal from '@/components/admin/EditOrderModal';

export default function CounterOrderTab() {
  const [boys, setBoys] = useState<DeliveryBoy[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [pendingOrders, setPendingOrders] = useState<DeliveryWithSettlement[]>([]);
  const [deliveredOrders, setDeliveredOrders] = useState<DeliveryWithSettlement[]>([]);
  const [loadingBoys, setLoadingBoys] = useState(true);
  const [loadingPool, setLoadingPool] = useState(true);
  const [address, setAddress] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [flatHouseNo, setFlatHouseNo] = useState('');
  const [packetsCount, setPacketsCount] = useState('1');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [newAddressAdded, setNewAddressAdded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showAddrDropdown, setShowAddrDropdown] = useState(false);
  const [handoverDelivery, setHandoverDelivery] = useState<DeliveryWithSettlement | null>(null);
  const [editDelivery, setEditDelivery] = useState<DeliveryWithSettlement | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    if (!lightboxImage) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxImage(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxImage]);

  const fetchBoys = useCallback(async () => {
    setLoadingBoys(true);
    try {
      const { data, error: boysError } = await supabase
        .from('delivery_boys')
        .select('id, name, phone, pin, is_active, created_at')
        .eq('is_active', true)
        .order('name', { ascending: true });
      if (boysError) throw boysError;
      setBoys(data ?? []);
    } catch {
      // dropdown will be empty
    } finally {
      setLoadingBoys(false);
    }
  }, []);

  const fetchAddresses = useCallback(async () => {
    const { data } = await supabase
      .from('addresses')
      .select('id, flat_house_no, customer_name, phone, full_address, landmark, latitude, longitude, created_at')
      .order('flat_house_no', { ascending: true });
    if (data) setAddresses(data as Address[]);
  }, []);

  const fetchPool = useCallback(async () => {
    setLoadingPool(true);
    try {
      const { data, error: poolError } = await supabase
        .from('deliveries')
        .select('id, order_number, bill_no, customer_name, customer_phone, address, landmark, bill_amount, latitude, longitude, status, assigned_to, created_at, flat_house_no, packets_count')
        .in('status', ['pending', 'assigned', 'delivered'])
        .order('created_at', { ascending: false });
      if (poolError) throw poolError;

      const deliveryIds = (data ?? []).map((d) => d.id);
      let settlementsMap: Record<string, DeliveryWithSettlement['settlement']> = {};
      if (deliveryIds.length > 0) {
        const { data: settlementsData } = await supabase
          .from('settlements')
          .select('id, delivery_id, delivery_boy_id, payment_method, amount_collected, upi_screenshot_path, pod_photo_path, created_at')
          .in('delivery_id', deliveryIds);
        for (const s of settlementsData ?? []) {
          settlementsMap[s.delivery_id] = s;
        }
      }

      const boysById: Record<string, string> = {};
      for (const b of boys) boysById[b.id] = b.name;

      const combined: DeliveryWithSettlement[] = (data ?? []).map((d) => ({
        ...d,
        settlement: settlementsMap[d.id] ?? null,
        delivery_boy_name: d.assigned_to ? boysById[d.assigned_to] ?? null : null,
      }));

      setPendingOrders(combined.filter((d) => d.status === 'pending' || d.status === 'assigned'));
      setDeliveredOrders(combined.filter((d) => d.status === 'delivered'));
    } catch {
      // silent
    } finally {
      setLoadingPool(false);
    }
  }, [boys]);

  useEffect(() => {
    fetchBoys();
    fetchAddresses();
  }, [fetchBoys, fetchAddresses]);

  useEffect(() => {
    fetchPool();
  }, [fetchPool]);

  // Realtime: auto-refresh when deliveries or settlements change
  useEffect(() => {
    const channel = supabase
      .channel('admin-counter-deliveries')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deliveries' },
        () => fetchPool(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settlements' },
        () => fetchPool(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPool]);

  const filteredAddresses = flatHouseNo.trim()
    ? addresses.filter((a) =>
        a.flat_house_no.toLowerCase().includes(flatHouseNo.toLowerCase()) ||
        a.customer_name.toLowerCase().includes(flatHouseNo.toLowerCase())
      ).slice(0, 8)
    : addresses.slice(0, 8);

  const selectAddress = (a: Address) => {
    setFlatHouseNo(a.flat_house_no);
    setAddress(a.full_address);
    setShowAddrDropdown(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!flatHouseNo.trim()) {
      setError('Flat / House No is required.');
      return;
    }

    const amount = billAmount.trim() ? parseFloat(billAmount) : 0;
    if (isNaN(amount) || amount < 0) {
      setError('Bill amount must be a valid number.');
      return;
    }

    const parsedPackets = parseInt(packetsCount, 10);
    if (isNaN(parsedPackets) || parsedPackets < 1) {
      setError('Packets must be at least 1.');
      return;
    }

    setSubmitting(true);
    try {
      const typedFlat = flatHouseNo.trim();
      const typedAddress = address.trim();

      // Check if address already exists (case-insensitive)
      const { data: existing } = await supabase
        .from('addresses')
        .select('id, full_address, latitude, longitude')
        .ilike('flat_house_no', typedFlat)
        .maybeSingle();

      let addressId: string | null = null;
      let newAddressAdded = false;
      let savedLat: number | null = null;
      let savedLng: number | null = null;

      if (existing) {
        addressId = existing.id;
        savedLat = existing.latitude;
        savedLng = existing.longitude;
        // Update full_address if user provided one and existing record had none
        if (typedAddress && !existing.full_address) {
          await supabase
            .from('addresses')
            .update({ full_address: typedAddress })
            .eq('id', existing.id);
        }
      } else {
        // Create new address entry
        const { data: inserted, error: addrInsertError } = await supabase
          .from('addresses')
          .insert({
            flat_house_no: typedFlat,
            customer_name: '',
            phone: '',
            full_address: typedAddress || '',
          })
          .select('id')
          .single();
        if (addrInsertError) throw addrInsertError;
        addressId = inserted.id;
        newAddressAdded = true;
      }

      const billNo = await generateBillNo();

      const { error: insertError } = await supabase
        .from('deliveries')
        .insert({
          order_number: billNo,
          bill_no: billNo,
          customer_name: '',
          customer_phone: null,
          address: typedAddress || '',
          landmark: null,
          bill_amount: amount,
          status: 'pending',
          assigned_to: null,
          flat_house_no: typedFlat,
          packets_count: parsedPackets,
          address_id: addressId,
          latitude: savedLat,
          longitude: savedLng,
        });
      if (insertError) throw insertError;

      setSuccess(true);
      setNewAddressAdded(newAddressAdded);
      setError(null);
      setAddress('');
      setBillAmount('');
      setFlatHouseNo('');
      setPacketsCount('1');
      fetchAddresses();
      fetchPool();
      setTimeout(() => { setSuccess(false); setNewAddressAdded(false); }, 3000);
    } catch (err) {
      setError(`Failed to create order. ${err instanceof Error ? err.message : 'Please try again.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssign = async (orderId: string, boyId: string) => {
    if (!boyId) return;
    const { error: assignError } = await supabase
      .from('deliveries')
      .update({ assigned_to: boyId, status: 'assigned' })
      .eq('id', orderId);
    if (!assignError) fetchPool();
  };

  const handleDelete = async (orderId: string) => {
    if (!window.confirm('Delete this order? This cannot be undone.')) return;
    setDeletingId(orderId);
    try {
      await supabase.from('settlements').delete().eq('delivery_id', orderId);
      const { error: deleteError } = await supabase.from('deliveries').delete().eq('id', orderId);
      if (deleteError) throw deleteError;
      fetchPool();
    } catch {
      // silent
    } finally {
      setDeletingId(null);
    }
  };

  const handleClose = async (orderId: string) => {
    setClosingId(orderId);
    try {
      const { error: closeError } = await supabase
        .from('deliveries')
        .update({ status: 'closed' })
        .eq('id', orderId);
      if (closeError) throw closeError;
      fetchPool();
    } catch {
      // silent
    } finally {
      setClosingId(null);
      setHandoverDelivery(null);
    }
  };

  const getPublicUrl = (path: string | null) => {
    if (!path) return null;
    const { data } = supabase.storage.from('delivery-proofs').getPublicUrl(path);
    return data.publicUrl;
  };

  const paymentLabel = (method: string | null) => {
    switch (method) {
      case 'cash': return 'Cash';
      case 'upi': return 'UPI';
      case 'credit': return 'Credit';
      default: return '—';
    }
  };

  return (
    <div className="space-y-5">
      {/* Create Order Form */}
      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
        <div className="flex items-center gap-2 text-slate-300 text-sm font-semibold">
          <PackagePlus className="w-4 h-4 text-sky-400" />
          Create New Order
        </div>

        {error && (
          <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-300">
              {newAddressAdded
                ? 'Order created & new address added to Address Book!'
                : 'Order created successfully!'}
            </p>
          </div>
        )}

        {/* Address autocomplete */}
        <div className="relative">
          <label className="block text-sm font-medium text-slate-300 mb-2">Flat / House No (autocomplete)</label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={flatHouseNo}
              onChange={(e) => {
                setFlatHouseNo(e.target.value);
                setShowAddrDropdown(true);
              }}
              onFocus={() => setShowAddrDropdown(true)}
              placeholder="Type flat/house no or search..."
              className="w-full bg-slate-800/60 text-white text-base rounded-xl pl-11 pr-4 py-3.5 border border-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all placeholder:text-slate-600"
            />
          </div>
          {showAddrDropdown && filteredAddresses.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-xl max-h-56 overflow-y-auto">
              {filteredAddresses.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => selectAddress(a)}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-700 transition-colors border-b border-slate-700/50 last:border-0"
                >
                  <p className="text-slate-200 text-sm font-medium">{a.flat_house_no} — {a.customer_name}</p>
                  <p className="text-slate-500 text-xs truncate">{a.full_address}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Delivery Address (optional)</label>
          <div className="relative">
            <MapPin className="absolute left-3.5 top-4 w-5 h-5 text-slate-500" />
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Auto-filled from address book, or type manually"
              rows={2}
              className="w-full bg-slate-800/60 text-white text-base rounded-xl pl-11 pr-4 py-3 border border-slate-700 focus:border-sky-500 outline-none transition-all placeholder:text-slate-600 resize-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Amount to Collect</label>
          <div className="relative">
            <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="number"
              inputMode="decimal"
              value={billAmount}
              onChange={(e) => setBillAmount(e.target.value)}
              placeholder="0"
              step="0.01"
              min="0"
              className="w-full bg-slate-800/60 text-white text-base rounded-xl pl-11 pr-4 py-3 border border-slate-700 focus:border-sky-500 outline-none transition-all placeholder:text-slate-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Number of Packets</label>
          <div className="relative">
            <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="number"
              inputMode="numeric"
              value={packetsCount}
              onChange={(e) => setPacketsCount(e.target.value)}
              placeholder="1"
              min="1"
              step="1"
              className="w-full bg-slate-800/60 text-white text-base rounded-xl pl-11 pr-4 py-3 border border-slate-700 focus:border-sky-500 outline-none transition-all placeholder:text-slate-600"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold text-base rounded-xl py-3.5 flex items-center justify-center gap-2 hover:from-sky-400 hover:to-blue-500 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <PackagePlus className="w-5 h-5" />
              Create Order
            </>
          )}
        </button>
      </form>

      {/* Pending Pool */}
      <div>
        <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3 px-1">
          Pending Pool ({pendingOrders.length})
        </h3>
        {loadingPool ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />
          </div>
        ) : pendingOrders.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-6 bg-slate-900 border border-slate-800 rounded-2xl">
            No pending orders. Create one above.
          </p>
        ) : (
          <div className="space-y-2">
            {pendingOrders.map((d) => (
              <div key={d.id} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-3">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg font-mono flex-shrink-0 ${d.status === 'pending' ? 'bg-amber-500/15 text-amber-400' : 'bg-sky-500/15 text-sky-400'}`}>
                  {d.bill_no ?? d.order_number}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {d.flat_house_no ?? '—'}
                  </p>
                  <p className="text-slate-500 text-xs truncate">
                    {d.status === 'pending' ? 'Unassigned' : d.delivery_boy_name ?? 'Assigned'} · ₹{Number(d.bill_amount).toFixed(0)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setEditDelivery(d)}
                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-sky-500/15 text-slate-400 hover:text-sky-400 flex items-center justify-center transition-colors active:scale-95"
                    aria-label="Edit order"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(d.id)}
                    disabled={deletingId === d.id}
                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-red-500/15 text-slate-400 hover:text-red-400 flex items-center justify-center transition-colors active:scale-95 disabled:opacity-50"
                    aria-label="Delete order"
                  >
                    {deletingId === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                  <div className="relative">
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                    <select
                      value={d.assigned_to ?? ''}
                      onChange={(e) => handleAssign(d.id, e.target.value)}
                      className="appearance-none bg-slate-800 text-slate-300 text-xs rounded-lg pl-2.5 pr-7 py-1.5 border border-slate-700 focus:outline-none focus:border-sky-500"
                    >
                      <option value="">Assign to...</option>
                      {boys.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delivered — Handover Settlement */}
      <div>
        <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3 px-1">
          Delivered — Awaiting Handover ({deliveredOrders.length})
        </h3>
        {deliveredOrders.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-6 bg-slate-900 border border-slate-800 rounded-2xl">
            No deliveries awaiting handover.
          </p>
        ) : (
          <div className="space-y-2">
            {deliveredOrders.map((d) => (
              <div key={d.id} className="bg-slate-900 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="bg-emerald-500/15 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-lg font-mono flex-shrink-0">
                  {d.bill_no ?? d.order_number}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {d.flat_house_no ? `${d.flat_house_no} — ` : ''}{d.customer_name}
                  </p>
                  <p className="text-slate-500 text-xs truncate">
                    {d.delivery_boy_name ?? '—'} · {d.packets_count} pkt
                    {d.settlement && ` · ${paymentLabel(d.settlement.payment_method)}`}
                    {d.settlement?.payment_method === 'cash' && ` · ₹${Number(d.settlement.amount_collected).toFixed(0)}`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setEditDelivery(d)}
                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-sky-500/15 text-slate-400 hover:text-sky-400 flex items-center justify-center transition-colors active:scale-95"
                    aria-label="Edit order"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(d.id)}
                    disabled={deletingId === d.id}
                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-red-500/15 text-slate-400 hover:text-red-400 flex items-center justify-center transition-colors active:scale-95 disabled:opacity-50"
                    aria-label="Delete order"
                  >
                    {deletingId === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => setHandoverDelivery(d)}
                    className="flex items-center gap-1.5 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors active:scale-95"
                  >
                    <Handshake className="w-3.5 h-3.5" />
                    Handover
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Handover Modal */}
      {handoverDelivery && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 flex-shrink-0">
              <div>
                <h2 className="text-white font-bold text-lg">Accept Handover</h2>
                <p className="text-slate-400 text-xs mt-0.5">{handoverDelivery.bill_no ?? handoverDelivery.order_number}</p>
              </div>
              <button
                onClick={() => setHandoverDelivery(null)}
                className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors active:scale-95"
              >
                <X className="w-5 h-5 text-slate-300" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
              <div className="bg-slate-800/40 rounded-xl p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 text-xs">Customer</span>
                  <span className="text-slate-200 text-sm">{handoverDelivery.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-xs">Driver</span>
                  <span className="text-slate-200 text-sm">{handoverDelivery.delivery_boy_name ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-xs">Packets</span>
                  <span className="text-slate-200 text-sm">{handoverDelivery.packets_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-xs">Bill Amount</span>
                  <span className="text-amber-300 text-sm font-bold">₹{Number(handoverDelivery.bill_amount).toFixed(2)}</span>
                </div>
                {handoverDelivery.settlement && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-xs">Payment</span>
                      <span className="text-slate-200 text-sm">{paymentLabel(handoverDelivery.settlement.payment_method)}</span>
                    </div>
                    {handoverDelivery.settlement.payment_method === 'cash' && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 text-xs">Cash Collected</span>
                        <span className="text-emerald-400 text-sm font-bold">₹{Number(handoverDelivery.settlement.amount_collected).toFixed(2)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* POD Photo */}
              {handoverDelivery.settlement && (() => {
                const podUrl = getPublicUrl(handoverDelivery.settlement.pod_photo_path);
                const upiUrl = getPublicUrl(handoverDelivery.settlement.upi_screenshot_path);
                return (
                  <div className="space-y-2">
                    {podUrl && (
                      <button
                        type="button"
                        onClick={() => setLightboxImage(podUrl)}
                        className="w-full flex items-center gap-2 bg-slate-800/60 rounded-xl px-3 py-2.5 hover:bg-slate-700 transition-colors"
                      >
                        <ImageIcon className="w-4 h-4 text-sky-400" />
                        <span className="text-slate-300 text-xs font-medium">View POD Photo</span>
                      </button>
                    )}
                    {upiUrl && (
                      <button
                        type="button"
                        onClick={() => setLightboxImage(upiUrl)}
                        className="w-full flex items-center gap-2 bg-slate-800/60 rounded-xl px-3 py-2.5 hover:bg-slate-700 transition-colors"
                      >
                        <ImageIcon className="w-4 h-4 text-sky-400" />
                        <span className="text-slate-300 text-xs font-medium">View UPI Screenshot</span>
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="px-5 py-4 border-t border-slate-800 flex-shrink-0">
              <button
                onClick={() => handleClose(handoverDelivery.id)}
                disabled={closingId === handoverDelivery.id}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-base rounded-xl py-3.5 flex items-center justify-center gap-2 hover:from-emerald-400 hover:to-teal-500 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
              >
                {closingId === handoverDelivery.id ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Closing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Accept Handover & Close
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {editDelivery && (
        <EditOrderModal
          delivery={editDelivery}
          onClose={() => setEditDelivery(null)}
          onSaved={fetchPool}
        />
      )}

      {/* Image Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            className="absolute top-5 right-5 w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors z-10"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <img
            src={lightboxImage}
            alt="Proof document"
            className="max-h-[80vh] max-w-full object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
