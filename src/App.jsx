// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'

import Home           from './pages/Home'
import EventGateway   from './pages/EventGateway'
import GuestUploader  from './pages/GuestUploader'
import Gallery        from './pages/Gallery'
import HostLogin      from './pages/HostLogin'
import HostSignup     from './pages/HostSignup'
import HostHub          from './pages/HostHub'
import GalleryDashboard from './pages/GalleryDashboard'
import RSVPDashboard    from './pages/RSVPDashboard'
import GuestRSVP        from './pages/GuestRSVP'
import AdminLogin       from './pages/AdminLogin'
import AdminDashboard   from './pages/AdminDashboard'
import PendingApproval  from './pages/PendingApproval'

export default function App() {
  return (
    // Removed the <BrowserRouter> from here to fix the conflict
    <Routes>
      {/* ── Marketing home ───────────────────────────────────── */}
      <Route path="/"          element={<Home />} />

      {/* ── Host routes ──────────────────────────────────────── */}
      <Route path="/login"     element={<HostLogin />} />
      <Route path="/signup"    element={<HostSignup />} />
      <Route path="/hub"            element={<HostHub />} />
      <Route path="/dashboard"      element={<GalleryDashboard />} />
      <Route path="/rsvp-dashboard" element={<RSVPDashboard />} />

      {/* ── Guest routes (all scoped to /:eventSlug) ─────────── */}
      <Route path="/:eventSlug"          element={<EventGateway />} />
      <Route path="/:eventSlug/upload"   element={<GuestUploader />} />
      <Route path="/:eventSlug/gallery"  element={<Gallery />} />
      <Route path="/:eventSlug/rsvp"     element={<GuestRSVP />} />

      {/* ── Admin routes ─────────────────────────────────────── */}
      <Route path="/admin/login"  element={<AdminLogin />} />
      <Route path="/admin"        element={<AdminDashboard />} />
      <Route path="/pending"      element={<PendingApproval />} />

      {/* ── Fallback ─────────────────────────────────────────── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}