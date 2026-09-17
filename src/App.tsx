import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AdminAuthProvider, useAdminAuth } from '@/context/AdminAuthContext';
import LoginScreen from '@/components/LoginScreen';
import Dashboard from '@/components/Dashboard';
import AdminLogin from '@/components/AdminLogin';
import AdminPanel from '@/components/AdminPanel';

function DriverApp() {
  const { agent } = useAuth();
  return agent ? <Dashboard /> : <LoginScreen />;
}

function AdminApp() {
  const { admin } = useAdminAuth();
  return admin ? <AdminPanel /> : <AdminLogin />;
}

function AppContent() {
  const isAdminRoute = window.location.pathname.startsWith('/admin');
  return isAdminRoute ? <AdminApp /> : <DriverApp />;
}

function App() {
  return (
    <AuthProvider>
      <AdminAuthProvider>
        <AppContent />
      </AdminAuthProvider>
    </AuthProvider>
  );
}

export default App;
