"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { 
  Users, 
  Calendar, 
  Clock, 
  DollarSign, 
  Activity, 
  UserCheck, 
  UserX, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Eye,
  Edit,
  Settings,
  LogOut,
  BarChart3,
  AlertTriangle
} from "lucide-react"
import { format } from "date-fns"

interface DashboardStats {
  patientsToday: number;
  completedAppointments: number;
  revenue: number;
  activeStaff: number;
}

interface QueueToken {
  id: string;
  tokenNumber: number;
  status: string;
  estimatedWaitTime: number;
  priority: number;
  createdAt: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
  doctor: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface Appointment {
  id: string;
  appointmentDate: string;
  duration: number;
  type: string;
  status: string;
  symptoms?: string;
  notes?: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
  doctor: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  isActive: boolean;
  isApproved: boolean;
  createdAt: string;
}

export default function AdminDashboard() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedQueueToken, setSelectedQueueToken] = useState<QueueToken | null>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)

  // Check if user is admin
  const { data: currentUser } = useQuery({
    queryKey: ['/api/users/me'],
    queryFn: () => apiRequest('/api/users/me')
  })

  // Redirect if not admin
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      window.location.href = '/dashboard'
    }
  }, [currentUser])

  // Dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/admin/dashboard-stats'],
    queryFn: () => apiRequest('/api/admin/dashboard-stats'),
    refetchInterval: 30000 // Refresh every 30 seconds
  })

  // Queue management
  const { data: queueTokens, isLoading: queueLoading } = useQuery<QueueToken[]>({
    queryKey: ['/api/queue/admin'],
    queryFn: () => apiRequest('/api/queue/admin'),
    refetchInterval: 10000 // Refresh every 10 seconds
  })

  const updateQueueTokenMutation = useMutation({
    mutationFn: ({ tokenId, status }: { tokenId: string; status: string }) =>
      apiRequest(`/api/queue/${tokenId}/status`, { method: 'PUT', body: { status } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/queue/admin'] })
      toast({ title: "Queue token updated successfully" })
    },
    onError: () => {
      toast({ title: "Failed to update queue token", variant: "destructive" })
    }
  })

  // Appointments management
  const { data: appointments, isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ['/api/appointments/admin'],
    queryFn: () => apiRequest('/api/appointments/admin'),
    refetchInterval: 30000
  })

  const updateAppointmentMutation = useMutation({
    mutationFn: ({ appointmentId, status }: { appointmentId: string; status: string }) =>
      apiRequest(`/api/appointments/${appointmentId}/status`, { method: 'PUT', body: { status } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments/admin'] })
      toast({ title: "Appointment updated successfully" })
    },
    onError: () => {
      toast({ title: "Failed to update appointment", variant: "destructive" })
    }
  })

  // Patients management
  const { data: patients, isLoading: patientsLoading } = useQuery<Patient[]>({
    queryKey: ['/api/patients'],
    queryFn: () => apiRequest('/api/patients'),
    refetchInterval: 60000
  })

  const updatePatientApprovalMutation = useMutation({
    mutationFn: ({ userId, isApproved }: { userId: string; isApproved: boolean }) =>
      apiRequest(`/api/users/${userId}/approve`, { method: 'PUT', body: { isApproved } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] })
      toast({ title: "Patient approval updated successfully" })
    },
    onError: () => {
      toast({ title: "Failed to update patient approval", variant: "destructive" })
    }
  })

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'waiting': return 'bg-yellow-500'
      case 'called': return 'bg-blue-500'
      case 'completed': return 'bg-green-500'
      case 'cancelled': return 'bg-red-500'
      case 'confirmed': return 'bg-green-500'
      case 'scheduled': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    window.location.href = '/login'
  }

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400">You need admin privileges to access this page.</p>
          <Button onClick={() => window.location.href = '/dashboard'} className="mt-4">
            Return to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SmartClinic Admin</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Healthcare Management Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Patients Today</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsLoading ? '...' : stats?.patientsToday || 0}</div>
              <p className="text-xs text-muted-foreground">Scheduled appointments</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsLoading ? '...' : stats?.completedAppointments || 0}</div>
              <p className="text-xs text-muted-foreground">Today's completions</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${statsLoading ? '...' : stats?.revenue || 0}</div>
              <p className="text-xs text-muted-foreground">Today's earnings</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsLoading ? '...' : stats?.activeStaff || 0}</div>
              <p className="text-xs text-muted-foreground">Currently working</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="queue" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="queue">Queue Management</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="patients">Patients</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Queue Management Tab */}
          <TabsContent value="queue" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Current Queue Status</CardTitle>
                <CardDescription>Manage patient queue tokens and wait times</CardDescription>
              </CardHeader>
              <CardContent>
                {queueLoading ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Token #</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Doctor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Wait Time</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {queueTokens?.map((token) => (
                        <TableRow key={token.id}>
                          <TableCell className="font-medium">#{token.tokenNumber}</TableCell>
                          <TableCell>{token.patient.firstName} {token.patient.lastName}</TableCell>
                          <TableCell>{token.doctor.firstName} {token.doctor.lastName}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(token.status)}>
                              {token.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{token.estimatedWaitTime} min</TableCell>
                          <TableCell>
                            <Badge variant={token.priority === 1 ? "destructive" : "secondary"}>
                              {token.priority === 1 ? 'High' : 'Normal'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Select
                                value={token.status}
                                onValueChange={(status) => 
                                  updateQueueTokenMutation.mutate({ tokenId: token.id, status })
                                }
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="waiting">Waiting</SelectItem>
                                  <SelectItem value="called">Called</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Appointment Management</CardTitle>
                <CardDescription>View and manage all appointments</CardDescription>
              </CardHeader>
              <CardContent>
                {appointmentsLoading ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Doctor</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appointments?.map((appointment) => (
                        <TableRow key={appointment.id}>
                          <TableCell>
                            {format(new Date(appointment.appointmentDate), 'MMM dd, HH:mm')}
                          </TableCell>
                          <TableCell>{appointment.patient.firstName} {appointment.patient.lastName}</TableCell>
                          <TableCell>{appointment.doctor.firstName} {appointment.doctor.lastName}</TableCell>
                          <TableCell className="capitalize">{appointment.type}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(appointment.status)}>
                              {appointment.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{appointment.duration} min</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedAppointment(appointment)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Select
                                value={appointment.status}
                                onValueChange={(status) => 
                                  updateAppointmentMutation.mutate({ appointmentId: appointment.id, status })
                                }
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="scheduled">Scheduled</SelectItem>
                                  <SelectItem value="confirmed">Confirmed</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Patients Tab */}
          <TabsContent value="patients" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Patient Management</CardTitle>
                <CardDescription>View and manage patient accounts</CardDescription>
              </CardHeader>
              <CardContent>
                {patientsLoading ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {patients?.map((patient) => (
                        <TableRow key={patient.id}>
                          <TableCell className="font-medium">
                            {patient.firstName} {patient.lastName}
                          </TableCell>
                          <TableCell>{patient.phoneNumber}</TableCell>
                          <TableCell>{patient.email || 'N/A'}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Badge variant={patient.isActive ? "default" : "secondary"}>
                                {patient.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                              <Badge variant={patient.isApproved ? "default" : "destructive"}>
                                {patient.isApproved ? 'Approved' : 'Pending'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(patient.createdAt), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => 
                                  updatePatientApprovalMutation.mutate({ 
                                    userId: patient.id, 
                                    isApproved: !patient.isApproved 
                                  })
                                }
                              >
                                {patient.isApproved ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Overview</CardTitle>
                  <CardDescription>Key performance metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Total Patients</span>
                      <span className="text-2xl font-bold">{patients?.length || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Active Queue Tokens</span>
                      <span className="text-2xl font-bold">
                        {queueTokens?.filter(t => t.status === 'waiting' || t.status === 'called').length || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Today's Appointments</span>
                      <span className="text-2xl font-bold">{stats?.patientsToday || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Administrative shortcuts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button className="w-full justify-start" variant="outline">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Generate Report
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Settings className="h-4 w-4 mr-2" />
                      System Settings
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Users className="h-4 w-4 mr-2" />
                      Manage Staff
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Appointment Details Modal */}
      <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
            <DialogDescription>
              View complete appointment information
            </DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Patient</Label>
                <p className="text-sm">{selectedAppointment.patient.firstName} {selectedAppointment.patient.lastName}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Doctor</Label>
                <p className="text-sm">{selectedAppointment.doctor.firstName} {selectedAppointment.doctor.lastName}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Date & Time</Label>
                <p className="text-sm">{format(new Date(selectedAppointment.appointmentDate), 'MMMM dd, yyyy at HH:mm')}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Type & Duration</Label>
                <p className="text-sm capitalize">{selectedAppointment.type} - {selectedAppointment.duration} minutes</p>
              </div>
              {selectedAppointment.symptoms && (
                <div>
                  <Label className="text-sm font-medium">Symptoms</Label>
                  <p className="text-sm">{selectedAppointment.symptoms}</p>
                </div>
              )}
              {selectedAppointment.notes && (
                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-sm">{selectedAppointment.notes}</p>
                </div>
              )}
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <Badge className={getStatusColor(selectedAppointment.status)}>
                  {selectedAppointment.status}
                </Badge>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAppointment(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}