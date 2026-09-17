import { useState, useCallback, useRef, type FormEvent } from 'react';
import {
  X, Camera, IndianRupee, Smartphone, CreditCard, Loader2,
  CheckCircle2, AlertCircle, Upload, ImageIcon,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Delivery, PaymentMethod } from '@/types';

interface Props {
  delivery: Delivery;
  onClose: () => void;
  onCompleted: (deliveryId: string) => void;
}

export default function CompletionModal({ delivery, onClose, onCompleted }: Props) {
  const { agent } = useAuth();
  const [podFile, setPodFile] = useState<File | null>(null);
  const [upiFile, setUpiFile] = useState<File | null>(null);
  const [podPreview, setPodPreview] = useState<string | null>(null);
  const [upiPreview, setUpiPreview] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashAmount, setCashAmount] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const podInputRef = useRef<HTMLInputElement>(null);
  const upiInputRef = useRef<HTMLInputElement>(null);

  const handlePodChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPodFile(file);
    setPodPreview(URL.createObjectURL(file));
  };

  const handleUpiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUpiFile(file);
    setUpiPreview(URL.createObjectURL(file));
  };

  const uploadFile = useCallback(async (file: File, prefix: string) => {
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${prefix}/${delivery.id}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('delivery-proofs')
      .upload(fileName, file, { contentType: file.type });
    if (uploadError) throw uploadError;
    return fileName;
  }, [delivery.id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!podFile) {
      setError('Proof of delivery photo is required.');
      return;
    }
    if (paymentMethod === 'cash' && !cashAmount) {
      setError('Please enter the cash amount collected.');
      return;
    }
    if (paymentMethod === 'upi' && !upiFile) {
      setError('Please upload the UPI transaction screenshot.');
      return;
    }

    setSubmitting(true);
    try {
      // Upload POD photo
      const podPath = await uploadFile(podFile, 'pod');

      // Upload UPI screenshot if applicable
      let upiPath: string | null = null;
      if (paymentMethod === 'upi' && upiFile) {
        upiPath = await uploadFile(upiFile, 'upi');
      }

      // Insert settlement record
      const settlementRecord: Record<string, unknown> = {
        delivery_id: delivery.id,
        delivery_boy_id: agent?.id ?? null,
        payment_method: paymentMethod,
        amount_collected: paymentMethod === 'cash' ? parseFloat(cashAmount) : 0,
        upi_screenshot_path: upiPath,
        pod_photo_path: podPath,
      };

      const { error: settlementError } = await supabase
        .from('settlements')
        .insert(settlementRecord);

      if (settlementError) throw settlementError;

      // Update delivery status to 'delivered'
      const { error: updateError } = await supabase
        .from('deliveries')
        .update({ status: 'delivered' })
        .eq('id', delivery.id);

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => onCompleted(delivery.id), 1200);
    } catch {
      setError('Failed to submit delivery. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const paymentOptions: { value: PaymentMethod; label: string; icon: typeof IndianRupee; desc: string }[] = [
    { value: 'cash', label: 'Cash Received', icon: IndianRupee, desc: 'Enter amount collected' },
    { value: 'upi', label: 'UPI Received', icon: Smartphone, desc: 'Upload transaction screenshot' },
    { value: 'credit', label: 'Credit (Khata)', icon: CreditCard, desc: 'Mark as uncollected' },
  ];

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center gap-4 max-w-sm w-full">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-9 h-9 text-emerald-400" />
          </div>
          <h2 className="text-white text-xl font-bold">Delivery Complete!</h2>
          <p className="text-slate-400 text-sm text-center">
            {delivery.bill_no ?? delivery.order_number} has been marked as delivered and removed from your queue.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 flex-shrink-0">
          <div>
            <h2 className="text-white font-bold text-lg">Complete Delivery</h2>
            <p className="text-slate-400 text-xs mt-0.5">{delivery.bill_no ?? delivery.order_number}</p>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors active:scale-95 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-300" />
          </button>
        </div>

        {/* Scrollable content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* POD Photo Upload */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2.5">
              Proof of Delivery Photo <span className="text-red-400">*</span>
            </label>
            <input
              ref={podInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePodChange}
              className="hidden"
            />
            {podPreview ? (
              <div className="relative group">
                <img src={podPreview} alt="POD preview" className="w-full h-48 object-cover rounded-xl border border-slate-700" />
                <button
                  type="button"
                  onClick={() => { setPodFile(null); setPodPreview(null); }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/70 flex items-center justify-center text-white hover:bg-black/90 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => podInputRef.current?.click()}
                className="w-full h-48 border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-xl flex flex-col items-center justify-center gap-2.5 transition-colors bg-slate-800/40"
              >
                <Camera className="w-8 h-8 text-slate-500" />
                <span className="text-slate-400 text-sm font-medium">Take or upload a photo</span>
                <span className="text-slate-600 text-xs">Package delivered at customer location</span>
              </button>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2.5">
              Payment Settlement <span className="text-red-400">*</span>
            </label>
            <div className="space-y-2.5">
              {paymentOptions.map((opt) => {
                const isSelected = paymentMethod === opt.value;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPaymentMethod(opt.value)}
                    className={`w-full flex items-center gap-3 rounded-xl px-4 py-3.5 border transition-all active:scale-[0.98] ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500'
                        : 'bg-slate-800/40 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-emerald-500/20' : 'bg-slate-700/60'
                    }`}>
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                        {opt.label}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-600'
                    }`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conditional fields */}
          {paymentMethod === 'cash' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="block text-sm font-semibold text-slate-200 mb-2.5">
                Cash Amount Collected <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="number"
                  inputMode="decimal"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  placeholder={delivery.bill_amount.toString()}
                  step="0.01"
                  min="0"
                  className="w-full bg-slate-800/60 text-white text-base rounded-xl pl-11 pr-4 py-3.5 border border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-600"
                />
              </div>
              <p className="text-slate-500 text-xs mt-1.5">
                Bill amount: ₹{Number(delivery.bill_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}

          {paymentMethod === 'upi' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="block text-sm font-semibold text-slate-200 mb-2.5">
                UPI Transaction Screenshot <span className="text-red-400">*</span>
              </label>
              <input
                ref={upiInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleUpiChange}
                className="hidden"
              />
              {upiPreview ? (
                <div className="relative group">
                  <img src={upiPreview} alt="UPI screenshot preview" className="w-full h-48 object-cover rounded-xl border border-slate-700" />
                  <button
                    type="button"
                    onClick={() => { setUpiFile(null); setUpiPreview(null); }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/70 flex items-center justify-center text-white hover:bg-black/90 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => upiInputRef.current?.click()}
                  className="w-full h-40 border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors bg-slate-800/40"
                >
                  <ImageIcon className="w-7 h-7 text-slate-500" />
                  <span className="text-slate-400 text-sm font-medium">Upload screenshot</span>
                  <span className="text-slate-600 text-xs">Screenshot of UPI payment confirmation</span>
                </button>
              )}
            </div>
          )}

          {paymentMethod === 'credit' && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
              <CreditCard className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-300 font-medium">Marked as Credit (Khata)</p>
                <p className="text-xs text-amber-400/70 mt-0.5">
                  Bill amount ₹{Number(delivery.bill_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} will be recorded as uncollected.
                </p>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-800 flex-shrink-0">
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-base rounded-xl py-3.5 flex items-center justify-center gap-2 hover:from-emerald-400 hover:to-teal-500 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Submit & Complete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
