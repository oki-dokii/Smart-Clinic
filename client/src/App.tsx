import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import StaffCheckinPage from "@/pages/staff-checkin";
import ProfilePage from "@/pages/profile";
import SettingsPage from "@/pages/settings";
import MedicinesPage from "@/pages/medicines";
import PatientBooking from "@/pages/patient-booking-new";
import PatientLogin from "@/pages/patient-login";
import LiveQueueTracker from "@/pages/live-queue";
import ClinicManagement from "@/pages/clinic-management";
import ClinicAdminDashboard from "@/pages/clinic-admin-dashboard";
import Homepage from "@/pages/homepage";
import PlatformAdminLogin from "@/pages/platform-admin-login";
import NotFound from "@/pages/not-found";

// User interface for type safety
interface User {
  id: string;
  role: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber: string;
  isActive: boolean;
}

// Platform Admin Protection - SmartClinic team only 
function PlatformAdminRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('auth_token');
  const [loading, setLoading] = useState(true);

  const { data: currentUser, isLoading, error } = useQuery<User>({
    queryKey: ['/api/users/me'],
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    if (error || (!isLoading && !currentUser && token)) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return;
    }

    setLoading(isLoading);

    if (!token) {
      window.location.href = '/login';
      return;
    }

    if (currentUser) {
      const SMARTCLINIC_TEAM_EMAIL = 'soham.banerjee@iiitb.ac.in';
      
      // Check if user is SmartClinic team member with super_admin role and no clinic association
      if (currentUser.role !== 'super_admin' || currentUser.email !== SMARTCLINIC_TEAM_EMAIL || (currentUser as any).clinicId) {
        console.log('🔥 UNAUTHORIZED PLATFORM ACCESS ATTEMPT:', {
          email: currentUser.email,
          role: currentUser.role,
          clinicId: (currentUser as any).clinicId,
          smartclinicTeam: SMARTCLINIC_TEAM_EMAIL
        });
        
        // Redirect to appropriate dashboard based on role
        if (currentUser.role === 'admin') {
          window.location.href = '/clinic-admin';
        } else if (currentUser.role === 'staff' || currentUser.role === 'doctor') {
          window.location.href = '/dashboard';
        } else if (currentUser.role === 'patient') {
          window.location.href = '/dashboard';
        } else {
          window.location.href = '/login';
        }
        return;
      }
      
      localStorage.setItem('user', JSON.stringify(currentUser));
    }
  }, [token, currentUser, isLoading, error]);

  if (!token || loading || (!currentUser && !error)) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (error || !currentUser) {
    return null;
  }

  const SMARTCLINIC_TEAM_EMAIL = 'soham.banerjee@iiitb.ac.in';
  if (currentUser.role !== 'super_admin' || currentUser.email !== SMARTCLINIC_TEAM_EMAIL || (currentUser as any).clinicId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don't have permission to access platform administration.</p>
          <button 
            onClick={() => {
              if (currentUser.role === 'admin') {
                window.location.href = '/clinic-admin';
              } else {
                window.location.href = '/dashboard';
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Clinic Admin Protection - for individual clinic administrators
function ClinicAdminRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('auth_token');
  const [loading, setLoading] = useState(true);

  const { data: currentUser, isLoading, error } = useQuery<User>({
    queryKey: ['/api/users/me'],
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    if (error || (!isLoading && !currentUser && token)) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return;
    }

    setLoading(isLoading);

    if (!token) {
      window.location.href = '/login';
      return;
    }

    if (currentUser) {
      // Check if user is clinic admin (admin role + has clinic association)
      if (currentUser.role !== 'admin' || !(currentUser as any).clinicId) {
        console.log('🔥 UNAUTHORIZED CLINIC ADMIN ACCESS:', {
          email: currentUser.email,
          role: currentUser.role,
          clinicId: (currentUser as any).clinicId
        });
        
        // Redirect based on role
        if (currentUser.role === 'staff' || currentUser.role === 'doctor') {
          window.location.href = '/dashboard';
        } else if (currentUser.role === 'patient') {
          window.location.href = '/dashboard';
        } else {
          window.location.href = '/login';
        }
        return;
      }
      
      localStorage.setItem('user', JSON.stringify(currentUser));
    }
  }, [token, currentUser, isLoading, error]);

  if (!token || loading || (!currentUser && !error)) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (error || !currentUser) {
    return null;
  }

  if (currentUser.role !== 'admin' || !(currentUser as any).clinicId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don't have permission to access clinic administration.</p>
          <button 
            onClick={() => window.location.href = '/dashboard'}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Route protection component
function ProtectedRoute({ 
  children, 
  allowedRoles, 
  redirectTo = "/login" 
}: { 
  children: React.ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
}) {
  const token = localStorage.getItem('auth_token');
  const [loading, setLoading] = useState(true);

  // Get current user info
  const { data: currentUser, isLoading, error } = useQuery<User>({
    queryKey: ['/api/users/me'],
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    // Handle authentication errors
    if (error || (!isLoading && !currentUser && token)) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = redirectTo;
      return;
    }

    // Update loading state
    setLoading(isLoading);

    // Handle no token
    if (!token) {
      window.location.href = redirectTo;
      return;
    }

    // Store user data when available
    if (currentUser) {
      localStorage.setItem('user', JSON.stringify(currentUser));
    }
  }, [token, currentUser, isLoading, error, redirectTo]);

  useEffect(() => {
    if (!loading && currentUser && allowedRoles && !allowedRoles.includes(currentUser.role)) {
      // Redirect based on user role
      if (currentUser.role === 'admin') {
        window.location.href = '/admin-dashboard';
      } else if (currentUser.role === 'staff' || currentUser.role === 'doctor') {
        window.location.href = '/dashboard';
      } else if (currentUser.role === 'patient') {
        window.location.href = '/dashboard';
      } else {
        window.location.href = '/login';
      }
    }
  }, [loading, currentUser, allowedRoles]);

  // Show loading during authentication check
  if (!token || loading || (!currentUser && !error)) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // Handle authentication errors
  if (error || !currentUser) {
    return null;
  }

  // Handle unauthorized role access
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return null;
  }

  return <>{children}</>;
}

// Public route component (no auth required)
function PublicRoute({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

const AppRouter = () => {
  return (
    <Switch>
      {/* Public routes - no auth required */}
      <Route path="/login">{() => <PublicRoute><LoginPage /></PublicRoute>}</Route>
      <Route path="/patient-login">{() => <PublicRoute><PatientLogin /></PublicRoute>}</Route>
      <Route path="/platform-login">{() => <PublicRoute><PlatformAdminLogin /></PublicRoute>}</Route>
      <Route path="/">{() => <PublicRoute><Homepage /></PublicRoute>}</Route>
      
      {/* Platform Admin routes - SmartClinic team only */}
      <Route path="/platform-admin">{() => <PlatformAdminRoute><AdminDashboard /></PlatformAdminRoute>}</Route>
      <Route path="/clinic-management">{() => <PlatformAdminRoute><ClinicManagement /></PlatformAdminRoute>}</Route>
      
      {/* Clinic Admin routes - individual clinic administrators */}
      <Route path="/admin">{() => <ClinicAdminRoute><AdminDashboard /></ClinicAdminRoute>}</Route>
      <Route path="/admin-dashboard">{() => <ClinicAdminRoute><AdminDashboard /></ClinicAdminRoute>}</Route>
      <Route path="/clinic-admin">{() => <ClinicAdminRoute><AdminDashboard /></ClinicAdminRoute>}</Route>
      <Route path="/clinic-admin/:clinicId">{() => <ClinicAdminRoute><ClinicAdminDashboard /></ClinicAdminRoute>}</Route>
      <Route path="/medicines">{() => <ClinicAdminRoute><MedicinesPage /></ClinicAdminRoute>}</Route>
      
      {/* Staff/Doctor-only routes */}
      <Route path="/staff-checkin">{() => <ProtectedRoute allowedRoles={['staff', 'doctor']}><StaffCheckinPage /></ProtectedRoute>}</Route>
      
      {/* Multi-role routes (patient, staff, doctor, admin) */}
      <Route path="/dashboard">{() => <ProtectedRoute><Dashboard /></ProtectedRoute>}</Route>
      <Route path="/profile">{() => <ProtectedRoute><ProfilePage /></ProtectedRoute>}</Route>
      <Route path="/settings">{() => <ProtectedRoute><SettingsPage /></ProtectedRoute>}</Route>
      <Route path="/book-appointment">{() => <ProtectedRoute allowedRoles={['patient']}><PatientBooking /></ProtectedRoute>}</Route>
      <Route path="/live-queue">{() => <ProtectedRoute><LiveQueueTracker /></ProtectedRoute>}</Route>
      
      {/* 404 page */}
      <Route>{() => <PublicRoute><NotFound /></PublicRoute>}</Route>
    </Switch>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <AppRouter />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
