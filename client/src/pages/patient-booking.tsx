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
        description: "Your appointment request has been sent to the clinic for approval. You'll receive an SMS notification once it's reviewed.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit appointment request. Please try again.",
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
                patientFirstName: '',
                patientLastName: '',
                patientPhone: '',
                patientEmail: '',
                dateOfBirth: '',
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
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Book an Appointment</h1>
          <p className="text-gray-600">Complete the form below to request an appointment with our healthcare professionals</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              1
            </div>
            <div className="text-xs ml-2 text-gray-600">Patient Info</div>
          </div>
          <div className={`w-16 h-1 mx-4 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              2
            </div>
            <div className="text-xs ml-2 text-gray-600">Appointment</div>
          </div>
          <div className={`w-16 h-1 mx-4 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              3
            </div>
            <div className="text-xs ml-2 text-gray-600">Review</div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {step === 1 && <><User className="w-5 h-5" /> Patient Information</>}
              {step === 2 && <><Calendar className="w-5 h-5" /> Appointment Details</>}
              {step === 3 && <><CheckCircle className="w-5 h-5" /> Review & Submit</>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Patient Information */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={bookingData.patientFirstName}
                      onChange={(e) => setBookingData({...bookingData, patientFirstName: e.target.value})}
                      placeholder="Enter your first name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={bookingData.patientLastName}
                      onChange={(e) => setBookingData({...bookingData, patientLastName: e.target.value})}
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={bookingData.patientPhone}
                    onChange={(e) => setBookingData({...bookingData, patientPhone: e.target.value})}
                    placeholder="+1234567890"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={bookingData.patientEmail}
                    onChange={(e) => setBookingData({...bookingData, patientEmail: e.target.value})}
                    placeholder="your.email@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="dob">Date of Birth (Optional)</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={bookingData.dateOfBirth}
                    onChange={(e) => setBookingData({...bookingData, dateOfBirth: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="symptoms">Describe Your Symptoms</Label>
                  <Textarea
                    id="symptoms"
                    value={bookingData.symptoms}
                    onChange={(e) => setBookingData({...bookingData, symptoms: e.target.value})}
                    placeholder="Please describe your symptoms or reason for the appointment..."
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Appointment Details */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <Label>Appointment Type *</Label>
                  <div className="grid grid-cols-3 gap-4 mt-2">
                    <div 
                      onClick={() => setBookingData({...bookingData, appointmentType: 'clinic'})}
                      className={`p-4 border rounded-lg cursor-pointer text-center ${
                        bookingData.appointmentType === 'clinic' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <Stethoscope className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                      <div className="font-medium">In-Clinic</div>
                      <div className="text-xs text-gray-500">Visit our clinic</div>
                    </div>
                    <div 
                      onClick={() => setBookingData({...bookingData, appointmentType: 'home'})}
                      className={`p-4 border rounded-lg cursor-pointer text-center ${
                        bookingData.appointmentType === 'home' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <Home className="w-8 h-8 mx-auto mb-2 text-green-600" />
                      <div className="font-medium">Home Visit</div>
                      <div className="text-xs text-gray-500">Doctor visits you</div>
                    </div>
                    <div 
                      onClick={() => setBookingData({...bookingData, appointmentType: 'video'})}
                      className={`p-4 border rounded-lg cursor-pointer text-center ${
                        bookingData.appointmentType === 'video' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <Video className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                      <div className="font-medium">Video Call</div>
                      <div className="text-xs text-gray-500">Online consultation</div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Select Doctor *</Label>
                  {doctorsLoading ? (
                    <div className="text-center py-4">Loading doctors...</div>
                  ) : (
                    <div className="grid gap-3 mt-2">
                      {doctors.map((doctor) => (
                        <div
                          key={doctor.id}
                          onClick={() => setBookingData({...bookingData, doctorId: doctor.id})}
                          className={`p-4 border rounded-lg cursor-pointer ${
                            bookingData.doctorId === doctor.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">Dr. {doctor.firstName} {doctor.lastName}</div>
                              <div className="text-sm text-gray-500">{doctor.phoneNumber}</div>
                              {doctor.specialization && (
                                <Badge variant="outline" className="mt-1">{doctor.specialization}</Badge>
                              )}
                            </div>
                            {doctor.isActive && (
                              <Badge className="bg-green-100 text-green-800">Available</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">Preferred Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={bookingData.preferredDate}
                      onChange={(e) => setBookingData({...bookingData, preferredDate: e.target.value})}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <Label htmlFor="time">Preferred Time *</Label>
                    <Input
                      id="time"
                      type="time"
                      value={bookingData.preferredTime}
                      onChange={(e) => setBookingData({...bookingData, preferredTime: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label>Urgency Level</Label>
                  <Select value={bookingData.urgency} onValueChange={(value) => setBookingData({...bookingData, urgency: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - Routine checkup</SelectItem>
                      <SelectItem value="normal">Normal - Standard appointment</SelectItem>
                      <SelectItem value="high">High - Need attention soon</SelectItem>
                      <SelectItem value="urgent">Urgent - Emergency situation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={bookingData.notes}
                    onChange={(e) => setBookingData({...bookingData, notes: e.target.value})}
                    placeholder="Any additional information for the doctor..."
                    rows={2}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-3">Patient Information</h3>
                  <div className="text-sm space-y-1">
                    <div><strong>Name:</strong> {bookingData.patientFirstName} {bookingData.patientLastName}</div>
                    <div><strong>Phone:</strong> {bookingData.patientPhone}</div>
                    {bookingData.patientEmail && <div><strong>Email:</strong> {bookingData.patientEmail}</div>}
                    {bookingData.dateOfBirth && <div><strong>Date of Birth:</strong> {bookingData.dateOfBirth}</div>}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-3">Appointment Details</h3>
                  <div className="text-sm space-y-1">
                    <div><strong>Type:</strong> {bookingData.appointmentType}</div>
                    <div><strong>Doctor:</strong> Dr. {doctors.find(d => d.id === bookingData.doctorId)?.firstName} {doctors.find(d => d.id === bookingData.doctorId)?.lastName}</div>
                    <div><strong>Preferred Date:</strong> {bookingData.preferredDate}</div>
                    <div><strong>Preferred Time:</strong> {bookingData.preferredTime}</div>
                    <div><strong>Urgency:</strong> {bookingData.urgency}</div>
                  </div>
                </div>

                {bookingData.symptoms && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium mb-2">Symptoms</h3>
                    <p className="text-sm">{bookingData.symptoms}</p>
                  </div>
                )}

                {bookingData.notes && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium mb-2">Additional Notes</h3>
                    <p className="text-sm">{bookingData.notes}</p>
                  </div>
                )}

                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Important:</strong> This is a request for an appointment. The clinic administration will review your request and contact you to confirm the appointment details.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-4 pt-4">
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
                  Previous
                </Button>
              )}
              {step < 3 ? (
                <Button onClick={handleNext} className="flex-1">
                  Next
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit} 
                  className="flex-1"
                  disabled={submitAppointment.isPending}
                >
                  {submitAppointment.isPending ? 'Submitting...' : 'Submit Request'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}