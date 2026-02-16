import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { EventProvider } from './context/EventContext';
import { ThemeProvider } from './context/ThemeContext';

// Layouts
import UserLayout from './layouts/UserLayout';
import AuthLayout from './layouts/AuthLayout';
import OrganizerLayout from './layouts/OrganizerLayout';

// Public/User Pages
import PublicEventPage from './pages/user/PublicEventPage';
import EventDetails from './pages/EventDetails';
import ViewTicket from './pages/user/ViewTicket';
import RegistrationSuccess from './pages/user/RegistrationSuccess';
import NotFound from './pages/NotFound';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';

// Organizer Pages
import OrganizerDashboard from './pages/organizer/OrganizerDashboard';
import EventManagement from './pages/organizer/EventManagement';
import CreateEvent from './pages/organizer/CreateEvent';
import EditEvent from './pages/organizer/EditEvent';
import RegistrationList from './components/organizer/RegistrationList';
import OrganizerSettings from './pages/organizer/OrganizerSettings';

// HOC
import ProtectedRoute from './components/common/ProtectedRoute';

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <EventProvider>
            <Routes>
              {/* Public Routes with User Layout (Navbar + Footer) */}
              <Route element={<UserLayout />}>
                <Route path="/" element={<PublicEventPage />} />
                <Route path="/event/:id" element={<EventDetails />} />
                <Route path="/booking-success" element={<RegistrationSuccess />} />
              </Route>

              {/* Protected User Routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<UserLayout />}>
                  <Route path="/dashboard" element={<ViewTicket />} />
                </Route>
              </Route>

              {/* Auth Routes with specific Layout */}
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
              </Route>

              {/* Organizer Routes with Dashboard Layout */}
              <Route path="/organizer" element={
                <ProtectedRoute>
                  <OrganizerLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<OrganizerDashboard />} />
                <Route path="events" element={<EventManagement />} />
                <Route path="events/new" element={<CreateEvent />} />
                <Route path="events/edit/:id" element={<EditEvent />} />
                <Route path="registrations" element={<RegistrationList />} />
                <Route path="settings" element={<OrganizerSettings />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </EventProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
