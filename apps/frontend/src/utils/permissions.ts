/**
 * Permission utilities for role-based access control
 */

// Define role hierarchy (higher index = more permissions)
export const ROLE_HIERARCHY = [
  'Staff',
  'Groomer',
  'Trainer',
  'Instructor',
  'Manager',
  'Administrator',
  'Admin',
  'STAFF',
  'GROOMER',
  'TRAINER',
  'MANAGER',
  'ADMIN',
  'TENANT_ADMIN',
  'SUPER_ADMIN',
] as const;

// Roles that have admin access
export const ADMIN_ROLES = [
  'Administrator',
  'Admin',
  'Manager',
  'ADMIN',
  'MANAGER',
  'TENANT_ADMIN',
  'SUPER_ADMIN',
];

// Roles that have manager access (includes admin)
export const MANAGER_ROLES = [
  'Administrator',
  'Admin',
  'Manager',
  'ADMIN',
  'MANAGER',
  'TENANT_ADMIN',
  'SUPER_ADMIN',
];

/**
 * Check if user has admin access (Admin or Manager)
 */
export const hasAdminAccess = (role: string | undefined): boolean => {
  if (!role) return false;
  return ADMIN_ROLES.includes(role);
};

/**
 * Check if user has manager access
 */
export const hasManagerAccess = (role: string | undefined): boolean => {
  if (!role) return false;
  return MANAGER_ROLES.includes(role);
};

/**
 * Check if user has at least the specified role level
 */
export const hasMinimumRole = (
  userRole: string | undefined,
  minimumRole: string
): boolean => {
  if (!userRole) return false;

  const userRoleIndex = ROLE_HIERARCHY.indexOf(userRole as any);
  const minimumRoleIndex = ROLE_HIERARCHY.indexOf(minimumRole as any);

  if (userRoleIndex === -1 || minimumRoleIndex === -1) {
    // If role not found in hierarchy, fall back to exact match
    return userRole === minimumRole;
  }

  return userRoleIndex >= minimumRoleIndex;
};

/**
 * Check if user can access settings/admin pages
 */
export const canAccessSettings = (role: string | undefined): boolean => {
  return hasAdminAccess(role);
};

/**
 * Check if user can manage other users
 */
export const canManageUsers = (role: string | undefined): boolean => {
  return hasAdminAccess(role);
};

/**
 * Check if user can view reports
 */
export const canViewReports = (role: string | undefined): boolean => {
  return hasManagerAccess(role);
};

/**
 * Check if user can manage pricing
 */
export const canManagePricing = (role: string | undefined): boolean => {
  return hasAdminAccess(role);
};
