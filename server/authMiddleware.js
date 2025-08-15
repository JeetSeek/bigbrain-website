// Authentication middleware using Supabase JWT validation
import { supabase } from './supabaseClient.js';

/**
 * Admin authentication middleware
 * Verifies the JWT token from Authorization header is valid
 * and belongs to a user with admin role
 */
export function adminAuth(req, res, next) {
  return validateAuth(req, res, next, true);
}

/**
 * User authentication middleware
 * Verifies the JWT token from Authorization header is valid
 */
export function userAuth(req, res, next) {
  return validateAuth(req, res, next, false);
}

/**
 * Core authentication validation logic
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @param {Boolean} requireAdmin - Whether admin role is required
 */
async function validateAuth(req, res, next, requireAdmin = false) {
  try {
    // Get JWT from Authorization header
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authentication required', 
        message: 'Missing or invalid Authorization header'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify JWT with Supabase
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      console.error('Auth error:', error);
      return res.status(401).json({ 
        error: 'Authentication failed', 
        message: 'Invalid or expired token'
      });
    }
    
    // If admin access is required, verify user has admin role
    if (requireAdmin) {
      try {
        // Check if user is admin by email (fallback method)
        const adminEmails = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '').split(',').map(email => email.trim());
        const isAdminByEmail = adminEmails.includes(data.user.email);
        
        if (isAdminByEmail) {
          // Admin verified by email
          req.user = { ...data.user, role: 'admin' };
          next();
          return;
        }
        
        // Try to get user's role from database (if users table exists)
        const { data: userData, error: roleError } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .single();
        
        if (roleError) {
          // If users table doesn't exist or query fails, fall back to email check
          console.warn('Users table query failed, using email-based admin check:', roleError.message);
          if (!isAdminByEmail) {
            return res.status(403).json({ 
              error: 'Forbidden', 
              message: 'Admin privileges required'
            });
          }
        } else if (!userData || userData.role !== 'admin') {
          return res.status(403).json({ 
            error: 'Forbidden', 
            message: 'Admin privileges required'
          });
        }
      } catch (dbError) {
        console.error('Database error during admin check:', dbError);
        // Fallback to email-based admin check
        const adminEmails = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '').split(',').map(email => email.trim());
        if (!adminEmails.includes(data.user.email)) {
          return res.status(403).json({ 
            error: 'Forbidden', 
            message: 'Admin privileges required'
          });
        }
      }
    }
    
    // Add user to request object for later use
    req.user = data.user;
    next();
  } catch (err) {
    console.error('Authentication error:', err);
    res.status(500).json({ 
      error: 'Authentication system error', 
      message: 'An error occurred during authentication'
    });
  }
}
