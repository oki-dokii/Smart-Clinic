import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Calendar as CalendarIcon, Clock, User, MapPin, 
  Stethoscope, Home, Video, Phone
} from "lucide-react";
import { format } from "date-fns";

// Helper function to format doctor names properly (avoid double "Dr.")
const formatDoctorName = (firstName: string, lastName: string) => {
  const cleanFirstName = firstName?.startsWith('Dr. ') ? firstName.slice(4) : firstName;
  return `Dr. ${cleanFirstName} ${lastName}`;
};

// Clinic location options
const clinicLocations = [
  "Bangalore Central Clinic, MG Road, Bangalore",
  "Whitefield Branch, ITPL Main Road, Bangalore",
  "Koramangala Clinic, 5th Block, Bangalore", 
  "Electronic City Clinic, Phase 1, Bangalore"
];

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAppointment?: any;
  selectedDoctor?: any;
  rescheduleData?: any;
}

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  address: string;
}

interface BookingData {
  doctorId: string;
  appointmentDate: string;
  type: 'clinic' | 'home_visit' | 'video_call';
  duration: number;
  location: string;
  notes: string;
  symptoms: string;
}

export default function BookingModal({ isOpen, onClose, selectedAppointment, selectedDoctor, rescheduleData }: BookingModalProps) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("");
  const [bookingData, setBookingData] = useState<BookingData>({
    doctorId: selectedDoctor?.id || "",
    appointmentDate: "",
    type: "clinic",
    duration: 30,
    location: selectedDoctor?.address || "",
    notes: "",
    symptoms: ""
  });

  // Fetch available doctors
  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['/api/users', 'doctor'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/users?role=doctor');
      return response.json();
    },
  });

  // Fetch doctor's appointments for selected date to check availability
  const { data: existingAppointments = [] } = useQuery({
    queryKey: ['/api/appointments', 'availability', bookingData.doctorId, selectedDate?.toISOString()],
    queryFn: async () => {
      if (!bookingData.doctorId || !selectedDate) return [];
      const dateStr = selectedDate.toISOString().split('T')[0];
      const response = await apiRequest('GET', `/api/appointments?date=${dateStr}&doctorId=${bookingData.doctorId}`);
      return response.json();
    },
    enabled: !!bookingData.doctorId && !!selectedDate,
  });

  // Book or reschedule appointment mutation
  const bookAppointmentMutation = useMutation({
    mutationFn: async (appointment: BookingData) => {
      if (rescheduleData) {
        // Reschedule existing appointment
        const response = await apiRequest('PUT', `/api/appointments/${rescheduleData.appointmentId}`, appointment);
        return response.json();
      } else {
        // Book new appointment with pending_approval status
        const requestData = {
          doctorId: appointment.doctorId,
          type: appointment.type,
          symptoms: appointment.symptoms,
          preferredDate: appointment.appointmentDate,
          urgency: 'normal',
          notes: appointment.notes
        };
        const response = await apiRequest('POST', '/api/appointments/patient-request', requestData);
        return response.json();
      }
    },
    onSuccess: () => {
      // Invalidate both patient and admin appointment queries for real-time sync
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments/admin'] });
      onClose();
      resetForm();
      toast({
        title: "Appointment Booked",
        description: "Your appointment has been scheduled successfully. You'll receive a confirmation SMS.",
      });
    },
    onError: (error: any) => {
      console.error('Appointment booking error:', error);
      
      // Check for authentication errors
      if (error.message?.includes('401') || error.message?.includes('Invalid or expired token')) {
        toast({
          title: "Authentication Required",
          description: "Please log in to book an appointment.",
          variant: "destructive",
        });
        return;
      }
      
      // Check for validation errors
      if (error.message?.includes('400')) {
        toast({
          title: "Invalid Information",
          description: "Please check all required fields and try again.",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to book appointment. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Update booking data when selectedDoctor changes
  useEffect(() => {
    if (selectedDoctor) {
      setBookingData(prev => ({
        ...prev,
        doctorId: selectedDoctor.id,
        location: prev.type === 'clinic' ? selectedDoctor.address || '' : prev.location
      }));
    }
  }, [selectedDoctor]);

  const resetForm = () => {
    setSelectedDate(undefined);
    setSelectedTime("");
    setBookingData({
      doctorId: selectedDoctor?.id || "",
      appointmentDate: "",
      type: "clinic",
      duration: 30,
      location: selectedDoctor?.address || "",
      notes: "",
      symptoms: ""
    });
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date && selectedTime) {
      const dateTime = new Date(date);
      const [hours, minutes] = selectedTime.split(':');
      dateTime.setHours(parseInt(hours), parseInt(minutes));
      setBookingData(prev => ({
        ...prev,
        appointmentDate: dateTime.toISOString()
      }));
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    if (selectedDate && time) {
      const dateTime = new Date(selectedDate);
      const [hours, minutes] = time.split(':');
      dateTime.setHours(parseInt(hours), parseInt(minutes));
      setBookingData(prev => ({
        ...prev,
        appointmentDate: dateTime.toISOString()
      }));
    }
  };

  const handleDoctorSelect = (doctorId: string) => {
    const doctor = doctors.find((d: Doctor) => d.id === doctorId);
    setBookingData(prev => ({
      ...prev,
      doctorId,
      location: bookingData.type === 'clinic' ? doctor?.address || '' : prev.location
    }));
  };

  const handleTypeChange = (type: 'clinic' | 'home_visit' | 'video_call') => {
    const doctor = doctors.find((d: Doctor) => d.id === bookingData.doctorId);
    let location = "";
    
    if (type === 'clinic' && doctor) {
      location = doctor.address;
    } else if (type === 'home_visit') {
      location = "Patient Home Address";
    } else if (type === 'video_call') {
      location = "Video Conference";
    }
    
    setBookingData(prev => ({ ...prev, type, location }));
  };

  const canSubmit = bookingData.doctorId && bookingData.appointmentDate && bookingData.symptoms.trim();

  const baseTimeSlots = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
    "17:00", "17:30", "18:00", "18:30"
  ];

  // Filter out time slots that conflict with existing appointments
  const availableTimeSlots = baseTimeSlots.filter(timeSlot => {
    if (!selectedDate || !existingAppointments.length) return true;
    
    const [hours, minutes] = timeSlot.split(':').map(Number);
    const slotDateTime = new Date(selectedDate);
    slotDateTime.setHours(hours, minutes, 0, 0);
    
    // Check if this time slot conflicts with any existing appointment
    return !existingAppointments.some((appointment: any) => {
      const appointmentStart = new Date(appointment.appointmentDate);
      const appointmentEnd = new Date(appointmentStart.getTime() + (appointment.duration || 30) * 60000);
      
      // Check for overlap: appointment is active status and times overlap
      const isActiveStatus = ['scheduled', 'confirmed', 'pending_approval'].includes(appointment.status);
      const timesOverlap = slotDateTime >= appointmentStart && slotDateTime < appointmentEnd;
      
      return isActiveStatus && timesOverlap;
    });
  });

  // Clinic operating hours for display
  const clinicHours = {
    morning: "9:00 AM - 12:00 PM",
    afternoon: "2:00 PM - 7:00 PM",
    closed: "Sundays"
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'clinic': return <Stethoscope className="w-4 h-4" />;
      case 'home_visit': return <Home className="w-4 h-4" />;
      case 'video_call': return <Video className="w-4 h-4" />;
      default: return <Stethoscope className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'clinic': return 'bg-blue-500';
      case 'home_visit': return 'bg-green-500';
      case 'video_call': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <div className="flex items-center justify-center p-8">
            Loading doctors...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Book New Appointment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Doctor Selection */}
          <div>
            <Label>Select Doctor</Label>
            <Select value={bookingData.doctorId} onValueChange={handleDoctorSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a doctor" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((doctor: Doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <div>
                        <p className="font-medium">{formatDoctorName(doctor.firstName, doctor.lastName)}</p>
                        <p className="text-xs text-gray-500">{doctor.address}</p>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Appointment Type */}
          <div>
            <Label>Appointment Type</Label>
            <div className="grid grid-cols-3 gap-3 mt-2">
              {[
                { value: 'clinic', label: 'Clinic Visit', icon: 'clinic' },
                { value: 'home_visit', label: 'Home Visit', icon: 'home_visit' },
                { value: 'video_call', label: 'Video Call', icon: 'video_call' }
              ].map((type) => (
                <button
                  key={type.value}
                  onClick={() => handleTypeChange(type.value as any)}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    bookingData.type === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    {getTypeIcon(type.value)}
                    <span className="text-sm font-medium">{type.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Clinic Hours Info */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Clinic Hours
            </h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>Morning:</strong> {clinicHours.morning}</p>
              <p><strong>Afternoon:</strong> {clinicHours.afternoon}</p>
              <p><strong>Closed:</strong> {clinicHours.closed}</p>
            </div>
          </div>

          {/* Date and Time Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Select Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const maxDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                      const isSunday = date.getDay() === 0; // Sunday = 0
                      return date < today || date > maxDate || isSunday;
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Select Time</Label>
              {!bookingData.doctorId ? (
                <div className="text-sm text-gray-500 py-3 px-4 border rounded-md">
                  Please select a doctor first
                </div>
              ) : !selectedDate ? (
                <div className="text-sm text-gray-500 py-3 px-4 border rounded-md">
                  Please select a date first
                </div>
              ) : availableTimeSlots.length === 0 ? (
                <div className="text-sm text-red-500 py-3 px-4 border rounded-md bg-red-50">
                  No available time slots for this date
                </div>
              ) : (
                <Select value={selectedTime} onValueChange={handleTimeSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose available time" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTimeSlots.map((time) => {
                      const isBooked = baseTimeSlots.includes(time) && !availableTimeSlots.includes(time);
                      return (
                        <SelectItem key={time} value={time}>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>{time}</span>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ml-auto ${
                                isBooked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {isBooked ? 'Booked' : 'Available'}
                            </Badge>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
              {bookingData.doctorId && selectedDate && existingAppointments.length > 0 && (
                <p className="text-xs text-gray-600 mt-1">
                  {existingAppointments.length} existing appointment(s) on this date
                </p>
              )}
            </div>
          </div>

          {/* Duration */}
          <div>
            <Label>Duration (minutes)</Label>
            <Select 
              value={bookingData.duration.toString()} 
              onValueChange={(value) => setBookingData(prev => ({ ...prev, duration: parseInt(value) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div>
            <Label>Location</Label>
            {bookingData.type === 'home_visit' ? (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <Input
                  value={bookingData.location}
                  onChange={(e) => setBookingData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Enter your home address"
                />
              </div>
            ) : bookingData.type === 'video_call' ? (
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-gray-500" />
                <Input
                  value="Video Call - Online"
                  readOnly
                  className="bg-gray-50"
                />
              </div>
            ) : (
              <Select 
                value={bookingData.location} 
                onValueChange={(value) => setBookingData(prev => ({ ...prev, location: value }))}
              >
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <SelectValue placeholder="Select clinic location" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {clinicLocations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Symptoms */}
          <div>
            <Label>Symptoms / Reason for Visit *</Label>
            <Textarea
              value={bookingData.symptoms}
              onChange={(e) => setBookingData(prev => ({ ...prev, symptoms: e.target.value }))}
              placeholder="Please describe your symptoms or reason for the appointment..."
              rows={3}
            />
          </div>

          {/* Additional Notes */}
          <div>
            <Label>Additional Notes</Label>
            <Textarea
              value={bookingData.notes}
              onChange={(e) => setBookingData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any additional information for the doctor..."
              rows={2}
            />
          </div>

          {/* Booking Summary */}
          {bookingData.doctorId && bookingData.appointmentDate && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-medium mb-2 text-green-900 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Booking Summary - Time Slot Available
              </h4>
              <div className="space-y-1 text-sm text-green-800">
                <p><strong>Doctor:</strong> {(() => {
                  const doctor = doctors.find((d: Doctor) => d.id === bookingData.doctorId);
                  return doctor ? formatDoctorName(doctor.firstName, doctor.lastName) : '';
                })()}</p>
                <p><strong>Date & Time:</strong> {selectedDate && format(selectedDate, "PPP")} at {selectedTime}</p>
                <p><strong>Type:</strong> 
                  <Badge className={`ml-2 ${getTypeColor(bookingData.type)}`}>
                    {getTypeIcon(bookingData.type)}
                    <span className="ml-1">{bookingData.type.replace('_', ' ')}</span>
                  </Badge>
                </p>
                <p><strong>Duration:</strong> {bookingData.duration} minutes</p>
                <p><strong>Location:</strong> {bookingData.location}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={() => {
                console.log('Booking data:', bookingData);
                
                // Check if user is authenticated first
                const token = localStorage.getItem("auth_token");
                if (!token) {
                  toast({
                    title: "Login Required",
                    description: "Please log in to book an appointment. Use phone/OTP or Google authentication.",
                    variant: "destructive",
                  });
                  return;
                }
                
                if (canSubmit) {
                  bookAppointmentMutation.mutate(bookingData);
                } else {
                  toast({
                    title: "Incomplete Information",
                    description: "Please fill in all required fields: doctor, date/time, and symptoms.",
                    variant: "destructive",
                  });
                }
              }}
              disabled={bookAppointmentMutation.isPending}
              className="flex-1 bg-blue-500 hover:bg-blue-600"
            >
              {bookAppointmentMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Booking...
                </>
              ) : (
                <>
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Book Appointment
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}