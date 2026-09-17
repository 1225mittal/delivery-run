import { useState, useEffect, useCallback, type FormEvent } from 'react';
import {
  PackagePlus, Package, Loader2, AlertCircle, CheckCircle2, User, MapPin,
  IndianRupee, FileText, ChevronDown,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { generateBillNo } from '@/lib/billNo';
import type { DeliveryBoy } from '@/types';

export default function CreateOrderTab() {
  const [boys, setBoys] = useState<DeliveryBoy[]>([]);
  const [loadingBoys, setLoadingBoys] = useState(true);
  const [orderNumber, setOrderNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [packetsCount, setPacketsCount] = useState('1');
  const [assignedTo, setAssignedTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => {
    fetchBoys();
  }, [fetchBoys]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!orderNumber.trim() || !customerName.trim() || !address.trim() || !billAmount.trim() || !assignedTo) {
      setError('All fields are required except landmark.');
      return;
    }

    const amount = parseFloat(billAmount);
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
      const billNo = await generateBillNo();

      const { error: insertError } = await supabase
        .from('deliveries')
        .insert({
          order_number: billNo,
          bill_no: billNo,
          customer_name: customerName.trim(),
          customer_phone: null,
          address: address.trim(),
          landmark: landmark.trim() || null,
          bill_amount: amount,
          status: 'assigned',
          assigned_to: assignedTo,
          packets_count: parsedPackets,
        });
      if (insertError) throw insertError;

      setSuccess(true);
      setOrderNumber('');
      setCustomerName('');
      setAddress('');
      setLandmark('');
      setBillAmount('');
      setPacketsCount('1');
      setAssignedTo('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(`Failed to create delivery order. ${err instanceof Error ? err.message : 'Please try again.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
      {error && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-300">Delivery order created successfully!</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Order / Bill Number</label>
        <div className="relative">
          <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="ORD-2406"
            className="w-full bg-slate-800/60 text-white text-base rounded-xl pl-11 pr-4 py-3.5 border border-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all placeholder:text-slate-600"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Customer Name</label>
        <div className="relative">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Priya Sharma"
            className="w-full bg-slate-800/60 text-white text-base rounded-xl pl-11 pr-4 py-3.5 border border-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all placeholder:text-slate-600"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Delivery Address</label>
        <div className="relative">
          <MapPin className="absolute left-3.5 top-4 w-5 h-5 text-slate-500" />
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="12, MG Road, Indiranagar, Bangalore 560038"
            rows={3}
            className="w-full bg-slate-800/60 text-white text-base rounded-xl pl-11 pr-4 py-3.5 border border-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all placeholder:text-slate-600 resize-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Landmark (optional)</label>
        <div className="relative">
          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
            placeholder="Near Metro Station"
            className="w-full bg-slate-800/60 text-white text-base rounded-xl pl-11 pr-4 py-3.5 border border-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all placeholder:text-slate-600"
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
            placeholder="1250.00"
            step="0.01"
            min="0"
            className="w-full bg-slate-800/60 text-white text-base rounded-xl pl-11 pr-4 py-3.5 border border-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all placeholder:text-slate-600"
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
            className="w-full bg-slate-800/60 text-white text-base rounded-xl pl-11 pr-4 py-3.5 border border-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all placeholder:text-slate-600"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Assign To</label>
        <div className="relative">
          <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" />
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            disabled={loadingBoys || boys.length === 0}
            className="w-full appearance-none bg-slate-800/60 text-white text-base rounded-xl pl-4 pr-11 py-3.5 border border-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all disabled:opacity-50"
          >
            <option value="">Select a delivery boy...</option>
            {boys.map((boy) => (
              <option key={boy.id} value={boy.id}>
                {boy.name} ({boy.phone})
              </option>
            ))}
          </select>
        </div>
        {boys.length === 0 && !loadingBoys && (
          <p className="text-amber-400/70 text-xs mt-1.5">
            No active delivery boys found. Add one in the Delivery Boys tab.
          </p>
        )}
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
            Create Delivery Order
          </>
        )}
      </button>
    </form>
  );
}
