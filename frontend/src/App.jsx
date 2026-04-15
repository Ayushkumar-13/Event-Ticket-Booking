import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { EventProvider } from './context/EventContext';
import { ThemeContext } from './context/ThemeContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';

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
const OrganizerDashboard = React.lazy(() => import('./pages/organizer/OrganizerDashboard'));
import EventManagement from './pages/organizer/EventManagement';
const CreateEvent = React.lazy(() => import('./pages/organizer/CreateEvent'));
const EditEvent = React.lazy(() => import('./pages/organizer/EditEvent'));
// import RegistrationList from './components/organizer/RegistrationList'; (Commented out as replaced by ExportReports)
import OrganizerSettings from './pages/organizer/OrganizerSettings';
const ExportReports = React.lazy(() => import('./pages/organizer/ExportReports')); // Added new lazy import

import AOS from 'aos';
import 'aos/dist/aos.css';

// HOC
import ProtectedRoute from './components/common/ProtectedRoute';

// Forces unauthenticated new users directly to the Registration page
const LandingRedirect = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/register" replace />;
  }
  return children;
};

function App() {
  React.useEffect(() => {
    AOS.init({
      once: true, // Only animate once
      offset: 100, // Offset (in px) from the original trigger point
      duration: 800, // Values from 0 to 3000, with step 50ms
      easing: 'ease-out-cubic', // Default easing for AOS animations
    });
  }, []);

  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <SocketProvider>
            <EventProvider>
              <Routes>
                {/* Public Routes with User Layout (Navbar + Footer) */}
                <Route element={<UserLayout />}>
                  <Route path="/" element={<LandingRedirect><PublicEventPage /></LandingRedirect>} />
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
                  {/* <Route path="registrations" element={<RegistrationList />} /> */}
                  <Route path="registrations" element={<ExportReports />} /> {/* Updated route to match Dashboard link */}
                  <Route path="settings" element={<OrganizerSettings />} />
                </Route>
  
                <Route path="*" element={<NotFound />} />
              </Routes>
            </EventProvider>
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
