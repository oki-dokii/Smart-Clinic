"use client"

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Pill, User, Clock, Phone, Mail, MessageSquare, CheckCircle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface EmergencyRequest {
  id: string;
  patientId: string;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  symptoms: string;
  contactMethod: 'phone' | 'sms' | 'email';
  location?: string;
  status: 'pending' | 'acknowledged' | 'resolved';
  createdAt: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string;
  };
}

interface Medicine {
  id: string;
  name: string;
  stock: number;
  description: string;
  dosageForm: string;
  strength: string;
  manufacturer: string;
}

interface LowStockAlert {
  id: string;
  name: string;
  stock: number;
  threshold: number;
  description: string;
  dosageForm: string;
  strength: string;
}

interface UnifiedEmergencyAlertsProps {
  onTestAlerts?: () => void;
}

export function UnifiedEmergencyAlerts({ onTestAlerts }: UnifiedEmergencyAlertsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<EmergencyRequest | null>(null);
  const [responseNotes, setResponseNotes] = useState('');
  const [showResponseDialog, setShowResponseDialog] = useState(false);

  // Fetch emergency requests
  const { data: emergencyRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ['/api/emergency'],
    refetchInterval: 10000, // Refresh every 10 seconds for real-time updates
  });

  // Fetch medicines for low stock monitoring
  const { data: medicines = [], isLoading: medicinesLoading } = useQuery({
    queryKey: ['/api/medicines'],
    refetchInterval: 30000, // Refresh every 30 seconds to reduce fluctuation
  });

  // Calculate low stock alerts
  const lowStockAlerts: LowStockAlert[] = Array.isArray(medicines)
    ? (medicines as Medicine[])
        .filter((medicine: Medicine) => medicine.stock <= 10) // Default threshold of 10
        .map((medicine: Medicine) => ({
          id: medicine.id,
          name: medicine.name,
          stock: medicine.stock,
          threshold: 10,
          description: medicine.description,
          dosageForm: medicine.dosageForm,
          strength: medicine.strength,
        }))
    : [];

  // Acknowledge emergency request mutation
  const acknowledgeRequestMutation = useMutation({
    mutationFn: async ({ requestId, notes }: { requestId: string; notes: string }) => {
      const response = await apiRequest('PATCH', `/api/emergency/${requestId}`, {
        status: 'acknowledged',
        responseNotes: notes,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/emergency'] });
      setShowResponseDialog(false);
      setSelectedRequest(null);
      setResponseNotes('');
      toast({
        title: "Request Acknowledged",
        description: "Emergency request has been acknowledged successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Acknowledge Failed",
        description: error.message || "Failed to acknowledge emergency request",
        variant: "destructive",
      });
    },
  });

  // Resolve emergency request mutation
  const resolveRequestMutation = useMutation({
    mutationFn: async ({ requestId, notes }: { requestId: string; notes: string }) => {
      const response = await apiRequest('PATCH', `/api/emergency/${requestId}`, {
        status: 'resolved',
        responseNotes: notes,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/emergency'] });
      setShowResponseDialog(false);
      setSelectedRequest(null);
      setResponseNotes('');
      toast({
        title: "Request Resolved",
        description: "Emergency request has been marked as resolved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Resolve Failed",
        description: error.message || "Failed to resolve emergency request",
        variant: "destructive",
      });
    },
  });

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-red-100 text-red-800';
      case 'acknowledged': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAcknowledge = (request: EmergencyRequest) => {
    setSelectedRequest(request);
    setShowResponseDialog(true);
  };

  const handleSubmitResponse = (action: 'acknowledge' | 'resolve') => {
    if (!selectedRequest) return;

    if (action === 'acknowledge') {
      acknowledgeRequestMutation.mutate({
        requestId: selectedRequest.id,
        notes: responseNotes,
      });
    } else {
      resolveRequestMutation.mutate({
        requestId: selectedRequest.id,
        notes: responseNotes,
      });
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const pendingRequests = Array.isArray(emergencyRequests) 
    ? (emergencyRequests as EmergencyRequest[]).filter((req: EmergencyRequest) => req.status === 'pending')
    : [];
  const criticalLowStock = lowStockAlerts.filter(alert => alert.stock <= 5);
  const totalAlerts = pendingRequests.length + lowStockAlerts.length;

  if (requestsLoading || medicinesLoading) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Emergency Alerts
          </CardTitle>
          <p className="text-sm text-red-600 dark:text-red-400">Loading alerts...</p>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card className={`border-red-200 ${totalAlerts > 0 ? 'bg-red-50 dark:bg-red-950/20' : 'bg-gray-50 dark:bg-gray-800'}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className={`flex items-center gap-2 ${totalAlerts > 0 ? 'text-red-700 dark:text-red-300' : 'text-gray-600 dark:text-gray-300'}`}>
              <AlertTriangle className="w-5 h-5" />
              Emergency Alerts
            </CardTitle>
            {onTestAlerts && (
              <Button
                variant="outline"
                size="sm"
                onClick={onTestAlerts}
                className="text-xs border-red-300 text-red-600 hover:bg-red-100"
              >
                Test Alerts
              </Button>
            )}
          </div>
          <p className={`text-sm ${totalAlerts > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
            {totalAlerts > 0 ? 'Urgent notifications requiring immediate attention' : 'No active emergency alerts at this time.'}
          </p>
        </CardHeader>
        
        <CardContent>
          {totalAlerts === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-3">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">All Clear!</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">No emergency alerts at this time.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Patient Emergency Requests */}
              {pendingRequests.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2 flex items-center gap-1">
                    <User className="w-4 h-4" />
                    Patient Emergency Requests ({pendingRequests.length})
                  </h4>
                  <div className="space-y-2">
                    {pendingRequests.map((request: EmergencyRequest) => (
                      <div key={request.id} className="border border-red-200 rounded-lg p-3 bg-white dark:bg-gray-800">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge className={getUrgencyColor(request.urgencyLevel)}>
                              {request.urgencyLevel.toUpperCase()}
                            </Badge>
                            <Badge className={getStatusColor(request.status)}>
                              {request.status}
                            </Badge>
                          </div>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimeAgo(request.createdAt)}
                          </span>
                        </div>
                        
                        <div className="mb-2">
                          <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                            {request.patient.firstName} {request.patient.lastName}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {request.patient.phoneNumber}
                          </p>
                        </div>
                        
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                          <strong>Symptoms:</strong> {request.symptoms}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            {request.contactMethod === 'phone' && <Phone className="w-3 h-3" />}
                            {request.contactMethod === 'email' && <Mail className="w-3 h-3" />}
                            {request.contactMethod === 'sms' && <MessageSquare className="w-3 h-3" />}
                            Contact via {request.contactMethod}
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAcknowledge(request)}
                              className="text-xs"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Respond
                            </Button>
                          </div>
                        </div>
                        
                        {request.location && (
                          <p className="text-xs text-gray-500 mt-1">
                            <strong>Location:</strong> {request.location}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Medicine Low Stock Alerts */}
              {lowStockAlerts.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-orange-700 dark:text-orange-300 mb-2 flex items-center gap-1">
                    <Pill className="w-4 h-4" />
                    Low Stock Medicines ({lowStockAlerts.length})
                  </h4>
                  <div className="space-y-2">
                    {lowStockAlerts.map((alert: LowStockAlert) => (
                      <div key={alert.id} className="border border-orange-200 rounded-lg p-3 bg-orange-50 dark:bg-orange-950/20">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                            {alert.name}
                          </p>
                          <Badge className={alert.stock <= 5 ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'}>
                            {alert.stock} left
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                          {alert.strength} • {alert.dosageForm}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {alert.description}
                        </p>
                        {alert.stock <= 5 && (
                          <div className="mt-2">
                            <Badge className="bg-red-600 text-white text-xs">
                              CRITICAL - Reorder immediately
                            </Badge>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Response Dialog */}
      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Respond to Emergency Request
            </DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                <p className="font-medium text-sm mb-1">
                  {selectedRequest.patient.firstName} {selectedRequest.patient.lastName}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  {selectedRequest.patient.phoneNumber} • {selectedRequest.patient.email}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Symptoms:</strong> {selectedRequest.symptoms}
                </p>
                <div className="flex gap-2 mt-2">
                  <Badge className={getUrgencyColor(selectedRequest.urgencyLevel)}>
                    {selectedRequest.urgencyLevel.toUpperCase()}
                  </Badge>
                  <Badge className={getStatusColor(selectedRequest.status)}>
                    {selectedRequest.status}
                  </Badge>
                </div>
              </div>
              
              <div>
                <Label htmlFor="response-notes">Response Notes</Label>
                <Textarea
                  id="response-notes"
                  placeholder="Enter response notes, instructions, or next steps..."
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => handleSubmitResponse('acknowledge')}
                  disabled={acknowledgeRequestMutation.isPending}
                  className="flex-1"
                >
                  {acknowledgeRequestMutation.isPending ? 'Acknowledging...' : 'Acknowledge'}
                </Button>
                <Button
                  onClick={() => handleSubmitResponse('resolve')}
                  disabled={resolveRequestMutation.isPending}
                  variant="outline"
                  className="flex-1"
                >
                  {resolveRequestMutation.isPending ? 'Resolving...' : 'Mark Resolved'}
                </Button>
              </div>
              
              <Button
                variant="ghost"
                onClick={() => {
                  setShowResponseDialog(false);
                  setSelectedRequest(null);
                  setResponseNotes('');
                }}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}