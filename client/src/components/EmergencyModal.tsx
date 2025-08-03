import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  AlertTriangle, Phone, User, Clock, 
  Stethoscope, Ambulance, Car, Video
} from "lucide-react";

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  address: string;
}

interface EmergencyData {
  doctorId: string;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  symptoms: string;
  contactMethod: 'call_doctor' | 'ambulance' | 'home_visit' | 'video_call';
  location: string;
  notes: string;
}

export default function EmergencyModal({ isOpen, onClose }: EmergencyModalProps) {
  const { toast } = useToast();
  const [emergencyData, setEmergencyData] = useState<EmergencyData>({
    doctorId: "",
    urgencyLevel: "medium",
    symptoms: "",
    contactMethod: "call_doctor",
    location: "",
    notes: ""
  });

  // Fetch available doctors
  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['/api/users', 'doctor'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/users?role=doctor');
      return response.json();
    },
    enabled: isOpen,
  });

  // Emergency request mutation
  const emergencyMutation = useMutation({
    mutationFn: (emergency: EmergencyData) => apiRequest("POST", "/api/emergency", emergency),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      onClose();
      resetForm();
      toast({
        title: "Emergency Request Sent",
        description: "Your emergency request has been submitted. A doctor will contact you immediately.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Emergency Request Failed",
        description: error.message || "Failed to send emergency request. Please call emergency services.",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setEmergencyData({
      doctorId: "",
      urgencyLevel: "medium",
      symptoms: "",
      contactMethod: "call_doctor",
      location: "",
      notes: ""
    });
  };

  const handleSubmit = () => {
    if (!emergencyData.symptoms.trim()) {
      toast({
        title: "Missing Information",
        description: "Please describe your symptoms or emergency situation.",
        variant: "destructive",
      });
      return;
    }

    if (emergencyData.contactMethod !== 'ambulance' && !emergencyData.doctorId) {
      toast({
        title: "Doctor Required",
        description: "Please select a doctor for your emergency request.",
        variant: "destructive",
      });
      return;
    }

    emergencyMutation.mutate(emergencyData);
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getContactMethodIcon = (method: string) => {
    switch (method) {
      case 'call_doctor': return <Phone className="w-4 h-4" />;
      case 'ambulance': return <Ambulance className="w-4 h-4" />;
      case 'home_visit': return <Car className="w-4 h-4" />;
      case 'video_call': return <Video className="w-4 h-4" />;
      default: return <Phone className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-6 h-6" />
            Emergency Medical Request
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Emergency Notice */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-800">Emergency Notice</h3>
                <p className="text-sm text-red-600 mt-1">
                  If this is a life-threatening emergency, call emergency services (911) immediately.
                  This form is for urgent medical consultations with available doctors.
                </p>
              </div>
            </div>
          </div>

          {/* Urgency Level */}
          <div>
            <Label className="text-base font-medium">Urgency Level</Label>
            <Select 
              value={emergencyData.urgencyLevel} 
              onValueChange={(value: any) => setEmergencyData(prev => ({ ...prev, urgencyLevel: value }))}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select urgency level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">Low</Badge>
                    <span>Can wait a few hours</span>
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Medium</Badge>
                    <span>Need attention within 1 hour</span>
                  </div>
                </SelectItem>
                <SelectItem value="high">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">High</Badge>
                    <span>Need immediate attention</span>
                  </div>
                </SelectItem>
                <SelectItem value="critical">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-red-100 text-red-800">Critical</Badge>
                    <span>Life-threatening situation</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Contact Method */}
          <div>
            <Label className="text-base font-medium">How would you like to be contacted?</Label>
            <Select 
              value={emergencyData.contactMethod} 
              onValueChange={(value: any) => setEmergencyData(prev => ({ ...prev, contactMethod: value }))}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select contact method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="call_doctor">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>Doctor will call me</span>
                  </div>
                </SelectItem>
                <SelectItem value="video_call">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    <span>Video consultation</span>
                  </div>
                </SelectItem>
                <SelectItem value="home_visit">
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    <span>Doctor home visit</span>
                  </div>
                </SelectItem>
                <SelectItem value="ambulance">
                  <div className="flex items-center gap-2">
                    <Ambulance className="w-4 h-4" />
                    <span>Send ambulance</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Doctor Selection (hidden for ambulance) */}
          {emergencyData.contactMethod !== 'ambulance' && (
            <div>
              <Label className="text-base font-medium">Choose Doctor</Label>
              <Select 
                value={emergencyData.doctorId} 
                onValueChange={(value) => setEmergencyData(prev => ({ ...prev, doctorId: value }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select a doctor" />
                </SelectTrigger>
                <SelectContent>
                  {isLoading ? (
                    <SelectItem value="loading" disabled>Loading doctors...</SelectItem>
                  ) : doctors.length === 0 ? (
                    <SelectItem value="none" disabled>No doctors available</SelectItem>
                  ) : (
                    doctors.map((doctor: Doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        <div className="flex items-center gap-2">
                          <Stethoscope className="w-4 h-4" />
                          <span>{doctor.firstName} {doctor.lastName}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Symptoms */}
          <div>
            <Label htmlFor="symptoms" className="text-base font-medium">
              Describe your symptoms or emergency situation *
            </Label>
            <Textarea
              id="symptoms"
              placeholder="Please describe what's happening, when it started, and any relevant details..."
              value={emergencyData.symptoms}
              onChange={(e) => setEmergencyData(prev => ({ ...prev, symptoms: e.target.value }))}
              className="mt-2 min-h-[100px]"
            />
          </div>

          {/* Location (for home visit or ambulance) */}
          {(emergencyData.contactMethod === 'home_visit' || emergencyData.contactMethod === 'ambulance') && (
            <div>
              <Label htmlFor="location" className="text-base font-medium">
                Current Location *
              </Label>
              <Input
                id="location"
                placeholder="Enter your current address or location"
                value={emergencyData.location}
                onChange={(e) => setEmergencyData(prev => ({ ...prev, location: e.target.value }))}
                className="mt-2"
              />
            </div>
          )}

          {/* Additional Notes */}
          <div>
            <Label htmlFor="notes" className="text-base font-medium">Additional Information</Label>
            <Textarea
              id="notes"
              placeholder="Any other relevant medical information, medications, allergies, etc."
              value={emergencyData.notes}
              onChange={(e) => setEmergencyData(prev => ({ ...prev, notes: e.target.value }))}
              className="mt-2"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={emergencyMutation.isPending}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {emergencyMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending Request...
                </>
              ) : (
                <>
                  {getContactMethodIcon(emergencyData.contactMethod)}
                  <span className="ml-2">Send Emergency Request</span>
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={emergencyMutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}