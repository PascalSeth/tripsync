import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

// Extend the Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: Record<string, any>;
    }
  }
}

/**
 * Middleware to authenticate user requests using JWT
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false,
      message: 'Authentication required. Please provide a valid token.' 
    });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ 
      success: false,
      message: 'Invalid or expired token. Please login again.' 
    });
  }

  req.user = decoded;
  next();
}

/**
 * Middleware to authorize based on user roles
 * @param roles - Array of roles allowed to access the resource
 */
export function authorize(roles: string[] = []) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required before authorization' 
      });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        message: 'You do not have permission to access this resource' 
      });
    }

    next();
  };
}