import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Mail, ArrowRight } from 'lucide-react';

export default function PatientLogin() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1: email, 2: otp
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const sendOtp = useMutation({
    mutationFn: async (emailAddress: string) => {
      const response = await apiRequest('POST', '/api/auth/send-email-otp', { email: emailAddress });
      return await response.json();
    },
    onSuccess: () => {
      setStep(2);
      toast({
        title: "OTP Sent!",
        description: "Please check your email for the verification code.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send OTP. Please try again.",
        variant: "destructive"
      });
    }
  });

  const verifyLogin = useMutation({
    mutationFn: async ({ emailAddress, otpCode }: { emailAddress: string; otpCode: string }) => {
      const response = await apiRequest('POST', '/api/auth/verify-email-otp', { email: emailAddress, otp: otpCode });
      return await response.json();
    },
    onSuccess: (data: any) => {
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        
        // Redirect based on role
        if (data.user.role === 'patient') {
          window.location.href = '/book-appointment';
        } else if (data.user.role === 'admin') {
          window.location.href = '/admin-dashboard';
        } else {
          window.location.href = '/dashboard';
        }
      }
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid OTP. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address.",
        variant: "destructive"
      });
      return;
    }
    sendOtp.mutate(email);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      toast({
        title: "OTP Required",
        description: "Please enter the verification code.",
        variant: "destructive"
      });
      return;
    }
    verifyLogin.mutate({ emailAddress: email, otpCode: otp });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Patient Login</CardTitle>
          <p className="text-gray-600">
            {step === 1 
              ? "Enter your email address to book an appointment" 
              : "Enter the verification code sent to your email"
            }
          </p>
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="patient@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={sendOtp.isPending}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={sendOtp.isPending}
              >
                {sendOtp.isPending ? (
                  "Sending..."
                ) : (
                  <>
                    Send Verification Code
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  disabled={verifyLogin.isPending}
                  maxLength={6}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={verifyLogin.isPending}
              >
                {verifyLogin.isPending ? "Verifying..." : "Login & Book Appointment"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="w-full" 
                onClick={() => {
                  setStep(1);
                  setOtp('');
                }}
                disabled={verifyLogin.isPending}
              >
                Back to Phone Number
              </Button>
            </form>
          )}
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              New patient? Call us at{' '}
              <a href="tel:+1234567890" className="text-blue-600 hover:underline">
                +1 (234) 567-890
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}