import { useState, useEffect, type FormEvent } from 'react';
import { X, Loader2, AlertCircle, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { DeliveryWithSettlement } from '@/types';

interface EditOrderModalProps {
  delivery: DeliveryWithSettlement;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditOrderModal({ delivery, onClose, onSaved }: EditOrderModalProps) {
  const [flatHouseNo, setFlatHouseNo] = useState(delivery.flat_house_no ?? '');
  const [address, setAddress] = useState(delivery.address ?? '');
  const [billAmount, setBillAmount] = useState(String(delivery.bill_amount));
  const [packetsCount, setPacketsCount] = useState(String(delivery.packets_count ?? 1));
  const [customerName, setCustomerName] = useState(delivery.customer_name ?? '');
  const [status, setStatus] = useState(delivery.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const amount = billAmount.trim() ? parseFloat(billAmount) : 0;
    if (isNaN(amount) || amount < 0) {
      setError('Bill amount must be a valid number.');
      return;
    }

    const packets = parseInt(packetsCount, 10);
    if (isNaN(packets) || packets < 1) {
      setError('Packets must be at least 1.');
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('deliveries')
        .update({
          flat_house_no: flatHouseNo.trim() || null,
          address: address.trim() || null,
          bill_amount: amount,
          packets_count: packets,
          customer_name: customerName.trim(),
          status,
        })
        .eq('id', delivery.id);

      if (updateError) throw updateError;
      onSaved();
      onClose();
    } catch {
      setError('Failed to update order. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 flex-shrink-0">
          <div>
            <h2 className="text-white font-bold text-lg">Edit Order</h2>
            <p className="text-slate-400 text-xs mt-0.5 font-mono">{delivery.bill_no ?? delivery.order_number}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors active:scale-95"
          >
            <X className="w-5 h-5 text-slate-300" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Flat / House No</label>
            <input
              type="text"
              value={flatHouseNo}
              onChange={(e) => setFlatHouseNo(e.target.value)}
              className="w-full bg-slate-800/60 text-white text-base rounded-xl px-4 py-3 border border-slate-700 focus:border-sky-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Customer Name</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full bg-slate-800/60 text-white text-base rounded-xl px-4 py-3 border border-slate-700 focus:border-sky-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Delivery Address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="w-full bg-slate-800/60 text-white text-base rounded-xl px-4 py-3 border border-slate-700 focus:border-sky-500 outline-none transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Bill Amount</label>
              <input
                type="number"
                inputMode="decimal"
                value={billAmount}
                onChange={(e) => setBillAmount(e.target.value)}
                step="0.01"
                min="0"
                className="w-full bg-slate-800/60 text-white text-base rounded-xl px-4 py-3 border border-slate-700 focus:border-sky-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Packets</label>
              <input
                type="number"
                inputMode="numeric"
                value={packetsCount}
                onChange={(e) => setPacketsCount(e.target.value)}
                min="1"
                className="w-full bg-slate-800/60 text-white text-base rounded-xl px-4 py-3 border border-slate-700 focus:border-sky-500 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full appearance-none bg-slate-800/60 text-white text-base rounded-xl px-4 py-3 border border-slate-700 focus:border-sky-500 outline-none transition-all"
            >
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="delivered">Delivered</option>
              <option value="closed">Closed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </form>

        <div className="px-5 py-4 border-t border-slate-800 flex-shrink-0">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold text-base rounded-xl py-3.5 flex items-center justify-center gap-2 hover:from-sky-400 hover:to-blue-500 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
