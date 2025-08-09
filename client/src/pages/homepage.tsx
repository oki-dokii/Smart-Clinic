import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { insertClinicSchema } from "@shared/schema";
import { useTheme } from "@/components/ThemeProvider";
import { z } from "zod";
import { 
  Building2, 
  UserCheck, 
  Calendar, 
  Shield, 
  Users, 
  Clock, 
  Phone,
  MapPin,
  CheckCircle,
  ArrowRight,
  Heart,
  Activity,
  Moon,
  Sun
} from "lucide-react";

const clinicRegistrationSchema = insertClinicSchema.extend({
  adminName: z.string().min(2, "Admin name is required"),
  adminPhone: z.string().min(10, "Valid phone number is required"),
  adminEmail: z.string().email("Valid email is required")
});

type ClinicRegistrationForm = z.infer<typeof clinicRegistrationSchema>;

export default function Homepage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isRegistering, setIsRegistering] = useState(false);
  const queryClient = useQueryClient();
  const { theme, toggleTheme } = useTheme();

  const form = useForm<ClinicRegistrationForm>({
    resolver: zodResolver(clinicRegistrationSchema),
    defaultValues: {
      name: "",
      address: "",
      phoneNumber: "",
      email: "",
      adminName: "",
      adminPhone: "",
      adminEmail: ""
    }
  });

  const registerClinicMutation = useMutation({
    mutationFn: async (data: ClinicRegistrationForm) => {
      const { adminName, adminPhone, adminEmail, ...clinicData } = data;
      
      const response = await fetch('/api/clinics/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clinicData,
          adminData: {
            phoneNumber: adminPhone,
            firstName: adminName.split(' ')[0],
            lastName: adminName.split(' ').slice(1).join(' ') || '',
            email: adminEmail
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to register clinic');
      }

      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Application Submitted Successfully!",
        description: `Thank you for registering ${result.clinic.name}! We will review your application and update you within 48 hours.`
      });
      
      // Reset form and close dialog
      form.reset();
      setIsRegistering(false);
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register clinic",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: ClinicRegistrationForm) => {
    registerClinicMutation.mutate(data);
  };

  const features = [
    {
      icon: Calendar,
      title: "Smart Scheduling",
      description: "AI-powered appointment scheduling with real-time queue management"
    },
    {
      icon: Users,
      title: "Multi-Role Access",
      description: "Dedicated interfaces for patients, doctors, staff, and administrators"
    },
    {
      icon: Clock,
      title: "Real-Time Updates",
      description: "Live queue tracking and instant notifications for all users"
    },
    {
      icon: Shield,
      title: "Secure & Compliant",
      description: "HIPAA-compliant data handling with advanced security measures"
    },
    {
      icon: Phone,
      title: "SMS Integration",
      description: "Automated appointment reminders and status updates via SMS"
    },
    {
      icon: Activity,
      title: "Analytics Dashboard",
      description: "Comprehensive insights into clinic operations and performance"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-xl">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SmartClinic</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="h-9 w-9 p-0"
                data-testid="button-theme-toggle"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4 text-yellow-500" />
                ) : (
                  <Moon className="h-4 w-4 text-gray-600" />
                )}
              </Button>
              <Badge variant="secondary" className="hidden sm:inline-flex">
                Trusted by 500+ Clinics
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 bg-blue-100 dark:bg-blue-900/30 px-4 py-2 rounded-full mb-6">
            <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="text-blue-800 dark:text-blue-300 font-medium">Next-Generation Healthcare Management</span>
          </div>
          
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Streamline Your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-600">
              Healthcare Operations
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-3xl mx-auto">
            Comprehensive clinic management system with real-time queue tracking, smart scheduling, 
            and seamless patient experience. Built for modern healthcare providers.
          </p>

          {/* Action Cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-16">
            {/* Patient Login */}
            <Card className="hover:shadow-lg transition-all duration-200 border-2 hover:border-blue-200 dark:hover:border-blue-700" data-testid="card-patient-login">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="text-xl">I'm a Patient</CardTitle>
                <CardDescription>
                  Book appointments, track queue status, and manage your healthcare
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/patient-login" data-testid="link-patient-login">
                  <Button className="w-full" size="lg">
                    Patient Portal
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Staff/Admin Login */}
            <Card className="hover:shadow-lg transition-all duration-200 border-2 hover:border-blue-200 dark:hover:border-blue-700" data-testid="card-staff-login">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-xl">Staff & Admin</CardTitle>
                <CardDescription>
                  Access clinic dashboard, manage appointments, and oversee operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/login" data-testid="link-staff-login">
                  <Button variant="outline" className="w-full" size="lg">
                    Staff Portal
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Clinic Registration */}
            <Card className="hover:shadow-lg transition-all duration-200 border-2 border-purple-200 hover:border-purple-300 dark:border-purple-700 dark:hover:border-purple-600 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20" data-testid="card-clinic-registration">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-4">
                  <Building2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle className="text-xl">Register Your Clinic</CardTitle>
                <CardDescription>
                  Join our platform and start managing your clinic efficiently
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog open={isRegistering} onOpenChange={setIsRegistering}>
                  <DialogTrigger asChild>
                    <Button 
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700" 
                      size="lg"
                      data-testid="button-register-clinic"
                    >
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-clinic-registration">
                    <DialogHeader>
                      <DialogTitle className="text-2xl">Register Your Clinic</DialogTitle>
                      <DialogDescription>
                        Fill out the information below to register your clinic and create an admin account.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Clinic Information */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">Clinic Information</h3>
                          
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Clinic Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="SmartClinic Downtown" {...field} data-testid="input-clinic-name" />
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
                                <FormLabel>Address</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="123 Healthcare Avenue, Medical District" {...field} data-testid="input-clinic-address" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="phoneNumber"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Phone Number</FormLabel>
                                  <FormControl>
                                    <Input placeholder="+1234567890" {...field} value={field.value || ""} data-testid="input-clinic-phone" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Email</FormLabel>
                                  <FormControl>
                                    <Input placeholder="contact@smartclinic.com" {...field} value={field.value || ""} data-testid="input-clinic-email" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        {/* Admin Information */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">Administrator Information</h3>
                          
                          <FormField
                            control={form.control}
                            name="adminName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Full Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Dr. John Smith" {...field} data-testid="input-admin-name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="adminPhone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Phone Number</FormLabel>
                                  <FormControl>
                                    <Input placeholder="+1234567890" {...field} data-testid="input-admin-phone" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="adminEmail"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Email</FormLabel>
                                  <FormControl>
                                    <Input placeholder="admin@smartclinic.com" {...field} data-testid="input-admin-email" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <div className="flex justify-end space-x-4 pt-6">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsRegistering(false)}
                            data-testid="button-cancel-registration"
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={registerClinicMutation.isPending}
                            data-testid="button-submit-registration"
                          >
                            {registerClinicMutation.isPending ? "Registering..." : "Register Clinic"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Everything You Need to Run Your Clinic
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Comprehensive features designed to streamline operations and enhance patient care
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-200" data-testid={`feature-card-${index}`}>
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="p-2 bg-blue-600 rounded-xl">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">SmartClinic</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Empowering healthcare providers with intelligent technology
            </p>
            <div className="flex justify-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
              <span>© 2025 SmartClinic. All rights reserved.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}