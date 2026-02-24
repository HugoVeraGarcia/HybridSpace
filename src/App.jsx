import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Sidebar from './components/Sidebar';
import OfficeMap from './components/OfficeMap';
import TeamView from './components/TeamView';
import QRCheckIn from './components/QRCheckIn';
import Analytics from './components/Analytics';
import CapacityAdmin from './components/CapacityAdmin';
import ZonesAdmin from './components/ZonesAdmin';
import SaasDashboard from './components/SaasDashboard';
import SaasRoute from './components/SaasRoute';
import Header from './components/Header';
import LoginPage from './pages/LoginPage';
import OfficeAdmin from './pages/OfficeAdmin';
import OfficeEditor from './pages/OfficeEditor';
import CompanyAdmin from './pages/CompanyAdmin';
import CheckInPage from './pages/CheckInPage';
import RegisterPage from './pages/RegisterPage';
import AcceptInvitePage from './pages/AcceptInvitePage';
import TeamAdmin from './pages/TeamAdmin';
import ResetPasswordPage from './pages/ResetPasswordPage';


function AppShell() {
  const [mode, setMode] = useState('employee');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <Header onOpenSidebar={() => setSidebarOpen(true)} />
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      <Sidebar mode={mode} setMode={setMode} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="main-content">
        <Routes>
          {/* Employee */}
          <Route path="/map" element={<OfficeMap />} />
          <Route path="/team" element={<TeamView />} />
          <Route path="/qr" element={<QRCheckIn />} />
          {/* Admin — for admins and superadmins */}
          <Route path="/admin/*" element={<AdminRoute>
            <Routes>
              <Route path="analytics" element={<Analytics />} />
              <Route path="capacity" element={<CapacityAdmin />} />
              <Route path="zones" element={<ZonesAdmin />} />
              <Route path="offices" element={<OfficeAdmin />} />
              <Route path="offices/:id/edit" element={<OfficeEditor />} />
              <Route path="team" element={<TeamAdmin />} />
            </Routes>
          </AdminRoute>} />

          {/* SaaS — only for superadmins */}
          <Route path="/saas/*" element={<SaasRoute>
            <Routes>
              <Route path="dashboard" element={<SaasDashboard />} />
              <Route path="companies" element={<CompanyAdmin />} />
            </Routes>
          </SaasRoute>} />

          {/* QR Check-in landing — full screen, no sidebar nav needed */}
          <Route path="/checkin/:bookingId" element={<CheckInPage />} />
          {/* Default */}
          <Route path="*" element={<Navigate to="/map" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<SaasRoute><RegisterPage /></SaasRoute>} />
          <Route path="/accept-invite/:token" element={<AcceptInvitePage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          {/* Protected — everything else */}
          <Route path="/*" element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
