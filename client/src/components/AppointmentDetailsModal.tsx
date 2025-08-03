import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Stethoscope, FileText, Phone } from "lucide-react";

interface AppointmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: any;
}

export default function AppointmentDetailsModal({ isOpen, onClose, appointment }: AppointmentDetailsModalProps) {
  if (!appointment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            Appointment Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Doctor Information */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Stethoscope className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold">Dr. {appointment.doctor.firstName} {appointment.doctor.lastName}</p>
              <p className="text-sm text-gray-600">{appointment.doctor.email}</p>
            </div>
          </div>

          {/* Appointment Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm">
                {new Date(appointment.appointmentDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-sm">
                {new Date(appointment.appointmentDate).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="text-sm">{appointment.location || "Clinic"}</span>
            </div>

            <div className="flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-800 capitalize">
                {appointment.type.replace('_', ' ')}
              </Badge>
              <Badge className="bg-green-100 text-green-800 capitalize">
                {appointment.status}
              </Badge>
            </div>

            {appointment.symptoms && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium">Symptoms</span>
                </div>
                <p className="text-sm text-gray-600 ml-6">{appointment.symptoms}</p>
              </div>
            )}

            {appointment.notes && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium">Notes</span>
                </div>
                <p className="text-sm text-gray-600 ml-6">{appointment.notes}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Close
            </Button>
            <Button className="bg-green-500 hover:bg-green-600">
              <Phone className="w-4 h-4 mr-2" />
              Call Doctor
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}