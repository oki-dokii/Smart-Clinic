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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTheme } from "@/components/ThemeProvider";

export default function SmartClinicDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

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
  });

  const { data: queuePosition } = useQuery({
    queryKey: ["/api/queue/position"],
    enabled: !!user && user.role === "patient",
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ["/api/reminders"],
    enabled: !!user && user.role === "patient",
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ["/api/users", "doctor"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/users?role=doctor");
      return response.json();
    },
    enabled: !!user,
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

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          checkInMutation.mutate({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            workLocation: "Main Clinic"
          });
        },
        (error) => {
          toast({
            title: "Location Required",
            description: "Please enable location access to check in.",
            variant: "destructive",
          });
        }
      );
    } else {
      toast({
        title: "Location Not Supported",
        description: "Your browser doesn't support location services.",
        variant: "destructive",
      });
    }
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
      appointmentTime: new Date(appointment.appointmentDate).toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute: '2-digit'}),
      type: appointment.type,
      notes: appointment.notes || ""
    });
    setShowBookingModal(true);
  };

  const handleCancelAppointment = (appointment: any) => {
    setSelectedAppointment(appointment);
    setShowCancelModal(true);
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
            <div className="bg-white rounded-lg px-4 py-3 flex-1 max-w-full sm:max-w-md">
              <Input
                placeholder="Search doctors, specialties..."
                className="border-0 p-0 focus-visible:ring-0 text-sm sm:text-base"
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
                  ? new Date(appointments[0].appointmentDate).toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit', hour12: true})
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
                <div className="text-xs text-gray-500 mb-4">
                  {new Date(appointments[0].appointmentDate).toLocaleDateString('en-US', { 
                    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' 
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
          <Card className="border-orange-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Pill className="w-4 h-4 text-orange-500" />
                Pending Medicines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl font-bold">
                  {reminders?.filter((r: any) => !r.isTaken).length || 0}
                </span>
                {reminders?.some((r: any) => !r.isTaken && new Date(r.scheduledAt) < new Date()) && (
                  <Badge className="bg-red-500 text-white text-xs">Urgent</Badge>
                )}
              </div>
              <div className="text-sm text-gray-600 mb-4">
                {reminders?.filter((r: any) => !r.isTaken && new Date(r.scheduledAt) < new Date()).length || 0} dose(s) overdue
              </div>
              <Button 
                className="w-full bg-orange-500 hover:bg-orange-600"
                onClick={() => setLocation("/medicines")}
              >
                Manage Medicines
              </Button>
            </CardContent>
          </Card>

          {/* Doctor Status */}
          <Card className="border-red-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Clock className="w-4 h-4 text-red-500" />
                Doctor Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl font-bold">On Time</span>
              </div>
              <div className="text-sm text-gray-600 mb-4">All appointments on schedule</div>
              <Button className="w-full bg-blue-500 hover:bg-blue-600">Get Updates</Button>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
          {/* Live Queue Tracker */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                Live Queue Tracker
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-500 text-white rounded-lg p-6 text-center mb-6">
                <div className="text-sm mb-2">Now Serving</div>
                <div className="text-4xl font-bold mb-2">#12</div>
                <div className="text-sm">Token Number</div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-blue-500 text-white">#13</Badge>
                    <div>
                      <div className="text-sm font-medium">Next Patient</div>
                      <div className="text-xs text-gray-500">10:45 AM</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">0min</div>
                    <div className="text-xs text-gray-500">est. wait</div>
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

          {/* Medicine Reminders */}
          <Card>
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
                    {reminders?.filter((r: any) => !r.isTaken && !r.isSkipped).length || 0}
                  </div>
                  <div className="text-xs text-gray-500">Due Today</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {reminders?.filter((r: any) => r.isTaken).length || 0}
                  </div>
                  <div className="text-xs text-gray-500">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {reminders?.filter((r: any) => r.isSkipped).length || 0}
                  </div>
                  <div className="text-xs text-gray-500">Missed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {reminders?.filter((r: any) => {
                      const scheduledTime = new Date(r.scheduledAt);
                      const now = new Date();
                      return !r.isTaken && !r.isSkipped && scheduledTime < now;
                    }).length || 0}
                  </div>
                  <div className="text-xs text-gray-500">Overdue</div>
                </div>
              </div>

              {reminders?.length > 0 ? (
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
                            {new Date(reminder.scheduledAt).toLocaleTimeString()}
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
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            {appointment.status}
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
                          {new Date(appointment.appointmentDate).toLocaleDateString()}
                        </span>
                        <Clock className="w-4 h-4 text-gray-400 ml-2" />
                        <span className="text-sm">
                          {new Date(appointment.appointmentDate).toLocaleTimeString()}
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
                  onClick={() => {
                    toast({
                      title: "Home Care Service",
                      description: "Home care appointment booking initiated. Our team will contact you within 30 minutes.",
                    });
                  }}
                >
                  <Home className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
                  <span>Home Care</span>
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
        }}
        selectedAppointment={selectedAppointment}
        rescheduleData={selectedAppointment ? {
          appointmentId: selectedAppointment.id,
          doctorId: selectedAppointment.doctorId,
          appointmentDate: selectedAppointment.appointmentDate.split('T')[0],
          appointmentTime: new Date(selectedAppointment.appointmentDate).toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute: '2-digit'}),
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
    </div>
  );
}
