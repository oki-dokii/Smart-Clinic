import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useEffect } from "react";
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
import NotFound from "@/pages/not-found";

// Auth wrapper component - simplified since auth is now handled in queryClient
function AuthWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

const AppRouter = () => {
  return (
    <Switch>
      <Route path="/login">{() => <LoginPage />}</Route>
      <Route path="/dashboard">{() => <Dashboard />}</Route>
      <Route path="/admin">{() => <AdminDashboard />}</Route>
      <Route path="/admin-dashboard">{() => <AdminDashboard />}</Route>
      <Route path="/staff-checkin">{() => <StaffCheckinPage />}</Route>
      <Route path="/profile">{() => <ProfilePage />}</Route>
      <Route path="/settings">{() => <SettingsPage />}</Route>
      <Route path="/medicines">{() => <MedicinesPage />}</Route>
      <Route path="/book-appointment">{() => <PatientBooking />}</Route>
      <Route path="/patient-login">{() => <PatientLogin />}</Route>
      <Route path="/live-queue">{() => <LiveQueueTracker />}</Route>
      <Route path="/clinic-management">{() => <ClinicManagement />}</Route>
      <Route path="/clinic-admin/:clinicId">{() => <ClinicAdminDashboard />}</Route>
      <Route path="/">{() => <Homepage />}</Route>
      <Route>{() => <NotFound />}</Route>
    </Switch>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthWrapper>
            <Toaster />
            <AppRouter />
          </AuthWrapper>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
