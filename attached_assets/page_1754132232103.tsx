import {
  Bell,
  Calendar,
  Clock,
  Home,
  MapPin,
  Phone,
  Settings,
  AlertTriangle,
  Pill,
  Stethoscope,
  Activity,
  UserCheck,
  Zap,
  User,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"

export default function SmartClinicDashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">SmartClinic</h1>
              <p className="text-xs sm:text-sm text-gray-500">Healthcare Manager</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="relative">
              <Bell className="w-5 h-5 text-gray-600" />
              <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                3
              </div>
            </div>

            <div className="flex flex-col items-center gap-1">
              <span className="text-sm font-medium text-gray-900">Alex Johnson</span>
              <Badge className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">Patient</Badge>
            </div>

            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-gray-600" />
            </div>

            <Settings className="w-5 h-5 text-gray-600" />

            <div className="w-5 h-5 text-gray-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16,17 21,12 16,7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section
        className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 sm:px-6 py-8 sm:py-12 relative overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(rgba(59, 130, 246, 0.8), rgba(37, 99, 235, 0.8)), url('/images/medical-background.png')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-white mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">Welcome back, Alex!</h2>
            <p className="text-blue-100 text-base sm:text-lg">Manage your healthcare with smart tools</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            <Button className="bg-green-500 hover:bg-green-600 text-white px-4 sm:px-6 py-3 w-full sm:w-auto">
              <Calendar className="w-4 h-4 mr-2" />
              Book Appointment
            </Button>
            <div className="bg-white rounded-lg px-4 py-3 flex-1 max-w-full sm:max-w-md">
              <Input
                placeholder="Search doctors, specialties..."
                className="border-0 p-0 focus-visible:ring-0 text-sm sm:text-base"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Dashboard */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Next Appointment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                Next Appointment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">2:30 PM</div>
              <div className="text-sm text-gray-600 mb-4">Dr. Sarah Wilson - Cardiology</div>
              <Button className="w-full bg-blue-500 hover:bg-blue-600">View Details</Button>
            </CardContent>
          </Card>

          {/* Queue Position */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-500" />
                Queue Position
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">#15</div>
              <div className="text-sm text-gray-600 mb-4">Estimated wait: 45 minutes</div>
              <Button className="w-full bg-green-500 hover:bg-green-600">Track Live</Button>
            </CardContent>
          </Card>

          {/* Pending Medicines */}
          <Card className="border-orange-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Pill className="w-4 h-4 text-orange-500" />
                Pending Medicines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl font-bold">2</span>
                <Badge className="bg-red-500 text-white text-xs">Urgent</Badge>
              </div>
              <div className="text-sm text-gray-600 mb-4">1 dose overdue</div>
              <Button className="w-full bg-orange-500 hover:bg-orange-600 animate-flash">Take Medicine</Button>
            </CardContent>
          </Card>

          {/* Doctor Status */}
          <Card className="border-red-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Clock className="w-4 h-4 text-red-500" />
                Doctor Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl font-bold">Delayed</span>
                <Badge className="bg-red-500 text-white text-xs">Urgent</Badge>
              </div>
              <div className="text-sm text-gray-600 mb-4">Running 20 minutes late</div>
              <Button className="w-full bg-blue-500 hover:bg-blue-600 animate-flash">Get Updates</Button>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
          {/* Live Queue Tracker */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                Live Queue Tracker
                <Badge className="bg-orange-100 text-orange-800 text-xs ml-auto">Delayed 20min</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-500 text-white rounded-lg p-6 text-center mb-6">
                <div className="text-sm mb-2">Now Serving</div>
                <div className="text-4xl font-bold mb-2">#12</div>
                <div className="text-sm">Token Number</div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 text-yellow-800">
                  <Clock className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium">Doctor Running Late</span>
                </div>
                <div className="text-sm text-yellow-700 mt-1">Expected delay: 20 minutes</div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium">Upcoming Appointments</span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-blue-500 text-white">#12</Badge>
                      <div>
                        <div className="text-sm font-medium">John Doe</div>
                        <div className="text-xs text-gray-500">10:30 AM</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">0min</div>
                      <div className="text-xs text-gray-500">est. wait</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-gray-500 text-white">#13</Badge>
                      <div>
                        <div className="text-sm font-medium">Sarah Smith</div>
                        <div className="text-xs text-gray-500">10:45 AM</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">15min</div>
                      <div className="text-xs text-gray-500">est. wait</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-gray-500 text-white">#14</Badge>
                      <div>
                        <div className="text-sm font-medium">Mike Johnson</div>
                        <div className="text-xs text-gray-500">11:00 AM</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">30min</div>
                      <div className="text-xs text-gray-500">est. wait</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-gray-500 text-white">#15</Badge>
                      <div>
                        <div className="text-sm font-medium">Emily Davis</div>
                        <div className="text-xs text-gray-500">11:15 AM</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">45min</div>
                      <div className="text-xs text-gray-500">est. wait</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" className="flex-1 bg-transparent">
                  Refresh Queue
                </Button>
                <Button className="flex-1 bg-blue-500 hover:bg-blue-600">Join Queue</Button>
              </div>
            </CardContent>
          </Card>

          {/* Medicine Reminders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-orange-500" />
                Medicine Reminders
                <Badge className="bg-red-100 text-red-800 text-xs ml-auto">1 Missed</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center gap-8 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">2</div>
                  <div className="text-xs text-gray-500">Due Today</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">1</div>
                  <div className="text-xs text-gray-500">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">1</div>
                  <div className="text-xs text-gray-500">Missed</div>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium">Today's Schedule</span>
              </div>

              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Metformin</span>
                      <Pill className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">9:00 PM</div>
                      <Badge className="bg-red-100 text-red-800 text-xs">1 missed</Badge>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">500mg</div>
                  <div className="text-xs text-gray-500 mb-3">Twice daily</div>
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progress</span>
                      <span>13/14</span>
                    </div>
                    <Progress value={93} className="h-2" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 bg-green-500 hover:bg-green-600">
                      <div className="w-3 h-3 bg-white rounded-full mr-2"></div>
                      Mark Taken
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                      <Clock className="w-3 h-3 mr-2" />
                      Snooze
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Vitamin D3</span>
                      <Pill className="w-4 h-4 text-yellow-500" />
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">6:00 PM</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">1000 IU</div>
                  <div className="text-xs text-gray-500">Once daily</div>
                </div>
              </div>
              <Button className="w-full mt-4 bg-blue-500 hover:bg-blue-600">
                <Calendar className="w-4 h-4 mr-2" />
                View Full Schedule
              </Button>
            </CardContent>
          </Card>

          {/* Appointments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                Appointments
                <Button size="sm" className="ml-auto bg-blue-500 hover:bg-blue-600">
                  Book New
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center gap-8 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">2</div>
                  <div className="text-xs text-gray-500">Upcoming</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">1</div>
                  <div className="text-xs text-gray-500">Home Visits</div>
                </div>
              </div>

              <div className="mb-4">
                <span className="text-sm font-medium">Upcoming Appointments</span>
              </div>

              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Dr. Sarah Wilson</span>
                      <Badge className="bg-green-100 text-green-800 text-xs">confirmed</Badge>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Stethoscope className="w-3 h-3" />
                      Clinic
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">Cardiology</div>
                  <div className="text-sm text-gray-500 mb-3">Room 201</div>
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">Today</span>
                    <Clock className="w-4 h-4 text-gray-400 ml-2" />
                    <span className="text-sm">2:30 PM</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                      Reschedule
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 text-red-600 border-red-200 bg-transparent">
                      Cancel
                    </Button>
                    <Button size="sm" className="bg-green-500 hover:bg-green-600">
                      <Phone className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Dr. Michael Chen</span>
                      <Badge className="bg-green-100 text-green-800 text-xs">confirmed</Badge>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Home className="w-3 h-3" />
                      Home Visit
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">General Practice</div>
                  <div className="text-sm text-gray-500 mb-3">123 Main St</div>
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">Tomorrow</span>
                    <Clock className="w-4 h-4 text-gray-400 ml-2" />
                    <span className="text-sm">10:00 AM</span>
                  </div>
                  <div className="text-xs text-gray-500 mb-3">Edit with Lovable</div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="bg-transparent">
                      Reschedule
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600 border-red-200 bg-transparent">
                      Cancel
                    </Button>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                      View History
                    </Button>
                    <Button size="sm" className="flex-1 bg-green-500 hover:bg-green-600">
                      <MapPin className="w-3 h-3 mr-1" />
                      Book Home Visit
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Quick Actions */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-500" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <Button
                  variant="outline"
                  className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 bg-transparent text-xs sm:text-sm"
                >
                  <UserCheck className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                  <span>Check In</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 bg-transparent text-xs sm:text-sm"
                >
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
                  <span>Emergency</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 bg-transparent text-xs sm:text-sm"
                >
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
                  <span>Reschedule</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 bg-transparent text-xs sm:text-sm"
                >
                  <Home className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
                  <span>Home Care</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
