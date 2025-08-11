"use client";

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Package, AlertTriangle, Pill } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface Medicine {
  id: string;
  name: string;
  description?: string;
  manufacturer?: string;
  category?: string;
  stockQuantity?: number;
  minStockLevel?: number;
  unitPrice?: number;
  expiryDate?: string;
  clinicId: string;
}

interface LowStockAlertsProps {
  threshold?: number;
}

export function LowStockAlerts({ threshold = 10 }: LowStockAlertsProps) {
  const { data: lowStockMedicines = [], isLoading, error } = useQuery({
    queryKey: ['/api/medicines/low-stock', threshold],
    queryFn: async () => {
      const response = await apiRequest(`/api/medicines/low-stock?threshold=${threshold}`);
      return response as Medicine[];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const getStockLevelColor = (quantity: number, minLevel: number = 10) => {
    const ratio = quantity / minLevel;
    if (ratio <= 0.2) return 'text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400';
    if (ratio <= 0.5) return 'text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-400';
    return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-400';
  };

  const getUrgencyLevel = (quantity: number, minLevel: number = 10) => {
    const ratio = quantity / minLevel;
    if (ratio <= 0.2) return { label: 'Critical', color: 'destructive' as const };
    if (ratio <= 0.5) return { label: 'Low', color: 'default' as const };
    return { label: 'Warning', color: 'secondary' as const };
  };

  if (isLoading) {
    return (
      <Card data-testid="low-stock-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-600">
            <Package className="h-5 w-5" />
            Medicine Stock Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card data-testid="low-stock-error">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-600">
            <Package className="h-5 w-5" />
            Medicine Stock Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load stock information. Please try again later.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="low-stock-alerts">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-600">
          <Package className="h-5 w-5" />
          Medicine Stock Alerts
          {lowStockMedicines.length > 0 && (
            <Badge variant="destructive" className="ml-auto">
              {lowStockMedicines.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {lowStockMedicines.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground" data-testid="no-low-stock">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>All medicines are well stocked</p>
            <p className="text-sm">Stock levels are above {threshold} units</p>
          </div>
        ) : (
          <>
            <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {lowStockMedicines.length} medicine{lowStockMedicines.length > 1 ? 's' : ''} running low on stock. 
                Consider reordering soon.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              {lowStockMedicines.map((medicine) => {
                const urgency = getUrgencyLevel(medicine.stockQuantity || 0, medicine.minStockLevel || threshold);
                const stockColor = getStockLevelColor(medicine.stockQuantity || 0, medicine.minStockLevel || threshold);
                
                return (
                  <div
                    key={medicine.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    data-testid={`medicine-${medicine.id}`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`p-2 rounded-full ${stockColor}`}>
                        <Pill className="h-4 w-4" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium" data-testid="medicine-name">
                            {medicine.name}
                          </h4>
                          <Badge variant={urgency.color} className="text-xs">
                            {urgency.label}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span data-testid="stock-quantity">
                            Stock: <span className="font-medium">{medicine.stockQuantity || 0} units</span>
                          </span>
                          {medicine.minStockLevel && (
                            <span data-testid="min-stock">
                              Min: {medicine.minStockLevel} units
                            </span>
                          )}
                          {medicine.category && (
                            <span data-testid="category">
                              {medicine.category}
                            </span>
                          )}
                        </div>
                        
                        {medicine.description && (
                          <p className="text-sm text-muted-foreground mt-1" data-testid="description">
                            {medicine.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      {medicine.unitPrice && (
                        <div className="text-sm font-medium" data-testid="unit-price">
                          ₹{medicine.unitPrice}/unit
                        </div>
                      )}
                      {medicine.expiryDate && (
                        <div className="text-xs text-muted-foreground" data-testid="expiry">
                          Exp: {new Date(medicine.expiryDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}