import { useState, useEffect, useCallback, type FormEvent } from 'react';
import {
  UserPlus, Loader2, AlertCircle, CheckCircle2, Phone, Lock, User,
  Power, PowerOff, Pencil, Trash2, X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { DeliveryBoy } from '@/types';

export default function DeliveryBoysTab() {
  const [boys, setBoys] = useState<DeliveryBoy[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [editBoy, setEditBoy] = useState<DeliveryBoy | null>(null);
  const [deleteBoy, setDeleteBoy] = useState<DeliveryBoy | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPin, setEditPin] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchBoys = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('delivery_boys')
        .select('id, name, phone, pin, is_active, created_at')
        .order('name', { ascending: true });
      if (fetchError) throw fetchError;
      setBoys(data ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoys();
  }, [fetchBoys]);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!name.trim() || !phone.trim() || !pin.trim()) {
      setError('All fields are required.');
      return;
    }
    if (pin.trim().length !== 4 || !/^\d{4}$/.test(pin.trim())) {
      setError('PIN must be exactly 4 digits.');
      return;
    }

    setSubmitting(true);
    try {
      const { error: insertError } = await supabase
        .from('delivery_boys')
        .insert({
          name: name.trim(),
          phone: phone.trim(),
          pin: pin.trim(),
          is_active: true,
        });
      if (insertError) {
        if (insertError.code === '23505') {
          setError('A delivery boy with this phone number already exists.');
        } else {
          throw insertError;
        }
        return;
      }
      setSuccess(true);
      setName('');
      setPhone('');
      setPin('');
      fetchBoys();
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('Failed to add delivery boy. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (boy: DeliveryBoy) => {
    setTogglingId(boy.id);
    try {
      const { error: updateError } = await supabase
        .from('delivery_boys')
        .update({ is_active: !boy.is_active })
        .eq('id', boy.id);
      if (updateError) throw updateError;
      setBoys((prev) =>
        prev.map((b) => (b.id === boy.id ? { ...b, is_active: !b.is_active } : b))
      );
    } catch {
      // silent
    } finally {
      setTogglingId(null);
    }
  };

  const openEdit = (boy: DeliveryBoy) => {
    setEditBoy(boy);
    setEditName(boy.name);
    setEditPhone(boy.phone);
    setEditPin(boy.pin);
    setEditError(null);
  };

  const handleEditSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editBoy) return;
    setEditError(null);

    if (!editName.trim() || !editPhone.trim()) {
      setEditError('Name and phone are required.');
      return;
    }
    if (editPin.trim() && (editPin.trim().length !== 4 || !/^\d{4}$/.test(editPin.trim()))) {
      setEditError('PIN must be exactly 4 digits.');
      return;
    }

    setEditSubmitting(true);
    try {
      const updates: Record<string, string> = {
        name: editName.trim(),
        phone: editPhone.trim(),
      };
      if (editPin.trim()) {
        updates.pin = editPin.trim();
      }
      const { error: updateError } = await supabase
        .from('delivery_boys')
        .update(updates)
        .eq('id', editBoy.id);
      if (updateError) {
        if (updateError.code === '23505') {
          setEditError('A delivery boy with this phone number already exists.');
        } else {
          throw updateError;
        }
        return;
      }
      setBoys((prev) =>
        prev.map((b) =>
          b.id === editBoy.id
            ? { ...b, name: updates.name, phone: updates.phone, pin: updates.pin ?? b.pin }
            : b
        )
      );
      setEditBoy(null);
    } catch {
      setEditError('Failed to update delivery boy.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteBoy) return;
    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      const { error: deleteError } = await supabase
        .from('delivery_boys')
        .delete()
        .eq('id', deleteBoy.id);
      if (deleteError) throw deleteError;
      setBoys((prev) => prev.filter((b) => b.id !== deleteBoy.id));
      setDeleteBoy(null);
    } catch {
      setDeleteError('Failed to delete delivery boy. Please try again.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Add form */}
      <form onSubmit={handleAdd} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
        <div className="flex items-center gap-2 text-slate-300 text-sm font-semibold">
          <UserPlus className="w-4 h-4 text-sky-400" />
          Add New Delivery Boy
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
            <p className="text-sm text-emerald-300">Delivery boy added successfully!</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-slate-400 text-xs font-medium mb-1.5">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ravi Kumar"
                className="w-full bg-slate-800/60 text-white text-sm rounded-xl pl-10 pr-3 py-2.5 border border-slate-700 focus:border-sky-500 outline-none transition-all placeholder:text-slate-600"
              />
            </div>
          </div>
          <div>
            <label className="block text-slate-400 text-xs font-medium mb-1.5">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                maxLength={10}
                className="w-full bg-slate-800/60 text-white text-sm rounded-xl pl-10 pr-3 py-2.5 border border-slate-700 focus:border-sky-500 outline-none transition-all placeholder:text-slate-600"
              />
            </div>
          </div>
          <div>
            <label className="block text-slate-400 text-xs font-medium mb-1.5">4-Digit PIN</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="1234"
                maxLength={4}
                className="w-full bg-slate-800/60 text-white text-sm rounded-xl pl-10 pr-3 py-2.5 border border-slate-700 focus:border-sky-500 outline-none transition-all placeholder:text-slate-600 tracking-[0.5em]"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold text-sm rounded-xl py-3 flex items-center justify-center gap-2 hover:from-sky-400 hover:to-blue-500 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              Add Delivery Boy
            </>
          )}
        </button>
      </form>

      {/* Existing boys list */}
      <div>
        <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3 px-1">
          All Delivery Boys ({boys.length})
        </h3>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />
          </div>
        ) : boys.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-6 bg-slate-900 border border-slate-800 rounded-2xl">
            No delivery boys yet.
          </p>
        ) : (
          <div className="space-y-2">
            {boys.map((boy) => (
              <div
                key={boy.id}
                className={`flex items-center gap-3 bg-slate-900 border rounded-xl px-4 py-3 ${
                  boy.is_active ? 'border-slate-800' : 'border-slate-800 opacity-50'
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{boy.name}</p>
                  <p className="text-slate-500 text-xs font-mono">{boy.phone} · PIN: {boy.pin}</p>
                </div>
                <button
                  onClick={() => openEdit(boy)}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-slate-800 text-sky-400 hover:bg-slate-700 transition-colors active:scale-95"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => toggleActive(boy)}
                  disabled={togglingId === boy.id}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors active:scale-95 disabled:opacity-50 ${
                    boy.is_active
                      ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                >
                  {togglingId === boy.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : boy.is_active ? (
                    <>
                      <Power className="w-3.5 h-3.5" />
                      Active
                    </>
                  ) : (
                    <>
                      <PowerOff className="w-3.5 h-3.5" />
                      Inactive
                    </>
                  )}
                </button>
                <button
                  onClick={() => setDeleteBoy(boy)}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editBoy && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <h2 className="text-white font-bold text-lg">Edit Delivery Boy</h2>
              <button
                onClick={() => setEditBoy(null)}
                className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors active:scale-95"
              >
                <X className="w-5 h-5 text-slate-300" />
              </button>
            </div>
            <form onSubmit={handleEditSave} className="px-5 py-5 space-y-4">
              {editError && (
                <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{editError}</p>
                </div>
              )}
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-800/60 text-white text-sm rounded-xl px-3 py-2.5 border border-slate-700 focus:border-sky-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">Phone</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  maxLength={10}
                  className="w-full bg-slate-800/60 text-white text-sm rounded-xl px-3 py-2.5 border border-slate-700 focus:border-sky-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">Reset PIN (leave blank to keep current)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={editPin}
                  onChange={(e) => setEditPin(e.target.value.replace(/\D/g, ''))}
                  maxLength={4}
                  placeholder="••••"
                  className="w-full bg-slate-800/60 text-white text-sm rounded-xl px-3 py-2.5 border border-slate-700 focus:border-sky-500 outline-none tracking-[0.5em]"
                />
              </div>
              <button
                type="submit"
                disabled={editSubmitting}
                className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold text-sm rounded-xl py-3 flex items-center justify-center gap-2 hover:from-sky-400 hover:to-blue-500 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {editSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteBoy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <h2 className="text-white font-bold text-lg text-center">Delete Driver?</h2>
            <p className="text-slate-400 text-sm text-center mt-2">
              Are you sure you want to delete <span className="text-white font-medium">{deleteBoy.name}</span>? This action cannot be undone.
            </p>
            {deleteError && (
              <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mt-4">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{deleteError}</p>
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeleteBoy(null)}
                className="flex-1 bg-slate-800 text-slate-300 font-semibold text-sm rounded-xl py-3 hover:bg-slate-700 transition-colors active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteSubmitting}
                className="flex-1 bg-red-500 text-white font-semibold text-sm rounded-xl py-3 hover:bg-red-400 transition-colors active:scale-95 disabled:opacity-50"
              >
                {deleteSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
