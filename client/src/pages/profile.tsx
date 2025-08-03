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
import { User, Phone, Mail, Calendar, MapPin, Heart, ArrowLeft } from "lucide-react";

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    dateOfBirth: "",
    address: "",
    emergencyContact: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const userData = localStorage.getItem("user");
    
    if (!token || !userData) {
      setLocation("/login");
      return;
    }
    
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    setFormData({
      firstName: parsedUser.firstName || "",
      lastName: parsedUser.lastName || "",
      email: parsedUser.email || "",
      dateOfBirth: parsedUser.dateOfBirth || "",
      address: parsedUser.address || "",
      emergencyContact: parsedUser.emergencyContact || "",
    });
  }, [setLocation]);

  const { data: profileData } = useQuery({
    queryKey: ["/api/users/me"],
    enabled: !!user,
  });

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
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
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

  if (!user) {
    return <div>Loading...</div>;
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
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    placeholder="Enter your last name"
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
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button
                  onClick={handleSaveProfile}
                  disabled={updateProfileMutation.isPending}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Account Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-green-500" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm font-medium text-gray-600">Phone Number</span>
                  <span className="text-sm text-gray-900">{user.phoneNumber}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm font-medium text-gray-600">Role</span>
                  <span className="text-sm text-gray-900 capitalize">{user.role}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm font-medium text-gray-600">Account Status</span>
                  <span className={`text-sm ${user.isActive ? 'text-green-600' : 'text-red-600'}`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium text-gray-600">Account Created</span>
                  <span className="text-sm text-gray-900">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}