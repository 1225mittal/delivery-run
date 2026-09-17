import { useState, useEffect, useCallback, type FormEvent } from 'react';
import {
  BookOpen, Loader2, AlertCircle, Search, Pencil, Trash2, X, MapPin,
  User, Phone, CheckCircle2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Address } from '@/types';

export default function AddressBookTab() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editAddr, setEditAddr] = useState<Address | null>(null);
  const [deleteAddr, setDeleteAddr] = useState<Address | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Edit form state
  const [fFlat, setFFlat] = useState('');
  const [fName, setFName] = useState('');
  const [fPhone, setFPhone] = useState('');
  const [fAddress, setFAddress] = useState('');
  const [fLandmark, setFLandmark] = useState('');
  const [fLat, setFLat] = useState('');
  const [fLng, setFLng] = useState('');

  const fetchAddresses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('addresses')
        .select('id, flat_house_no, customer_name, phone, full_address, landmark, latitude, longitude, created_at')
        .order('flat_house_no', { ascending: true });
      if (fetchError) throw fetchError;
      setAddresses(data ?? []);
    } catch {
      setError('Failed to load address book.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const filtered = search.trim()
    ? addresses.filter((a) => {
        const q = search.toLowerCase();
        return (
          a.flat_house_no.toLowerCase().includes(q) ||
          a.customer_name.toLowerCase().includes(q) ||
          a.phone.toLowerCase().includes(q)
        );
      })
    : addresses;

  const openEdit = (a: Address) => {
    setEditAddr(a);
    setFFlat(a.flat_house_no);
    setFName(a.customer_name);
    setFPhone(a.phone);
    setFAddress(a.full_address);
    setFLandmark(a.landmark ?? '');
    setFLat(a.latitude?.toString() ?? '');
    setFLng(a.longitude?.toString() ?? '');
    setEditError(null);
  };

  const handleEditSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editAddr) return;
    setEditError(null);

    if (!fAddress.trim()) {
      setEditError('Full address is required.');
      return;
    }

    setEditSubmitting(true);
    try {
      const updates = {
        flat_house_no: fFlat.trim(),
        customer_name: fName.trim(),
        phone: fPhone.trim(),
        full_address: fAddress.trim(),
        landmark: fLandmark.trim() || null,
        latitude: fLat ? parseFloat(fLat) : null,
        longitude: fLng ? parseFloat(fLng) : null,
      };
      const { error: updateError } = await supabase
        .from('addresses')
        .update(updates)
        .eq('id', editAddr.id);
      if (updateError) throw updateError;

      setAddresses((prev) =>
        prev.map((a) => (a.id === editAddr.id ? { ...a, ...updates } : a))
      );
      setEditAddr(null);
    } catch {
      setEditError('Failed to update address.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteAddr) return;
    setDeleteSubmitting(true);
    try {
      const { error: deleteError } = await supabase
        .from('addresses')
        .delete()
        .eq('id', deleteAddr.id);
      if (deleteError) throw deleteError;
      setAddresses((prev) => prev.filter((a) => a.id !== deleteAddr.id));
      setDeleteAddr(null);
    } catch {
      // silent
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by flat/house no, name, or phone..."
            className="w-full bg-slate-800/60 text-white text-base rounded-xl pl-11 pr-4 py-3 border border-slate-700 focus:border-sky-500 outline-none transition-all placeholder:text-slate-600"
          />
        </div>
        <p className="text-slate-500 text-xs mt-2">{filtered.length} of {addresses.length} addresses</p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
          <p className="text-slate-400 text-sm">Loading address book...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <BookOpen className="w-12 h-12 text-slate-700" />
          <p className="text-slate-400 text-sm font-medium">No addresses found</p>
          <p className="text-slate-600 text-xs">Try a different search or add addresses from the Counter Orders tab.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => (
            <div key={a.id} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-800 text-slate-300 text-xs font-bold px-2.5 py-1 rounded-lg font-mono">
                      {a.flat_house_no || '—'}
                    </span>
                    <p className="text-white text-sm font-medium truncate">{a.customer_name}</p>
                  </div>
                  <p className="text-slate-500 text-xs mt-1 flex items-center gap-1.5">
                    <Phone className="w-3 h-3" />
                    {a.phone || '—'}
                  </p>
                  <p className="text-slate-400 text-xs mt-1 flex items-start gap-1.5">
                    <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{a.full_address}</span>
                  </p>
                  {a.landmark && (
                    <p className="text-slate-600 text-xs mt-0.5 ml-4.5">Landmark: {a.landmark}</p>
                  )}
                  {(a.latitude != null && a.longitude != null) && (
                    <a
                      href={`https://www.google.com/maps?q=${a.latitude},${a.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 text-xs mt-1.5 transition-colors"
                    >
                      <MapPin className="w-3 h-3" />
                      View on Map
                    </a>
                  )}
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => openEdit(a)}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-slate-800 text-sky-400 hover:bg-slate-700 transition-colors active:scale-95"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteAddr(a)}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editAddr && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 flex-shrink-0">
              <h2 className="text-white font-bold text-lg">Edit Address</h2>
              <button
                onClick={() => setEditAddr(null)}
                className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors active:scale-95"
              >
                <X className="w-5 h-5 text-slate-300" />
              </button>
            </div>
            <form onSubmit={handleEditSave} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
              {editError && (
                <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{editError}</p>
                </div>
              )}
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">Flat / House No</label>
                <input
                  type="text"
                  value={fFlat}
                  onChange={(e) => setFFlat(e.target.value)}
                  className="w-full bg-slate-800/60 text-white text-sm rounded-xl px-3 py-2.5 border border-slate-700 focus:border-sky-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">Customer Name</label>
                <input
                  type="text"
                  value={fName}
                  onChange={(e) => setFName(e.target.value)}
                  className="w-full bg-slate-800/60 text-white text-sm rounded-xl px-3 py-2.5 border border-slate-700 focus:border-sky-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={fPhone}
                  onChange={(e) => setFPhone(e.target.value)}
                  className="w-full bg-slate-800/60 text-white text-sm rounded-xl px-3 py-2.5 border border-slate-700 focus:border-sky-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">Full Address</label>
                <textarea
                  value={fAddress}
                  onChange={(e) => setFAddress(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-800/60 text-white text-sm rounded-xl px-3 py-2.5 border border-slate-700 focus:border-sky-500 outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">Landmark</label>
                <input
                  type="text"
                  value={fLandmark}
                  onChange={(e) => setFLandmark(e.target.value)}
                  className="w-full bg-slate-800/60 text-white text-sm rounded-xl px-3 py-2.5 border border-slate-700 focus:border-sky-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 text-xs font-medium mb-1.5">Latitude</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={fLat}
                    onChange={(e) => setFLat(e.target.value)}
                    placeholder="12.9716"
                    className="w-full bg-slate-800/60 text-white text-sm rounded-xl px-3 py-2.5 border border-slate-700 focus:border-sky-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-medium mb-1.5">Longitude</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={fLng}
                    onChange={(e) => setFLng(e.target.value)}
                    placeholder="77.5946"
                    className="w-full bg-slate-800/60 text-white text-sm rounded-xl px-3 py-2.5 border border-slate-700 focus:border-sky-500 outline-none"
                  />
                </div>
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

      {/* Delete Confirmation */}
      {deleteAddr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <h2 className="text-white font-bold text-lg text-center">Delete Address?</h2>
            <p className="text-slate-400 text-sm text-center mt-2">
              Delete <span className="text-white font-medium">{deleteAddr.flat_house_no || deleteAddr.customer_name}</span>? This cannot be undone.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeleteAddr(null)}
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
