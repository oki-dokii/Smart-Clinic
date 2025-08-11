"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Phone, Mail, MessageSquare, MapPin, Clock, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface EmergencyRequest {
  id: string;
  patientId: string;
  doctorId?: string;
  clinicId: string;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  symptoms: string;
  contactMethod: 'phone' | 'email' | 'sms';
  location?: string;
  notes?: string;
  status: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string;
  };
  doctor?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

const urgencyStyles = {
  low: { badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', border: 'border-yellow-200' },
  medium: { badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300', border: 'border-orange-200' },
  high: { badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', border: 'border-red-200' },
  critical: { badge: 'bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100 font-bold', border: 'border-red-400' },
};

const contactIcons = {
  phone: <Phone className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  sms: <MessageSquare className="h-4 w-4" />,
};

export function EmergencyAlerts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: emergencyRequests = [], isLoading } = useQuery({
    queryKey: ['/api/emergency'],
    queryFn: async () => {
      const response = await apiRequest('/api/emergency');
      return response as EmergencyRequest[];
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest(`/api/emergency/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/emergency'] });
      toast({
        title: 'Status Updated',
        description: 'Emergency request status has been updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive',
      });
    },
  });

  const activeRequests = emergencyRequests.filter(req => 
    req.status === 'pending' || req.status === 'acknowledged' || req.status === 'in_progress'
  );

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  if (isLoading) {
    return (
      <Card data-testid="emergency-alerts-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Emergency Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="emergency-alerts">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="h-5 w-5" />
          Emergency Alerts
          {activeRequests.length > 0 && (
            <Badge variant="destructive" className="ml-auto">
              {activeRequests.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeRequests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground" data-testid="no-emergencies">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No active emergency requests</p>
          </div>
        ) : (
          activeRequests.map((request) => {
            const urgencyStyle = urgencyStyles[request.urgencyLevel];
            return (
              <Card
                key={request.id}
                className={`${urgencyStyle.border} shadow-sm`}
                data-testid={`emergency-${request.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium" data-testid="patient-name">
                          {request.patient.firstName} {request.patient.lastName}
                        </span>
                      </div>
                      <Badge className={urgencyStyle.badge} data-testid="urgency-badge">
                        {request.urgencyLevel.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span data-testid="time-ago">{formatTimeAgo(request.createdAt)}</span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div>
                      <p className="text-sm font-medium">Symptoms:</p>
                      <p className="text-sm text-muted-foreground" data-testid="symptoms">
                        {request.symptoms}
                      </p>
                    </div>
                    
                    {request.location && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Location:</p>
                          <p className="text-sm text-muted-foreground" data-testid="location">
                            {request.location}
                          </p>
                        </div>
                      </div>
                    )}

                    {request.notes && (
                      <div>
                        <p className="text-sm font-medium">Notes:</p>
                        <p className="text-sm text-muted-foreground" data-testid="notes">
                          {request.notes}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Contact:</span>
                      {contactIcons[request.contactMethod]}
                      <span className="text-sm text-muted-foreground" data-testid="contact-method">
                        {request.contactMethod === 'phone' ? request.patient.phoneNumber : 
                         request.contactMethod === 'email' ? request.patient.email : 
                         request.contactMethod}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {request.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'acknowledged' })}
                          disabled={updateStatusMutation.isPending}
                          data-testid="button-acknowledge"
                        >
                          Acknowledge
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'in_progress' })}
                          disabled={updateStatusMutation.isPending}
                          data-testid="button-in-progress"
                        >
                          Handle
                        </Button>
                      </>
                    )}
                    
                    {(request.status === 'acknowledged' || request.status === 'in_progress') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'resolved' })}
                        disabled={updateStatusMutation.isPending}
                        data-testid="button-resolve"
                      >
                        Mark Resolved
                      </Button>
                    )}

                    <Badge
                      variant={request.status === 'in_progress' ? 'default' : 'secondary'}
                      className="ml-auto"
                      data-testid="status-badge"
                    >
                      {request.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}