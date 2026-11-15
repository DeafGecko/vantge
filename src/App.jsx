// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'

import { Suspense, lazy } from 'react'
import Home           from './pages/Home'

// Every other page loads only when it is opened, so the home page stays light
const EventGateway      = lazy(() => import('./pages/EventGateway'))
const GuestUploader     = lazy(() => import('./pages/GuestUploader'))
const Gallery           = lazy(() => import('./pages/Gallery'))
const HostLogin         = lazy(() => import('./pages/HostLogin'))
const HostSignup        = lazy(() => import('./pages/HostSignup'))
const HostHub           = lazy(() => import('./pages/HostHub'))
const GalleryDashboard  = lazy(() => import('./pages/GalleryDashboard'))
const RSVPDashboard     = lazy(() => import('./pages/RSVPDashboard'))
const GuestRSVP         = lazy(() => import('./pages/GuestRSVP'))
const AdminLogin        = lazy(() => import('./pages/AdminLogin'))
const AdminDashboard    = lazy(() => import('./pages/AdminDashboard'))
const PendingApproval   = lazy(() => import('./pages/PendingApproval'))
const DemoFrame         = lazy(() => import('./components/DemoFrame'))
const DemoStart         = lazy(() => import('./pages/DemoStart'))

export default function App() {
  return (
    // Removed the <BrowserRouter> from here to fix the conflict
    <Suspense fallback={<div className="min-h-screen bg-[#F7F5F0]" />}>
    <Routes>
      {/* ── Marketing home ───────────────────────────────────── */}
      <Route path="/"          element={<Home />} />

      {/* ── Host routes ──────────────────────────────────────── */}
      <Route path="/login"     element={<HostLogin />} />
      <Route path="/signup"    element={<HostSignup />} />
      <Route path="/hub"            element={<HostHub />} />
      <Route path="/dashboard"      element={<GalleryDashboard />} />
      <Route path="/rsvp-dashboard" element={<RSVPDashboard />} />

      {/* ── Browser-only demo dashboards (no login, nothing saved) ── */}
      <Route path="/try"       element={<DemoStart />} />
      <Route path="/try/event" element={<DemoFrame><GalleryDashboard /></DemoFrame>} />
      <Route path="/try/rsvp"  element={<DemoFrame><RSVPDashboard /></DemoFrame>} />
      {/* Guest mobile page for the demo event (/try/demo), built from the same demo data */}
      <Route path="/try/:eventSlug" element={<DemoFrame><EventGateway /></DemoFrame>} />

      {/* /demo opens the guest demo page, so it never shows the saved event with that slug */}
      <Route path="/demo" element={<Navigate to="/try/demo" replace />} />

      {/* ── Guest routes (all scoped to /:eventSlug) ─────────── */}
      <Route path="/:eventSlug"          element={<EventGateway />} />
      <Route path="/:eventSlug/upload"   element={<GuestUploader />} />
      <Route path="/:eventSlug/gallery"  element={<Gallery />} />
      <Route path="/RSVP/:eventSlug"      element={<GuestRSVP />} />

      {/* ── Admin routes ─────────────────────────────────────── */}
      <Route path="/admin/login"  element={<AdminLogin />} />
      <Route path="/admin"        element={<AdminDashboard />} />
      <Route path="/pending"      element={<PendingApproval />} />

      {/* ── Fallback ─────────────────────────────────────────── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  )
}