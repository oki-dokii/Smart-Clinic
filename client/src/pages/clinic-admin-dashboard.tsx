"use client"

import React, { useState, useEffect } from "react"
import { useRoute } from "wouter"
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
  X,
  Plus,
  UserCheck,
  Shield,
  Database,
  Download,
  MessageCircle,
  Star,
  Eye,
  Mail,
  PhoneCall,
  Pill,
  Building2,
  MapPin
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { useQueueSocket } from "@/hooks/useQueueSocket"

interface User {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  phoneNumber: string;
  email?: string;
  address?: string;
  isActive: boolean;
  isApproved: boolean;
  createdAt: string;
  clinicId: string;
}

interface Clinic {
  id: string;
  name: string;
  address: string;
  phoneNumber?: string;
  email?: string;
  status: string;
  capacity?: number;
  description?: string;
  workingHours?: any;
  createdAt: string;
}

interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  clinicId: string;
  appointmentDate: string;
  duration: number;
  type: string;
  status: string;
  location?: string;
  notes?: string;
  symptoms?: string;
  patient: User;
  doctor: User;
}

interface QueueToken {
  id: string;
  tokenNumber: number;
  patientId: string;
  doctorId: string;
  appointmentId: string;
  status: string;
  estimatedWaitTime: number;
  patient: User;
  doctor: User;
}

export default function ClinicAdminDashboard() {
  const [, params] = useRoute("/clinic-admin/:clinicId")
  const clinicId = params?.clinicId
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedPatient, setSelectedPatient] = useState<User | null>(null)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch clinic information
  const { data: clinic, isLoading: clinicLoading } = useQuery<Clinic>({
    queryKey: ['/api/clinics', clinicId],
    enabled: !!clinicId
  })

  // Fetch clinic-specific appointments
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ['/api/appointments/clinic', clinicId],
    enabled: !!clinicId
  })

  // Fetch clinic-specific staff
  const { data: staff = [], isLoading: staffLoading } = useQuery<User[]>({
    queryKey: ['/api/users/clinic', clinicId],
    enabled: !!clinicId
  })

  // Fetch clinic-specific patients
  const { data: patients = [], isLoading: patientsLoading } = useQuery<User[]>({
    queryKey: ['/api/patients/clinic', clinicId],
    enabled: !!clinicId
  })

  // Fetch clinic-specific queue
  const { data: queue = [], isLoading: queueLoading } = useQuery<QueueToken[]>({
    queryKey: ['/api/queue/clinic', clinicId],
    enabled: !!clinicId
  })

  // Fetch clinic dashboard stats
  const { data: stats } = useQuery<{
    patientsToday: number;
    completedAppointments: number;
    revenue: number;
    activeStaff: number;
  }>({
    queryKey: ['/api/clinic/dashboard-stats', clinicId],
    enabled: !!clinicId
  })

  // WebSocket for real-time updates
  const { queueTokens, isConnected } = useQueueSocket("admin")

  if (!clinicId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Clinic</h1>
          <p className="text-gray-600">Clinic ID not found in URL</p>
        </div>
      </div>
    )
  }

  if (clinicLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading clinic dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{clinic?.name || 'Clinic'} Dashboard</h1>
                <p className="text-sm text-gray-600 flex items-center mt-1">
                  <MapPin className="h-4 w-4 mr-1" />
                  {clinic?.address}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                {clinic?.status || 'Active'}
              </Badge>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Clinic Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="appointments" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Appointments
            </TabsTrigger>
            <TabsTrigger value="queue" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Queue
            </TabsTrigger>
            <TabsTrigger value="patients" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Patients
            </TabsTrigger>
            <TabsTrigger value="staff" className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Staff
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Reports
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Stats Cards */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today's Patients</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.patientsToday || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    +12% from yesterday
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.completedAppointments || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    +8% from yesterday
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${stats?.revenue || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    +15% from yesterday
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.activeStaff || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    All staff present
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions and Current Queue */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-500" />
                    Current Queue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {queue.slice(0, 5).map((token: QueueToken) => (
                      <div key={token.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline" className="text-xs">
                            #{token.tokenNumber}
                          </Badge>
                          <div>
                            <p className="font-medium text-sm">
                              {token.patient.firstName} {token.patient.lastName}
                            </p>
                            <p className="text-xs text-gray-500">
                              Dr. {token.doctor.firstName} {token.doctor.lastName}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge 
                            className={
                              token.status === 'waiting' ? 'bg-yellow-100 text-yellow-800' :
                              token.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              'bg-green-100 text-green-800'
                            }
                          >
                            {token.status}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            ~{Math.round(token.estimatedWaitTime / 60)}min
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button className="w-full justify-start" variant="outline">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add New Patient
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule Appointment
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Report
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Settings className="w-4 h-4 mr-2" />
                      Clinic Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    Clinic Appointments
                  </span>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    New Appointment
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {appointments.map((appointment: Appointment) => (
                    <div key={appointment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">
                            {appointment.patient.firstName} {appointment.patient.lastName}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Dr. {appointment.doctor.firstName} {appointment.doctor.lastName}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(appointment.appointmentDate).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge 
                          className={
                            appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                            appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                            appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }
                        >
                          {appointment.status}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Queue Tab */}
          <TabsContent value="queue" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  Live Queue Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {queue.map((token: QueueToken) => (
                    <div key={token.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Badge variant="outline" className="text-lg px-3 py-1">
                          #{token.tokenNumber}
                        </Badge>
                        <div>
                          <h3 className="font-medium">
                            {token.patient.firstName} {token.patient.lastName}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Dr. {token.doctor.firstName} {token.doctor.lastName}
                          </p>
                          <p className="text-xs text-gray-400">
                            Wait time: ~{Math.round(token.estimatedWaitTime / 60)} minutes
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge 
                          className={
                            token.status === 'waiting' ? 'bg-yellow-100 text-yellow-800' :
                            token.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }
                        >
                          {token.status}
                        </Badge>
                        {token.status === 'waiting' && (
                          <Button size="sm">
                            Call Patient
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Patients Tab */}
          <TabsContent value="patients" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    Clinic Patients
                  </span>
                  <Button size="sm">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Patient
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {patients.map((patient: User) => (
                    <div key={patient.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">{patient.firstName} {patient.lastName}</h3>
                          <p className="text-sm text-gray-500">{patient.phoneNumber}</p>
                          <p className="text-xs text-gray-400">{patient.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge className={patient.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {patient.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button variant="outline" size="sm" onClick={() => {
                          setSelectedPatient(patient)
                          setShowHistoryModal(true)
                        }}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Staff Tab */}
          <TabsContent value="staff" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-blue-500" />
                    Clinic Staff
                  </span>
                  <Button size="sm">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Staff
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {staff.map((member: User) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <Stethoscope className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">{member.firstName} {member.lastName}</h3>
                          <p className="text-sm text-gray-500">{member.role}</p>
                          <p className="text-xs text-gray-400">{member.phoneNumber}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge className={member.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {member.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline">
                          {member.role}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Patient Satisfaction</span>
                        <span>95%</span>
                      </div>
                      <Progress value={95} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Appointment Completion</span>
                        <span>88%</span>
                      </div>
                      <Progress value={88} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Staff Utilization</span>
                        <span>92%</span>
                      </div>
                      <Progress value={92} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-green-500" />
                    Generate Reports
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button className="w-full justify-start" variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Monthly Performance Report
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Patient Demographics
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Revenue Analysis
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Staff Performance
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Patient History Modal */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Patient Medical History</DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <div className="space-y-6">
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </h3>
                <p className="text-gray-600">{selectedPatient.phoneNumber}</p>
                <p className="text-sm text-gray-500">
                  Patient ID: {selectedPatient.id.slice(0, 8)}...
                </p>
              </div>
              <p className="text-gray-600">Patient history details would be displayed here...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}