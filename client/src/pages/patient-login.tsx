import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { signInWithGoogle, signInWithEmail } from '@/lib/firebase';
import { Mail, Lock, Chrome, LogIn } from 'lucide-react';

export default function PatientLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const loginWithFirebaseMutation = useMutation({
    mutationFn: async (firebaseUser: any) => {
      const response = await apiRequest('POST', '/api/auth/firebase-login', {
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        toast({
          title: "Login Successful!",
          description: "Welcome back to SmartClinic.",
        });
        window.location.href = '/dashboard';
      }
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Failed to login. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const user = await signInWithGoogle();
      await loginWithFirebaseMutation.mutateAsync(user);
    } catch (error: any) {
      let errorMessage = "Failed to login with Google. Please try again.";
      
      if (error.message?.includes('domain')) {
        errorMessage = "Google sign-in is not configured for this domain. Please use email login instead.";
      } else if (error.message?.includes('popup')) {
        errorMessage = "Popup was blocked. Please allow popups or use email login.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Google Login Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Missing Information",
        description: "Please enter both email and password.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const user = await signInWithEmail(email, password);
      await loginWithFirebaseMutation.mutateAsync(user);
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid email or password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto bg-blue-100 dark:bg-blue-900 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <LogIn className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Patient Login</CardTitle>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Access your healthcare dashboard</p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Google Login Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full py-3 border-2 hover:bg-gray-50 dark:hover:bg-gray-800"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              data-testid="button-google-login"
            >
              <Chrome className="w-5 h-5 mr-2" />
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-gray-900 px-2 text-gray-500">Or login with email</span>
              </div>
            </div>

            {/* Email Login Form */}
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    data-testid="input-email"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    data-testid="input-password"
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isLoading || loginWithFirebaseMutation.isPending}
                data-testid="button-login"
              >
                {isLoading || loginWithFirebaseMutation.isPending ? "Signing In..." : "Sign In"}
              </Button>
            </form>
            
            <div className="text-center pt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Don't have an account?{' '}
                <a href="/patient-signup" className="text-blue-600 hover:text-blue-500 font-medium">
                  Create account
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}