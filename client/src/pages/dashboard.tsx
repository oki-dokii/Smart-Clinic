import {
  Bell,
  Calendar,
  Clock,
  Home,
  MapPin,
  Phone,
  Settings,
  AlertTriangle,
  Pill,
  Stethoscope,
  Activity,
  UserCheck,
  Zap,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageCircle,
  Star,
  Send,
} from "lucide-react";
import BookingModal from "@/components/BookingModal";
import EmergencyModal from "@/components/EmergencyModal";
import CancelModal from "@/components/CancelModal";
import AppointmentDetailsModal from "@/components/AppointmentDetailsModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTheme } from "@/components/ThemeProvider";

// Feedback form schema
const feedbackSchema = z.object({
  rating: z.string().refine((val) => parseInt(val) >= 1 && parseInt(val) <= 5, {
    message: "Please provide a rating between 1 and 5",
  }),
  comment: z.string().optional(),
  categories: z.array(z.string()).min(1, {
    message: "Please select at least one feedback category",
  }),
  appointmentId: z.string().optional(),
  isAnonymous: z.boolean().default(false),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

export default function SmartClinicDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);

  // Helper function to check if patient has appointment today
  const hasAppointmentToday = (appointments: any[], doctorId?: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return appointments?.some((appointment: any) => {
      const appointmentDate = new Date(appointment.appointmentDate);
      appointmentDate.setHours(0, 0, 0, 0);
      const isToday = appointmentDate >= today && appointmentDate < tomorrow;
      return isToday && (!doctorId || appointment.doctorId === doctorId);
    });
  };
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showDoctorsModal, setShowDoctorsModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const userData = localStorage.getItem("user");
    
    if (!token || !userData) {
      setLocation("/login");
      return;
    }
    
    setUser(JSON.parse(userData));
  }, [setLocation]);

  const { data: appointments = [] } = useQuery({
    queryKey: ["/api/appointments"],
    enabled: !!user,
    refetchInterval: 3000, // Poll every 3 seconds for real-time updates
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider data stale for real-time sync
  });

  const { data: queuePosition } = useQuery({
    queryKey: ["/api/queue/position"],
    enabled: !!user && user.role === "patient",
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ["/api/reminders"],
    enabled: !!user, // Enable for all users, not just patients
  });

  // Calculate overdue medicines from reminders (same logic as medicines page)
  const overdueReminders = Array.isArray(reminders) ? reminders.filter((r: any) => {
    if (r.isTaken || r.isSkipped) return false;
    const reminderTime = new Date(r.scheduledAt);
    const now = new Date();
    return reminderTime < now;
  }) : [];
  
  const totalOverdue = overdueReminders.length;
  const hasOverdue = totalOverdue > 0;

  const { data: doctors = [] } = useQuery({
    queryKey: ["/api/users", "doctor"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/users?role=doctor");
      return response.json();
    },
    enabled: !!user,
  });

  // Query for active delay notifications
  const { data: delayNotifications = [] } = useQuery({
    queryKey: ["/api/delays"],
    refetchInterval: 30000, // Check every 30 seconds for real-time updates
  });

  // Medicine reminder handlers
  const markTakenMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      const response = await apiRequest("PUT", `/api/reminders/${reminderId}`, {
        status: "taken"
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      toast({
        title: "Medicine Marked as Taken",
        description: "Your medicine reminder has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update reminder",
        variant: "destructive",
      });
    },
  });

  const snoozeReminderMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      const response = await apiRequest("PUT", `/api/reminders/${reminderId}`, {
        status: "snoozed"
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      toast({
        title: "Reminder Snoozed",
        description: "Medicine reminder snoozed for 15 minutes.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to snooze reminder",
        variant: "destructive",
      });
    },
  });

  const handleMarkTaken = (reminderId: string) => {
    markTakenMutation.mutate(reminderId);
  };

  const handleSnoozeReminder = (reminderId: string) => {
    snoozeReminderMutation.mutate(reminderId);
  };

  // Add new reminder action handlers
  const handleSkipReminder = (reminderId: string) => {
    skipReminderMutation.mutate(reminderId);
  };

  const handleResetReminder = (reminderId: string) => {
    resetReminderMutation.mutate(reminderId);
  };

  // Skip reminder mutation
  const skipReminderMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      const response = await apiRequest("PUT", `/api/reminders/${reminderId}`, { status: 'skipped' });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      toast({
        title: "Medicine Skipped",
        description: "Medicine reminder has been marked as skipped."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to skip reminder",
        variant: "destructive"
      });
    }
  });

  // Reset reminder mutation for corrections
  const resetReminderMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      const response = await apiRequest("PUT", `/api/reminders/${reminderId}`, { status: 'not_taken' });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      toast({
        title: "Reminder Reset",
        description: "Medicine reminder has been reset. You can now mark it as taken or skipped again."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset reminder",
        variant: "destructive"
      });
    }
  });

  // Mutations for interactive functionality
  const joinQueueMutation = useMutation({
    mutationFn: async (doctorId: string) => {
      const response = await apiRequest("POST", "/api/queue/join", { doctorId });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Queue Joined",
        description: "You have been added to the queue successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/queue/position"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to join queue",
        variant: "destructive",
      });
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async (data: { latitude: number; longitude: number; workLocation: string }) => {
      const response = await apiRequest("POST", "/api/staff/checkin", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Checked In",
        description: "Successfully checked in at work location.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Check-in Failed",
        description: error.message || "Failed to check in",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    setLocation("/login");
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };

  const handleJoinQueue = () => {
    // Check if user is already in queue
    if (queuePosition && queuePosition.status === 'waiting') {
      toast({
        title: "Already in Queue",
        description: `You are already in the queue at position #${queuePosition.tokenNumber}`,
        variant: "destructive",
      });
      return;
    }

    if (doctors.length > 0) {
      // Use the first available doctor for demo
      const doctorId = doctors[0].id;
      joinQueueMutation.mutate(doctorId);
    } else {
      toast({
        title: "No Doctors Available",
        description: "Please try again later when doctors are available.",
        variant: "destructive",
      });
    }
  };

  const handleCheckIn = () => {
    // Check-in is only for staff/doctors, show appropriate message for patients
    if (user.role === 'patient') {
      toast({
        title: "Patient Check-in",
        description: "Patients check in at the reception desk. This feature is for staff members.",
      });
      return;
    }

    // Redirect to dedicated staff check-in page for better GPS verification
    setLocation("/staff-checkin");
  };

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const handleBookAppointment = () => {
    setIsBookingModalOpen(true);
  };

  const [bookingData, setBookingData] = useState({
    doctorId: "",
    appointmentDate: "",
    appointmentTime: "",
    type: "clinic",
    notes: ""
  });

  const bookNowMutation = useMutation({
    mutationFn: async () => {
      if (doctors.length === 0) throw new Error("No doctors available");
      
      const doctor = doctors[0];
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const appointmentData = {
        doctorId: doctor.id,
        appointmentDate: tomorrow.toISOString().split('T')[0],
        appointmentTime: "09:00",
        type: "clinic",
        notes: "Quick booking for next available slot"
      };
      
      const response = await apiRequest("POST", "/api/appointments", appointmentData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Appointment Booked",
        description: "Your appointment has been scheduled for tomorrow at 9:00 AM.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to book appointment",
        variant: "destructive",
      });
    },
  });

  const handleBookNow = () => {
    bookNowMutation.mutate();
  };

  // Reschedule and cancel handlers
  const rescheduleAppointmentMutation = useMutation({
    mutationFn: async ({ appointmentId, appointmentData }: { appointmentId: string, appointmentData: any }) => {
      const response = await apiRequest("PUT", `/api/appointments/${appointmentId}`, appointmentData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setShowBookingModal(false);
      toast({
        title: "Appointment Rescheduled",
        description: "Your appointment has been successfully rescheduled.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Reschedule Failed",
        description: error.message || "Failed to reschedule appointment",
        variant: "destructive",
      });
    },
  });

  const cancelAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const response = await apiRequest("PUT", `/api/appointments/${appointmentId}/cancel`, {
        reason: "Cancelled by patient"
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Appointment Cancelled",
        description: "Your appointment has been cancelled successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel appointment",
        variant: "destructive",
      });
    },
  });

  const handleRescheduleAppointment = (appointment: any) => {
    setSelectedAppointment(appointment);
    setBookingData({
      doctorId: appointment.doctorId,
      appointmentDate: appointment.appointmentDate.split('T')[0],
      appointmentTime: new Date(appointment.appointmentDate).toLocaleTimeString('en-IN', {hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'}),
      type: appointment.type,
      notes: appointment.notes || ""
    });
    setShowBookingModal(true);
  };

  const handleCancelAppointment = (appointment: any) => {
    setSelectedAppointment(appointment);
    setShowCancelModal(true);
  };

  // Feedback form setup
  const feedbackForm = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      rating: "",
      comment: "",
      categories: [],
      appointmentId: "",
      isAnonymous: false,
    },
  });

  // Feedback submission mutation
  const submitFeedbackMutation = useMutation({
    mutationFn: async (feedbackData: FeedbackFormData) => {
      const response = await apiRequest("POST", "/api/feedback", {
        ...feedbackData,
        rating: parseInt(feedbackData.rating),
        appointmentId: feedbackData.appointmentId || null,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback! It helps us improve our service.",
      });
      setShowFeedbackModal(false);
      feedbackForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit feedback",
        variant: "destructive",
      });
    },
  });

  const handleSubmitFeedback = (data: FeedbackFormData) => {
    submitFeedbackMutation.mutate(data);
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">SmartClinic</h1>
              <p className="text-xs sm:text-sm text-gray-500">Healthcare Manager</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={() => {
                toast({
                  title: "Notifications",
                  description: "You have 3 new notifications",
                });
              }}
              className="relative hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-full transition-colors"
            >
              <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                3
              </div>
            </button>

            <div className="flex flex-col items-center gap-1">
              <span className="text-sm font-medium text-gray-900">
                {user.firstName || user.phoneNumber}
              </span>
              <Badge className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                {user.role}
              </Badge>
            </div>

            {/* Staff Check-in Link */}
            {(user.role === 'doctor' || user.role === 'staff' || user.role === 'nurse') && (
              <button 
                onClick={() => setLocation("/staff-checkin")}
                className="flex items-center gap-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors text-sm font-medium"
                title="GPS Check-in"
              >
                <MapPin className="w-4 h-4" />
                <span className="hidden sm:inline">Check-in</span>
              </button>
            )}

            <button 
              onClick={() => setLocation("/profile")}
              className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <User className="w-4 h-4 text-gray-600" />
            </button>

            <button 
              onClick={() => setLocation("/settings")} 
              className="w-5 h-5 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>

            <button onClick={handleLogout} className="w-5 h-5 text-gray-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16,17 21,12 16,7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 sm:px-6 py-8 sm:py-12 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-white mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
              Welcome back, {user.firstName || "User"}!
            </h2>
            <p className="text-blue-100 text-base sm:text-lg">Manage your healthcare with smart tools</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            <Button 
              className="bg-green-500 hover:bg-green-600 text-white px-4 sm:px-6 py-3 w-full sm:w-auto"
              onClick={() => setShowBookingModal(true)}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Book Appointment
            </Button>
            <div className="bg-white rounded-lg px-4 py-3 flex-1 max-w-full sm:max-w-md cursor-pointer" onClick={() => setShowDoctorsModal(true)}>
              <Input
                placeholder="Search doctors, specialties..."
                className="border-0 p-0 focus-visible:ring-0 text-sm sm:text-base cursor-pointer"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                readOnly
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Dashboard */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Next Appointment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                Next Appointment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">
                {appointments?.length > 0 
                  ? new Date(appointments[0].appointmentDate).toLocaleTimeString('en-IN', {hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata'})
                  : "None"
                }
              </div>
              <div className="text-sm text-gray-600 mb-2">
                {appointments?.length > 0 
                  ? `Dr. ${appointments[0].doctor.firstName} ${appointments[0].doctor.lastName} - ${appointments[0].type}`
                  : "No upcoming appointments"
                }
              </div>
              {appointments?.length > 0 && (
                <div className="mb-2">
                  <Badge className={`text-xs ${
                    appointments[0].status === 'pending_approval' 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : appointments[0].status === 'scheduled' 
                      ? 'bg-green-100 text-green-800'
                      : appointments[0].status === 'cancelled'
                      ? 'bg-red-100 text-red-800'
                      : appointments[0].status === 'completed'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {appointments[0].status === 'pending_approval' ? 'Pending Approval' : appointments[0].status}
                  </Badge>
                </div>
              )}
              {appointments?.length > 0 && (
                <div className="text-xs text-gray-500 mb-4">
                  {new Date(appointments[0].appointmentDate).toLocaleDateString('en-IN', { 
                    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata' 
                  })}
                </div>
              )}
              <div className="flex gap-2">
                <Button 
                  className="flex-1 bg-blue-500 hover:bg-blue-600" 
                  size="sm"
                  onClick={() => {
                    if (appointments?.length > 0) {
                      setSelectedAppointment(appointments[0]);
                      setShowDetailsModal(true);
                    }
                  }}
                >
                  View Details
                </Button>
                {appointments?.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedAppointment(appointments[0]);
                      setShowCancelModal(true);
                    }}
                    className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Queue Position */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-500" />
                Queue Position
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">
                {queuePosition ? `#${queuePosition.tokenNumber}` : "Not in queue"}
              </div>
              <div className="text-sm text-gray-600 mb-4">
                {queuePosition ? "Estimated wait: 45 minutes" : "Join queue when you arrive"}
              </div>
              <Button 
                className="w-full bg-green-500 hover:bg-green-600"
                onClick={() => {
                  if (queuePosition) {
                    toast({
                      title: "Queue Status",
                      description: `You are #${queuePosition.tokenNumber} in queue. ${queuePosition.estimatedWaitTime} minutes remaining.`,
                    });
                  } else {
                    toast({
                      title: "Not in Queue",
                      description: "Join the queue first to track your position.",
                      variant: "destructive",
                    });
                  }
                }}
              >
                Track Live
              </Button>
            </CardContent>
          </Card>

          {/* Pending Medicines */}
          <Card className={`border-orange-200 ${hasOverdue ? 'flash-border-urgent' : ''}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Pill className="w-4 h-4 text-orange-500" />
                Pending Medicines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-2xl font-bold ${hasOverdue ? 'text-white' : ''}`}>
                  {Array.isArray(reminders) ? reminders.filter((r: any) => !r.isTaken).length : 0}
                </span>
                {hasOverdue && (
                  <Badge className="bg-red-600 text-white text-sm font-bold flash-urgent ml-2">URGENT</Badge>
                )}
              </div>
              <div className={`text-sm mb-4 font-medium ${
                hasOverdue ? 'flash-urgent text-white' : 'text-gray-600'
              }`}>
                {hasOverdue ? `🚨 ${totalOverdue} DOSE(S) OVERDUE` : `${totalOverdue} dose(s) overdue`}
              </div>
              <Button 
                className={`w-full ${hasOverdue ? 'flash-urgent' : 'bg-orange-500 hover:bg-orange-600'}`}
                onClick={() => setLocation("/medicines")}
                data-testid="button-manage-medicines"
              >
                {hasOverdue ? '🚨 Manage Medicines' : 'Manage Medicines'}
              </Button>
            </CardContent>
          </Card>

          {/* Doctor Status */}
          <Card className={`border-red-200 ${delayNotifications && Array.isArray(delayNotifications) && delayNotifications.length > 0 ? 'glow-delay' : ''}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Clock className="w-4 h-4 text-red-500" />
                Doctor Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!hasAppointmentToday(appointments) ? (
                // No appointment today - show message only
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg text-gray-500">No appointments today</span>
                  </div>
                  <div className="text-sm text-gray-500 mb-4">Doctor status will be shown on your appointment day</div>
                </div>
              ) : (
                // Has appointment today - show status and button
                <div>
                  {(() => {
                    // Group delay notifications by doctor and keep only the latest one for each doctor
                    // Filter to only show delays for doctors with whom patient has appointment today
                    const latestDelaysByDoctor = delayNotifications.reduce((acc: any, delay: any) => {
                      if (hasAppointmentToday(appointments, delay.doctorId)) {
                        if (!acc[delay.doctorId] || new Date(delay.createdAt) > new Date(acc[delay.doctorId].createdAt)) {
                          acc[delay.doctorId] = delay;
                        }
                      }
                      return acc;
                    }, {});
                    
                    const relevantDelays = Object.values(latestDelaysByDoctor);
                    
                    if (relevantDelays.length > 0) {
                      return relevantDelays.map((delay: any) => {
                        const doctor = doctors.find(d => d.id === delay.doctorId);
                        return (
                          <div key={delay.id} className="mb-4 glow-delay p-3 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-2xl font-bold flash-delay text-white">Delayed</span>
                              <Badge className="bg-orange-600 text-white text-sm font-bold flash-delay">URGENT</Badge>
                            </div>
                            <div className="text-sm mb-4 flash-delay text-white font-medium">
                              🕒 Dr. {doctor?.firstName || 'Unknown'} {doctor?.lastName || 'Doctor'} is running {delay.delayMinutes} minutes late
                              {delay.reason && (
                                <div className="text-xs mt-1 text-orange-100">Reason: {delay.reason}</div>
                              )}
                            </div>
                          </div>
                        );
                      });
                    } else {
                      return (
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl font-bold text-green-600">On Time</span>
                          </div>
                          <div className="text-sm text-gray-600 mb-4">Your doctor is on schedule today</div>
                        </div>
                      );
                    }
                  })()}
                  <Button 
                    className={`w-full ${relevantDelays.length > 0 ? 'bg-orange-500 hover:bg-orange-600 pulse-delay' : 'bg-blue-500 hover:bg-blue-600'}`}
                    onClick={() => {
                      queryClient.invalidateQueries({ queryKey: ["/api/delays"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/queue/position"] });
                      toast({
                        title: "Updates Retrieved",
                        description: "Doctor schedule and appointment status updated successfully.",
                      });
                    }}
                  >
                    Get Updates
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
          {/* Live Queue Tracker - Only show if patient has appointment today */}
          {hasAppointmentToday(appointments) ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-500" />
                  Live Queue Tracker
                </CardTitle>
              </CardHeader>
            <CardContent>
              <div className="bg-blue-500 text-white rounded-lg p-6 text-center mb-6">
                <div className="text-sm mb-2">
                  {queuePosition?.status === 'waiting' ? 'Your Position' : 'Queue Status'}
                </div>
                <div className="text-4xl font-bold mb-2">
                  #{queuePosition?.status === 'waiting' ? queuePosition.tokenNumber : '6'}
                </div>
                <div className="text-sm">
                  {queuePosition?.status === 'waiting' ? `You are ${queuePosition.tokenNumber - 1} patients away` : 'Current Token'}
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs text-orange-600 mb-2 font-medium">⚠️ Delays Expected - 6 patients waiting</div>
                
                {/* Currently being served */}
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-green-500 text-white">#1</Badge>
                    <div>
                      <div className="text-sm font-medium">Sarah Johnson - In Progress</div>
                      <div className="text-xs text-gray-500">Started at {new Date(Date.now() - 12 * 60000).toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'})}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-green-600">Active</div>
                    <div className="text-xs text-gray-500">12 min ago</div>
                  </div>
                </div>

                {/* Next patients in queue */}
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-blue-500 text-white">#2</Badge>
                    <div>
                      <div className="text-sm font-medium">Michael Chen - Next</div>
                      <div className="text-xs text-gray-500">Waiting since {new Date(Date.now() - 35 * 60000).toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'})}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">~8min</div>
                    <div className="text-xs text-gray-500">est. wait</div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-orange-500 text-white">#3</Badge>
                    <div>
                      <div className="text-sm font-medium">Emma Rodriguez</div>
                      <div className="text-xs text-gray-500">Waiting since {new Date(Date.now() - 45 * 60000).toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'})}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">~25min</div>
                    <div className="text-xs text-gray-500">est. wait</div>
                  </div>
                </div>

                <div className="space-y-2 mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>#4 - David Kim</span>
                    <span>~40min wait</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>#5 - Lisa Thompson</span>
                    <span>~55min wait</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>#6 - You (Alex Parker)</span>
                    <span>~70min wait</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button 
                  variant="outline" 
                  className="flex-1 bg-transparent"
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ["/api/queue/position"] });
                    toast({
                      title: "Queue Refreshed",
                      description: "Queue information has been updated.",
                    });
                  }}
                >
                  Refresh Queue
                </Button>
                <Button 
                  className="flex-1 bg-blue-500 hover:bg-blue-600"
                  onClick={handleJoinQueue}
                  disabled={joinQueueMutation.isPending || (queuePosition && queuePosition.status === 'waiting')}
                >
                  {joinQueueMutation.isPending ? "Joining..." : 
                   (queuePosition && queuePosition.status === 'waiting') ? "Already in Queue" : "Join Queue"}
                </Button>
              </div>
            </CardContent>
          </Card>
          ) : null}

          {/* Medicine Reminders */}
          <Card className={hasOverdue ? 'glow-urgent' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-orange-500" />
                Medicine Reminders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {Array.isArray(reminders) ? reminders.filter((r: any) => !r.isTaken && !r.isSkipped).length : 0}
                  </div>
                  <div className="text-xs text-gray-500">Due Today</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {Array.isArray(reminders) ? reminders.filter((r: any) => r.isTaken).length : 0}
                  </div>
                  <div className="text-xs text-gray-500">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {Array.isArray(reminders) ? reminders.filter((r: any) => r.isSkipped).length : 0}
                  </div>
                  <div className="text-xs text-gray-500">Missed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {Array.isArray(reminders) ? reminders.filter((r: any) => {
                      const scheduledTime = new Date(r.scheduledAt);
                      const now = new Date();
                      return !r.isTaken && !r.isSkipped && scheduledTime < now;
                    }).length : 0}
                  </div>
                  <div className="text-xs text-gray-500">Overdue</div>
                </div>
              </div>

              {Array.isArray(reminders) && reminders.length > 0 ? (
                <div className="space-y-4">
                  {reminders.slice(0, 2).map((reminder: any) => (
                    <div key={reminder.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{reminder.prescription.medicine.name}</span>
                          <Pill className="w-4 h-4 text-blue-500" />
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {new Date(reminder.scheduledAt).toLocaleTimeString('en-IN', {hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata'})}
                          </div>
                          {!reminder.isTaken && new Date(reminder.scheduledAt) < new Date() && (
                            <Badge className="bg-red-100 text-red-800 text-xs">Overdue</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">{reminder.prescription.dosage}</div>
                      <div className="flex gap-2">
                        {!reminder.isTaken && !reminder.isSkipped ? (
                          <>
                            <Button 
                              size="sm" 
                              className="flex-1 bg-green-500 hover:bg-green-600"
                              onClick={() => handleMarkTaken(reminder.id)}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Taken
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex-1 bg-transparent"
                              onClick={() => handleSkipReminder(reminder.id)}
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Skip
                            </Button>
                          </>
                        ) : (
                          <>
                            <Badge className={reminder.isTaken ? "bg-green-500" : "bg-gray-500"}>
                              {reminder.isTaken ? (
                                <>
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Taken
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Skipped
                                </>
                              )}
                            </Badge>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                              onClick={() => handleResetReminder(reminder.id)}
                            >
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Correct
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No medicine reminders for today
                </div>
              )}

              <Button 
                className="w-full mt-4 bg-blue-500 hover:bg-blue-600"
                onClick={() => setLocation("/medicines")}
              >
                <Calendar className="w-4 h-4 mr-2" />
                View Full Schedule
              </Button>
            </CardContent>
          </Card>

          {/* Appointments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                Appointments

              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center gap-8 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {appointments?.length || 0}
                  </div>
                  <div className="text-xs text-gray-500">Upcoming</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">0</div>
                  <div className="text-xs text-gray-500">Home Visits</div>
                </div>
              </div>

              {appointments?.length > 0 ? (
                <div className="space-y-4">
                  {appointments.slice(0, 2).map((appointment: any) => (
                    <div key={appointment.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            Dr. {appointment.doctor.firstName} {appointment.doctor.lastName}
                          </span>
                          <Badge className={`text-xs ${
                            appointment.status === 'pending_approval' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : appointment.status === 'scheduled' 
                              ? 'bg-green-100 text-green-800'
                              : appointment.status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : appointment.status === 'completed'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {appointment.status === 'pending_approval' ? 'Pending Approval' : appointment.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Stethoscope className="w-3 h-3" />
                          {appointment.type}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 mb-3">{appointment.location}</div>
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">
                          {new Date(appointment.appointmentDate).toLocaleDateString('en-IN', {timeZone: 'Asia/Kolkata'})}
                        </span>
                        <Clock className="w-4 h-4 text-gray-400 ml-2" />
                        <span className="text-sm">
                          {new Date(appointment.appointmentDate).toLocaleTimeString('en-IN', {hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata'})}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 bg-transparent"
                          onClick={() => handleRescheduleAppointment(appointment)}
                        >
                          Reschedule
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 text-red-600 border-red-200 bg-transparent"
                          onClick={() => handleCancelAppointment(appointment)}
                        >
                          Cancel
                        </Button>
                        <Button size="sm" className="bg-green-500 hover:bg-green-600">
                          <Phone className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No upcoming appointments
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Quick Actions */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-500" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <Button
                  variant="outline"
                  className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 bg-transparent text-xs sm:text-sm"
                  onClick={handleCheckIn}
                  disabled={checkInMutation.isPending}
                >
                  <UserCheck className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                  <span>{checkInMutation.isPending ? "Checking..." : "Check In"}</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 bg-transparent text-xs sm:text-sm"
                  onClick={() => setShowEmergencyModal(true)}
                >
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
                  <span>Emergency</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 bg-transparent text-xs sm:text-sm"
                  onClick={() => {
                    if (appointments?.length > 0) {
                      setShowBookingModal(true);
                      toast({
                        title: "Reschedule Mode",
                        description: "Select a new date and time for your appointment.",
                      });
                    } else {
                      toast({
                        title: "No Appointments",
                        description: "You don't have any appointments to reschedule.",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
                  <span>Reschedule</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 bg-transparent text-xs sm:text-sm"
                  onClick={() => setShowFeedbackModal(true)}
                >
                  <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
                  <span>Feedback</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Modals */}
      <BookingModal 
        isOpen={showBookingModal} 
        onClose={() => {
          setShowBookingModal(false);
          setSelectedAppointment(null);
          setSelectedDoctor(null);
        }}
        selectedAppointment={selectedAppointment}
        selectedDoctor={selectedDoctor}
        rescheduleData={selectedAppointment ? {
          appointmentId: selectedAppointment.id,
          doctorId: selectedAppointment.doctorId,
          appointmentDate: selectedAppointment.appointmentDate.split('T')[0],
          appointmentTime: new Date(selectedAppointment.appointmentDate).toLocaleTimeString('en-IN', {hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'}),
          type: selectedAppointment.type,
          notes: selectedAppointment.notes || ""
        } : null}
      />
      <EmergencyModal 
        isOpen={showEmergencyModal} 
        onClose={() => setShowEmergencyModal(false)} 
      />
      <CancelModal 
        isOpen={showCancelModal} 
        onClose={() => setShowCancelModal(false)}
        appointment={selectedAppointment}
      />
      <AppointmentDetailsModal 
        isOpen={showDetailsModal} 
        onClose={() => setShowDetailsModal(false)}
        appointment={selectedAppointment}
      />

      {/* Feedback Modal */}
      <Dialog open={showFeedbackModal} onOpenChange={setShowFeedbackModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-orange-500" />
              Share Your Feedback
            </DialogTitle>
            <DialogDescription>
              Help us improve SmartClinic by sharing your experience with us.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...feedbackForm}>
            <form onSubmit={feedbackForm.handleSubmit(handleSubmitFeedback)} className="space-y-4">
              <FormField
                control={feedbackForm.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Overall Rating</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select rating (1-5 stars)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="5">⭐⭐⭐⭐⭐ Excellent</SelectItem>
                        <SelectItem value="4">⭐⭐⭐⭐ Very Good</SelectItem>
                        <SelectItem value="3">⭐⭐⭐ Good</SelectItem>
                        <SelectItem value="2">⭐⭐ Fair</SelectItem>
                        <SelectItem value="1">⭐ Poor</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={feedbackForm.control}
                name="categories"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Feedback Categories</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Select all areas you'd like to provide feedback on
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { id: "service_quality", label: "Service Quality" },
                        { id: "wait_time", label: "Wait Time" },
                        { id: "staff_behavior", label: "Staff Behavior" },
                        { id: "facility", label: "Facility & Cleanliness" },
                        { id: "appointment_booking", label: "Appointment Booking" },
                        { id: "app_usability", label: "App Experience" },
                        { id: "other", label: "Other" }
                      ].map((item) => (
                        <FormField
                          key={item.id}
                          control={feedbackForm.control}
                          name="categories"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={item.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    data-testid={`checkbox-${item.id}`}
                                    checked={field.value?.includes(item.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, item.id])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value: string) => value !== item.id
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  {item.label}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {appointments?.length > 0 && (
                <FormField
                  control={feedbackForm.control}
                  name="appointmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Related Appointment (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select appointment" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">No specific appointment</SelectItem>
                          {appointments.map((appointment: any) => (
                            <SelectItem key={appointment.id} value={appointment.id}>
                              {new Date(appointment.appointmentDate).toLocaleDateString('en-IN', {timeZone: 'Asia/Kolkata'})} - Dr. {appointment.doctor?.firstName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={feedbackForm.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Comments (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Optional: Share any additional thoughts, suggestions, or concerns..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional field - leave blank if you prefer
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={feedbackForm.control}
                name="isAnonymous"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Submit Anonymously
                      </FormLabel>
                      <FormDescription>
                        Your name will not be associated with this feedback
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowFeedbackModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitFeedbackMutation.isPending}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {submitFeedbackMutation.isPending ? (
                    "Submitting..."
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Feedback
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Search Doctors Modal */}
      <Dialog open={showDoctorsModal} onOpenChange={setShowDoctorsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-blue-500" />
              Search Doctors
            </DialogTitle>
            <DialogDescription>
              Find and book appointments with available doctors
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <Input
                placeholder="Search by name, specialty, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-4 pr-4"
                data-testid="input-doctor-search"
              />
            </div>

            {doctors && doctors.length > 0 ? (
              <div className="max-h-96 overflow-y-auto space-y-3">
                {doctors
                  .filter((doctor: any) => 
                    searchQuery === "" || 
                    `${doctor.firstName} ${doctor.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    doctor.address?.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((doctor: any) => (
                    <div
                      key={doctor.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedDoctor(doctor);
                        setShowDoctorsModal(false);
                        setShowBookingModal(true);
                      }}
                      data-testid={`doctor-card-${doctor.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <Stethoscope className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              Dr. {doctor.firstName} {doctor.lastName}
                            </h3>
                            <p className="text-sm text-gray-600">General Practitioner</p>
                            {doctor.address && (
                              <div className="flex items-center gap-1 mt-1">
                                <MapPin className="w-3 h-3 text-gray-400" />
                                <p className="text-xs text-gray-500">{doctor.address}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 mb-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs text-green-600">Available</span>
                          </div>
                          <Button 
                            size="sm"
                            className="bg-blue-500 hover:bg-blue-600"
                            data-testid={`button-book-${doctor.id}`}
                          >
                            <Calendar className="w-3 h-3 mr-1" />
                            Book Now
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Stethoscope className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Doctors Found</h3>
                <p className="text-gray-600">Try adjusting your search terms</p>
              </div>
            )}

            {searchQuery && doctors.filter((doctor: any) => 
              `${doctor.firstName} ${doctor.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
              doctor.address?.toLowerCase().includes(searchQuery.toLowerCase())
            ).length === 0 && (
              <div className="text-center py-8">
                <Stethoscope className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Results</h3>
                <p className="text-gray-600">No doctors match your search criteria</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
