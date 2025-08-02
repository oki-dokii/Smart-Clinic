import { Request, Response, NextFunction } from 'express';

// Define allowed clinic locations (latitude, longitude, radius in meters)
const CLINIC_LOCATIONS = [
  { name: 'Main Clinic', lat: 40.7128, lng: -74.0060, radius: 100 }, // Example: NYC
  { name: 'Branch Clinic', lat: 34.0522, lng: -118.2437, radius: 100 }, // Example: LA
  // Add more clinic locations as needed
];

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

export function gpsVerificationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const { latitude, longitude, workLocation } = req.body;

  if (!latitude || !longitude) {
    res.status(400).json({ message: 'GPS coordinates are required for check-in' });
    return;
  }

  // Find the specified work location
  const targetLocation = CLINIC_LOCATIONS.find(loc => loc.name === workLocation);
  if (!targetLocation) {
    res.status(400).json({ message: 'Invalid work location specified' });
    return;
  }

  // Calculate distance from clinic
  const distance = calculateDistance(
    latitude,
    longitude,
    targetLocation.lat,
    targetLocation.lng
  );

  // Check if within allowed radius
  if (distance > targetLocation.radius) {
    res.status(403).json({ 
      message: `You must be within ${targetLocation.radius}m of ${targetLocation.name} to check in. Current distance: ${Math.round(distance)}m`,
      distance: Math.round(distance),
      allowedRadius: targetLocation.radius
    });
    return;
  }

  // Add location validation flag to request body
  req.body.isValid = true;
  next();
}
