import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import EventGateway from './pages/EventGateway'
import HostLogin from './pages/HostLogin'
import HostDashboard from './pages/HostDashboard'
import Gallery from './pages/Gallery'
import GuestCamera from './pages/GuestCamera'
import GuestUploader from './pages/GuestUploader'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/host/login" element={<HostLogin />} />
      <Route
        path="/host/dashboard"
        element={
          <ProtectedRoute>
            <HostDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/gallery/:eventSlug" element={<Gallery />} />
      <Route path="/:eventSlug/upload" element={<GuestUploader />} />
      <Route path="/:eventSlug/camera" element={<GuestCamera />} />
      <Route path="/:eventSlug" element={<EventGateway />} />
    </Routes>
  )
}

export default App