import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  ArrowLeft, Plus, Pill, Clock, Upload, Calendar, 
  Trash2, Edit, CheckCircle, XCircle, AlertCircle
} from "lucide-react";

interface CustomMedicine {
  id?: string;
  name: string;
  dosage: string;
  frequency: string;
  timings: string[];
  instructions: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'paused';
}

interface MedicineReminder {
  id: string;
  scheduledAt: string;
  isTaken: boolean;
  isSkipped: boolean;
  notes: string;
}

export default function MedicinesPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadText, setUploadText] = useState("");
  const [newMedicine, setNewMedicine] = useState<CustomMedicine>({
    name: "",
    dosage: "",
    frequency: "once_daily",
    timings: ["08:00"],
    instructions: "",
    startDate: new Date().toISOString().split('T')[0],
    endDate: "",
    status: "active"
  });

  // Fetch custom medicines
  const { data: customMedicines = [], isLoading: loadingCustom } = useQuery({
    queryKey: ['/api/custom-medicines'],
  });

  // Fetch reminders  
  const { data: reminders = [], isLoading: loadingReminders } = useQuery({
    queryKey: ['/api/reminders'],
  });

  // Add custom medicine mutation
  const addMedicineMutation = useMutation({
    mutationFn: async (medicine: CustomMedicine) => {
      const response = await apiRequest('POST', '/api/custom-medicines', medicine);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-medicines'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reminders'] });
      setIsAddDialogOpen(false);
      setNewMedicine({
        name: "", dosage: "", frequency: "once_daily", timings: ["08:00"],
        instructions: "", startDate: new Date().toISOString().split('T')[0],
        endDate: "", status: "active"
      });
      toast({ title: "Medicine Added", description: "Your custom medicine has been added successfully." });
    }
  });

  // Upload medicines mutation
  const uploadMedicinesMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await apiRequest('POST', '/api/medicines/upload', { medicineList: text });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-medicines'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reminders'] });
      setIsUploadDialogOpen(false);
      setUploadText("");
      toast({ title: "Medicines Uploaded", description: "Your medicine list has been processed successfully." });
    }
  });

  // Update reminder status
  const updateReminderMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'taken' | 'skipped' }) => {
      const response = await apiRequest('PUT', `/api/reminders/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reminders'] });
      toast({ title: "Reminder Updated", description: "Medicine reminder status updated." });
    }
  });

  const addTiming = () => {
    setNewMedicine(prev => ({
      ...prev,
      timings: [...prev.timings, "12:00"]
    }));
  };

  const removeTiming = (index: number) => {
    setNewMedicine(prev => ({
      ...prev,
      timings: prev.timings.filter((_, i) => i !== index)
    }));
  };

  const updateTiming = (index: number, time: string) => {
    setNewMedicine(prev => ({
      ...prev,
      timings: prev.timings.map((t, i) => i === index ? time : t)
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'completed': return 'bg-blue-500';
      case 'paused': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loadingCustom || loadingReminders) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => setLocation("/dashboard")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Pill className="w-6 h-6 text-blue-500" />
              <h1 className="text-xl font-semibold">Medicine Manager</h1>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Upload List
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Medicine List</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Paste your medicine list</Label>
                    <Textarea
                      placeholder="Example:
Aspirin 75mg - Once daily at 8:00 AM - Take with food
Metformin 500mg - Twice daily at 7:00 AM, 7:00 PM - Before meals
Lisinopril 10mg - Once daily at 9:00 PM - For blood pressure"
                      value={uploadText}
                      onChange={(e) => setUploadText(e.target.value)}
                      rows={8}
                    />
                  </div>
                  <Button 
                    onClick={() => uploadMedicinesMutation.mutate(uploadText)}
                    disabled={uploadMedicinesMutation.isPending || !uploadText.trim()}
                    className="w-full"
                  >
                    {uploadMedicinesMutation.isPending ? "Processing..." : "Upload Medicines"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Medicine
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Custom Medicine</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Medicine Name</Label>
                      <Input
                        value={newMedicine.name}
                        onChange={(e) => setNewMedicine(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Aspirin"
                      />
                    </div>
                    <div>
                      <Label>Dosage</Label>
                      <Input
                        value={newMedicine.dosage}
                        onChange={(e) => setNewMedicine(prev => ({ ...prev, dosage: e.target.value }))}
                        placeholder="e.g., 75mg, 1 tablet"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Frequency</Label>
                    <Select value={newMedicine.frequency} onValueChange={(value) => 
                      setNewMedicine(prev => ({ ...prev, frequency: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="once_daily">Once Daily</SelectItem>
                        <SelectItem value="twice_daily">Twice Daily</SelectItem>
                        <SelectItem value="three_times_daily">Three Times Daily</SelectItem>
                        <SelectItem value="four_times_daily">Four Times Daily</SelectItem>
                        <SelectItem value="as_needed">As Needed</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Timings</Label>
                    <div className="space-y-2">
                      {newMedicine.timings.map((time, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={time}
                            onChange={(e) => updateTiming(index, e.target.value)}
                            className="flex-1"
                          />
                          {newMedicine.timings.length > 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeTiming(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button variant="outline" onClick={addTiming} className="w-full">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Timing
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label>Instructions</Label>
                    <Textarea
                      value={newMedicine.instructions}
                      onChange={(e) => setNewMedicine(prev => ({ ...prev, instructions: e.target.value }))}
                      placeholder="e.g., Take with food, before meals, etc."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={newMedicine.startDate}
                        onChange={(e) => setNewMedicine(prev => ({ ...prev, startDate: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>End Date (Optional)</Label>
                      <Input
                        type="date"
                        value={newMedicine.endDate}
                        onChange={(e) => setNewMedicine(prev => ({ ...prev, endDate: e.target.value }))}
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={() => addMedicineMutation.mutate(newMedicine)}
                    disabled={addMedicineMutation.isPending || !newMedicine.name || !newMedicine.dosage}
                    className="w-full"
                  >
                    {addMedicineMutation.isPending ? "Adding..." : "Add Medicine"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        <Tabs defaultValue="medicines" className="space-y-6">
          <TabsList>
            <TabsTrigger value="medicines">My Medicines</TabsTrigger>
            <TabsTrigger value="reminders">Today's Reminders</TabsTrigger>
          </TabsList>

          <TabsContent value="medicines">
            <div className="grid gap-4">
              {customMedicines.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Pill className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No medicines added yet</h3>
                    <p className="text-gray-500 mb-4">Add your first medicine or upload a list to get started</p>
                    <div className="flex gap-2 justify-center">
                      <Button onClick={() => setIsAddDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Medicine
                      </Button>
                      <Button variant="outline" onClick={() => setIsUploadDialogOpen(true)}>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload List
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                customMedicines.map((medicine: CustomMedicine) => (
                  <Card key={medicine.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Pill className="w-5 h-5 text-blue-500" />
                          {medicine.name}
                        </CardTitle>
                        <Badge className={getStatusColor(medicine.status)}>
                          {medicine.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Dosage: <span className="font-medium">{medicine.dosage}</span></p>
                          <p className="text-sm text-gray-600">Frequency: <span className="font-medium">{medicine.frequency.replace('_', ' ')}</span></p>
                          <p className="text-sm text-gray-600">Instructions: <span className="font-medium">{medicine.instructions}</span></p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-2">Timings:</p>
                          <div className="flex flex-wrap gap-2">
                            {medicine.timings.map((time, index) => (
                              <Badge key={index} variant="outline" className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTime(time)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="reminders">
            <div className="grid gap-4">
              {reminders.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No reminders for today</h3>
                    <p className="text-gray-500">Add some medicines to see reminders here</p>
                  </CardContent>
                </Card>
              ) : (
                reminders.map((reminder: any) => (
                  <Card key={reminder.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            reminder.isTaken ? 'bg-green-500' : 
                            reminder.isSkipped ? 'bg-red-500' : 'bg-yellow-500'
                          }`} />
                          <div>
                            <h4 className="font-medium">{reminder.prescription?.medicine?.name}</h4>
                            <p className="text-sm text-gray-600">
                              {reminder.prescription?.dosage} - {formatTime(new Date(reminder.scheduledAt).toTimeString().split(' ')[0])}
                            </p>
                            {reminder.notes && (
                              <p className="text-sm text-gray-500">{reminder.notes}</p>
                            )}
                          </div>
                        </div>
                        
                        {!reminder.isTaken && !reminder.isSkipped && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => updateReminderMutation.mutate({ id: reminder.id, status: 'taken' })}
                              disabled={updateReminderMutation.isPending}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Taken
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateReminderMutation.mutate({ id: reminder.id, status: 'skipped' })}
                              disabled={updateReminderMutation.isPending}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Skip
                            </Button>
                          </div>
                        )}
                        
                        {reminder.isTaken && (
                          <Badge className="bg-green-500">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Taken
                          </Badge>
                        )}
                        
                        {reminder.isSkipped && (
                          <Badge variant="destructive">
                            <XCircle className="w-3 h-3 mr-1" />
                            Skipped
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}