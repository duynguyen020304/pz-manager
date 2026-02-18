import type { TestUser } from '../helpers/auth';

/**
 * Test user fixtures for E2E tests.
 * Provides reusable test user data for all role types.
 */

/**
 * User fixtures with default data for each role.
 * Use these as templates when creating test users.
 */
export const testUserFixtures = {
  superadmin: {
    username: 'test_superadmin',
    password: 'SuperAdmin123!',
    email: 'test_superadmin@example.com',
    roleId: 1,
    isActive: true
  } as TestUser,

  admin: {
    username: 'test_admin',
    password: 'Admin123!',
    email: 'test_admin@example.com',
    roleId: 2,
    isActive: true
  } as TestUser,

  operator: {
    username: 'test_operator',
    password: 'Operator123!',
    email: 'test_operator@example.com',
    roleId: 3,
    isActive: true
  } as TestUser,

  viewer: {
    username: 'test_viewer',
    password: 'Viewer123!',
    email: 'test_viewer@example.com',
    roleId: 4,
    isActive: true
  } as TestUser
};

/**
 * User fixtures for edge cases.
 */
export const edgeCaseUserFixtures = {
  inactive: {
    username: 'test_inactive',
    password: 'Inactive123!',
    email: 'test_inactive@example.com',
    roleId: 4, // viewer
    isActive: false
  } as TestUser,

  weakPassword: {
    username: 'test_weak',
    password: '123', // Too short
    email: 'test_weak@example.com',
    roleId: 4,
    isActive: true
  } as TestUser,

  invalidEmail: {
    username: 'test_invalid_email',
    password: 'Valid123!',
    email: 'not-an-email',
    roleId: 4,
    isActive: true
  } as TestUser,

  duplicateUsername: {
    username: 'test_duplicate',
    password: 'Duplicate123!',
    email: 'test_duplicate@example.com',
    roleId: 4,
    isActive: true
  } as TestUser
};

/**
 * User fixtures for pagination tests.
 * Returns an array of user data objects.
 */
export function generatePaginationUserFixtures(count: number): Array<{
  username: string;
  password: string;
  email: string;
  roleId: number;
  isActive: boolean;
}> {
  const users: Array<{
    username: string;
    password: string;
    email: string;
    roleId: number;
    isActive: boolean;
  }> = [];

  for (let i = 0; i < count; i++) {
    users.push({
      username: `test_pagination_${i}_${Date.now()}`,
      password: `Pagination${i}123!`,
      email: `test_pagination_${i}_${Date.now()}@example.com`,
      roleId: 4, // viewer
      isActive: true
    });
  }

  return users;
}

/**
 * User fixtures for search/filter tests.
 */
export const searchUserFixtures = {
  matchExact: {
    username: 'test_search_exact',
    password: 'Search123!',
    email: 'search_exact@example.com',
    roleId: 4,
    isActive: true
  } as TestUser,

  matchPartial: {
    username: 'test_search_partial_match',
    password: 'Search123!',
    email: 'search_partial@example.com',
    roleId: 4,
    isActive: true
  } as TestUser,

  noMatch: {
    username: 'test_no_match',
    password: 'Nomatch123!',
    email: 'nomatch@example.com',
    roleId: 4,
    isActive: true
  } as TestUser
};

/**
 * User fixtures for role assignment tests.
 */
export const roleAssignmentFixtures = {
  original: {
    username: 'test_role_assignment',
    password: 'RoleAssign123!',
    email: 'role_assignment@example.com',
    roleId: 4, // Start as viewer
    isActive: true
  } as TestUser
};

/**
 * User fixtures for bulk operations.
 */
export function generateBulkUserFixtures(count: number): Array<TestUser> {
  const users: TestUser[] = [];

  for (let i = 0; i < count; i++) {
    users.push({
      username: `test_bulk_${i}_${Date.now()}`,
      password: `Bulk${i}123!`,
      email: `test_bulk_${i}_${Date.now()}@example.com`,
      roleId: (i % 4) + 1, // Distribute across all roles
      isActive: i % 2 === 0 // Half active, half inactive
    } as TestUser);
  }

  return users;
}

/**
 * User fixtures for concurrent request tests.
 */
export const concurrentUserFixtures = [
  {
    username: 'test_concurrent_1',
    password: 'Concurrent123!',
    email: 'concurrent1@example.com',
    roleId: 4,
    isActive: true
  },
  {
    username: 'test_concurrent_2',
    password: 'Concurrent123!',
    email: 'concurrent2@example.com',
    roleId: 4,
    isActive: true
  },
  {
    username: 'test_concurrent_3',
    password: 'Concurrent123!',
    email: 'concurrent3@example.com',
    roleId: 4,
    isActive: true
  }
] as TestUser[];

/**
 * User data templates for CRUD operations.
 */
export const crudUserFixtures = {
  create: {
    username: 'test_crud_create',
    password: 'CrudCreate123!',
    email: 'crud_create@example.com',
    roleId: 4,
    isActive: true
  } as TestUser,

  update: {
    username: 'test_crud_update',
    password: 'CrudUpdate123!',
    email: 'crud_update@example.com',
    roleId: 4,
    isActive: true
  } as TestUser,

  delete: {
    username: 'test_crud_delete',
    password: 'CrudDelete123!',
    email: 'crud_delete@example.com',
    roleId: 4,
    isActive: true
  } as TestUser
};

/**
 * User fixtures for validation tests.
 */
export const validationUserFixtures = {
  valid: {
    username: 'test_valid',
    password: 'ValidPass123!',
    email: 'valid@example.com',
    roleId: 4,
    isActive: true
  } as TestUser,

  usernameTooShort: {
    username: 'ab',
    password: 'ValidPass123!',
    email: 'short@example.com',
    roleId: 4,
    isActive: true
  } as TestUser,

  usernameTooLong: {
    username: 'a'.repeat(100),
    password: 'ValidPass123!',
    email: 'long@example.com',
    roleId: 4,
    isActive: true
  } as TestUser,

  passwordTooWeak: {
    username: 'test_weak_pass',
    password: 'weak',
    email: 'weakpass@example.com',
    roleId: 4,
    isActive: true
  } as TestUser,

  emailInvalid: {
    username: 'test_invalid_email_format',
    password: 'ValidPass123!',
    email: 'invalid-email-format',
    roleId: 4,
    isActive: true
  } as TestUser,

  roleIdInvalid: {
    username: 'test_invalid_role',
    password: 'ValidPass123!',
    email: 'invalidrole@example.com',
    roleId: 999, // Non-existent role
    isActive: true
  } as TestUser
};

/**
 * Generate unique test user data to avoid conflicts.
 * Adds timestamp to username/email.
 */
export function generateUniqueTestUser(
  roleName: 'superadmin' | 'admin' | 'operator' | 'viewer' = 'viewer',
  suffix?: string
): TestUser {
  const timestamp = Date.now();
  const uniqueSuffix = suffix || `${timestamp}`;

  return {
    username: `test_${roleName}_${uniqueSuffix}`,
    password: `Test${roleName.charAt(0).toUpperCase() + roleName.slice(1)}123!`,
    email: `test_${roleName}_${uniqueSuffix}@example.com`,
    roleId: { superadmin: 1, admin: 2, operator: 3, viewer: 4 }[roleName],
    isActive: true
  } as TestUser;
}

/**
 * User fixtures for session management tests.
 */
export const sessionUserFixtures = {
  forLogin: {
    username: 'test_login_session',
    password: 'LoginSession123!',
    email: 'login_session@example.com',
    roleId: 2, // admin
    isActive: true
  } as TestUser,

  forLogout: {
    username: 'test_logout_session',
    password: 'LogoutSession123!',
    email: 'logout_session@example.com',
    roleId: 2,
    isActive: true
  } as TestUser,

  forExpiry: {
    username: 'test_session_expiry',
    password: 'SessionExpiry123!',
    email: 'session_expiry@example.com',
    roleId: 2,
    isActive: true
  } as TestUser
};

/**
 * User fixtures for audit log tests.
 */
export const auditLogUserFixtures = {
  creator: {
    username: 'test_audit_creator',
    password: 'AuditCreator123!',
    email: 'audit_creator@example.com',
    roleId: 2, // admin
    isActive: true
  } as TestUser,

  modifier: {
    username: 'test_audit_modifier',
    password: 'AuditModifier123!',
    email: 'audit_modifier@example.com',
    roleId: 2,
    isActive: true
  } as TestUser,

  deleter: {
    username: 'test_audit_deleter',
    password: 'AuditDeleter123!',
    email: 'audit_deleter@example.com',
    roleId: 2,
    isActive: true
  } as TestUser
};
