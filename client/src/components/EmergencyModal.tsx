"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Phone } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

const emergencySchema = z.object({
  urgencyLevel: z.enum(['low', 'medium', 'high', 'critical']),
  symptoms: z.string().min(1, 'Please describe your symptoms'),
  contactMethod: z.enum(['phone', 'email', 'sms']),
  location: z.string().optional(),
  notes: z.string().optional(),
});

type EmergencyFormData = z.infer<typeof emergencySchema>;

interface EmergencyModalProps {
  patientId: string;
  trigger?: React.ReactNode;
  onClose?: () => void;
}

export function EmergencyModal({ patientId, trigger, onClose }: EmergencyModalProps) {
  const [isOpen, setIsOpen] = useState(true); // Auto-open modal when rendered
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<EmergencyFormData>({
    resolver: zodResolver(emergencySchema),
    defaultValues: {
      urgencyLevel: 'medium',
      contactMethod: 'phone',
      symptoms: '',
      location: '',
      notes: '',
    },
  });

  const emergencyMutation = useMutation({
    mutationFn: async (data: EmergencyFormData) => {
      const response = await fetch('/api/emergency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          ...data,
          patientId,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send emergency request');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Emergency Request Sent',
        description: 'Your emergency request has been sent to the medical staff. They will contact you shortly.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/emergency-requests'] });
      setIsOpen(false);
      onClose?.();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send emergency request',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: EmergencyFormData) => {
    emergencyMutation.mutate(data);
  };

  const urgencyColors = {
    low: 'text-yellow-600',
    medium: 'text-orange-600',
    high: 'text-red-600',
    critical: 'text-red-800 font-bold',
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      onClose?.();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="destructive"
            size="sm"
            className="bg-red-600 hover:bg-red-700"
            data-testid="button-emergency"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Emergency
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Emergency Request
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="urgencyLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Urgency Level</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-urgency">
                        <SelectValue placeholder="Select urgency level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">
                        <span className="text-yellow-600">Low - Non-urgent concern</span>
                      </SelectItem>
                      <SelectItem value="medium">
                        <span className="text-orange-600">Medium - Needs attention</span>
                      </SelectItem>
                      <SelectItem value="high">
                        <span className="text-red-600">High - Urgent medical issue</span>
                      </SelectItem>
                      <SelectItem value="critical">
                        <span className="text-red-800 font-bold">Critical - Life threatening</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="symptoms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Symptoms/Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Describe your symptoms or emergency situation..."
                      className="min-h-[80px]"
                      data-testid="input-symptoms"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Contact Method</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-contact">
                        <SelectValue placeholder="How should we contact you?" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="phone">
                        <span className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Phone Call
                        </span>
                      </SelectItem>
                      <SelectItem value="sms">SMS/Text Message</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Location (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Your current address or location"
                      data-testid="input-location"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Any additional information..."
                      className="min-h-[60px]"
                      data-testid="input-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={emergencyMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
                data-testid="button-submit-emergency"
              >
                {emergencyMutation.isPending ? 'Sending...' : 'Send Emergency Request'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}