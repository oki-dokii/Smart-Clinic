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
import PatientPortal from "@/pages/patient-portal";
import LiveQueueTracker from "@/pages/live-queue";
import ClinicManagement from "@/pages/clinic-management";
import ClinicAdminDashboard from "@/pages/clinic-admin-dashboard";
import Homepage from "@/pages/homepage";
import NotFound from "@/pages/not-found";

// Auth wrapper component - simplified since auth is now handled in queryClient
function AuthWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin-dashboard" component={AdminDashboard} />
      <Route path="/staff-checkin" component={StaffCheckinPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/medicines" component={MedicinesPage} />
      <Route path="/book-appointment" component={PatientBooking} />
      <Route path="/patient-login" component={PatientLogin} />
      <Route path="/patient-portal" component={PatientPortal} />
      <Route path="/live-queue" component={LiveQueueTracker} />
      <Route path="/clinic-management" component={ClinicManagement} />
      <Route path="/clinic-admin/:clinicId" component={ClinicAdminDashboard} />
      <Route path="/" component={Homepage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthWrapper>
            <Toaster />
            <Router />
          </AuthWrapper>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
