import { useState } from 'react';
import {
  Shield, LogOut, PackagePlus, Users, ClipboardList, Clock, BookOpen, Package,
} from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import CounterOrderTab from '@/components/admin/CounterOrderTab';
import DeliveryBoysTab from '@/components/admin/DeliveryBoysTab';
import DeliveryHistoryTab from '@/components/admin/DeliveryHistoryTab';
import AttendanceLogsTab from '@/components/admin/AttendanceLogsTab';
import AddressBookTab from '@/components/admin/AddressBookTab';

type TabType = 'counter' | 'deliveryBoys' | 'history' | 'attendance' | 'addressBook';

export default function AdminPanel() {
  const { admin, logout } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<TabType>('counter');

  const tabs: { id: TabType; label: string; icon: typeof PackagePlus }[] = [
    { id: 'counter', label: 'Counter Orders', icon: ClipboardList },
    { id: 'deliveryBoys', label: 'Delivery Boys', icon: Users },
    { id: 'history', label: 'Orders', icon: ClipboardList },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'addressBook', label: 'Address Book', icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-5 pt-6 pb-4 safe-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center shadow-md">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">Admin Portal</h1>
              <p className="text-slate-400 text-xs">{admin?.display_name ?? 'Administrator'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 rounded-xl px-4 py-2.5 text-slate-300 text-sm font-medium transition-colors active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        {/* Desktop sidebar-style tabs (horizontal on mobile, sidebar on desktop) */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-semibold transition-all active:scale-[0.98] whitespace-nowrap ${
                  isActive
                    ? 'bg-sky-500/15 text-sky-400 border border-sky-500/50'
                    : 'bg-slate-800/60 text-slate-400 border border-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-5 py-5 max-w-4xl w-full mx-auto">
        {activeTab === 'counter' && <CounterOrderTab />}
        {activeTab === 'deliveryBoys' && <DeliveryBoysTab />}
        {activeTab === 'history' && <DeliveryHistoryTab />}
        {activeTab === 'attendance' && <AttendanceLogsTab />}
        {activeTab === 'addressBook' && <AddressBookTab />}
      </main>
    </div>
  );
}
