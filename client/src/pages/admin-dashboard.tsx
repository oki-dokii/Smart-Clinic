"use client"

import { useState, useEffect } from "react"
import {
  Bell,
  Calendar,
  Clock,
  Users,
  DollarSign,
  AlertTriangle,
  Activity,
  UserPlus,
  FileText,
  LogOut,
  Settings,
  BarChart3,
  Stethoscope,
  User,
  TrendingUp,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"

interface User {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  phoneNumber: string;
  email?: string;
  isActive: boolean;
  isApproved: boolean;
  createdAt: string;
}

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
  createdAt: string;
  patient: User;
  doctor: User;
}

interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentDate: string;
  appointmentTime: string;
  consultationType: string;
  symptoms: string;
  status: string;
  patient: User;
  doctor: User;
}

interface Medicine {
  id: string;
  name: string;
  description: string;
  dosageForm: string;
  strength: string;
  manufacturer: string;
  stock: number;
}

interface StaffMember extends User {
  specialization?: string;
  department?: string;
  lastCheckIn?: string;
  isPresent: boolean;
}

export default function ClinicDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [reportData, setReportData] = useState<any>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Check if user is admin
  const { data: currentUser } = useQuery<User>({
    queryKey: ['/api/users/me']
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
    refetchInterval: 30000
  })

  // Queue data
  const { data: queueTokens, isLoading: queueLoading } = useQuery<QueueToken[]>({
    queryKey: ['/api/queue/admin'],
    refetchInterval: 10000
  })

  // Appointments data
  const { data: appointments, isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ['/api/appointments/admin'],
    refetchInterval: 30000
  })

  // Patients data
  const { data: patients, isLoading: patientsLoading } = useQuery<User[]>({
    queryKey: ['/api/patients'],
    refetchInterval: 60000
  })

  // Staff data
  const { data: staffMembers, isLoading: staffLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
    queryFn: () => fetch('/api/users?role=staff,doctor', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
    }).then(res => res.json()),
    refetchInterval: 60000
  })

  // Medicines/Inventory data
  const { data: medicines, isLoading: medicinesLoading } = useQuery<Medicine[]>({
    queryKey: ['/api/medicines'],
    refetchInterval: 300000 // 5 minutes
  })

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    window.location.href = '/login'
  }

  // Mutation for updating queue token status
  const updateQueueStatus = useMutation({
    mutationFn: async ({ tokenId, status }: { tokenId: string; status: string }) => {
      return await apiRequest('PUT', `/api/queue/${tokenId}/status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/queue/admin'] })
      toast({ title: 'Success', description: 'Queue status updated successfully' })
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  })

  // Mutation for approving users
  const approveUser = useMutation({
    mutationFn: async ({ userId, isApproved }: { userId: string; isApproved: boolean }) => {
      return await apiRequest('PUT', `/api/users/${userId}/approve`, { isApproved })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] })
      toast({ title: 'Success', description: 'User approval status updated' })
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  })

  // Additional mutations for comprehensive admin functionality
  const updateUserStatus = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: 'activate' | 'deactivate' }) => {
      return await apiRequest('PUT', `/api/users/${userId}/${action}`, {})
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] })
      toast({ title: 'Success', description: 'User status updated successfully' })
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  })

  const updateAppointmentStatus = useMutation({
    mutationFn: async ({ appointmentId, status }: { appointmentId: string; status: string }) => {
      return await apiRequest('PUT', `/api/appointments/${appointmentId}/status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments/admin'] })
      toast({ title: 'Success', description: 'Appointment status updated successfully' })
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  })

  const generateReport = useMutation({
    mutationFn: async () => {
      return await apiRequest('GET', '/api/reports/daily', {})
    },
    onSuccess: (data) => {
      setReportData(data)
      toast({ title: 'Success', description: 'Daily report generated successfully' })
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  })

  // Handle queue actions
  const handleCallNext = (tokenId: string) => {
    updateQueueStatus.mutate({ tokenId, status: 'in_progress' })
  }

  const handleApproveUser = (userId: string) => {
    approveUser.mutate({ userId, isApproved: true })
  }

  // Additional handler functions for new functionality
  const handleActivateUser = (userId: string) => {
    updateUserStatus.mutate({ userId, action: 'activate' })
  }

  const handleDeactivateUser = (userId: string) => {
    updateUserStatus.mutate({ userId, action: 'deactivate' })
  }

  const handleUpdateAppointment = (appointmentId: string, status: string) => {
    updateAppointmentStatus.mutate({ appointmentId, status })
  }

  const handleGenerateReport = () => {
    generateReport.mutate()
  }

  if (currentUser && currentUser.role !== 'admin') {
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">SmartClinic Medical Center</h1>
                <p className="text-sm text-gray-500">Healthcare Management System</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{formatTime(currentTime)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{statsLoading ? '...' : (stats?.patientsToday || 0)} Patients Today</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Bell className="w-5 h-5 text-gray-600" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-medium">1</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {currentUser?.firstName} {currentUser?.lastName}
                </span>
                <Badge className="bg-blue-600 text-white text-xs px-2 py-1">Admin</Badge>
              </div>

              <Settings className="w-5 h-5 text-gray-600 cursor-pointer" />
              <LogOut className="w-5 h-5 text-gray-600 cursor-pointer" onClick={handleLogout} />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6">
          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="grid w-full grid-cols-7 bg-transparent border-0 h-auto p-0">
              <TabsTrigger
                value="dashboard"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none py-4 px-6"
              >
                Dashboard
              </TabsTrigger>
              <TabsTrigger
                value="queue"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none py-4 px-6"
              >
                Patient Queue
              </TabsTrigger>
              <TabsTrigger
                value="appointments"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none py-4 px-6"
              >
                Appointments
              </TabsTrigger>
              <TabsTrigger
                value="records"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none py-4 px-6"
              >
                Patient Records
              </TabsTrigger>
              <TabsTrigger
                value="inventory"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none py-4 px-6"
              >
                Inventory
              </TabsTrigger>
              <TabsTrigger
                value="staff"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none py-4 px-6"
              >
                Staff
              </TabsTrigger>
              <TabsTrigger
                value="reports"
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none py-4 px-6"
              >
                Reports
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="mt-0">
              <main className="p-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {/* Patients Today */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-500" />
                        Patients Today
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-3xl font-bold">{statsLoading ? '...' : (stats?.patientsToday || 24)}</span>
                        <Badge className="bg-blue-100 text-blue-800 text-xs flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          +12.94%
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">8 completed, 16 pending</p>
                    </CardContent>
                  </Card>

                  {/* Queue Length */}
                  <Card className="border-orange-200 bg-orange-50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-orange-500" />
                        Queue Length
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-3xl font-bold">6</span>
                        <Badge className="bg-red-500 text-white text-xs">Urgent</Badge>
                      </div>
                      <p className="text-sm text-gray-600">Current waiting patients</p>
                    </CardContent>
                  </Card>

                  {/* Revenue Today */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-500" />
                        Revenue Today
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-3xl font-bold">${statsLoading ? '...' : (stats?.revenue || 2450)}</span>
                        <Badge className="bg-green-100 text-green-800 text-xs flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          +5.8%
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">18 consultations completed</p>
                    </CardContent>
                  </Card>

                  {/* Staff Present */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-purple-500" />
                        Staff Present
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-3xl font-bold">{statsLoading ? '...' : (stats?.activeStaff || 12)}/15</span>
                      </div>
                      <p className="text-sm text-gray-600">3 doctors, 8 nurses, 3 admin</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Emergency Alerts */}
                  <Card className="border-red-200 bg-red-50">
                    <CardHeader>
                      <CardTitle className="text-red-700 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Emergency Alerts
                      </CardTitle>
                      <p className="text-sm text-red-600">Urgent notifications requiring immediate attention</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span className="text-sm font-medium">Patient in Room 3 needs immediate attention</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">2 min ago</span>
                            <Button size="sm" variant="outline" className="text-xs bg-transparent">
                              Resolve
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            <span className="text-sm font-medium">Low stock: Paracetamol (5 units left)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">15 min ago</span>
                            <Button size="sm" variant="outline" className="text-xs bg-transparent">
                              Resolve
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-sm font-medium">Dr. Johnson's next appointment is delayed</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">30 min ago</span>
                            <Button size="sm" variant="outline" className="text-xs bg-transparent">
                              Resolve
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-blue-500" />
                        Quick Actions
                      </CardTitle>
                      <p className="text-sm text-gray-600">Common administrative tasks</p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <Button className="h-20 flex-col gap-2 bg-blue-600 hover:bg-blue-700">
                          <UserPlus className="w-6 h-6" />
                          <span>Add Patient</span>
                        </Button>
                        <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent">
                          <Calendar className="w-6 h-6" />
                          <span>Schedule</span>
                        </Button>
                        <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent">
                          <FileText className="w-6 h-6" />
                          <span>Prescriptions</span>
                        </Button>
                        <Button variant="outline" className="h-20 flex-col gap-2 bg-transparent">
                          <LogOut className="w-6 h-6" />
                          <span>Discharge</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Department Status */}
                <Card className="mt-8">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-blue-500" />
                      Department Status
                    </CardTitle>
                    <p className="text-sm text-gray-600">Current patient load by department</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Emergency */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Emergency</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">3/5 patients</span>
                            <Badge className="bg-green-100 text-green-800 text-xs">Low</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={60} className="flex-1 h-2" />
                          <span className="text-sm text-gray-500">60% capacity</span>
                        </div>
                      </div>

                      {/* General */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">General</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">8/10 patients</span>
                            <Badge className="bg-yellow-100 text-yellow-800 text-xs">Medium</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={80} className="flex-1 h-2" />
                          <span className="text-sm text-gray-500">80% capacity</span>
                        </div>
                      </div>

                      {/* Pediatrics */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Pediatrics</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">4/6 patients</span>
                            <Badge className="bg-yellow-100 text-yellow-800 text-xs">Medium</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={67} className="flex-1 h-2" />
                          <span className="text-sm text-gray-500">67% capacity</span>
                        </div>
                      </div>

                      {/* Cardiology */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Cardiology</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">2/4 patients</span>
                            <Badge className="bg-green-100 text-green-800 text-xs">Low</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={50} className="flex-1 h-2" />
                          <span className="text-sm text-gray-500">50% capacity</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </main>
            </TabsContent>

            <TabsContent value="queue">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">Patient Queue Management</h2>
                    <p className="text-gray-600">Monitor and manage patient queues across all doctors</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-800">
                      Live Updates
                    </Badge>
                    <span className="text-sm text-gray-500">
                      Updated {new Date().toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {queueLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {queueTokens && queueTokens.length > 0 ? (
                      queueTokens.map((token) => (
                        <Card key={token.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <span className="text-lg font-bold text-blue-600">#{token.tokenNumber}</span>
                              </div>
                              <div>
                                <h3 className="font-semibold">
                                  {token.patient.firstName} {token.patient.lastName}
                                </h3>
                                <p className="text-sm text-gray-600">
                                  Dr. {token.doctor.firstName} {token.doctor.lastName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Joined: {new Date(token.createdAt).toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <Badge className={
                                  token.status === 'waiting' ? 'bg-yellow-100 text-yellow-800' :
                                  token.status === 'in_progress' ? 'bg-green-100 text-green-800' :
                                  token.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }>
                                  {token.status}
                                </Badge>
                                <p className="text-sm text-gray-600 mt-1">
                                  Est. wait: {token.estimatedWaitTime || 15} min
                                </p>
                              </div>
                              <div className="flex gap-2">
                                {token.status === 'waiting' && (
                                  <Button 
                                    size="sm" 
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => handleCallNext(token.id)}
                                    disabled={updateQueueStatus.isPending}
                                    data-testid={`button-call-next-${token.id}`}
                                  >
                                    {updateQueueStatus.isPending ? 'Calling...' : 'Call Next'}
                                  </Button>
                                )}
                                {token.status === 'in_progress' && (
                                  <Button 
                                    size="sm" 
                                    className="bg-blue-600 hover:bg-blue-700"
                                    onClick={() => updateQueueStatus.mutate({ tokenId: token.id, status: 'completed' })}
                                    disabled={updateQueueStatus.isPending}
                                    data-testid={`button-complete-${token.id}`}
                                  >
                                    {updateQueueStatus.isPending ? 'Completing...' : 'Complete'}
                                  </Button>
                                )}
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => toast({ title: 'Queue Details', description: `Token #${token.tokenNumber} - ${token.patient.firstName} ${token.patient.lastName}` })}
                                  data-testid={`button-view-details-${token.id}`}
                                >
                                  View Details
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))
                    ) : (
                      <Card className="p-8 text-center">
                        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Queue</h3>
                        <p className="text-gray-600">No patients are currently waiting in the queue.</p>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="appointments">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">Appointments Management</h2>
                    <p className="text-gray-600">View and manage all scheduled appointments</p>
                  </div>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => toast({ title: 'Feature Coming Soon', description: 'New appointment booking will be available soon' })}
                    data-testid="button-new-appointment"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    New Appointment
                  </Button>
                </div>

                {appointmentsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse"></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {appointments && appointments.length > 0 ? (
                      appointments.map((appointment) => (
                        <Card key={appointment.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <Calendar className="w-6 h-6 text-green-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold">
                                  {appointment.patient.firstName} {appointment.patient.lastName}
                                </h3>
                                <p className="text-sm text-gray-600">
                                  Dr. {appointment.doctor.firstName} {appointment.doctor.lastName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(appointment.appointmentDate).toLocaleDateString()} at {new Date(appointment.appointmentDate).toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <Badge className={
                                  appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                                  appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }>
                                  {appointment.status}
                                </Badge>
                                <p className="text-sm text-gray-600 mt-1">
                                  {appointment.type || 'Consultation'}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => toast({ title: 'Reschedule Appointment', description: `Rescheduling appointment for ${appointment.patient.firstName} ${appointment.patient.lastName}` })}
                                  data-testid={`button-reschedule-${appointment.id}`}
                                >
                                  Reschedule
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => toast({ title: 'Appointment Details', description: `Viewing details for appointment with ${appointment.patient.firstName} ${appointment.patient.lastName}` })}
                                  data-testid={`button-view-details-${appointment.id}`}
                                >
                                  View Details
                                </Button>
                                {appointment.status === 'scheduled' && (
                                  <Button 
                                    size="sm" 
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => handleUpdateAppointment(appointment.id, 'completed')}
                                    disabled={updateAppointmentStatus.isPending}
                                    data-testid={`button-complete-appointment-${appointment.id}`}
                                  >
                                    {updateAppointmentStatus.isPending ? 'Completing...' : 'Mark Complete'}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))
                    ) : (
                      <Card className="p-8 text-center">
                        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Appointments Today</h3>
                        <p className="text-gray-600">No appointments are scheduled for today.</p>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="records">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">Patient Records</h2>
                    <p className="text-gray-600">View and manage all patient records</p>
                  </div>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => toast({ title: 'Feature Coming Soon', description: 'Add patient functionality will be available soon' })}
                    data-testid="button-add-patient"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Patient
                  </Button>
                </div>

                {patientsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {patients && patients.length > 0 ? (
                      patients.map((patient) => (
                        <Card key={patient.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                <User className="w-6 h-6 text-purple-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold">
                                  {patient.firstName} {patient.lastName}
                                </h3>
                                <p className="text-sm text-gray-600">
                                  {patient.phoneNumber}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Registered: {new Date(patient.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <Badge className={
                                  patient.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }>
                                  {patient.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                                {!patient.isApproved && (
                                  <Badge className="bg-yellow-100 text-yellow-800 ml-2">
                                    Pending Approval
                                  </Badge>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => toast({ title: 'Patient History', description: `Viewing medical history for ${patient.firstName} ${patient.lastName}` })}
                                  data-testid={`button-view-history-${patient.id}`}
                                >
                                  View History
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => toast({ title: 'Edit Patient', description: `Editing profile for ${patient.firstName} ${patient.lastName}` })}
                                  data-testid={`button-edit-profile-${patient.id}`}
                                >
                                  Edit Profile
                                </Button>
                                {!patient.isApproved && (
                                  <Button 
                                    size="sm" 
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => handleApproveUser(patient.id)}
                                    disabled={approveUser.isPending}
                                    data-testid={`button-approve-${patient.id}`}
                                  >
                                    {approveUser.isPending ? 'Approving...' : 'Approve'}
                                  </Button>
                                )}
                                {patient.isActive ? (
                                  <Button 
                                    size="sm" 
                                    variant="destructive"
                                    onClick={() => handleDeactivateUser(patient.id)}
                                    disabled={updateUserStatus.isPending}
                                    data-testid={`button-deactivate-${patient.id}`}
                                  >
                                    {updateUserStatus.isPending ? 'Deactivating...' : 'Deactivate'}
                                  </Button>
                                ) : (
                                  <Button 
                                    size="sm" 
                                    className="bg-blue-600 hover:bg-blue-700"
                                    onClick={() => handleActivateUser(patient.id)}
                                    disabled={updateUserStatus.isPending}
                                    data-testid={`button-activate-${patient.id}`}
                                  >
                                    {updateUserStatus.isPending ? 'Activating...' : 'Activate'}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))
                    ) : (
                      <Card className="p-8 text-center">
                        <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Patient Records</h3>
                        <p className="text-gray-600">No patient records found in the system.</p>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="inventory">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">Inventory Management</h2>
                    <p className="text-gray-600">Monitor medicine stock levels and manage inventory</p>
                  </div>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => toast({ title: 'Feature Coming Soon', description: 'Add medicine functionality will be available soon' })}
                    data-testid="button-add-medicine"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Add Medicine
                  </Button>
                </div>

                {medicinesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {medicines && medicines.length > 0 ? (
                      medicines.map((medicine) => (
                        <Card key={medicine.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                <FileText className="w-6 h-6 text-orange-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold">{medicine.name}</h3>
                                <p className="text-sm text-gray-600">
                                  {medicine.strength} - {medicine.dosageForm}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Manufacturer: {medicine.manufacturer}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <Badge className={
                                  (medicine.stock || 0) > 50 ? 'bg-green-100 text-green-800' :
                                  (medicine.stock || 0) > 10 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }>
                                  {medicine.stock || 0} units
                                </Badge>
                                <p className="text-sm text-gray-600 mt-1">
                                  {(medicine.stock || 0) <= 10 ? 'Low Stock' : 
                                   (medicine.stock || 0) <= 50 ? 'Medium Stock' : 'In Stock'}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline">
                                  Restock
                                </Button>
                                <Button size="sm" variant="outline">
                                  Edit
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))
                    ) : (
                      <Card className="p-8 text-center">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Medicines</h3>
                        <p className="text-gray-600">No medicines found in inventory.</p>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="staff">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">Staff Management</h2>
                    <p className="text-gray-600">Manage doctors, nurses, and administrative staff</p>
                  </div>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Staff Member
                  </Button>
                </div>

                {staffLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {staffMembers && staffMembers.length > 0 ? (
                      staffMembers.map((staff) => (
                        <Card key={staff.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                                <Stethoscope className="w-6 h-6 text-teal-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold">
                                  Dr. {staff.firstName} {staff.lastName}
                                </h3>
                                <p className="text-sm text-gray-600">
                                  {staff.role === 'doctor' ? 'Doctor' : 'Staff'} • {staff.phoneNumber}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Joined: {new Date(staff.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <Badge className={
                                  staff.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }>
                                  {staff.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                                <p className="text-sm text-gray-600 mt-1">
                                  {staff.role === 'doctor' ? 'Available' : 'On Duty'}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline">
                                  View Schedule
                                </Button>
                                <Button size="sm" variant="outline">
                                  Edit Profile
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))
                    ) : (
                      <Card className="p-8 text-center">
                        <Stethoscope className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Staff Members</h3>
                        <p className="text-gray-600">No staff members found in the system.</p>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="reports">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">Reports & Analytics</h2>
                    <p className="text-gray-600">View comprehensive reports and analytics</p>
                  </div>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Generate Report
                  </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Daily Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-blue-500" />
                        Daily Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Total Patients</span>
                          <span className="font-semibold">{stats?.patientsToday || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Completed Appointments</span>
                          <span className="font-semibold">{stats?.completedAppointments || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Revenue</span>
                          <span className="font-semibold">${stats?.revenue || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Active Staff</span>
                          <span className="font-semibold">{stats?.activeStaff || 0}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Patient Flow */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-500" />
                        Patient Flow
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Average Wait Time</span>
                          <span className="font-semibold">15 min</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Queue Length</span>
                          <span className="font-semibold">{queueTokens?.length || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Cancelled Appointments</span>
                          <span className="font-semibold">2</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">No-Shows</span>
                          <span className="font-semibold">1</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Popular Services */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-purple-500" />
                        Popular Services
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">General Consultation</span>
                          <span className="font-semibold">45%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Pediatrics</span>
                          <span className="font-semibold">25%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Cardiology</span>
                          <span className="font-semibold">20%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Home Visits</span>
                          <span className="font-semibold">10%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* System Status */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-gray-500" />
                        System Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Database</span>
                          <Badge className="bg-green-100 text-green-800">Online</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">SMS Service</span>
                          <Badge className="bg-yellow-100 text-yellow-800">Limited</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Queue System</span>
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Backup Status</span>
                          <Badge className="bg-green-100 text-green-800">Current</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}