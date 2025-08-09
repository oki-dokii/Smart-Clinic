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

// Strict admin access control - only allows soham.banerjee@iiitb.ac.in
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  const AUTHORIZED_ADMIN_EMAIL = 'soham.banerjee@iiitb.ac.in';
  
  // Check if user has admin role AND authorized email
  if (req.user.role !== 'admin' || req.user.email !== AUTHORIZED_ADMIN_EMAIL) {
    console.log('🔥 SUPER ADMIN ACCESS DENIED:', {
      email: req.user.email,
      role: req.user.role,
      authorized: AUTHORIZED_ADMIN_EMAIL
    });
    res.status(403).json({ 
      message: 'Access denied. Super admin privileges required.',
      details: 'Only authorized administrators can access this resource.'
    });
    return;
  }

  console.log('🔥 SUPER ADMIN ACCESS GRANTED:', req.user.email);
  next();
}
