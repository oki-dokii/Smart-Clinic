'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { MapPin, Clock, CheckCircle, XCircle, Loader2, Navigation } from 'lucide-react'
import { apiRequest } from '@/lib/queryClient'

interface StaffVerification {
  id: string
  staffId: string
  latitude: number
  longitude: number
  checkedInAt: string
  checkedOutAt: string | null
  workLocation: string
  isValid: boolean
}

const CLINIC_LOCATIONS = [
  { name: 'Bangalore Central Clinic', description: 'Primary Bangalore healthcare facility' },
  { name: 'Whitefield Branch', description: 'Eastern Bangalore location' },
  { name: 'Koramangala Clinic', description: 'South Bangalore branch' },
  { name: 'Electronic City Clinic', description: 'IT hub location in South Bangalore' }
]

export default function StaffCheckinPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const [selectedLocation, setSelectedLocation] = useState('')
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [locationStatus, setLocationStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle')
  
  // Get current user
  const { data: user } = useQuery({
    queryKey: ['/api/users/me'],
  })

  // Get staff verifications (check-in history)
  const { data: verifications, isLoading: verificationsLoading } = useQuery({
    queryKey: ['/api/staff/verifications'],
  })

  // Get active verification (currently checked in)
  const activeVerification = Array.isArray(verifications) ? verifications.find((v: StaffVerification) => !v.checkedOutAt) : null

  // Check-in mutation
  const checkinMutation = useMutation({
    mutationFn: async (data: { latitude: number; longitude: number; workLocation: string }) => {
      const response = await fetch('/api/staff/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Check-in failed')
      }
      
      return response.json()
    },
    onSuccess: () => {
      toast({
        title: "✅ Checked In Successfully",
        description: "Your location has been verified and recorded."
      })
      queryClient.invalidateQueries({ queryKey: ['/api/staff/verifications'] })
      setSelectedLocation('')
    },
    onError: (error: any) => {
      toast({
        title: "❌ Check-in Failed",
        description: error.message || "Unable to verify your location. Please try again.",
        variant: "destructive"
      })
    }
  })

  // Check-out mutation
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/staff/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Check-out failed')
      }
      
      return response.json()
    },
    onSuccess: () => {
      toast({
        title: "✅ Checked Out Successfully",
        description: "Your work session has ended."
      })
      queryClient.invalidateQueries({ queryKey: ['/api/staff/verifications'] })
    },
    onError: (error: any) => {
      toast({
        title: "❌ Check-out Failed",
        description: error.message || "Unable to process check-out. Please try again.",
        variant: "destructive"
      })
    }
  })

  // Request location permission and get current position
  const requestLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "❌ Location Not Supported",
        description: "Your browser doesn't support location services.",
        variant: "destructive"
      })
      return
    }

    setLocationStatus('requesting')
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentPosition({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
        setLocationStatus('granted')
        toast({
          title: "📍 Location Accessed",
          description: `Coordinates: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
        })
      },
      (error) => {
        setLocationStatus('denied')
        let message = "Unable to get your location."
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            message = "Location access denied. Please enable location permissions."
            break
          case error.POSITION_UNAVAILABLE:
            message = "Location information unavailable."
            break
          case error.TIMEOUT:
            message = "Location request timed out."
            break
        }
        
        toast({
          title: "❌ Location Error",
          description: message,
          variant: "destructive"
        })
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    )
  }

  // Handle check-in
  const handleCheckin = () => {
    if (!currentPosition || !selectedLocation) {
      toast({
        title: "❌ Missing Information",
        description: "Please select a work location and grant location access.",
        variant: "destructive"
      })
      return
    }

    checkinMutation.mutate({
      latitude: currentPosition.lat,
      longitude: currentPosition.lng,
      workLocation: selectedLocation
    })
  }

  // Handle check-out
  const handleCheckout = () => {
    checkoutMutation.mutate()
  }

  // Auto-request location on page load if staff member
  useEffect(() => {
    if (user && ((user as any).role === 'staff' || (user as any).role === 'doctor') && locationStatus === 'idle') {
      // Small delay to ensure UI is rendered
      setTimeout(() => {
        requestLocation()
      }, 1000)
    }
  }, [user, locationStatus])

  if (!user || ((user as any).role !== 'staff' && (user as any).role !== 'doctor')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Staff check-in is only available for doctors and staff members.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Staff Check-In</h1>
          <p className="text-gray-600 mt-2">
            GPS-verified workplace attendance for {(user as any).firstName} {(user as any).lastName}
          </p>
        </div>

        {/* Current Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Current Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeVerification ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    ✅ Checked In
                  </Badge>
                  <div>
                    <p className="font-medium">{activeVerification.workLocation}</p>
                    <p className="text-sm text-gray-600">
                      Since {new Date(activeVerification.checkedInAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={handleCheckout}
                  disabled={checkoutMutation.isPending}
                  variant="outline"
                >
                  {checkoutMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Checking Out...
                    </>
                  ) : (
                    'Check Out'
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-gray-100">
                  ⭕ Not Checked In
                </Badge>
                <p className="text-gray-600">Ready to start your work session</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Check-in Form (only show if not already checked in) */}
        {!activeVerification && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Check In to Work Location
              </CardTitle>
              <CardDescription>
                Select your work location and verify your GPS coordinates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Location Access Status */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Navigation className="w-5 h-5" />
                  <span className="font-medium">Location Access</span>
                </div>
                
                {locationStatus === 'idle' && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Click to request location access</span>
                    <Button onClick={requestLocation} variant="outline" size="sm">
                      <MapPin className="w-4 h-4 mr-2" />
                      Get Location
                    </Button>
                  </div>
                )}
                
                {locationStatus === 'requesting' && (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-blue-600">Requesting location access...</span>
                  </div>
                )}
                
                {locationStatus === 'granted' && currentPosition && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-green-600">
                      Location obtained: {currentPosition.lat.toFixed(4)}, {currentPosition.lng.toFixed(4)}
                    </span>
                  </div>
                )}
                
                {locationStatus === 'denied' && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="text-red-600">Location access denied</span>
                    </div>
                    <Button onClick={requestLocation} variant="outline" size="sm">
                      Try Again
                    </Button>
                  </div>
                )}
              </div>

              {/* Work Location Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Select Work Location</label>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose your work location" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLINIC_LOCATIONS.map((location) => (
                      <SelectItem key={location.name} value={location.name}>
                        <div>
                          <div className="font-medium">{location.name}</div>
                          <div className="text-sm text-gray-500">{location.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Check-in Button */}
              <Button 
                onClick={handleCheckin}
                disabled={!currentPosition || !selectedLocation || checkinMutation.isPending}
                className="w-full"
                size="lg"
              >
                {checkinMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying Location...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Check In
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Check-in History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Check-ins</CardTitle>
            <CardDescription>Your GPS-verified work sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {verificationsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
                ))}
              </div>
            ) : Array.isArray(verifications) && verifications.length > 0 ? (
              <div className="space-y-3">
                {verifications.slice(0, 10).map((verification: StaffVerification) => (
                  <div key={verification.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${verification.isValid ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <div>
                        <p className="font-medium">{verification.workLocation}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(verification.checkedInAt).toLocaleDateString()} at {' '}
                          {new Date(verification.checkedInAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={verification.checkedOutAt ? "secondary" : "default"}>
                        {verification.checkedOutAt ? 'Completed' : 'Active'}
                      </Badge>
                      {verification.checkedOutAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Checked out: {new Date(verification.checkedOutAt).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No check-in history yet</p>
                <p className="text-sm">Your verified work sessions will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}