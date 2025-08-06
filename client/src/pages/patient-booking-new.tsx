import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, User, MapPin, Video, Home, Stethoscope, Phone, CheckCircle, LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  specialization?: string;
  isActive: boolean;
}

export default function PatientBooking() {
  const [step, setStep] = useState(1);
  const [bookingData, setBookingData] = useState({
    symptoms: '',
    appointmentType: '',
    doctorId: '',
    preferredDate: '',
    preferredTime: '',
    urgency: 'normal',
    notes: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  // Check authentication and redirect if not logged in
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
  }, []);

  // Get current patient info
  const { data: currentPatient, isLoading: patientLoading } = useQuery<any>({
    queryKey: ['/api/users/me'],
    retry: (failureCount, error) => {
      if (error && typeof error === 'object' && 'status' in error && error.status === 401) {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
        return false;
      }
      return failureCount < 2;
    }
  });

  // Redirect non-patients
  useEffect(() => {
    if (currentPatient && currentPatient.role !== 'patient') {
      if (currentPatient.role === 'admin') {
        window.location.href = '/admin-dashboard';
      } else {
        window.location.href = '/dashboard';
      }
    }
  }, [currentPatient]);

  // Fetch available doctors
  const { data: doctors = [], isLoading: doctorsLoading } = useQuery<Doctor[]>({
    queryKey: ['/api/doctors'],
    enabled: step >= 2
  });

  // Submit appointment request mutation
  const submitAppointment = useMutation({
    mutationFn: async (data: typeof bookingData) => {
      return apiRequest('/api/appointments/patient-request', {
        method: 'POST',
        body: JSON.stringify({
          doctorId: data.doctorId,
          type: data.appointmentType,
          symptoms: data.symptoms,
          preferredDate: `${data.preferredDate}T${data.preferredTime}:00.000Z`,
          urgency: data.urgency,
          notes: data.notes
        })
      });
    },
    onSuccess: () => {
      setIsSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      toast({
        title: "Appointment Request Submitted!",
        description: "Your appointment request has been submitted for admin approval. You'll receive an SMS notification once reviewed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to submit appointment request. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
  };

  if (patientLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentPatient) {
    return null; // Will redirect in useEffect
  }

  const handleNext = () => {
    if (step === 1) {
      // Validate symptoms
      if (!bookingData.symptoms) {
        toast({
          title: "Required Fields Missing",
          description: "Please describe your symptoms.",
          variant: "destructive"
        });
        return;
      }
    }
    setStep(step + 1);
  };

  const handleSubmit = () => {
    if (!bookingData.doctorId || !bookingData.appointmentType || !bookingData.preferredDate || !bookingData.preferredTime) {
      toast({
        title: "Required Fields Missing",
        description: "Please complete all appointment details.",
        variant: "destructive"
      });
      return;
    }
    submitAppointment.mutate(bookingData);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-700 mb-2">Request Submitted!</h2>
            <p className="text-gray-600 mb-4">
              Your appointment request has been sent to the clinic administration for review.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-blue-700">
                <strong>What happens next?</strong><br />
                • Admin will review your request<br />
                • You'll get SMS notification when approved<br />
                • Appointment will be confirmed with date/time
              </p>
            </div>
            <Button onClick={() => {
              setIsSubmitted(false);
              setStep(1);
              setBookingData({
                symptoms: '',
                appointmentType: '',
                doctorId: '',
                preferredDate: '',
                preferredTime: '',
                urgency: 'normal',
                notes: ''
              });
            }} className="w-full">
              Book Another Appointment
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header with Patient Info & Logout */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Book Your Appointment</h1>
            <p className="text-gray-600">Welcome, {currentPatient.firstName} {currentPatient.lastName}</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= stepNum 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {stepNum}
                </div>
                {stepNum < 3 && (
                  <div className={`w-16 h-1 mx-2 ${
                    step > stepNum ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>
              {step === 1 && "Tell us your symptoms"}
              {step === 2 && "Choose your doctor"}
              {step === 3 && "Select appointment details"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="symptoms">Describe your symptoms *</Label>
                  <Textarea
                    id="symptoms"
                    placeholder="Please describe what symptoms you're experiencing..."
                    value={bookingData.symptoms}
                    onChange={(e) => setBookingData({...bookingData, symptoms: e.target.value})}
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="urgency">Urgency Level</Label>
                  <Select value={bookingData.urgency} onValueChange={(value) => setBookingData({...bookingData, urgency: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - Routine check-up</SelectItem>
                      <SelectItem value="normal">Normal - General concern</SelectItem>
                      <SelectItem value="high">High - Urgent care needed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleNext} className="w-full">
                  Continue to Doctor Selection
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <Label>Select Your Doctor</Label>
                  {doctorsLoading ? (
                    <div className="text-center py-4">Loading doctors...</div>
                  ) : (
                    <div className="grid gap-3 mt-2">
                      {doctors.map((doctor) => (
                        <div
                          key={doctor.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${
                            bookingData.doctorId === doctor.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setBookingData({...bookingData, doctorId: doctor.id})}
                        >
                          <div className="flex items-center gap-3">
                            <Stethoscope className="w-5 h-5 text-blue-500" />
                            <div>
                              <p className="font-medium">Dr. {doctor.firstName} {doctor.lastName}</p>
                              <p className="text-sm text-gray-600">{doctor.specialization || 'General Practitioner'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                    Back
                  </Button>
                  <Button onClick={handleNext} disabled={!bookingData.doctorId} className="flex-1">
                    Continue to Details
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <Label>Appointment Type</Label>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    {[
                      { value: 'clinic', label: 'Clinic Visit', icon: MapPin },
                      { value: 'home_visit', label: 'Home Visit', icon: Home },
                      { value: 'telehealth', label: 'Video Call', icon: Video }
                    ].map(({ value, label, icon: Icon }) => (
                      <div
                        key={value}
                        className={`p-4 border rounded-lg cursor-pointer text-center transition-all ${
                          bookingData.appointmentType === value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setBookingData({...bookingData, appointmentType: value})}
                      >
                        <Icon className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                        <p className="text-sm font-medium">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="preferredDate">Preferred Date</Label>
                    <Input
                      id="preferredDate"
                      type="date"
                      value={bookingData.preferredDate}
                      onChange={(e) => setBookingData({...bookingData, preferredDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="preferredTime">Preferred Time</Label>
                    <Input
                      id="preferredTime"
                      type="time"
                      value={bookingData.preferredTime}
                      onChange={(e) => setBookingData({...bookingData, preferredTime: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional information or special requests..."
                    value={bookingData.notes}
                    onChange={(e) => setBookingData({...bookingData, notes: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                    Back
                  </Button>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={submitAppointment.isPending}
                    className="flex-1"
                  >
                    {submitAppointment.isPending ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}