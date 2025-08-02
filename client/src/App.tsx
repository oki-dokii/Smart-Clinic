import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";

// Auth wrapper component
function AuthWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      // Set authorization header for all API requests
      queryClient.setMutationDefaults(["auth"], {
        mutationFn: async (data: any) => {
          const response = await fetch(data.url, {
            method: data.method || "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
              ...data.headers,
            },
            body: data.body ? JSON.stringify(data.body) : undefined,
          });
          
          if (!response.ok) {
            const error = await response.text();
            throw new Error(error || response.statusText);
          }
          
          return response.json();
        },
      });
    }
  }, []);

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/">
        {() => {
          const token = localStorage.getItem("auth_token");
          if (token) {
            window.location.href = "/dashboard";
          } else {
            window.location.href = "/login";
          }
          return null;
        }}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthWrapper>
          <Toaster />
          <Router />
        </AuthWrapper>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
