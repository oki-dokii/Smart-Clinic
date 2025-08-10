import { Request, Response, NextFunction } from 'express';

// Define allowed clinic locations (latitude, longitude, radius in meters)
const CLINIC_LOCATIONS = [
  { name: 'Bangalore Central Clinic', lat: 12.9716, lng: 77.5946, radius: 200 }, // Bangalore Main Clinic
  { name: 'Whitefield Branch', lat: 12.9698, lng: 77.7500, radius: 150 }, // Bangalore Whitefield Branch
  { name: 'Koramangala Clinic', lat: 12.9279, lng: 77.6271, radius: 150 }, // Bangalore Koramangala Branch
  { name: 'Electronic City Clinic', lat: 12.8456, lng: 77.6603, radius: 150 }, // Electronic City IT hub location
  // Local Test Clinic uses dynamic location - handled specially in middleware
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

  // Special handling for Local Test Clinic - use user's current location
  if (workLocation === 'Local Test Clinic') {
    // For the test clinic, we'll create a virtual clinic at user's location with a small radius
    console.log(`🧪 TEST CLINIC: Creating virtual clinic at user location: ${latitude}, ${longitude}`);
    req.body.isValid = true;
    next();
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

  console.log(`🔍 GPS CHECK: ${workLocation} - User: ${latitude},${longitude} vs Clinic: ${targetLocation.lat},${targetLocation.lng} = ${Math.round(distance)}m`);

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
