import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth';

// Extend Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('🔥 AUTH MIDDLEWARE - No auth header or invalid format')
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const token = authHeader.replace('Bearer ', '');
    const user = await authService.verifyToken(token);
    
    console.log('🔥 AUTH MIDDLEWARE - User verified:', {
      id: user.id,
      role: user.role,
      phoneNumber: user.phoneNumber,
      clinicId: user.clinicId,
      isActive: user.isActive
    })
    
    req.user = user;
    next();
  } catch (error: any) {
    console.log('🔥 AUTH MIDDLEWARE - Error:', error.message)
    res.status(401).json({ message: error.message });
  }
}

export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Access denied. Insufficient permissions' });
      return;
    }

    next();
  };
}

// Platform superadmin access control - SmartClinic team only
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  const SMARTCLINIC_TEAM_EMAIL = 'soham.banerjee@iiitb.ac.in';
  
  // Check if user has super_admin role AND is SmartClinic team member AND no clinic association
  if (req.user.role !== 'super_admin' || req.user.email !== SMARTCLINIC_TEAM_EMAIL || req.user.clinicId) {
    console.log('🔥 PLATFORM ADMIN ACCESS DENIED:', {
      email: req.user.email,
      role: req.user.role,
      clinicId: req.user.clinicId,
      smartclinicTeam: SMARTCLINIC_TEAM_EMAIL,
      reason: req.user.role !== 'super_admin' ? 'Not super_admin role' : 
              req.user.email !== SMARTCLINIC_TEAM_EMAIL ? 'Not SmartClinic team' : 'Has clinic association'
    });
    res.status(403).json({ 
      message: 'Access denied. SmartClinic platform admin privileges required.',
      details: 'Only SmartClinic team members can access platform administration.'
    });
    return;
  }

  console.log('🔥 PLATFORM ADMIN ACCESS GRANTED:', req.user.email);
  next();
}

// Clinic admin access control - for individual clinic management
export function requireClinicAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  // Check if user has admin role AND is associated with a clinic
  if (req.user.role !== 'admin' || !req.user.clinicId) {
    console.log('🔥 CLINIC ADMIN ACCESS DENIED:', {
      email: req.user.email,
      role: req.user.role,
      clinicId: req.user.clinicId,
      reason: req.user.role !== 'admin' ? 'Not admin role' : 'No clinic association'
    });
    res.status(403).json({ 
      message: 'Access denied. Clinic admin privileges required.',
      details: 'Only clinic administrators can access this resource.'
    });
    return;
  }

  console.log('🔥 CLINIC ADMIN ACCESS GRANTED:', {
    email: req.user.email,
    clinicId: req.user.clinicId
  });
  next();
}
