"use client";

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueueSocket } from "@/hooks/useQueueSocket";
import { 
  Activity, 
  Clock, 
  ArrowLeft, 
  Users, 
  AlertCircle,
  RefreshCw
} from "lucide-react";

export default function LiveQueueTracker() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const userData = localStorage.getItem("user");
    
    if (!token || !userData) {
      setLocation("/login");
      return;
    }
    
    setUser(JSON.parse(userData));
  }, [setLocation]);

  // Get patient's queue position
  const { data: currentQueuePosition } = useQuery({
    queryKey: ["/api/queue/position"],
    enabled: !!user && (user.role === "patient" || user.role === "admin"),
    refetchInterval: 3000,
  });

  // Get admin queue data for full queue view
  const { data: adminQueue = [] } = useQuery({
    queryKey: ["/api/queue/admin"], 
    refetchInterval: 3000,
    retry: false,
  });

  // Use WebSocket for real-time queue updates
  const { queuePosition: liveQueuePosition, isConnected: queueConnected } = useQueueSocket(
    user?.id,
    false // Not admin mode for this view
  );

  // Use live queue position if available, otherwise fallback to API data
  const queuePosition = liveQueuePosition || currentQueuePosition || {};

  const queueArray = Array.isArray(adminQueue) ? adminQueue : [];
  const currentlyServing = queueArray.find((token: any) => token.status === 'called' || token.status === 'in_progress');
  const waitingQueue = queueArray.filter((token: any) => token.status === 'waiting');

  const refreshQueue = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/queue/position"] });
    queryClient.invalidateQueries({ queryKey: ["/api/queue/admin"] });
    toast({
      title: "Queue Refreshed",
      description: "Queue information has been updated.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation("/dashboard")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Activity className="w-6 h-6 text-blue-500" />
                Live Queue Tracker
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Real-time queue status and position tracking
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {queueConnected && (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                Live Connected
              </Badge>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={refreshQueue}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Your Position Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                Your Queue Position
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-8 text-center">
                <div className="text-sm mb-2 opacity-90">
                  Queue Position
                  {queueConnected && <span className="ml-2 text-green-300">● Live</span>}
                </div>
                <div className="text-5xl font-bold mb-2">
                  #{queuePosition?.tokenNumber || 'N/A'}
                </div>
                <div className="text-lg mb-4 opacity-90">
                  Estimated wait: {queuePosition?.estimatedWaitTime ? `${queuePosition.estimatedWaitTime} minutes` : 'Check with reception'}
                </div>
                {queuePosition?.status === 'called' && (
                  <Badge className="bg-green-600 text-white text-lg px-4 py-2">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    You're being called! Please proceed to the doctor.
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Now Serving */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-500" />
                Now Serving
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-green-500 text-white rounded-lg p-6 text-center">
                <div className="text-sm mb-2">Currently with Doctor</div>
                <div className="text-3xl font-bold mb-1">
                  #{currentlyServing?.tokenNumber || '--'}
                </div>
                <div className="text-sm">
                  {currentlyServing?.patient ? 
                    `${currentlyServing.patient.firstName} ${currentlyServing.patient.lastName}` : 
                    'No patient currently'
                  }
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Queue Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-500" />
                Queue Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div>
                    <div className="font-medium text-orange-800 dark:text-orange-200">Patients Waiting</div>
                    <div className="text-sm text-orange-600 dark:text-orange-300">In queue ahead of you</div>
                  </div>
                  <div className="text-2xl font-bold text-orange-600">
                    {waitingQueue.length}
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div>
                    <div className="font-medium text-blue-800 dark:text-blue-200">Average Wait</div>
                    <div className="text-sm text-blue-600 dark:text-blue-300">Per patient</div>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    ~15min
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Queue */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-600" />
                Upcoming Queue ({waitingQueue.length} patients waiting)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {waitingQueue.length > 0 ? (
                <div className="space-y-3">
                  {waitingQueue.slice(0, 8).map((token: any, index: number) => {
                    const isCurrentUser = token.patientId === user?.id;
                    const isNext = index === 0;
                    const bgColor = isCurrentUser ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300' : 
                                   isNext ? 'bg-green-50 dark:bg-green-900/20 border-green-200' : 
                                   'bg-gray-50 dark:bg-gray-800';
                    const borderColor = isCurrentUser ? 'border-l-4 border-l-blue-500' : 
                                       isNext ? 'border-l-4 border-l-green-500' : '';
                    
                    return (
                      <div key={token.id} className={`flex items-center justify-between p-4 rounded-lg ${bgColor} ${borderColor}`}>
                        <div className="flex items-center gap-3">
                          <Badge className={`${isCurrentUser ? 'bg-blue-500' : isNext ? 'bg-green-500' : 'bg-gray-500'} text-white`}>
                            #{token.tokenNumber}
                          </Badge>
                          <div>
                            <div className="font-medium">
                              {isCurrentUser ? 'You' : `${token.patient?.firstName || 'Patient'} ${token.patient?.lastName || ''}`}
                              {isNext && <span className="ml-2 text-green-600 font-semibold">- Next</span>}
                              {isCurrentUser && <span className="ml-2 text-blue-600 font-semibold">- Your Turn</span>}
                            </div>
                            <div className="text-sm text-gray-500">
                              Est. time: {new Date(Date.now() + index * 15 * 60000).toLocaleTimeString('en-IN', {
                                hour: '2-digit', 
                                minute: '2-digit',
                                timeZone: 'Asia/Kolkata'
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {index === 0 ? 'Now' : `~${(index) * 15}min`}
                          </div>
                          <div className="text-sm text-gray-500">wait time</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Queue Currently</h3>
                  <p className="text-gray-600 dark:text-gray-400">The queue is empty at the moment</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer Actions */}
        <div className="mt-8 flex justify-center">
          <Button 
            onClick={() => setLocation("/dashboard")}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}