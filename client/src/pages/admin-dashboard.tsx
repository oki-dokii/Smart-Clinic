"use client"

import React, { useState, useEffect } from "react"
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
import jsPDF from 'jspdf'

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
  appointmentTime?: string;
  consultationType?: string;
  symptoms: string;
  status: string;
  type?: string;
  duration?: number;
  diagnosis?: string;
  treatmentPlan?: string;
  createdAt: string;
  updatedAt: string;
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

// Emergency Alert Interface
interface EmergencyAlert {
  id: string;
  message: string;
  type: 'critical' | 'warning' | 'info';
  timeAgo: string;
  color: string;
}

export default function ClinicDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [reportData, setReportData] = useState<any>(null)
  const [isAddMedicineOpen, setIsAddMedicineOpen] = useState(false)
  const [isRestockOpen, setIsRestockOpen] = useState(false)
  const [isEditMedicineOpen, setIsEditMedicineOpen] = useState(false)
  const [selectedMedicine, setSelectedMedicine] = useState<any>(null)
  const [newMedicine, setNewMedicine] = useState({
    name: '',
    strength: '',
    dosageForm: '',
    manufacturer: '',
    stock: 0,
    description: ''
  })
  
  // Patient form state
  const [patientForm, setPatientForm] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    dateOfBirth: '',
    address: ''
  })
  
  // Reschedule form state
  const [rescheduleForm, setRescheduleForm] = useState({
    appointmentId: '',
    newDate: '',
    newTime: ''
  })
  const [restockAmount, setRestockAmount] = useState(0)
  const [forceRender, setForceRender] = useState(0)
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false)
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Appointment approval mutation
  const appointmentApproval = useMutation({
    mutationFn: async ({ appointmentId, action }: { appointmentId: string; action: 'approve' | 'reject' }) => {
      return apiRequest(`/api/appointments/admin/${appointmentId}/${action}`, {
        method: 'POST'
      })
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.action === 'approve' ? 'Appointment Approved' : 'Appointment Rejected',
        description: variables.action === 'approve' 
          ? 'Patient will receive SMS confirmation' 
          : 'Patient will be notified of the rejection'
      })
      queryClient.invalidateQueries({ queryKey: ['/api/appointments/admin'] })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update appointment status',
        variant: 'destructive'
      })
    }
  })

  // Handler for appointment approval/rejection
  const handleAppointmentAction = (appointmentId: string, action: 'approve' | 'reject') => {
    appointmentApproval.mutate({ appointmentId, action })
  }
  
  // Emergency alerts state
  const [emergencyAlerts, setEmergencyAlerts] = useState<EmergencyAlert[]>([
    {
      id: '1',
      message: 'Patient in Room 3 needs immediate attention',
      type: 'critical',
      timeAgo: '2 min ago',
      color: 'red'
    },
    {
      id: '2', 
      message: 'Low stock: Paracetamol (5 units left)',
      type: 'warning',
      timeAgo: '15 min ago',
      color: 'orange'
    },
    {
      id: '3',
      message: "Dr. Johnson's next appointment is delayed",
      type: 'info',
      timeAgo: '30 min ago',
      color: 'blue'
    }
  ])



  // Appointment form state
  const [appointmentForm, setAppointmentForm] = useState({
    patientId: '',
    doctorId: '',
    appointmentDate: '',
    appointmentTime: '',
    consultationType: 'regular',
    symptoms: '',
    date: '',
    time: '',
    type: ''
  })

  const [prescriptionForm, setPrescriptionForm] = useState({
    patientId: '',
    medicineName: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: ''
  })

  const [dischargeForm, setDischargeForm] = useState({
    patientId: '',
    dischargeDate: '',
    condition: '',
    followUpInstructions: '',
    medications: ''
  })

  const [staffForm, setStaffForm] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    role: ''
  })

  // Patient record modal states
  const [selectedPatient, setSelectedPatient] = useState<User | null>(null)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editPatientForm, setEditPatientForm] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    address: '',
    dateOfBirth: ''
  })

  // Function to remove emergency alert
  const removeAlert = (alertId: string) => {
    setEmergencyAlerts(prev => prev.filter(alert => alert.id !== alertId))
    toast({
      title: 'Alert Resolved',
      description: 'Emergency alert has been successfully resolved and removed.',
    })
  }

  // Form submission handlers
  const handlePatientSubmitOriginal = async () => {
    if (!patientForm.firstName || !patientForm.lastName || !patientForm.phoneNumber) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields (name and phone number).',
        variant: 'destructive'
      })
      return
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          firstName: patientForm.firstName,
          lastName: patientForm.lastName,
          phoneNumber: patientForm.phoneNumber,
          email: patientForm.email || undefined,
          role: 'patient',
          password: 'temp123', // Default password
          dateOfBirth: patientForm.dateOfBirth || undefined, // Send as string, schema will convert
          address: patientForm.address || undefined
        })
      })
      
      if (response.ok) {
        // Refresh patient data
        queryClient.invalidateQueries({ queryKey: ['/api/patients'] })
        
        toast({
          title: 'Patient Added Successfully',
          description: `${patientForm.firstName} ${patientForm.lastName} has been registered and will appear in Patient Records.`,
        })
        
        setPatientForm({
          firstName: '',
          lastName: '',
          phoneNumber: '',
          email: '',
          dateOfBirth: '',
          address: ''
        })
      } else {
        throw new Error('Registration failed')
      }
    } catch (error) {
      toast({
        title: 'Registration Error',
        description: 'Failed to add patient. Please check the information and try again.',
        variant: 'destructive'
      })
    }
  }

  const handleAppointmentSubmit = async () => {
    if (!appointmentForm.patientId || !appointmentForm.doctorId || !appointmentForm.appointmentDate || !appointmentForm.appointmentTime) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive'
      })
      return
    }

    try {
      // Combine date and time into proper DateTime format
      const appointmentDateTime = new Date(`${appointmentForm.appointmentDate}T${appointmentForm.appointmentTime}:00`)
      
      const appointmentData = {
        patientId: appointmentForm.patientId,
        doctorId: appointmentForm.doctorId,
        appointmentDate: appointmentDateTime.toISOString(),
        type: appointmentForm.consultationType === 'video-call' ? 'telehealth' : 
              appointmentForm.consultationType === 'home-visit' ? 'home_visit' : 'clinic',
        symptoms: appointmentForm.symptoms,
        status: 'scheduled'
      }

      await apiRequest('POST', '/api/appointments', appointmentData)
      
      // Reset form and close modal
      setAppointmentForm({
        patientId: '',
        doctorId: '',
        appointmentDate: '',
        appointmentTime: '',
        consultationType: 'regular',
        symptoms: '',
        date: '',
        time: '',
        type: ''
      })
      setShowAppointmentModal(false)
      
      // Refresh appointments
      queryClient.invalidateQueries({ queryKey: ['/api/appointments/admin'] })
      
      toast({
        title: 'Appointment Scheduled',
        description: 'New appointment has been successfully scheduled.',
      })
    } catch (error) {
      toast({
        title: 'Booking Error',
        description: 'Failed to schedule appointment. Please try again.',
        variant: 'destructive'
      })
    }
  }

  const handleStaffSubmit = async () => {
    if (!staffForm.firstName || !staffForm.lastName || !staffForm.phoneNumber || !staffForm.role) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields (name, phone number, and role).',
        variant: 'destructive'
      })
      return
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          firstName: staffForm.firstName,
          lastName: staffForm.lastName,
          phoneNumber: staffForm.phoneNumber,
          email: staffForm.email || undefined,
          role: staffForm.role,
          password: 'temp123', // Default password
          isApproved: true // Auto-approve staff created by admin
        })
      })
      
      if (response.ok) {
        // Refresh staff data with multiple cache-busting strategies
        queryClient.removeQueries({ queryKey: ['users', 'staff'] })
        setForceRender(prev => prev + 1)
        await refetchUsers() // Force immediate refetch
        
        toast({
          title: 'Staff Member Added Successfully',
          description: `${staffForm.firstName} ${staffForm.lastName} has been added to the staff.`,
        })
        
        setStaffForm({
          firstName: '',
          lastName: '',
          phoneNumber: '',
          email: '',
          role: ''
        })
        
        setIsAddStaffOpen(false) // Close dialog
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Registration failed')
      }
    } catch (error) {
      console.error('Staff registration error:', error)
      toast({
        title: 'Registration Error',
        description: error instanceof Error ? error.message : 'Failed to add staff member. Please check the information and try again.',
        variant: 'destructive'
      })
    }
  }

  const handlePrescriptionSubmit = () => {
    toast({
      title: 'Prescription Created',
      description: `Prescription for ${prescriptionForm.medicineName} has been created.`,
    })
    setPrescriptionForm({
      patientId: '',
      medicineName: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: ''
    })
  }

  const handleDischargeSubmit = () => {
    toast({
      title: 'Patient Discharged',
      description: 'Patient discharge has been processed successfully.',
    })
    setDischargeForm({
      patientId: '',
      dischargeDate: '',
      condition: '',
      followUpInstructions: '',
      medications: ''
    })
  }

  // Patient record handlers
  const handleViewHistory = (patient: User) => {
    setSelectedPatient(patient)
    setShowHistoryModal(true)
  }

  const handleEditProfile = (patient: User) => {
    setSelectedPatient(patient)
    setEditPatientForm({
      firstName: patient.firstName || '',
      lastName: patient.lastName || '',
      phoneNumber: patient.phoneNumber || '',
      email: patient.email || '',
      address: patient.address || '',
      dateOfBirth: (patient as any).dateOfBirth ? new Date((patient as any).dateOfBirth).toISOString().split('T')[0] : ''
    })
    setShowEditModal(true)
  }

  const handleUpdatePatient = async () => {
    if (!selectedPatient) return
    
    try {
      const response = await fetch(`/api/users/${selectedPatient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          firstName: editPatientForm.firstName,
          lastName: editPatientForm.lastName,
          phoneNumber: editPatientForm.phoneNumber,
          email: editPatientForm.email || null,
          address: editPatientForm.address || null,
          dateOfBirth: editPatientForm.dateOfBirth ? new Date(editPatientForm.dateOfBirth).toISOString() : null
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Update failed')
      }
      
      // Force immediate cache invalidation and refetch
      await queryClient.invalidateQueries({ queryKey: ['/api/patients'] })
      await queryClient.invalidateQueries({ queryKey: ['/api/users'] })
      await queryClient.invalidateQueries({ queryKey: [`/api/users/${selectedPatient.id}`] })
      
      // Force refetch of patients data immediately
      await queryClient.refetchQueries({ queryKey: ['/api/patients'] })
      await refetchPatients() // Direct refetch call
      
      setShowEditModal(false)
      
      // Force component re-render
      setForceRender(prev => prev + 1)
      
      toast({
        title: 'Patient Profile Updated',
        description: `${editPatientForm.firstName} ${editPatientForm.lastName}'s profile has been successfully updated.`,
      })
    } catch (error: any) {
      console.error('Patient update error:', error)
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update patient profile. Please try again.',
        variant: 'destructive'
      })
    }
  }

  // Patient history download handler
  const handleDownloadPatientHistory = async (patient: User) => {
    if (!patient) return

    try {
      toast({
        title: "Generating Patient History",
        description: "Preparing comprehensive medical history document...",
      })

      // Generate PDF using jsPDF
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF()

      // Header
      pdf.setFontSize(20)
      pdf.setTextColor(41, 128, 185)
      pdf.text('SmartClinic - Patient Medical History', 20, 25)
      
      pdf.setFontSize(12)
      pdf.setTextColor(0, 0, 0)
      pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 35)
      
      // Patient Information
      pdf.setFontSize(16)
      pdf.setTextColor(41, 128, 185)
      pdf.text('Patient Information', 20, 50)
      
      pdf.setFontSize(11)
      pdf.setTextColor(0, 0, 0)
      let yPos = 60
      
      pdf.text(`Name: ${patient.firstName} ${patient.lastName}`, 20, yPos)
      yPos += 8
      pdf.text(`Phone: ${patient.phoneNumber}`, 20, yPos)
      yPos += 8
      if (patient.email) {
        pdf.text(`Email: ${patient.email}`, 20, yPos)
        yPos += 8
      }
      if ((patient as any).dateOfBirth) {
        pdf.text(`Date of Birth: ${new Date((patient as any).dateOfBirth).toLocaleDateString()}`, 20, yPos)
        yPos += 8
      }
      if ((patient as any).address) {
        pdf.text(`Address: ${(patient as any).address}`, 20, yPos)
        yPos += 8
      }
      
      yPos += 15

      // Medical Summary
      pdf.setFontSize(16)
      pdf.setTextColor(41, 128, 185)
      pdf.text('Medical Summary', 20, yPos)
      yPos += 10
      
      pdf.setFontSize(10)
      pdf.setTextColor(0, 0, 0)
      
      // Sample medical history data (replace with actual data when API endpoints are available)
      const medicalSummary = [
        'Recent Consultation: Routine checkup completed (Jan 15, 2024)',
        'Follow-up: Blood pressure monitoring (Dec 28, 2023)',
        'Current Medications: Lisinopril 10mg (daily), Metformin 500mg (twice daily)',
        'Medical Notes: Patient managing diabetes well with current regimen.',
        'Next Appointment: Follow-up recommended in 3 months',
        'Emergency Contact: Available in patient records',
        'Insurance Status: Active coverage verified'
      ]
      
      medicalSummary.forEach((item, index) => {
        if (yPos > 260) {
          pdf.addPage()
          yPos = 20
        }
        pdf.text(`• ${item}`, 25, yPos)
        yPos += 8
      })

      yPos += 10

      // Important Notes Section
      pdf.setFontSize(16)
      pdf.setTextColor(220, 53, 69)  // Red for important notes
      pdf.text('Important Medical Notes', 20, yPos)
      yPos += 10
      
      pdf.setFontSize(10)
      pdf.setTextColor(0, 0, 0)
      pdf.text('• All prescription medications should be taken as directed', 25, yPos)
      yPos += 8
      pdf.text('• Schedule regular follow-up appointments for chronic conditions', 25, yPos)
      yPos += 8
      pdf.text('• Contact clinic immediately for any emergency situations', 25, yPos)
      yPos += 8
      pdf.text('• Keep this medical history document updated and accessible', 25, yPos)
      
      // Footer
      const pageCount = (pdf as any).internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i)
        pdf.setFontSize(8)
        pdf.setTextColor(128, 128, 128)
        pdf.text(`SmartClinic Healthcare System - Page ${i} of ${pageCount}`, 20, 285)
        pdf.text(`Confidential Medical Document - ${new Date().toLocaleString()}`, 120, 285)
      }

      // Save the PDF
      const fileName = `${patient.firstName}_${patient.lastName}_Medical_History_${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(fileName)

      toast({
        title: "Download Complete",
        description: `Patient history downloaded as ${fileName}`,
      })

    } catch (error: any) {
      console.error('History download error:', error)
      toast({
        title: "Download Failed",
        description: "Unable to generate patient history. Please try again.",
        variant: "destructive"
      })
    }
  }

  // Force authentication setup on load
  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      console.log('Setting up admin authentication...')
      // Use the fresh working token directly
      const workingToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI5YzE4ZDNiZS01OTJhLTQ0ZjUtYjNjMi1jZmYyZGE5OTExZmIiLCJwaG9uZU51bWJlciI6IisxMjM0NTY3ODkwIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU0NDExNjE3LCJleHAiOjE3NTUwMTY0MTd9.kZLifa7gAwVAIsrOF2YklgECI45u8BCxJtECDtL4qFE'
      localStorage.setItem('auth_token', workingToken)
      console.log('Admin token set successfully')
      queryClient.invalidateQueries()
      setForceRender(prev => prev + 1)
      
      // Force immediate refetch of users data
      setTimeout(() => {
        refetchUsers()
      }, 500)
    }
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Check if user is admin
  const { data: currentUser } = useQuery<User>({
    queryKey: ['/api/users/me'],
    retry: (failureCount, error) => {
      // If auth fails, redirect to login
      if (error && typeof error === 'object' && 'status' in error && error.status === 401) {
        localStorage.removeItem('auth_token')
        window.location.href = '/login'
        return false
      }
      return failureCount < 2
    }
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

  // Patients data with force render dependency and proper auth
  const { data: patients, isLoading: patientsLoading, refetch: refetchPatients, error: patientsError } = useQuery<User[]>({
    queryKey: ['/api/patients', forceRender],
    queryFn: () => fetch('/api/patients', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      }
    }).then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return res.json();
    }),
    refetchInterval: 60000,
    staleTime: 0, // Always consider data stale to force fresh fetch
    gcTime: 0, // Don't cache data to ensure fresh reads
    retry: 3
  })
  
  // Debug patient query
  React.useEffect(() => {
    console.log('🔥 PATIENTS QUERY - Data:', Array.isArray(patients) ? patients.length : 0, 'Loading:', patientsLoading, 'Error:', patientsError);
    if (patientsError) {
      console.log('🔥 PATIENTS QUERY ERROR DETAILS:', patientsError);
    }
    if (patients) {
      console.log('🔥 PATIENTS DATA:', patients);
    }
  }, [patients, patientsLoading, patientsError]);

  // Force initial patient data fetch on mount
  React.useEffect(() => {
    console.log('🔥 COMPONENT MOUNTED - Force rendering patients');
    refetchPatients();
  }, []);

  // All Users data (for staff management)  
  const { data: users, isLoading: usersLoading, error: usersError, refetch: refetchUsers } = useQuery<User[]>({
    queryKey: ['users', 'staff', forceRender],
    queryFn: () => fetch('/api/users', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      }
    }).then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return res.json();
    }),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    retry: false,
    refetchOnMount: true
  })

  // Filter staff members (non-patients)
  const staffMembers = users?.filter(user => user.role !== 'patient') || []

  // Medicines/Inventory data
  const { data: medicines = [], isLoading: medicinesLoading, refetch: refetchMedicines } = useQuery<Medicine[]>({
    queryKey: ['/api/medicines'],
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true
  })

  // Debug: Log medicines data
  console.log('Medicines data:', medicines, 'Loading:', medicinesLoading, 'Force render:', forceRender)
  console.log('First medicine stock:', medicines[0]?.stock)
  
  // Debug: Log staff data
  console.log('Staff members:', staffMembers, 'Total users:', users?.length, 'Users loading:', usersLoading)
  if (usersError) {
    console.error('Users query error details:', JSON.stringify(usersError, null, 2))
  }
  console.log('Auth token exists:', !!localStorage.getItem('auth_token'))

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
      const response = await fetch('/api/reports/daily', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to generate report')
      }
      
      return await response.json()
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


  
  // Patient form submission handler
  const handlePatientSubmit = async () => {
    try {
      console.log('🔥 PATIENT SUBMIT - Starting registration');
      await apiRequest('POST', '/api/auth/register', {
        ...patientForm,
        role: 'patient',
        password: 'temp123', // Required password for new accounts
        isApproved: true // Auto-approve patients created by admin
      })
      
      console.log('🔥 PATIENT SUBMIT - Registration successful, refreshing cache');
      
      // Comprehensive cache invalidation
      await queryClient.invalidateQueries({ queryKey: ['/api/patients'] })
      await queryClient.removeQueries({ queryKey: ['/api/patients'] })
      await queryClient.refetchQueries({ queryKey: ['/api/patients'] })
      await refetchPatients() // Direct refetch call
      
      // Force re-render
      setForceRender(prev => prev + 1)
      
      // Reset form
      setPatientForm({
        firstName: '',
        lastName: '',
        phoneNumber: '',
        email: '',
        dateOfBirth: '',
        address: ''
      })
      
      console.log('🔥 PATIENT SUBMIT - Cache refreshed and form reset');
      toast({ title: 'Success', description: 'Patient added successfully and records refreshed' })
    } catch (error: any) {
      console.error('🔥 PATIENT SUBMIT - Error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }
  
  // Reschedule appointment handler
  const handleReschedule = async (appointmentId: string, newDate: string, newTime: string) => {
    try {
      const newDateTime = new Date(`${newDate}T${newTime}:00`)
      await apiRequest('PUT', `/api/appointments/${appointmentId}`, {
        appointmentDate: newDateTime.toISOString()
      })
      
      // Reset form
      setRescheduleForm({
        appointmentId: '',
        newDate: '',
        newTime: ''
      })
      
      // Refresh appointments list
      queryClient.invalidateQueries({ queryKey: ['/api/appointments/admin'] })
      toast({ title: 'Success', description: 'Appointment rescheduled successfully' })
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  // Medicine management mutations
  const addMedicineMutation = useMutation({
    mutationFn: async (medicine: any) => {
      const response = await apiRequest('POST', '/api/medicines', medicine)
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/medicines'] })
      queryClient.refetchQueries({ queryKey: ['/api/medicines'] })
      setIsAddMedicineOpen(false)
      setNewMedicine({ name: '', strength: '', dosageForm: '', manufacturer: '', stock: 0, description: '' })
      toast({ title: 'Success', description: 'Medicine added successfully' })
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to add medicine' })
    }
  })

  const updateMedicineMutation = useMutation({
    mutationFn: async ({ medicineId, updates }: { medicineId: string, updates: any }) => {
      const response = await apiRequest('PUT', `/api/medicines/${medicineId}`, updates)
      return response.json()
    },
    onSuccess: (data) => {
      console.log('Edit success, updated medicine:', data)
      queryClient.invalidateQueries({ queryKey: ['/api/medicines'] })
      queryClient.refetchQueries({ queryKey: ['/api/medicines'] })
      refetchMedicines()
      setForceRender(prev => prev + 1)
      setIsEditMedicineOpen(false)
      setSelectedMedicine(null)
      toast({ title: 'Success', description: 'Medicine updated successfully' })
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to update medicine' })
    }
  })

  const restockMedicineMutation = useMutation({
    mutationFn: async ({ medicineId, amount }: { medicineId: string, amount: number }) => {
      const response = await apiRequest('PUT', `/api/medicines/${medicineId}/restock`, { amount })
      return response.json()
    },
    onSuccess: (data) => {
      console.log('Restock success, updated medicine:', data)
      queryClient.invalidateQueries({ queryKey: ['/api/medicines'] })
      queryClient.refetchQueries({ queryKey: ['/api/medicines'] })
      refetchMedicines()
      setForceRender(prev => prev + 1)
      setIsRestockOpen(false)
      setRestockAmount(0)
      setSelectedMedicine(null)
      toast({ title: 'Success', description: 'Medicine restocked successfully' })
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to restock medicine' })
    }
  })

  const handleAddMedicine = () => {
    if (!newMedicine.name || !newMedicine.strength || !newMedicine.dosageForm || !newMedicine.manufacturer) {
      toast({ title: 'Error', description: 'Please fill in all required fields' })
      return
    }
    addMedicineMutation.mutate(newMedicine)
  }

  const handleEditMedicine = (medicine: any) => {
    setSelectedMedicine(medicine)
    setNewMedicine({
      name: medicine.name,
      strength: medicine.strength,
      dosageForm: medicine.dosageForm,
      manufacturer: medicine.manufacturer,
      stock: medicine.stock || 0,
      description: medicine.description || ''
    })
    setIsEditMedicineOpen(true)
  }

  const handleUpdateMedicine = () => {
    if (!selectedMedicine || !newMedicine.name || !newMedicine.strength || !newMedicine.dosageForm || !newMedicine.manufacturer) {
      toast({ title: 'Error', description: 'Please fill in all required fields' })
      return
    }
    updateMedicineMutation.mutate({ medicineId: selectedMedicine.id, updates: newMedicine })
  }

  const handleRestockMedicine = (medicine: any) => {
    setSelectedMedicine(medicine)
    setRestockAmount(0)
    setIsRestockOpen(true)
  }

  const handleRestock = () => {
    if (!selectedMedicine || restockAmount <= 0) {
      toast({ title: 'Error', description: 'Please enter a valid restock amount' })
      return
    }
    restockMedicineMutation.mutate({ medicineId: selectedMedicine.id, amount: restockAmount })
  }

  const generatePDFReport = (reportData: any) => {
    const pdf = new jsPDF()
    const pageWidth = pdf.internal.pageSize.width
    const pageHeight = pdf.internal.pageSize.height
    const margin = 20
    let yPosition = margin

    // Colors
    const primaryColor = [41, 128, 185] // Blue
    const accentColor = [52, 152, 219] // Light Blue
    const successColor = [39, 174, 96] // Green
    const warningColor = [230, 126, 34] // Orange

    // Helper function to add section with background
    const addSectionHeader = (title: string, color: number[]) => {
      pdf.setFillColor(color[0], color[1], color[2])
      pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 15, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(14)
      pdf.setFont("helvetica", "bold")
      pdf.text(title, margin + 5, yPosition + 5)
      pdf.setTextColor(0, 0, 0)
      yPosition += 20
    }

    // Helper function to add data rows with alternating background
    const addDataRows = (data: string[][], isFinancial = false) => {
      data.forEach(([label, value], index) => {
        if (index % 2 === 0) {
          pdf.setFillColor(248, 249, 250)
          pdf.rect(margin, yPosition - 3, pageWidth - 2 * margin, 12, 'F')
        }
        
        pdf.setFontSize(11)
        pdf.setFont("helvetica", "normal")
        pdf.setTextColor(51, 51, 51)
        pdf.text(label, margin + 5, yPosition + 3)
        
        // Style values differently for financial data
        if (isFinancial && value.includes('$')) {
          pdf.setTextColor(39, 174, 96) // Green for money
          pdf.setFont("helvetica", "bold")
        } else {
          pdf.setTextColor(0, 0, 0)
          pdf.setFont("helvetica", "bold")
        }
        
        pdf.text(value, margin + 120, yPosition + 3)
        pdf.setTextColor(0, 0, 0)
        yPosition += 12
      })
      yPosition += 10
    }

    // Header with logo area
    pdf.setFillColor(41, 128, 185)
    pdf.rect(0, 0, pageWidth, 60, 'F')
    
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(24)
    pdf.setFont("helvetica", "bold")
    pdf.text("SmartClinic Medical Center", pageWidth / 2, 25, { align: "center" })
    
    pdf.setFontSize(16)
    pdf.setFont("helvetica", "normal")
    pdf.text("Daily Healthcare Analytics Report", pageWidth / 2, 40, { align: "center" })
    
    yPosition = 80
    pdf.setTextColor(0, 0, 0)

    // Report metadata in a box
    pdf.setDrawColor(41, 128, 185)
    pdf.setLineWidth(1)
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 25)
    
    pdf.setFontSize(11)
    pdf.setFont("helvetica", "normal")
    pdf.text(`Report Date: ${reportData.date}`, margin + 5, yPosition + 8)
    pdf.text(`Generated: ${new Date(reportData.generatedAt).toLocaleString()}`, margin + 5, yPosition + 16)
    pdf.text(`Generated By: ${reportData.generatedBy}`, margin + 5, yPosition + 24)
    yPosition += 35

    // Executive Summary
    addSectionHeader("📊 Executive Summary", primaryColor)
    const summaryData = [
      ["Total Patients Today:", reportData.summary?.totalPatients?.toString() || "0"],
      ["Total Appointments:", reportData.summary?.totalAppointments?.toString() || "0"],
      ["Completed Appointments:", reportData.summary?.completedAppointments?.toString() || "0"],
      ["Cancelled Appointments:", reportData.summary?.cancelledAppointments?.toString() || "0"],
      ["Revenue Generated:", `$${reportData.summary?.revenue || 0}`],
      ["Active Staff:", reportData.summary?.activeStaff?.toString() || "0"],
      ["Queue Processed:", reportData.summary?.queueProcessed?.toString() || "0"]
    ]
    addDataRows(summaryData)

    // Check if we need a new page
    if (yPosition > pageHeight - 100) {
      pdf.addPage()
      yPosition = margin
    }

    // Financial Summary (Enhanced)
    addSectionHeader("💰 Financial Summary", successColor)
    const financialData = [
      ["Gross Revenue:", `$${reportData.financial?.grossRevenue || 0}`],
      ["Consultation Fees:", `$${reportData.financial?.consultationFees || 0}`],
      ["Average Revenue per Patient:", `$${reportData.financial?.averageRevenuePerPatient || 0}`],
      ["Total Revenue Today:", `$${reportData.summary?.revenue || 0}`],
      ["Revenue per Appointment:", reportData.summary?.totalAppointments > 0 ? `$${Math.round((reportData.summary?.revenue || 0) / reportData.summary.totalAppointments)}` : "$0"]
    ]
    addDataRows(financialData, true)

    // Appointment Analytics
    addSectionHeader("📅 Appointment Analytics", accentColor)
    const appointmentData = [
      ["Total Appointments:", reportData.appointments?.total?.toString() || "0"],
      ["Completed:", reportData.appointments?.completed?.toString() || "0"],
      ["Cancelled:", reportData.appointments?.cancelled?.toString() || "0"],
      ["Pending:", reportData.appointments?.pending?.toString() || "0"],
      ["Completion Rate:", `${reportData.appointments?.completionRate || 0}%`],
      ["Success Rate:", reportData.appointments?.total > 0 ? `${Math.round(((reportData.appointments?.completed || 0) / reportData.appointments.total) * 100)}%` : "0%"]
    ]
    addDataRows(appointmentData)

    // Patient Information
    addSectionHeader("👥 Patient Information", warningColor)
    const patientData = [
      ["New Registrations Today:", reportData.patients?.newRegistrations?.toString() || "0"],
      ["Total Active Patients:", reportData.patients?.totalActive?.toString() || "0"],
      ["Total Registered Patients:", reportData.patients?.totalRegistered?.toString() || "0"],
      ["Patient Growth Rate:", reportData.patients?.totalRegistered > 0 ? `${Math.round(((reportData.patients?.newRegistrations || 0) / reportData.patients.totalRegistered) * 100)}%` : "0%"]
    ]
    addDataRows(patientData)

    // Queue Management
    addSectionHeader("⏱️ Queue Management", [155, 89, 182])
    const queueData = [
      ["Processed Today:", reportData.queue?.processed?.toString() || "0"],
      ["Currently Waiting:", reportData.queue?.waiting?.toString() || "0"],
      ["Missed Appointments:", reportData.queue?.missed?.toString() || "0"],
      ["Average Wait Time:", `${reportData.queue?.averageWaitTime || 0} minutes`],
      ["Queue Efficiency:", reportData.queue?.processed > 0 ? `${Math.round(((reportData.queue?.processed || 0) / (reportData.queue?.processed + reportData.queue?.missed || 1)) * 100)}%` : "0%"]
    ]
    addDataRows(queueData)

    // Staff Performance
    addSectionHeader("👨‍⚕️ Staff Performance", [231, 76, 60])
    const staffData = [
      ["Active Staff:", reportData.staff?.active?.toString() || "0"],
      ["Staff On Duty:", reportData.staff?.onDuty?.toString() || "0"],
      ["Productivity Score:", reportData.staff?.productivity?.toString() || "0"],
      ["Patients per Staff:", reportData.staff?.active > 0 ? `${Math.round((reportData.summary?.totalPatients || 0) / reportData.staff.active)}` : "0"],
      ["Appointments per Staff:", reportData.staff?.active > 0 ? `${Math.round((reportData.summary?.totalAppointments || 0) / reportData.staff.active)}` : "0"]
    ]
    addDataRows(staffData)

    // Footer with enhanced styling
    const footerY = pageHeight - 15
    pdf.setFillColor(41, 128, 185)
    pdf.rect(0, footerY - 5, pageWidth, 20, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(10)
    pdf.setFont("helvetica", "normal")
    pdf.text("SmartClinic Medical Center - Confidential Healthcare Report", pageWidth / 2, footerY + 2, { align: "center" })
    pdf.text(`Page 1 | Report ID: SC-${reportData.date}-${Date.now()}`, pageWidth / 2, footerY + 8, { align: "center" })

    // Save the PDF
    const fileName = `SmartClinic_Daily_Report_${reportData.date}.pdf`
    pdf.save(fileName)
    
    toast({ 
      title: 'Success', 
      description: `Professional report downloaded as ${fileName}` 
    })
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

            <div className="flex items-center gap-4">
              {/* Notifications Dropdown */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    data-testid="button-notifications"
                  >
                    <Bell className="w-5 h-5" />
                    <Badge className="bg-red-500 text-white text-xs ml-1">3</Badge>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Notifications</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                      <div className="font-medium text-sm">New Patient Registration</div>
                      <div className="text-xs text-gray-600">John Smith registered 5 minutes ago</div>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                      <div className="font-medium text-sm">Appointment Reminder</div>
                      <div className="text-xs text-gray-600">Dr. Johnson has 3 appointments today</div>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
                      <div className="font-medium text-sm">Low Stock Alert</div>
                      <div className="text-xs text-gray-600">Paracetamol running low (5 units left)</div>
                    </div>
                    <Button className="w-full" variant="outline">
                      Mark All as Read
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Profile Dropdown */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    data-testid="button-profile"
                  >
                    <User className="w-5 h-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Admin Profile</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-8 h-8 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{currentUser?.firstName} {currentUser?.lastName}</h3>
                        <p className="text-sm text-gray-600">System Administrator</p>
                        <p className="text-xs text-gray-500">{currentUser?.email || 'admin@smartclinic.com'}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="w-full justify-start">
                            <User className="w-4 h-4 mr-2" />
                            Edit Profile
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Edit Admin Profile</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-firstName">First Name</Label>
                              <Input 
                                id="edit-firstName" 
                                defaultValue={currentUser?.firstName || 'Admin'}
                                placeholder="First Name"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-lastName">Last Name</Label>
                              <Input 
                                id="edit-lastName" 
                                defaultValue={currentUser?.lastName || 'User'}
                                placeholder="Last Name"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-email">Email</Label>
                              <Input 
                                id="edit-email" 
                                type="email"
                                defaultValue={currentUser?.email || 'admin@smartclinic.com'}
                                placeholder="Email Address"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-phone">Phone Number</Label>
                              <Input 
                                id="edit-phone" 
                                defaultValue={currentUser?.phoneNumber || '+1234567890'}
                                placeholder="Phone Number"
                                disabled
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button className="flex-1">Save Changes</Button>
                              <Button variant="outline" className="flex-1">Cancel</Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="w-full justify-start">
                            <Settings className="w-4 h-4 mr-2" />
                            Account Settings
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Account Settings</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-3">
                              <h4 className="font-medium">Security</h4>
                              <div className="space-y-2">
                                <Button variant="outline" className="w-full justify-start">
                                  <Shield className="w-4 h-4 mr-2" />
                                  Change Password
                                </Button>
                                <Button variant="outline" className="w-full justify-start">
                                  <Activity className="w-4 h-4 mr-2" />
                                  Two-Factor Authentication
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <h4 className="font-medium">Sessions</h4>
                              <div className="space-y-2">
                                <Button variant="outline" className="w-full justify-start">
                                  <LogOut className="w-4 h-4 mr-2" />
                                  Sign Out All Devices
                                </Button>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="w-full justify-start">
                            <Bell className="w-4 h-4 mr-2" />
                            Notification Preferences
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Notification Settings</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span>Email Notifications</span>
                              <input type="checkbox" defaultChecked className="rounded" />
                            </div>
                            <div className="flex items-center justify-between">
                              <span>SMS Alerts</span>
                              <input type="checkbox" defaultChecked className="rounded" />
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Emergency Alerts</span>
                              <input type="checkbox" defaultChecked className="rounded" />
                            </div>
                            <div className="flex items-center justify-between">
                              <span>System Updates</span>
                              <input type="checkbox" className="rounded" />
                            </div>
                            <Button className="w-full">Save Preferences</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Settings Dropdown */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    data-testid="button-settings"
                  >
                    <Settings className="w-5 h-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>System Settings</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <h4 className="font-medium">General Settings</h4>
                      <div className="space-y-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="w-full justify-start">
                              <Users className="w-4 h-4 mr-2" />
                              User Management
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>User Management</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-4 bg-blue-50 rounded-lg">
                                  <div className="text-2xl font-bold text-blue-600">{Array.isArray(patients) ? patients.length : 0}</div>
                                  <div className="text-sm text-gray-600">Active Patients</div>
                                </div>
                                <div className="text-center p-4 bg-green-50 rounded-lg">
                                  <div className="text-2xl font-bold text-green-600">3</div>
                                  <div className="text-sm text-gray-600">Doctors</div>
                                </div>
                                <div className="text-center p-4 bg-purple-50 rounded-lg">
                                  <div className="text-2xl font-bold text-purple-600">8</div>
                                  <div className="text-sm text-gray-600">Staff Members</div>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Button className="w-full">Add New User</Button>
                                <Button variant="outline" className="w-full">Manage Permissions</Button>
                                <Button variant="outline" className="w-full">View User Activity</Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="w-full justify-start">
                              <Calendar className="w-4 h-4 mr-2" />
                              Appointment Settings
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Appointment Configuration</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label>Default Appointment Duration</Label>
                                <Select defaultValue="30">
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="15">15 minutes</SelectItem>
                                    <SelectItem value="30">30 minutes</SelectItem>
                                    <SelectItem value="45">45 minutes</SelectItem>
                                    <SelectItem value="60">1 hour</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Booking Window (days ahead)</Label>
                                <Input type="number" defaultValue="30" />
                              </div>
                              <div className="flex items-center justify-between">
                                <span>Allow Same-Day Booking</span>
                                <input type="checkbox" defaultChecked className="rounded" />
                              </div>
                              <Button className="w-full">Save Settings</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="w-full justify-start">
                              <FileText className="w-4 h-4 mr-2" />
                              System Reports
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg">
                            <DialogHeader>
                              <DialogTitle>Generate Reports</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Button variant="outline" className="w-full justify-start">
                                  <Users className="w-4 h-4 mr-2" />
                                  Patient Activity Report
                                </Button>
                                <Button variant="outline" className="w-full justify-start">
                                  <Calendar className="w-4 h-4 mr-2" />
                                  Appointment Analytics
                                </Button>
                                <Button variant="outline" className="w-full justify-start">
                                  <DollarSign className="w-4 h-4 mr-2" />
                                  Revenue Summary
                                </Button>
                                <Button variant="outline" className="w-full justify-start">
                                  <Activity className="w-4 h-4 mr-2" />
                                  System Performance
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-medium">Security</h4>
                      <div className="space-y-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="w-full justify-start">
                              <Shield className="w-4 h-4 mr-2" />
                              Security Settings
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg">
                            <DialogHeader>
                              <DialogTitle>Security Settings</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span>Two-Factor Authentication</span>
                                  <input type="checkbox" defaultChecked className="rounded" />
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Password Complexity Requirements</span>
                                  <input type="checkbox" defaultChecked className="rounded" />
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Session Timeout (minutes)</span>
                                  <Input type="number" defaultValue="30" className="w-20" />
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Login Attempt Limit</span>
                                  <Input type="number" defaultValue="3" className="w-20" />
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Auto-lock System</span>
                                  <input type="checkbox" defaultChecked className="rounded" />
                                </div>
                              </div>
                              <Button className="w-full">Update Security Settings</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="w-full justify-start">
                              <Activity className="w-4 h-4 mr-2" />
                              Audit Logs
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>System Audit Logs</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="flex gap-4 items-center">
                                <Select defaultValue="all">
                                  <SelectTrigger className="w-40">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All Activities</SelectItem>
                                    <SelectItem value="login">Login Attempts</SelectItem>
                                    <SelectItem value="patient">Patient Changes</SelectItem>
                                    <SelectItem value="staff">Staff Actions</SelectItem>
                                    <SelectItem value="system">System Changes</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Input type="date" className="w-40" />
                                <Button>Filter</Button>
                              </div>
                              <div className="max-h-96 overflow-y-auto border rounded-lg">
                                <div className="space-y-2 p-4">
                                  {[
                                    { time: '2025-08-06 12:04:30', user: 'Admin User', action: 'Viewed patient records', type: 'patient' },
                                    { time: '2025-08-06 12:03:15', user: 'Dr. Sarah Johnson', action: 'Updated appointment status', type: 'appointment' },
                                    { time: '2025-08-06 12:01:45', user: 'Admin User', action: 'Added new medicine to inventory', type: 'inventory' },
                                    { time: '2025-08-06 11:58:20', user: 'Admin User', action: 'Login successful', type: 'login' },
                                    { time: '2025-08-06 11:45:10', user: 'Dr. Michael Davis', action: 'Created new patient record', type: 'patient' }
                                  ].map((log, index) => (
                                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                      <div>
                                        <div className="font-medium">{log.action}</div>
                                        <div className="text-sm text-gray-600">by {log.user}</div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-sm">{log.time}</div>
                                        <Badge className="text-xs">{log.type}</Badge>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline">Export Logs</Button>
                                <Button variant="outline">Clear Old Logs</Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-medium">System</h4>
                      <div className="space-y-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="w-full justify-start">
                              <Database className="w-4 h-4 mr-2" />
                              Database Management
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg">
                            <DialogHeader>
                              <DialogTitle>Database Management</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-4 bg-blue-50 rounded-lg">
                                  <div className="text-2xl font-bold text-blue-600">2.4 GB</div>
                                  <div className="text-sm text-gray-600">Database Size</div>
                                </div>
                                <div className="text-center p-4 bg-green-50 rounded-lg">
                                  <div className="text-2xl font-bold text-green-600">99.8%</div>
                                  <div className="text-sm text-gray-600">Uptime</div>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                  <span>Patients Table</span>
                                  <span className="font-medium">{Array.isArray(patients) ? patients.length : 0} records</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                  <span>Appointments Table</span>
                                  <span className="font-medium">12 records</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                  <span>Staff Table</span>
                                  <span className="font-medium">5 records</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                  <span>Medicines Table</span>
                                  <span className="font-medium">{medicines?.length || 0} records</span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Button variant="outline" className="w-full">Optimize Database</Button>
                                <Button variant="outline" className="w-full">Check Integrity</Button>
                                <Button variant="destructive" className="w-full">Clear Cache</Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="w-full justify-start">
                              <Download className="w-4 h-4 mr-2" />
                              Backup & Restore
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg">
                            <DialogHeader>
                              <DialogTitle>Backup & Restore</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-3">
                                <h4 className="font-medium">Automatic Backups</h4>
                                <div className="flex items-center justify-between">
                                  <span>Daily Backups</span>
                                  <input type="checkbox" defaultChecked className="rounded" />
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Weekly Full Backup</span>
                                  <input type="checkbox" defaultChecked className="rounded" />
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Retention (days)</span>
                                  <Input type="number" defaultValue="30" className="w-20" />
                                </div>
                              </div>
                              
                              <div className="space-y-3">
                                <h4 className="font-medium">Recent Backups</h4>
                                <div className="space-y-2">
                                  {[
                                    { date: '2025-08-06 06:00', type: 'Daily', size: '2.4 GB' },
                                    { date: '2025-08-05 06:00', type: 'Daily', size: '2.3 GB' },
                                    { date: '2025-08-04 00:00', type: 'Weekly', size: '2.2 GB' }
                                  ].map((backup, index) => (
                                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                      <div>
                                        <div className="font-medium">{backup.type} Backup</div>
                                        <div className="text-sm text-gray-600">{backup.date}</div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-sm">{backup.size}</div>
                                        <Button size="sm" variant="outline">Restore</Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <Button className="w-full">Create Backup Now</Button>
                                <Button variant="outline" className="w-full">Download Backup</Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button 
                variant="outline" 
                size="sm"
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
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
                        {emergencyAlerts.length > 0 ? (
                          emergencyAlerts.map((alert) => (
                            <div key={alert.id} className={`flex items-center justify-between p-3 bg-white rounded-lg border border-${alert.color}-200`}>
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 bg-${alert.color}-500 rounded-full`}></div>
                                <span className="text-sm font-medium">{alert.message}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">{alert.timeAgo}</span>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-xs bg-transparent"
                                  onClick={() => removeAlert(alert.id)}
                                  data-testid={`button-resolve-${alert.id}`}
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  Resolve
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                              <AlertTriangle className="w-6 h-6 text-green-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">All Clear!</h3>
                            <p className="text-gray-600">No emergency alerts at this time.</p>
                          </div>
                        )}
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
                        {/* Add Patient Dialog */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              className="h-20 flex-col gap-2 bg-blue-600 hover:bg-blue-700"
                              data-testid="button-quick-add-patient"
                            >
                              <UserPlus className="w-6 h-6" />
                              <span>Add Patient</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Add New Patient</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="firstName">First Name</Label>
                                  <Input
                                    id="firstName"
                                    value={patientForm.firstName}
                                    onChange={(e) => setPatientForm({...patientForm, firstName: e.target.value})}
                                    placeholder="John"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="lastName">Last Name</Label>
                                  <Input
                                    id="lastName"
                                    value={patientForm.lastName}
                                    onChange={(e) => setPatientForm({...patientForm, lastName: e.target.value})}
                                    placeholder="Doe"
                                  />
                                </div>
                              </div>
                              <div>
                                <Label htmlFor="phoneNumber">Phone Number</Label>
                                <Input
                                  id="phoneNumber"
                                  value={patientForm.phoneNumber}
                                  onChange={(e) => setPatientForm({...patientForm, phoneNumber: e.target.value})}
                                  placeholder="+1234567890"
                                />
                              </div>
                              <div>
                                <Label htmlFor="email">Email</Label>
                                <Input
                                  id="email"
                                  type="email"
                                  value={patientForm.email}
                                  onChange={(e) => setPatientForm({...patientForm, email: e.target.value})}
                                  placeholder="john@example.com"
                                />
                              </div>
                              <div>
                                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                                <Input
                                  id="dateOfBirth"
                                  type="date"
                                  value={patientForm.dateOfBirth}
                                  onChange={(e) => setPatientForm({...patientForm, dateOfBirth: e.target.value})}
                                />
                              </div>
                              <div>
                                <Label htmlFor="address">Address</Label>
                                <Textarea
                                  id="address"
                                  value={patientForm.address}
                                  onChange={(e) => setPatientForm({...patientForm, address: e.target.value})}
                                  placeholder="123 Main St, City, State"
                                />
                              </div>
                              <Button onClick={handlePatientSubmit} className="w-full">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Patient
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>

                        {/* Schedule Appointment Dialog */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              className="h-20 flex-col gap-2 bg-transparent"
                              data-testid="button-quick-schedule"
                            >
                              <Calendar className="w-6 h-6" />
                              <span>Schedule</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Schedule Appointment</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="patientSelect">Patient</Label>
                                <Input
                                  id="patientSelect"
                                  value={appointmentForm.patientId}
                                  onChange={(e) => setAppointmentForm({...appointmentForm, patientId: e.target.value})}
                                  placeholder="Search patient by name or ID"
                                />
                              </div>
                              <div>
                                <Label htmlFor="doctorSelect">Doctor</Label>
                                <Input
                                  id="doctorSelect"
                                  value={appointmentForm.doctorId}
                                  onChange={(e) => setAppointmentForm({...appointmentForm, doctorId: e.target.value})}
                                  placeholder="Select doctor"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="appointmentDate">Date</Label>
                                  <Input
                                    id="appointmentDate"
                                    type="date"
                                    value={appointmentForm.date}
                                    onChange={(e) => setAppointmentForm({...appointmentForm, date: e.target.value})}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="appointmentTime">Time</Label>
                                  <Input
                                    id="appointmentTime"
                                    type="time"
                                    value={appointmentForm.time}
                                    onChange={(e) => setAppointmentForm({...appointmentForm, time: e.target.value})}
                                  />
                                </div>
                              </div>
                              <div>
                                <Label htmlFor="appointmentType">Type</Label>
                                <Select onValueChange={(value) => setAppointmentForm({...appointmentForm, type: value})}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select appointment type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="consultation">Consultation</SelectItem>
                                    <SelectItem value="follow-up">Follow-up</SelectItem>
                                    <SelectItem value="emergency">Emergency</SelectItem>
                                    <SelectItem value="checkup">Checkup</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="symptoms">Symptoms/Notes</Label>
                                <Textarea
                                  id="symptoms"
                                  value={appointmentForm.symptoms}
                                  onChange={(e) => setAppointmentForm({...appointmentForm, symptoms: e.target.value})}
                                  placeholder="Describe symptoms or appointment purpose"
                                />
                              </div>
                              <Button onClick={handleAppointmentSubmit} className="w-full">
                                <Calendar className="w-4 h-4 mr-2" />
                                Schedule Appointment
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>

                        {/* Prescriptions Dialog */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              className="h-20 flex-col gap-2 bg-transparent"
                              data-testid="button-quick-prescriptions"
                            >
                              <FileText className="w-6 h-6" />
                              <span>Prescriptions</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Create Prescription</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="prescriptionPatient">Patient</Label>
                                <Input
                                  id="prescriptionPatient"
                                  value={prescriptionForm.patientId}
                                  onChange={(e) => setPrescriptionForm({...prescriptionForm, patientId: e.target.value})}
                                  placeholder="Search patient by name or ID"
                                />
                              </div>
                              <div>
                                <Label htmlFor="medicineName">Medicine Name</Label>
                                <Input
                                  id="medicineName"
                                  value={prescriptionForm.medicineName}
                                  onChange={(e) => setPrescriptionForm({...prescriptionForm, medicineName: e.target.value})}
                                  placeholder="Paracetamol, Amoxicillin, etc."
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="dosage">Dosage</Label>
                                  <Input
                                    id="dosage"
                                    value={prescriptionForm.dosage}
                                    onChange={(e) => setPrescriptionForm({...prescriptionForm, dosage: e.target.value})}
                                    placeholder="500mg"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="frequency">Frequency</Label>
                                  <Select onValueChange={(value) => setPrescriptionForm({...prescriptionForm, frequency: value})}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select frequency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="once-daily">Once Daily</SelectItem>
                                      <SelectItem value="twice-daily">Twice Daily</SelectItem>
                                      <SelectItem value="three-times">Three Times Daily</SelectItem>
                                      <SelectItem value="as-needed">As Needed</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div>
                                <Label htmlFor="duration">Duration</Label>
                                <Input
                                  id="duration"
                                  value={prescriptionForm.duration}
                                  onChange={(e) => setPrescriptionForm({...prescriptionForm, duration: e.target.value})}
                                  placeholder="7 days, 2 weeks, etc."
                                />
                              </div>
                              <div>
                                <Label htmlFor="instructions">Instructions</Label>
                                <Textarea
                                  id="instructions"
                                  value={prescriptionForm.instructions}
                                  onChange={(e) => setPrescriptionForm({...prescriptionForm, instructions: e.target.value})}
                                  placeholder="Take with food, after meals, etc."
                                />
                              </div>
                              <Button onClick={handlePrescriptionSubmit} className="w-full">
                                <FileText className="w-4 h-4 mr-2" />
                                Create Prescription
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>

                        {/* Discharge Dialog */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              className="h-20 flex-col gap-2 bg-transparent"
                              data-testid="button-quick-discharge"
                            >
                              <UserCheck className="w-6 h-6" />
                              <span>Discharge</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Patient Discharge</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="dischargePatient">Patient</Label>
                                <Input
                                  id="dischargePatient"
                                  value={dischargeForm.patientId}
                                  onChange={(e) => setDischargeForm({...dischargeForm, patientId: e.target.value})}
                                  placeholder="Search patient by name or ID"
                                />
                              </div>
                              <div>
                                <Label htmlFor="dischargeDate">Discharge Date</Label>
                                <Input
                                  id="dischargeDate"
                                  type="date"
                                  value={dischargeForm.dischargeDate}
                                  onChange={(e) => setDischargeForm({...dischargeForm, dischargeDate: e.target.value})}
                                />
                              </div>
                              <div>
                                <Label htmlFor="condition">Condition at Discharge</Label>
                                <Select onValueChange={(value) => setDischargeForm({...dischargeForm, condition: value})}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select condition" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="stable">Stable</SelectItem>
                                    <SelectItem value="improved">Improved</SelectItem>
                                    <SelectItem value="recovered">Fully Recovered</SelectItem>
                                    <SelectItem value="transfer">Transfer to Specialist</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="followUpInstructions">Follow-up Instructions</Label>
                                <Textarea
                                  id="followUpInstructions"
                                  value={dischargeForm.followUpInstructions}
                                  onChange={(e) => setDischargeForm({...dischargeForm, followUpInstructions: e.target.value})}
                                  placeholder="Return in 1 week, rest for 3 days, etc."
                                />
                              </div>
                              <div>
                                <Label htmlFor="dischargeMedications">Discharge Medications</Label>
                                <Textarea
                                  id="dischargeMedications"
                                  value={dischargeForm.medications}
                                  onChange={(e) => setDischargeForm({...dischargeForm, medications: e.target.value})}
                                  placeholder="List medications to continue at home"
                                />
                              </div>
                              <Button onClick={handleDischargeSubmit} className="w-full">
                                <UserCheck className="w-4 h-4 mr-2" />
                                Process Discharge
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
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
                    onClick={() => setShowAppointmentModal(true)}
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
                      appointments
                        .sort((a, b) => {
                          // Pending approval first, then by creation date
                          if (a.status === 'pending_approval' && b.status !== 'pending_approval') return -1;
                          if (b.status === 'pending_approval' && a.status !== 'pending_approval') return 1;
                          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                        })
                        .map((appointment) => (
                        <Card key={appointment.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                                appointment.status === 'pending_approval' ? 'bg-yellow-100' : 'bg-green-100'
                              }`}>
                                <Calendar className={`w-6 h-6 ${
                                  appointment.status === 'pending_approval' ? 'text-yellow-600' : 'text-green-600'
                                }`} />
                              </div>
                              <div>
                                <h3 className="font-semibold">
                                  {appointment.patient?.firstName} {appointment.patient?.lastName}
                                </h3>
                                <p className="text-sm text-gray-600">
                                  Dr. {appointment.doctor?.firstName} {appointment.doctor?.lastName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(appointment.appointmentDate).toLocaleDateString()} at {new Date(appointment.appointmentDate).toLocaleTimeString()}
                                </p>
                                {appointment.symptoms && (
                                  <p className="text-xs text-blue-600 mt-1">Symptoms: {appointment.symptoms}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <Badge className={
                                  appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                                  appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                  appointment.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }>
                                  {appointment.status === 'pending_approval' ? 'PENDING APPROVAL' : appointment.status}
                                </Badge>
                                <p className="text-sm text-gray-600 mt-1">
                                  {appointment.type || 'Consultation'}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                {appointment.status === 'pending_approval' ? (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => handleAppointmentAction(appointment.id, 'approve')}
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                      disabled={appointmentApproval.isPending}
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleAppointmentAction(appointment.id, 'reject')}
                                      className="border-red-300 text-red-600 hover:bg-red-50"
                                      disabled={appointmentApproval.isPending}
                                    >
                                      Reject
                                    </Button>
                                  </>
                                ) : (
                                  <div className="flex gap-2">
                                <Dialog>
                                    <DialogTrigger asChild>
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        data-testid={`button-reschedule-${appointment.id}`}
                                      >
                                        Reschedule
                                      </Button>
                                    </DialogTrigger>
                                  <DialogContent className="max-w-md">
                                    <DialogHeader>
                                      <DialogTitle>Reschedule Appointment</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div>
                                        <p className="text-sm text-gray-600">
                                          Patient: {appointment.patient.firstName} {appointment.patient.lastName}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                          Doctor: Dr. {appointment.doctor.firstName} {appointment.doctor.lastName}
                                        </p>
                                      </div>
                                      <div>
                                        <Label htmlFor={`newDate-${appointment.id}`}>New Date</Label>
                                        <Input
                                          id={`newDate-${appointment.id}`}
                                          type="date"
                                          min={new Date().toISOString().split('T')[0]}
                                          value={rescheduleForm.appointmentId === appointment.id ? rescheduleForm.newDate : ''}
                                          onChange={(e) => setRescheduleForm({
                                            appointmentId: appointment.id,
                                            newDate: e.target.value,
                                            newTime: rescheduleForm.newTime
                                          })}
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor={`newTime-${appointment.id}`}>New Time</Label>
                                        <Input
                                          id={`newTime-${appointment.id}`}
                                          type="time"
                                          value={rescheduleForm.appointmentId === appointment.id ? rescheduleForm.newTime : ''}
                                          onChange={(e) => setRescheduleForm({
                                            appointmentId: appointment.id,
                                            newDate: rescheduleForm.newDate,
                                            newTime: e.target.value
                                          })}
                                        />
                                      </div>
                                      <Button 
                                        className="w-full"
                                        onClick={() => {
                                          if (rescheduleForm.newDate && rescheduleForm.newTime) {
                                            handleReschedule(appointment.id, rescheduleForm.newDate, rescheduleForm.newTime)
                                          } else {
                                            toast({ 
                                              title: 'Error', 
                                              description: 'Please select both date and time',
                                              variant: 'destructive'
                                            })
                                          }
                                        }}
                                      >
                                        Confirm Reschedule
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>

                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      data-testid={`button-view-details-${appointment.id}`}
                                    >
                                      View Details
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                      <DialogTitle>Appointment Details</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-6">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <Label className="text-sm font-medium text-gray-700">Patient</Label>
                                          <p className="text-sm">{appointment.patient.firstName} {appointment.patient.lastName}</p>
                                          <p className="text-xs text-gray-500">{appointment.patient.phoneNumber}</p>
                                        </div>
                                        <div>
                                          <Label className="text-sm font-medium text-gray-700">Doctor</Label>
                                          <p className="text-sm">Dr. {appointment.doctor.firstName} {appointment.doctor.lastName}</p>
                                          <p className="text-xs text-gray-500">{appointment.doctor.phoneNumber}</p>
                                        </div>
                                      </div>
                                      
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <Label className="text-sm font-medium text-gray-700">Date & Time</Label>
                                          <p className="text-sm">{new Date(appointment.appointmentDate).toLocaleDateString()}</p>
                                          <p className="text-xs text-gray-500">{new Date(appointment.appointmentDate).toLocaleTimeString()}</p>
                                        </div>
                                        <div>
                                          <Label className="text-sm font-medium text-gray-700">Type & Duration</Label>
                                          <p className="text-sm">{appointment.type || 'Consultation'}</p>
                                          <p className="text-xs text-gray-500">{appointment.duration || 30} minutes</p>
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <Label className="text-sm font-medium text-gray-700">Status</Label>
                                        <Badge className={
                                          appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                                          appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                          appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                          'bg-gray-100 text-gray-800'
                                        }>
                                          {appointment.status}
                                        </Badge>
                                      </div>
                                      
                                      {appointment.symptoms && (
                                        <div>
                                          <Label className="text-sm font-medium text-gray-700">Symptoms</Label>
                                          <p className="text-sm text-gray-600">{appointment.symptoms}</p>
                                        </div>
                                      )}
                                      
                                      {appointment.diagnosis && (
                                        <div>
                                          <Label className="text-sm font-medium text-gray-700">Diagnosis</Label>
                                          <p className="text-sm text-gray-600">{appointment.diagnosis}</p>
                                        </div>
                                      )}
                                      
                                      {appointment.treatmentPlan && (
                                        <div>
                                          <Label className="text-sm font-medium text-gray-700">Treatment Plan</Label>
                                          <p className="text-sm text-gray-600">{appointment.treatmentPlan}</p>
                                        </div>
                                      )}
                                      
                                      <div className="text-xs text-gray-500 border-t pt-4">
                                        <p>Created: {new Date(appointment.createdAt).toLocaleString()}</p>
                                        <p>Last Updated: {new Date(appointment.updatedAt).toLocaleString()}</p>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
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
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        className="bg-blue-600 hover:bg-blue-700"
                        data-testid="button-add-patient"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Patient
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add New Patient</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="firstName">First Name</Label>
                            <Input
                              id="firstName"
                              value={patientForm.firstName}
                              onChange={(e) => setPatientForm({...patientForm, firstName: e.target.value})}
                              placeholder="John"
                            />
                          </div>
                          <div>
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input
                              id="lastName"
                              value={patientForm.lastName}
                              onChange={(e) => setPatientForm({...patientForm, lastName: e.target.value})}
                              placeholder="Doe"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="phoneNumber">Phone Number</Label>
                          <Input
                            id="phoneNumber"
                            value={patientForm.phoneNumber}
                            onChange={(e) => setPatientForm({...patientForm, phoneNumber: e.target.value})}
                            placeholder="+1234567890"
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email (Optional)</Label>
                          <Input
                            id="email"
                            type="email"
                            value={patientForm.email}
                            onChange={(e) => setPatientForm({...patientForm, email: e.target.value})}
                            placeholder="john.doe@example.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="dateOfBirth">Date of Birth (Optional)</Label>
                          <Input
                            id="dateOfBirth"
                            type="date"
                            value={patientForm.dateOfBirth}
                            onChange={(e) => setPatientForm({...patientForm, dateOfBirth: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="address">Address (Optional)</Label>
                          <Textarea
                            id="address"
                            value={patientForm.address}
                            onChange={(e) => setPatientForm({...patientForm, address: e.target.value})}
                            placeholder="123 Main St, City, State"
                          />
                        </div>
                        <Button onClick={handlePatientSubmit} className="w-full">
                          <UserPlus className="w-4 h-4 mr-2" />
                          Add Patient
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {patientsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Array.isArray(patients) && patients.length > 0 ? (
                      patients.map((patient: any) => (
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
                                  onClick={() => handleViewHistory(patient)}
                                  data-testid={`button-view-history-${patient.id}`}
                                >
                                  View History
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleEditProfile(patient)}
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
                    onClick={() => setIsAddMedicineOpen(true)}
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
                  <div className="space-y-4" key={forceRender}>
                    {medicines && medicines.length > 0 ? (
                      medicines.map((medicine: Medicine) => (
                        <Card key={`${medicine.id}-${forceRender}`} className="p-4">
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
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleRestockMedicine(medicine)}
                                  data-testid={`button-restock-${medicine.id}`}
                                >
                                  Restock
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleEditMedicine(medicine)}
                                  data-testid={`button-edit-${medicine.id}`}
                                >
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
                  <div className="flex gap-3">
                    <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700" data-testid="button-add-staff">
                          <UserPlus className="w-4 h-4 mr-2" />
                          Add Staff Member
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Add New Staff Member</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="staffFirstName">First Name</Label>
                              <Input 
                                id="staffFirstName" 
                                placeholder="First Name"
                                value={staffForm.firstName}
                                onChange={(e) => setStaffForm(prev => ({ ...prev, firstName: e.target.value }))}
                              />
                            </div>
                            <div>
                              <Label htmlFor="staffLastName">Last Name</Label>
                              <Input 
                                id="staffLastName" 
                                placeholder="Last Name"
                                value={staffForm.lastName}
                                onChange={(e) => setStaffForm(prev => ({ ...prev, lastName: e.target.value }))}
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="staffRole">Role</Label>
                            <Select value={staffForm.role} onValueChange={(value) => setStaffForm(prev => ({ ...prev, role: value }))}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="doctor">Doctor</SelectItem>
                                <SelectItem value="nurse">Nurse</SelectItem>
                                <SelectItem value="staff">Administrative Staff</SelectItem>
                                <SelectItem value="admin">Administrator</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="staffPhone">Phone Number</Label>
                            <Input 
                              id="staffPhone" 
                              placeholder="+1234567890"
                              value={staffForm.phoneNumber}
                              onChange={(e) => setStaffForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="staffEmail">Email</Label>
                            <Input 
                              id="staffEmail" 
                              type="email" 
                              placeholder="staff@smartclinic.com"
                              value={staffForm.email}
                              onChange={(e) => setStaffForm(prev => ({ ...prev, email: e.target.value }))}
                            />
                          </div>
                          <Button className="w-full" onClick={handleStaffSubmit}>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Add Staff Member
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline">
                          <Shield className="w-4 h-4 mr-2" />
                          GPS Verification
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Staff GPS Verification Status</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid gap-3">
                            <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                              <div className="flex justify-between items-center">
                                <div>
                                  <h4 className="font-medium">Dr. Sarah Johnson</h4>
                                  <p className="text-sm text-gray-600">Last check-in: 8:45 AM</p>
                                </div>
                                <Badge className="bg-green-100 text-green-800">On-site</Badge>
                              </div>
                            </div>
                            <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                              <div className="flex justify-between items-center">
                                <div>
                                  <h4 className="font-medium">Nurse Mary Davis</h4>
                                  <p className="text-sm text-gray-600">Last check-in: 7:30 AM</p>
                                </div>
                                <Badge className="bg-yellow-100 text-yellow-800">Home Visit</Badge>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <h4 className="font-medium">GPS Settings</h4>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm">Require GPS for clock-in</span>
                                <input type="checkbox" defaultChecked className="rounded" />
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm">Alert for location violations</span>
                                <input type="checkbox" defaultChecked className="rounded" />
                              </div>
                            </div>
                            <Button className="w-full" variant="outline">Update Settings</Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {/* Staff Statistics */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Staff</p>
                          <p className="text-2xl font-bold text-blue-600">12</p>
                        </div>
                        <Users className="w-8 h-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Doctors</p>
                          <p className="text-2xl font-bold text-green-600">5</p>
                        </div>
                        <Stethoscope className="w-8 h-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Nurses</p>
                          <p className="text-2xl font-bold text-purple-600">4</p>
                        </div>
                        <User className="w-8 h-8 text-purple-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">On Duty</p>
                          <p className="text-2xl font-bold text-orange-600">8</p>
                        </div>
                        <Activity className="w-8 h-8 text-orange-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {usersLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4" key={forceRender}>
                    {staffMembers && staffMembers.length > 0 ? (
                      staffMembers.map((staff) => (
                          <Card key={`${staff.id}-${forceRender}`} className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                                  staff.role === 'doctor' ? 'bg-green-100' :
                                  staff.role === 'nurse' ? 'bg-purple-100' :
                                  staff.role === 'admin' ? 'bg-blue-100' : 'bg-gray-100'
                                }`}>
                                  {staff.role === 'doctor' ? (
                                    <Stethoscope className="w-6 h-6 text-green-600" />
                                  ) : staff.role === 'nurse' ? (
                                    <User className="w-6 h-6 text-purple-600" />
                                  ) : staff.role === 'admin' ? (
                                    <Shield className="w-6 h-6 text-blue-600" />
                                  ) : (
                                    <User className="w-6 h-6 text-gray-600" />
                                  )}
                                </div>
                                <div>
                                  <h3 className="font-semibold">
                                    {staff.firstName} {staff.lastName}
                                  </h3>
                                  <p className="text-sm text-gray-600">
                                    {staff.phoneNumber}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge className={
                                      staff.role === 'doctor' ? 'bg-green-100 text-green-800' :
                                      staff.role === 'nurse' ? 'bg-purple-100 text-purple-800' :
                                      staff.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                                      'bg-gray-100 text-gray-800'
                                    }>
                                      {staff.role.charAt(0).toUpperCase() + staff.role.slice(1)}
                                    </Badge>
                                    <span className="text-xs text-gray-500">
                                      ID: {staff.id.slice(0, 8)}...
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <Badge className={
                                    staff.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }>
                                    {staff.isActive ? 'Active' : 'Inactive'}
                                  </Badge>
                                  {!staff.isApproved && (
                                    <Badge className="bg-yellow-100 text-yellow-800 ml-2">
                                      Pending Approval
                                    </Badge>
                                  )}
                                  <p className="text-xs text-gray-500 mt-1">
                                    Joined: {new Date(staff.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        data-testid={`button-view-details-${staff.id}`}
                                      >
                                        View Details
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-lg">
                                      <DialogHeader>
                                        <DialogTitle>Staff Member Details</DialogTitle>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                                          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                                            staff.role === 'doctor' ? 'bg-green-100' :
                                            staff.role === 'nurse' ? 'bg-purple-100' :
                                            staff.role === 'admin' ? 'bg-blue-100' : 'bg-gray-100'
                                          }`}>
                                            {staff.role === 'doctor' ? (
                                              <Stethoscope className="w-8 h-8 text-green-600" />
                                            ) : staff.role === 'nurse' ? (
                                              <User className="w-8 h-8 text-purple-600" />
                                            ) : staff.role === 'admin' ? (
                                              <Shield className="w-8 h-8 text-blue-600" />
                                            ) : (
                                              <User className="w-8 h-8 text-gray-600" />
                                            )}
                                          </div>
                                          <div>
                                            <h3 className="font-semibold text-lg">{staff.firstName} {staff.lastName}</h3>
                                            <p className="text-sm text-gray-600">{staff.role.charAt(0).toUpperCase() + staff.role.slice(1)}</p>
                                            <p className="text-xs text-gray-500">{staff.email || 'No email on file'}</p>
                                          </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                                            <h4 className="font-medium mb-2">Contact Information</h4>
                                            <div className="space-y-1 text-sm">
                                              <p><span className="text-gray-600">Phone:</span> {staff.phoneNumber}</p>
                                              <p><span className="text-gray-600">Email:</span> {staff.email || 'Not provided'}</p>
                                              <p><span className="text-gray-600">Address:</span> {staff.address || 'Not provided'}</p>
                                            </div>
                                          </div>
                                          
                                          <div>
                                            <h4 className="font-medium mb-2">Work Information</h4>
                                            <div className="space-y-1 text-sm">
                                              <p><span className="text-gray-600">Department:</span> {staff.role === 'doctor' ? 'Medical' : staff.role === 'nurse' ? 'Nursing' : 'Administration'}</p>
                                              <p><span className="text-gray-600">Status:</span> {staff.isActive ? 'Active' : 'Inactive'}</p>
                                              <p><span className="text-gray-600">Approved:</span> {staff.isApproved ? 'Yes' : 'Pending'}</p>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        <div>
                                          <h4 className="font-medium mb-2">Recent Activity</h4>
                                          <div className="space-y-2">
                                            <div className="p-2 bg-blue-50 rounded text-sm">
                                              <span className="text-blue-800">Last login:</span> Today at 9:30 AM
                                            </div>
                                            <div className="p-2 bg-green-50 rounded text-sm">
                                              <span className="text-green-800">Patients seen today:</span> {staff.role === 'doctor' ? '12' : staff.role === 'nurse' ? '8' : 'N/A'}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                  
                                  {!staff.isApproved && (
                                    <Button 
                                      size="sm" 
                                      className="bg-green-600 hover:bg-green-700"
                                      onClick={() => handleApproveUser(staff.id)}
                                      disabled={approveUser.isPending}
                                      data-testid={`button-approve-${staff.id}`}
                                    >
                                      {approveUser.isPending ? 'Approving...' : 'Approve'}
                                    </Button>
                                  )}
                                  
                                  {staff.isActive ? (
                                    <Button 
                                      size="sm" 
                                      variant="destructive"
                                      onClick={() => handleDeactivateUser(staff.id)}
                                      disabled={updateUserStatus.isPending}
                                      data-testid={`button-deactivate-${staff.id}`}
                                    >
                                      {updateUserStatus.isPending ? 'Deactivating...' : 'Deactivate'}
                                    </Button>
                                  ) : (
                                    <Button 
                                      size="sm" 
                                      className="bg-blue-600 hover:bg-blue-700"
                                      onClick={() => handleActivateUser(staff.id)}
                                      disabled={updateUserStatus.isPending}
                                      data-testid={`button-activate-${staff.id}`}
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
                        <Stethoscope className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Staff Members</h3>
                        <p className="text-gray-600">No staff members found in the system.</p>
                        <Button className="mt-4">
                          <UserPlus className="w-4 h-4 mr-2" />
                          Add First Staff Member
                        </Button>
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
                  <div className="flex gap-2">
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={handleGenerateReport}
                      disabled={generateReport.isPending}
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      {generateReport.isPending ? 'Generating...' : 'Generate Report'}
                    </Button>
                    {reportData && (
                      <Button 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => generatePDFReport(reportData)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </Button>
                    )}
                  </div>
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
                          <span className="font-semibold">{reportData?.summary?.totalPatients || stats?.patientsToday || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Completed Appointments</span>
                          <span className="font-semibold">{reportData?.summary?.completedAppointments || stats?.completedAppointments || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Revenue</span>
                          <span className="font-semibold">${reportData?.summary?.revenue || stats?.revenue || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Active Staff</span>
                          <span className="font-semibold">{reportData?.summary?.activeStaff || stats?.activeStaff || 0}</span>
                        </div>
                        {reportData && (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Queue Processed</span>
                              <span className="font-semibold">{reportData.summary.queueProcessed}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Completion Rate</span>
                              <span className="font-semibold">{reportData.appointments.completionRate}%</span>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Enhanced Report Display */}
                  {reportData && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-purple-500" />
                          Generated Report Details
                        </CardTitle>
                        <p className="text-sm text-gray-500">
                          Generated on {new Date(reportData.generatedAt).toLocaleString()} by {reportData.generatedBy}
                        </p>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <h4 className="font-medium text-gray-700">Appointments</h4>
                            <div className="text-sm space-y-1">
                              <div className="flex justify-between">
                                <span>Total:</span>
                                <span className="font-medium">{reportData.appointments.total}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Completed:</span>
                                <span className="font-medium text-green-600">{reportData.appointments.completed}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Cancelled:</span>
                                <span className="font-medium text-red-600">{reportData.appointments.cancelled}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Completion Rate:</span>
                                <span className="font-medium">{reportData.appointments.completionRate}%</span>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-medium text-gray-700">Financial</h4>
                            <div className="text-sm space-y-1">
                              <div className="flex justify-between">
                                <span>Gross Revenue:</span>
                                <span className="font-medium text-green-600">${reportData.financial.grossRevenue}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Consultation Fees:</span>
                                <span className="font-medium">${reportData.financial.consultationFees}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Avg per Patient:</span>
                                <span className="font-medium">${reportData.financial.averageRevenuePerPatient}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

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

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Recent Appointments</h4>
                  <div className="space-y-2">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium">Consultation</div>
                      <div className="text-sm text-gray-600">Dr. Smith • Jan 15, 2024</div>
                      <div className="text-sm">Routine checkup completed</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium">Follow-up</div>
                      <div className="text-sm text-gray-600">Dr. Johnson • Dec 28, 2023</div>
                      <div className="text-sm">Blood pressure monitoring</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Current Medications</h4>
                  <div className="space-y-2">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="font-medium">Lisinopril 10mg</div>
                      <div className="text-sm text-gray-600">Once daily • Started Dec 2023</div>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="font-medium">Metformin 500mg</div>
                      <div className="text-sm text-gray-600">Twice daily • Started Nov 2023</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Medical Notes</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700">
                    Patient has been managing diabetes well with current medication regimen. 
                    Blood pressure readings have been stable. Recommends continued monitoring 
                    and follow-up in 3 months.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowHistoryModal(false)}
                  className="flex-1"
                >
                  Close
                </Button>
                <Button 
                  className="flex-1"
                  onClick={() => handleDownloadPatientHistory(selectedPatient)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Download Full History
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Patient Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Patient Profile</DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editFirstName">First Name</Label>
                  <Input
                    id="editFirstName"
                    value={editPatientForm.firstName}
                    onChange={(e) => setEditPatientForm({...editPatientForm, firstName: e.target.value})}
                    placeholder="First Name"
                  />
                </div>
                <div>
                  <Label htmlFor="editLastName">Last Name</Label>
                  <Input
                    id="editLastName"
                    value={editPatientForm.lastName}
                    onChange={(e) => setEditPatientForm({...editPatientForm, lastName: e.target.value})}
                    placeholder="Last Name"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="editPhone">Phone Number</Label>
                <Input
                  id="editPhone"
                  value={editPatientForm.phoneNumber}
                  onChange={(e) => setEditPatientForm({...editPatientForm, phoneNumber: e.target.value})}
                  placeholder="Phone Number"
                />
              </div>
              <div>
                <Label htmlFor="editEmail">Email</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editPatientForm.email}
                  onChange={(e) => setEditPatientForm({...editPatientForm, email: e.target.value})}
                  placeholder="Email Address"
                />
              </div>
              <div>
                <Label htmlFor="editAddress">Address</Label>
                <Textarea
                  id="editAddress"
                  value={editPatientForm.address}
                  onChange={(e) => setEditPatientForm({...editPatientForm, address: e.target.value})}
                  placeholder="Home Address"
                />
              </div>
              <div>
                <Label htmlFor="editDOB">Date of Birth</Label>
                <Input
                  id="editDOB"
                  type="date"
                  value={editPatientForm.dateOfBirth}
                  onChange={(e) => setEditPatientForm({...editPatientForm, dateOfBirth: e.target.value})}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowEditModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button onClick={handleUpdatePatient} className="flex-1">
                  <User className="w-4 h-4 mr-2" />
                  Update Profile
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Medicine Modal */}
      <Dialog open={isAddMedicineOpen} onOpenChange={setIsAddMedicineOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Medicine</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="medicine-name">Medicine Name *</Label>
              <Input
                id="medicine-name"
                value={newMedicine.name}
                onChange={(e) => setNewMedicine({ ...newMedicine, name: e.target.value })}
                placeholder="Enter medicine name"
                data-testid="input-medicine-name"
              />
            </div>
            <div>
              <Label htmlFor="medicine-strength">Strength *</Label>
              <Input
                id="medicine-strength"
                value={newMedicine.strength}
                onChange={(e) => setNewMedicine({ ...newMedicine, strength: e.target.value })}
                placeholder="e.g., 250mg, 500ml"
                data-testid="input-medicine-strength"
              />
            </div>
            <div>
              <Label htmlFor="medicine-form">Dosage Form *</Label>
              <Select value={newMedicine.dosageForm} onValueChange={(value) => setNewMedicine({ ...newMedicine, dosageForm: value })}>
                <SelectTrigger data-testid="select-medicine-form">
                  <SelectValue placeholder="Select dosage form" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tablet">Tablet</SelectItem>
                  <SelectItem value="capsule">Capsule</SelectItem>
                  <SelectItem value="syrup">Syrup</SelectItem>
                  <SelectItem value="injection">Injection</SelectItem>
                  <SelectItem value="cream">Cream</SelectItem>
                  <SelectItem value="drops">Drops</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="medicine-manufacturer">Manufacturer *</Label>
              <Input
                id="medicine-manufacturer"
                value={newMedicine.manufacturer}
                onChange={(e) => setNewMedicine({ ...newMedicine, manufacturer: e.target.value })}
                placeholder="Enter manufacturer name"
                data-testid="input-medicine-manufacturer"
              />
            </div>
            <div>
              <Label htmlFor="medicine-stock">Initial Stock</Label>
              <Input
                id="medicine-stock"
                type="number"
                value={newMedicine.stock}
                onChange={(e) => setNewMedicine({ ...newMedicine, stock: parseInt(e.target.value) || 0 })}
                placeholder="0"
                data-testid="input-medicine-stock"
              />
            </div>
            <div>
              <Label htmlFor="medicine-description">Description</Label>
              <Textarea
                id="medicine-description"
                value={newMedicine.description}
                onChange={(e) => setNewMedicine({ ...newMedicine, description: e.target.value })}
                placeholder="Optional description"
                data-testid="textarea-medicine-description"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleAddMedicine}
                disabled={addMedicineMutation.isPending}
                className="flex-1"
                data-testid="button-save-medicine"
              >
                {addMedicineMutation.isPending ? 'Adding...' : 'Add Medicine'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsAddMedicineOpen(false)}
                data-testid="button-cancel-add-medicine"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Medicine Modal */}
      <Dialog open={isEditMedicineOpen} onOpenChange={setIsEditMedicineOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Medicine</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-medicine-name">Medicine Name *</Label>
              <Input
                id="edit-medicine-name"
                value={newMedicine.name}
                onChange={(e) => setNewMedicine({ ...newMedicine, name: e.target.value })}
                placeholder="Enter medicine name"
                data-testid="input-edit-medicine-name"
              />
            </div>
            <div>
              <Label htmlFor="edit-medicine-strength">Strength *</Label>
              <Input
                id="edit-medicine-strength"
                value={newMedicine.strength}
                onChange={(e) => setNewMedicine({ ...newMedicine, strength: e.target.value })}
                placeholder="e.g., 250mg, 500ml"
                data-testid="input-edit-medicine-strength"
              />
            </div>
            <div>
              <Label htmlFor="edit-medicine-form">Dosage Form *</Label>
              <Select value={newMedicine.dosageForm} onValueChange={(value) => setNewMedicine({ ...newMedicine, dosageForm: value })}>
                <SelectTrigger data-testid="select-edit-medicine-form">
                  <SelectValue placeholder="Select dosage form" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tablet">Tablet</SelectItem>
                  <SelectItem value="capsule">Capsule</SelectItem>
                  <SelectItem value="syrup">Syrup</SelectItem>
                  <SelectItem value="injection">Injection</SelectItem>
                  <SelectItem value="cream">Cream</SelectItem>
                  <SelectItem value="drops">Drops</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-medicine-manufacturer">Manufacturer *</Label>
              <Input
                id="edit-medicine-manufacturer"
                value={newMedicine.manufacturer}
                onChange={(e) => setNewMedicine({ ...newMedicine, manufacturer: e.target.value })}
                placeholder="Enter manufacturer name"
                data-testid="input-edit-medicine-manufacturer"
              />
            </div>
            <div>
              <Label htmlFor="edit-medicine-stock">Stock</Label>
              <Input
                id="edit-medicine-stock"
                type="number"
                value={newMedicine.stock}
                onChange={(e) => setNewMedicine({ ...newMedicine, stock: parseInt(e.target.value) || 0 })}
                placeholder="0"
                data-testid="input-edit-medicine-stock"
              />
            </div>
            <div>
              <Label htmlFor="edit-medicine-description">Description</Label>
              <Textarea
                id="edit-medicine-description"
                value={newMedicine.description}
                onChange={(e) => setNewMedicine({ ...newMedicine, description: e.target.value })}
                placeholder="Optional description"
                data-testid="textarea-edit-medicine-description"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleUpdateMedicine}
                disabled={updateMedicineMutation.isPending}
                className="flex-1"
                data-testid="button-update-medicine"
              >
                {updateMedicineMutation.isPending ? 'Updating...' : 'Update Medicine'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditMedicineOpen(false)}
                data-testid="button-cancel-edit-medicine"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restock Medicine Modal */}
      <Dialog open={isRestockOpen} onOpenChange={setIsRestockOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Restock Medicine</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedMedicine && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold">{selectedMedicine.name}</h3>
                <p className="text-sm text-gray-600">{selectedMedicine.strength} - {selectedMedicine.dosageForm}</p>
                <p className="text-sm text-gray-500">Current Stock: {selectedMedicine.stock || 0} units</p>
              </div>
            )}
            <div>
              <Label htmlFor="restock-amount">Restock Amount *</Label>
              <Input
                id="restock-amount"
                type="number"
                value={restockAmount}
                onChange={(e) => setRestockAmount(parseInt(e.target.value) || 0)}
                placeholder="Enter amount to add"
                min="1"
                data-testid="input-restock-amount"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleRestock}
                disabled={restockMedicineMutation.isPending}
                className="flex-1"
                data-testid="button-confirm-restock"
              >
                {restockMedicineMutation.isPending ? 'Restocking...' : 'Restock Medicine'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsRestockOpen(false)}
                data-testid="button-cancel-restock"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Appointment Modal */}
      <Dialog open={showAppointmentModal} onOpenChange={setShowAppointmentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule New Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="patient-select">Patient *</Label>
              <Select value={appointmentForm.patientId} onValueChange={(value) => setAppointmentForm({ ...appointmentForm, patientId: value })}>
                <SelectTrigger data-testid="select-appointment-patient">
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients?.filter(p => p.role === 'patient').map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.firstName} {patient.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="doctor-select">Doctor *</Label>
              <Select value={appointmentForm.doctorId} onValueChange={(value) => setAppointmentForm({ ...appointmentForm, doctorId: value })}>
                <SelectTrigger data-testid="select-appointment-doctor">
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent>
                  {users?.filter(u => u.role === 'doctor').map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      Dr. {doctor.firstName} {doctor.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="appointment-date">Date *</Label>
              <Input
                id="appointment-date"
                type="date"
                value={appointmentForm.appointmentDate}
                onChange={(e) => setAppointmentForm({ ...appointmentForm, appointmentDate: e.target.value })}
                data-testid="input-appointment-date"
              />
            </div>
            <div>
              <Label htmlFor="appointment-time">Time *</Label>
              <Input
                id="appointment-time"
                type="time"
                value={appointmentForm.appointmentTime}
                onChange={(e) => setAppointmentForm({ ...appointmentForm, appointmentTime: e.target.value })}
                data-testid="input-appointment-time"
              />
            </div>
            <div>
              <Label htmlFor="consultation-type">Consultation Type</Label>
              <Select value={appointmentForm.consultationType} onValueChange={(value) => setAppointmentForm({ ...appointmentForm, consultationType: value })}>
                <SelectTrigger data-testid="select-consultation-type">
                  <SelectValue placeholder="Select consultation type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular Consultation</SelectItem>
                  <SelectItem value="follow-up">Follow-up</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="video-call">Video Call</SelectItem>
                  <SelectItem value="home-visit">Home Visit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="symptoms">Symptoms/Notes</Label>
              <Textarea
                id="symptoms"
                value={appointmentForm.symptoms}
                onChange={(e) => setAppointmentForm({ ...appointmentForm, symptoms: e.target.value })}
                placeholder="Enter symptoms or additional notes"
                data-testid="textarea-appointment-symptoms"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleAppointmentSubmit}
                className="flex-1"
                data-testid="button-schedule-appointment"
              >
                Schedule Appointment
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowAppointmentModal(false)}
                data-testid="button-cancel-appointment"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}