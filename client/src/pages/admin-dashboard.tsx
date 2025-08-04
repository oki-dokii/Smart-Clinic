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
}

interface DashboardStats {
  patientsToday: number;
  completedAppointments: number;
  revenue: number;
  activeStaff: number;
}

export default function ClinicDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date())
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

            {/* Other tab contents would go here */}
            <TabsContent value="queue">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Patient Queue Management</h2>
                <p className="text-gray-600">Queue management interface would go here...</p>
              </div>
            </TabsContent>

            <TabsContent value="appointments">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Appointments</h2>
                <p className="text-gray-600">Appointment management interface would go here...</p>
              </div>
            </TabsContent>

            <TabsContent value="records">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Patient Records</h2>
                <p className="text-gray-600">Patient records interface would go here...</p>
              </div>
            </TabsContent>

            <TabsContent value="inventory">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Inventory Management</h2>
                <p className="text-gray-600">Inventory management interface would go here...</p>
              </div>
            </TabsContent>

            <TabsContent value="staff">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Staff Management</h2>
                <p className="text-gray-600">Staff management interface would go here...</p>
              </div>
            </TabsContent>

            <TabsContent value="reports">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Reports & Analytics</h2>
                <p className="text-gray-600">Reports and analytics interface would go here...</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}