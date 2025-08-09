"use client";

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { signInWithGoogle, handleRedirectResult, signOutUser } from "@/lib/firebase";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { 
  User, 
  Calendar, 
  Settings, 
  LogOut, 
  UserCircle,
  Mail,
  Phone,
  MapPin,
  AlertCircle
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const patientProfileSchema = insertUserSchema.pick({
  firstName: true,
  lastName: true,
  email: true,
  phoneNumber: true,
  dateOfBirth: true,
  address: true,
  emergencyContact: true
}).extend({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phoneNumber: z.string().min(10, "Valid phone number is required").optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional()
});

type PatientProfileForm = z.infer<typeof patientProfileSchema>;

export default function PatientPortal() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<PatientProfileForm>({
    resolver: zodResolver(patientProfileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      dateOfBirth: "",
      address: "",
      emergencyContact: ""
    }
  });

  // Handle Google authentication redirect result
  useEffect(() => {
    const checkAuthResult = async () => {
      try {
        const result = await handleRedirectResult();
        if (result?.user) {
          // Send user info to backend for registration/login
          const googleUser = result.user;
          const response = await fetch('/api/auth/google', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              googleId: googleUser.uid,
              email: googleUser.email,
              firstName: googleUser.displayName?.split(' ')[0] || '',
              lastName: googleUser.displayName?.split(' ').slice(1).join(' ') || '',
              profilePicture: googleUser.photoURL
            })
          });

          if (response.ok) {
            const userData = await response.json();
            localStorage.setItem("auth_token", userData.token);
            localStorage.setItem("user", JSON.stringify(userData.user));
            setUser(userData.user);
            
            // Show profile completion form for new users
            if (userData.isNewUser) {
              setShowProfileForm(true);
              form.reset({
                firstName: userData.user.firstName,
                lastName: userData.user.lastName,
                email: userData.user.email,
                phoneNumber: userData.user.phoneNumber || "",
                dateOfBirth: userData.user.dateOfBirth || "",
                address: userData.user.address || "",
                emergencyContact: userData.user.emergencyContact || ""
              });
            }

            toast({
              title: "Welcome!",
              description: userData.isNewUser ? 
                "Please complete your profile information." : 
                "Successfully signed in with Google."
            });
          }
        }
      } catch (error) {
        console.error('Auth error:', error);
        toast({
          title: "Authentication Error",
          description: "Please try signing in again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    // Check for existing session
    const token = localStorage.getItem("auth_token");
    const storedUser = localStorage.getItem("user");
    
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      setLoading(false);
    } else {
      checkAuthResult();
    }
  }, []);

  // Fetch user profile data
  const { data: profileData } = useQuery({
    queryKey: ['/api/patients/profile'],
    enabled: !!user,
  });

  // Update profile data in form when fetched
  useEffect(() => {
    if (profileData) {
      form.reset({
        firstName: profileData.firstName || "",
        lastName: profileData.lastName || "",
        email: profileData.email || "",
        phoneNumber: profileData.phoneNumber || "",
        dateOfBirth: profileData.dateOfBirth ? new Date(profileData.dateOfBirth).toISOString().split('T')[0] : "",
        address: profileData.address || "",
        emergencyContact: profileData.emergencyContact || ""
      });
    }
  }, [profileData, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: PatientProfileForm) => {
      const formattedData = {
        ...data,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString() : null
      };
      
      return await apiRequest('/api/patients/profile', {
        method: 'PUT',
        body: JSON.stringify(formattedData)
      });
    },
    onSuccess: (result) => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully."
      });
      setShowProfileForm(false);
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/patients/profile'] });
      
      // Update stored user data
      const updatedUser = { ...user, ...result };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      if (error.message.includes('Firebase not configured')) {
        toast({
          title: "Configuration Required",
          description: "Google sign-in is not yet configured. Please contact support.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Sign In Failed",
          description: "Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      setUser(null);
      navigate("/");
      toast({
        title: "Signed Out",
        description: "You have been signed out successfully."
      });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const onSubmit = (data: PatientProfileForm) => {
    updateProfileMutation.mutate(data);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Not authenticated - show sign in options
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <UserCircle className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Patient Portal</CardTitle>
            <CardDescription>
              Sign in to manage your appointments and health records
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleGoogleSignIn}
              className="w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-300"
              data-testid="button-google-signin"
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>
            
            <div className="text-center text-sm text-gray-600">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Authenticated - show patient dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Patient Portal</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {user.profilePicture && (
                  <img 
                    src={user.profilePicture} 
                    alt="Profile" 
                    className="h-8 w-8 rounded-full"
                  />
                )}
                <span className="text-sm text-gray-700">
                  {user.firstName} {user.lastName}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                data-testid="button-signout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserCircle className="h-5 w-5 mr-2 text-blue-600" />
                My Profile
              </CardTitle>
              <CardDescription>Manage your personal information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-gray-400" />
                  <span>{user.email}</span>
                </div>
                {user.phoneNumber && (
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{user.phoneNumber}</span>
                  </div>
                )}
                {user.address && (
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="truncate">{user.address}</span>
                  </div>
                )}
              </div>
              <Button 
                className="w-full mt-4" 
                variant="outline"
                onClick={() => {
                  setIsEditing(true);
                  setShowProfileForm(true);
                }}
                data-testid="button-edit-profile"
              >
                <Settings className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </CardContent>
          </Card>

          {/* Appointments Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-green-600" />
                Appointments
              </CardTitle>
              <CardDescription>View and manage your appointments</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                No upcoming appointments scheduled.
              </p>
              <Button className="w-full" variant="outline">
                Book Appointment
              </Button>
            </CardContent>
          </Card>

          {/* Health Records Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-orange-600" />
                Health Records
              </CardTitle>
              <CardDescription>Access your medical history</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Your health records and prescriptions.
              </p>
              <Button className="w-full" variant="outline">
                View Records
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Profile Form Dialog */}
      <Dialog open={showProfileForm} onOpenChange={setShowProfileForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Profile" : "Complete Your Profile"}
            </DialogTitle>
            <DialogDescription>
              {isEditing ? "Update your personal information." : "Please provide your basic information to get started."}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-firstname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-lastname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" data-testid="input-dob" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} data-testid="input-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="emergencyContact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emergency Contact (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Name and phone number" data-testid="input-emergency-contact" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowProfileForm(false)}
                  className="flex-1"
                  data-testid="button-cancel"
                >
                  {isEditing ? "Cancel" : "Skip"}
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-save-profile"
                >
                  {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}