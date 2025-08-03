import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertTriangle, Calendar, X } from "lucide-react";

interface CancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment?: any;
}

export default function CancelModal({ isOpen, onClose, appointment }: CancelModalProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");

  // Cancel appointment mutation
  const cancelMutation = useMutation({
    mutationFn: (data: { appointmentId: string; reason: string }) => 
      apiRequest('PUT', `/api/appointments/${data.appointmentId}/cancel`, { reason: data.reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      onClose();
      setReason("");
      toast({
        title: "Appointment Cancelled",
        description: "Your appointment has been cancelled successfully. You'll receive a confirmation SMS.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel appointment. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleCancel = () => {
    if (!appointment?.id) {
      toast({
        title: "No Appointment",
        description: "No appointment selected for cancellation.",
        variant: "destructive",
      });
      return;
    }

    cancelMutation.mutate({
      appointmentId: appointment.id,
      reason: reason.trim() || "No reason provided"
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Cancel Appointment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Appointment Details */}
          {appointment && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Appointment Details</h4>
              <div className="space-y-1 text-sm">
                <p><strong>Doctor:</strong> {appointment.doctor?.firstName} {appointment.doctor?.lastName}</p>
                <p><strong>Date:</strong> {new Date(appointment.appointmentDate).toLocaleDateString()}</p>
                <p><strong>Time:</strong> {new Date(appointment.appointmentDate).toLocaleTimeString()}</p>
                <p><strong>Type:</strong> {appointment.type?.replace('_', ' ')}</p>
              </div>
            </div>
          )}

          {/* Cancellation Reason */}
          <div>
            <Label htmlFor="reason">Reason for Cancellation (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="Please let us know why you're cancelling..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2"
              rows={3}
            />
          </div>

          {/* Warning */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-700">
                <p className="font-medium">Cancellation Policy</p>
                <p className="mt-1">Cancelling within 24 hours may incur a cancellation fee. Emergency cancellations are exempt.</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={cancelMutation.isPending}
              className="flex-1"
            >
              Keep Appointment
            </Button>
            <Button
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {cancelMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Cancelling...
                </>
              ) : (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Cancel Appointment
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}