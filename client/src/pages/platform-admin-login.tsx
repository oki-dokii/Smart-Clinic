import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function PlatformAdminLogin() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/platform-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (response.ok) {
        // Store token and user data
        localStorage.setItem('auth_token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
        
        toast({
          title: "Login Successful",
          description: "Welcome to SmartClinic Platform Administration",
        });
        
        // Redirect to platform admin dashboard
        window.location.href = '/platform-admin';
      } else {
        toast({
          title: "Login Failed",
          description: result.message || "Authentication failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="w-full max-w-md p-6">
        <Card>
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold text-blue-600">
              🏥 SmartClinic Platform
            </CardTitle>
            <CardDescription>
              Platform Administration Login
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="input-email"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
                data-testid="button-login"
              >
                {loading ? 'Authenticating...' : 'Access Platform Admin'}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Only SmartClinic team members can access platform administration.
              </p>
              <div className="mt-2">
                <a 
                  href="/login" 
                  className="text-sm text-blue-600 hover:underline"
                  data-testid="link-clinic-login"
                >
                  Clinic Admin Login
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}