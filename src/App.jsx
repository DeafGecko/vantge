// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'

import EventGateway   from './pages/EventGateway'
import GuestCamera    from './pages/GuestCamera'
import GuestUploader  from './pages/GuestUploader'
import Gallery        from './pages/Gallery'
import HostLogin      from './pages/HostLogin'
import HostDashboard  from './pages/HostDashboard'

export default function App() {
  return (
    // Removed the <BrowserRouter> from here to fix the conflict
    <Routes>
      {/* ── Host routes ──────────────────────────────────────── */}
      <Route path="/login"     element={<HostLogin />} />
      <Route path="/dashboard" element={<HostDashboard />} />

      {/* ── Guest routes (all scoped to /:eventSlug) ─────────── */}
      <Route path="/:eventSlug"          element={<EventGateway />} />
      <Route path="/:eventSlug/camera"   element={<GuestCamera />} />
      <Route path="/:eventSlug/upload"   element={<GuestUploader />} />
      <Route path="/:eventSlug/gallery"  element={<Gallery />} />

      {/* ── Fallback ─────────────────────────────────────────── */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}