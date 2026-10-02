// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'

import Home           from './pages/Home'
import EventGateway   from './pages/EventGateway'
import GuestUploader  from './pages/GuestUploader'
import Gallery        from './pages/Gallery'
import HostLogin      from './pages/HostLogin'
import HostSignup     from './pages/HostSignup'
import HostDashboard  from './pages/HostDashboard'
import AdminLogin     from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'

export default function App() {
  return (
    // Removed the <BrowserRouter> from here to fix the conflict
    <Routes>
      {/* ── Marketing home ───────────────────────────────────── */}
      <Route path="/"          element={<Home />} />

      {/* ── Host routes ──────────────────────────────────────── */}
      <Route path="/login"     element={<HostLogin />} />
      <Route path="/signup"    element={<HostSignup />} />
      <Route path="/dashboard" element={<HostDashboard />} />

      {/* ── Guest routes (all scoped to /:eventSlug) ─────────── */}
      <Route path="/:eventSlug"          element={<EventGateway />} />
      <Route path="/:eventSlug/upload"   element={<GuestUploader />} />
      <Route path="/:eventSlug/gallery"  element={<Gallery />} />

      {/* ── Admin routes ─────────────────────────────────────── */}
      <Route path="/admin/login"  element={<AdminLogin />} />
      <Route path="/admin"        element={<AdminDashboard />} />

      {/* ── Fallback ─────────────────────────────────────────── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}