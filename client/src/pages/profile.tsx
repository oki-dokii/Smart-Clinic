import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Phone, Mail, Calendar, MapPin, Heart, ArrowLeft, Stethoscope } from "lucide-react";

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    dateOfBirth: "",
    address: "",
    emergencyContact: "",
  });

  // Check authentication and redirect if needed
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setLocation("/patient-login");
      return;
    }
  }, [setLocation]);

  // Fetch user data from API
  const { data: profileData, isLoading } = useQuery({
    queryKey: ["/api/users/me"],
    enabled: !!localStorage.getItem("auth_token"),
  });

  // Update form data when profile data is loaded
  useEffect(() => {
    if (profileData) {
      setFormData({
        firstName: profileData.firstName || "",
        lastName: profileData.lastName || "",
        email: profileData.email || "",
        dateOfBirth: profileData.dateOfBirth ? profileData.dateOfBirth.split('T')[0] : "",
        address: profileData.address || "",
        emergencyContact: profileData.emergencyContact || "",
      });
    }
  }, [profileData]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", "/api/users/me", data);
      return response.json();
    },
    onSuccess: (updatedUser) => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      // Update localStorage user data if it exists
      const existingUser = localStorage.getItem("user");
      if (existingUser) {
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/dashboard")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
              <p className="text-sm text-gray-600">Manage your personal information</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid gap-6">
          {/* Profile Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-500" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    placeholder="Enter your first name"
                    data-testid="input-firstName"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    placeholder="Enter your last name"
                    data-testid="input-lastName"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="Enter your email address"
                    className="pl-10"
                    data-testid="input-email"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                    className="pl-10"
                    data-testid="input-dateOfBirth"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    placeholder="Enter your complete address"
                    className="pl-10 resize-none"
                    rows={3}
                    data-testid="input-address"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="emergencyContact">Emergency Contact</Label>
                <div className="relative">
                  <Heart className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    id="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={(e) => handleInputChange("emergencyContact", e.target.value)}
                    placeholder="Emergency contact phone number"
                    className="pl-10"
                    data-testid="input-emergencyContact"
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button
                  onClick={handleSaveProfile}
                  disabled={updateProfileMutation.isPending}
                  className="bg-blue-500 hover:bg-blue-600"
                  data-testid="button-save-profile"
                >
                  {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Medical History Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-blue-500" />
                Medical History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="allergies">Known Allergies</Label>
                <Input
                  id="allergies"
                  value={formData.allergies || ""}
                  onChange={(e) => handleInputChange("allergies", e.target.value)}
                  placeholder="List any allergies (e.g., penicillin, peanuts)"
                />
              </div>
              <div>
                <Label htmlFor="chronicConditions">Chronic Conditions</Label>
                <Input
                  id="chronicConditions"
                  value={formData.chronicConditions || ""}
                  onChange={(e) => handleInputChange("chronicConditions", e.target.value)}
                  placeholder="List chronic conditions (e.g., diabetes, hypertension)"
                />
              </div>
              <div>
                <Label htmlFor="bloodType">Blood Type</Label>
                <Input
                  id="bloodType"
                  value={formData.bloodType || ""}
                  onChange={(e) => handleInputChange("bloodType", e.target.value)}
                  placeholder="Enter blood type (e.g., A+, B-, O+)"
                />
              </div>
              <div>
                <Label htmlFor="emergencyContact">Emergency Contact</Label>
                <Input
                  id="emergencyContact"
                  value={formData.emergencyContact || ""}
                  onChange={(e) => handleInputChange("emergencyContact", e.target.value)}
                  placeholder="Emergency contact name and phone"
                />
              </div>
              <div className="pt-4">
                <Button
                  onClick={handleSaveProfile}
                  disabled={updateProfileMutation.isPending}
                  className="bg-blue-500 hover:bg-blue-600 w-full"
                >
                  {updateProfileMutation.isPending ? "Saving..." : "Save Medical Information"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}