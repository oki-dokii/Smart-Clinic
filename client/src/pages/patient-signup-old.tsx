import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { signInWithGoogle, createUserAccount } from '@/lib/firebase';
import { UserPlus, Mail, Lock, User, Phone, MapPin, Heart, Chrome } from 'lucide-react';

export default function PatientSignup() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    dateOfBirth: '',
    address: '',
    emergencyContact: ''
  });
  const [step, setStep] = useState<'signup' | 'otp'>('signup');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [developmentOtp, setDevelopmentOtp] = useState<string | null>(null);
  const { toast } = useToast();

  // Send email OTP for signup
  const sendSignupOtpMutation = useMutation({
    mutationFn: async (signupData: any) => {
      const response = await apiRequest('POST', '/api/auth/patient-signup-otp', signupData);
      return await response.json();
    },
    onSuccess: (data: any) => {
      setStep('otp');
      
      // Check if development OTP is provided (when email fails)
      if (data.developmentOtp) {
        setDevelopmentOtp(data.developmentOtp);
        toast({
          title: "Email Service Fallback - Development Mode",
          description: `Email delivery fallback. Your OTP is: ${data.developmentOtp}`,
          variant: "destructive",
        });
      } else {
        setDevelopmentOtp(null);
        toast({
          title: "Verification Code Sent",
          description: "Please check your email for the 6-digit verification code.",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Signup Failed",
        description: error.message || "Failed to send verification code. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Verify OTP and complete signup
  const verifySignupOtpMutation = useMutation({
    mutationFn: async ({ email, otp }: { email: string; otp: string }) => {
      const response = await apiRequest('POST', '/api/auth/verify-signup-otp', { email, otp });
      return await response.json();
    },
    onSuccess: (data: any) => {
      if (data.token && data.user) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        toast({
          title: "Welcome to SmartClinic!",
          description: `Account created successfully for ${data.user.firstName}. Welcome to your healthcare dashboard.`,
        });
        window.location.href = '/dashboard';
      }
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid verification code. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    try {
      const user = await signInWithGoogle();
      
      // First try to login (in case user already exists)
      try {
        const loginResponse = await apiRequest('POST', '/api/auth/firebase-login', {
          firebaseUid: user.uid,
          email: user.email,
          name: user.displayName || user.email?.split('@')[0] || 'User'
        });
        
        const loginData = await loginResponse.json();
        if (loginData.token) {
          localStorage.setItem('auth_token', loginData.token);
          toast({
            title: "Welcome Back!",
            description: "Successfully signed in with Google.",
          });
          window.location.href = '/dashboard';
          return;
        }
      } catch (loginError) {
        // User doesn't exist, proceed with signup
        console.log('User not found, creating new account...');
      }
      
      // Create new patient account with Google data
      await createPatientMutation.mutateAsync({
        firstName: user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'Patient',
        lastName: user.displayName?.split(' ').slice(1).join(' ') || 'User',
        email: user.email,
        phoneNumber: user.phoneNumber || '',
        firebaseUid: user.uid,
        authProvider: 'google'
      });
    } catch (error: any) {
      let errorMessage = "Failed to sign up with Google. Please try again.";
      
      if (error.message?.includes('domain')) {
        errorMessage = "Google sign-in is not configured for this domain. Please use email signup instead.";
      } else if (error.message?.includes('popup')) {
        errorMessage = "Popup was blocked. Please allow popups or use email signup.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Google Signup Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive"
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      });
      return;
    }

    // Send OTP for email verification
    await sendSignupOtpMutation.mutateAsync(formData);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter the complete 6-digit verification code.",
        variant: "destructive"
      });
      return;
    }
    verifySignupOtpMutation.mutate({ email: formData.email, otp });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // OTP Verification Step
  if (step === 'otp') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-xl border-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto bg-green-100 dark:bg-green-900 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Verify Your Email</CardTitle>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Enter the 6-digit code sent to {formData.email}</p>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {developmentOtp && (
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 rounded-md">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Development Mode:</strong> Your verification code is: {developmentOtp}
                  </p>
                </div>
              )}
              
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <Label htmlFor="otp">Verification Code</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    className="text-center text-lg tracking-widest"
                    data-testid="input-otp"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white"
                  disabled={verifySignupOtpMutation.isPending}
                  data-testid="button-verify-otp"
                >
                  {verifySignupOtpMutation.isPending ? "Verifying..." : "Verify & Create Account"}
                </Button>
                
                <Button 
                  type="button" 
                  variant="outline"
                  className="w-full"
                  onClick={() => setStep('signup')}
                  data-testid="button-back-signup"
                >
                  Back to Signup
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto bg-blue-100 dark:bg-blue-900 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <UserPlus className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Create Patient Account</CardTitle>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Join SmartClinic for better healthcare management</p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Google Signup Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full py-3 border-2 hover:bg-gray-50 dark:hover:bg-gray-800"
              onClick={handleGoogleSignup}
              disabled={isLoading}
              data-testid="button-google-signup"
            >
              <Chrome className="w-5 h-5 mr-2" />
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-gray-900 px-2 text-gray-500">Or sign up with email</span>
              </div>
            </div>

            {/* Email Signup Form */}
            <form onSubmit={handleEmailSignup} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="First name"
                      className="pl-10"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      required
                      data-testid="input-firstname"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Last name"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    required
                    data-testid="input-lastname"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    className="pl-10"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
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
                    placeholder="Create a password"
                    className="pl-10"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    required
                    data-testid="input-password"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    className="pl-10"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    required
                    data-testid="input-confirm-password"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="Your phone number"
                    className="pl-10"
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    data-testid="input-phone"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="dateOfBirth">Date of Birth (Optional)</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  data-testid="input-dob"
                />
              </div>

              <div>
                <Label htmlFor="address">Address (Optional)</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="address"
                    type="text"
                    placeholder="Your address"
                    className="pl-10"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    data-testid="input-address"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="emergencyContact">Emergency Contact (Optional)</Label>
                <div className="relative">
                  <Heart className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="emergencyContact"
                    type="text"
                    placeholder="Emergency contact information"
                    className="pl-10"
                    value={formData.emergencyContact}
                    onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                    data-testid="input-emergency"
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={sendSignupOtpMutation.isPending}
                data-testid="button-create-account"
              >
                {sendSignupOtpMutation.isPending ? "Sending Verification..." : "Create Account"}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{' '}
                <a 
                  href="/patient-login" 
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                  data-testid="link-login"
                >
                  Sign in here
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
                <span className="bg-white dark:bg-gray-900 px-2 text-gray-500">Or signup with email</span>
              </div>
            </div>

            {/* Email Signup Form */}
            <form onSubmit={handleEmailSignup} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="John"
                      className="pl-10"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      required
                      data-testid="input-first-name"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Doe"
                      className="pl-10"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      required
                      data-testid="input-last-name"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    className="pl-10"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                    data-testid="input-email"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    className="pl-10"
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    data-testid="input-phone"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  data-testid="input-date-of-birth"
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    required
                    minLength={6}
                    data-testid="input-password"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    required
                    minLength={6}
                    data-testid="input-confirm-password"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Address (Optional)</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="address"
                    type="text"
                    placeholder="123 Main St, City, State"
                    className="pl-10"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    data-testid="input-address"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="emergencyContact">Emergency Contact (Optional)</Label>
                <div className="relative">
                  <Heart className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="emergencyContact"
                    type="text"
                    placeholder="Emergency contact name and phone"
                    className="pl-10"
                    value={formData.emergencyContact}
                    onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                    data-testid="input-emergency-contact"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isLoading || createPatientMutation.isPending}
                data-testid="button-signup"
              >
                {isLoading || createPatientMutation.isPending ? "Creating Account..." : "Create Account"}
              </Button>
            </form>

            <div className="text-center pt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{' '}
                <a href="/patient-login" className="text-blue-600 hover:text-blue-500 font-medium">
                  Sign in here
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}