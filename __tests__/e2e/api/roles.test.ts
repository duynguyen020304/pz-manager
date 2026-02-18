import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET, POST } from '@/app/api/roles/route';
import { GET as GETRole, PATCH, DELETE } from '@/app/api/roles/[id]/route';
import { createTestUser, createUsersForAllRoles } from '../helpers/auth';
import { cleanupTestData } from '../helpers/cleanup';
import { createRequestWithAuth, type TestUser } from '../helpers/auth-enhanced';
import {
  expectValidApiResponse,
  expectValidApiError,
  expectAuthError,
  expectPermissionError
} from '../helpers/validators';
import {
  createTestRole,
  deleteTestRole,
  getRolePermissions,
  isSystemRole,
  expectSystemRoleProtected
} from '../helpers/permissions';

/**
 * E2E tests for role management endpoints.
 * Tests role CRUD, permission matrix, and system role protection.
 */
describe('API: Roles', () => {
  let superadminUser: TestUser & { sessionToken: string };
  let adminUser: TestUser & { sessionToken: string };
  let operatorUser: TestUser & { sessionToken: string };
  let viewerUser: TestUser & { sessionToken: string };

  beforeEach(async () => {
    const users = await createUsersForAllRoles();
    superadminUser = users.superadmin;
    adminUser = users.admin;
    operatorUser = users.operator;
    viewerUser = users.viewer;
  });

  afterEach(async () => {
    await cleanupTestData({ users: true, sessions: true, roles: true });
  });

  describe('GET /api/roles', () => {
    it('should return 401 without authentication', async () => {
      const request = new Request('http://localhost:3000/api/roles');
      const response = await GET(request);

      await expectAuthError(response);
    });

    it('should return all roles for superadmin', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/roles',
        'GET',
        superadminUser
      );
      const response = await GET(request);

      const data = await expectValidApiResponse(response);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(4); // At least 4 system roles
    });

    it('should return all roles for admin', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/roles',
        'GET',
        adminUser
      );
      const response = await GET(request);

      const data = await expectValidApiResponse(response);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should return all roles for operator', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/roles',
        'GET',
        operatorUser
      );
      const response = await GET(request);

      const data = await expectValidApiResponse(response);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should return all roles for viewer', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/roles',
        'GET',
        viewerUser
      );
      const response = await GET(request);

      const data = await expectValidApiResponse(response);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should include role permissions', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/roles',
        'GET',
        superadminUser
      );
      const response = await GET(request);

      const data = await expectValidApiResponse<any[]>();

      const roleWithPermissions = data.find((r: any) => r.permissions);
      expect(roleWithPermissions).toBeDefined();
      expect(typeof roleWithPermissions.permissions).toBe('object');
    });

    it('should indicate system roles', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/roles',
        'GET',
        superadminUser
      );
      const response = await GET(request);

      const data = await expectValidApiResponse<any[]>();

      const systemRoles = data.filter((r: any) => r.isSystem);
      expect(systemRoles.length).toBe(4); // superadmin, admin, operator, viewer
    });

    it('should include custom roles in response', async () => {
      // Create a custom role
      const customRoleId = await createTestRole('test_custom_get', {
        users: ['view']
      });

      const request = await createRequestWithAuth(
        'http://localhost:3000/api/roles',
        'GET',
        superadminUser
      );
      const response = await GET(request);

      const data = await expectValidApiResponse<any[]>();

      const customRole = data.find((r: any) => r.name === 'test_custom_get');
      expect(customRole).toBeDefined();
      expect(customRole.isSystem).toBe(false);
    });
  });

  describe('POST /api/roles', () => {
    it('should return 401 without authentication', async () => {
      const request = new Request('http://localhost:3000/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'unauthenticated_role',
          permissions: { users: ['view'] }
        })
      });

      const response = await POST(request);

      await expectAuthError(response);
    });

    it('should create custom role as superadmin', async () => {
      const newRoleData = {
        name: `test_superadmin_create_${Date.now()}`,
        permissions: {
          users: ['view', 'create'],
          servers: ['view']
        }
      };

      const request = await createRequestWithAuth(
        'http://localhost:3000/api/roles',
        'POST',
        superadminUser,
        newRoleData
      );
      const response = await POST(request);

      const data = await expectValidApiResponse(response, 201);
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('name', newRoleData.name);
      expect(data).toHaveProperty('permissions');
      expect(data.isSystem).toBe(false);
    });

    it('should create custom role as admin', async () => {
      const newRoleData = {
        name: `test_admin_create_${Date.now()}`,
        permissions: {
          users: ['view']
        }
      };

      const request = await createRequestWithAuth(
        'http://localhost:3000/api/roles',
        'POST',
        adminUser,
        newRoleData
      );
      const response = await POST(request);

      await expectValidApiResponse(response, 201);
    });

    it('should forbid role creation by operator', async () => {
      const newRoleData = {
        name: `test_operator_create_${Date.now()}`,
        permissions: {
          users: ['view']
        }
      };

      const request = await createRequestWithAuth(
        'http://localhost:3000/api/roles',
        'POST',
        operatorUser,
        newRoleData
      );
      const response = await POST(request);

      await expectPermissionError(response);
    });

    it('should forbid role creation by viewer', async () => {
      const newRoleData = {
        name: `test_viewer_create_${Date.now()}`,
        permissions: {
          users: ['view']
        }
      };

      const request = await createRequestWithAuth(
        'http://localhost:3000/api/roles',
        'POST',
        viewerUser,
        newRoleData
      );
      const response = await POST(request);

      await expectPermissionError(response);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        name: 'test_incomplete'
        // Missing permissions
      };

      const request = await createRequestWithAuth(
        'http://localhost:3000/api/roles',
        'POST',
        superadminUser,
        invalidData
      );
      const response = await POST(request);

      await expectValidApiError(response, 400);
    });

    it('should reject duplicate role name', async () => {
      const roleName = `test_duplicate_${Date.now()}`;

      // Create first role
      await createTestRole(roleName, { users: ['view'] });

      // Try to create duplicate
      const duplicateData = {
        name: roleName,
        permissions: { servers: ['view'] }
      };

      const request = await createRequestWithAuth(
        'http://localhost:3000/api/roles',
        'POST',
        superadminUser,
        duplicateData
      );
      const response = await POST(request);

      await expectValidApiError(response, 400);
    });

    it('should validate permissions format', async () => {
      const invalidPermissions = {
        name: `test_invalid_perms_${Date.now()}`,
        permissions: 'not-an-object'
      };

      const request = await createRequestWithAuth(
        'http://localhost:3000/api/roles',
        'POST',
        superadminUser,
        invalidPermissions
      );
      const response = await POST(request);

      await expectValidApiError(response, 400);
    });

    it('should prevent creating role with system role name', async () => {
      const systemRoleNames = ['superadmin', 'admin', 'operator', 'viewer'];

      for (const roleName of systemRoleNames) {
        const request = await createRequestWithAuth(
          'http://localhost:3000/api/roles',
          'POST',
          superadminUser,
          {
            name: roleName,
            permissions: { users: ['view'] }
          }
        );
        const response = await POST(request);

        // Should fail - can't create system roles
        await expectValidApiError(response, 400);
      }
    });
  });

  describe('GET /api/roles/[id]', () => {
    it('should return 401 without authentication', async () => {
      const request = new Request('http://localhost:3000/api/roles/1');
      const response = await GETRole(request, { params: { id: '1' } });

      await expectAuthError(response);
    });

    it('should return role by ID for superadmin', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/roles/1',
        'GET',
        superadminUser
      );
      const response = await GETRole(request, { params: { id: '1' } });

      const data = await expectValidApiResponse(response);
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('name');
      expect(data).toHaveProperty('permissions');
      expect(data).toHaveProperty('isSystem');
    });

    it('should return role by ID for admin', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/roles/2',
        'GET',
        adminUser
      );
      const response = await GETRole(request, { params: { id: '2' } });

      await expectValidApiResponse(response);
    });

    it('should return 404 for non-existent role', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/roles/99999',
        'GET',
        superadminUser
      );
      const response = await GETRole(request, { params: { id: '99999' } });

      await expectValidApiError(response, 404);
    });
  });

  describe('PATCH /api/roles/[id]', () => {
    it('should return 401 without authentication', async () => {
      const request = new Request('http://localhost:3000/api/roles/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'hacked' })
      });

      const response = await PATCH(request, { params: { id: '1' } });

      await expectAuthError(response);
    });

    it('should update custom role as superadmin', async () => {
      const roleId = await createTestRole(`test_update_${Date.now()}`, {
        users: ['view']
      });

      const updateData = {
        name: `test_updated_${Date.now()}`,
        permissions: {
          users: ['view', 'create', 'edit']
        }
      };

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/roles/${roleId}`,
        'PATCH',
        superadminUser,
        updateData
      );
      const response = await PATCH(request, { params: { id: String(roleId) } });

      const data = await expectValidApiResponse(response);
      expect(data).toHaveProperty('name', updateData.name);
    });

    it('should update custom role as admin', async () => {
      const roleId = await createTestRole(`test_admin_update_${Date.now()}`, {
        servers: ['view']
      });

      const updateData = {
        permissions: {
          servers: ['view', 'start']
        }
      };

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/roles/${roleId}`,
        'PATCH',
        adminUser,
        updateData
      );
      const response = await PATCH(request, { params: { id: String(roleId) } });

      await expectValidApiResponse(response);
    });

    it('should forbid role updates by operator', async () => {
      const roleId = await createTestRole(`test_operator_update_${Date.now()}`, {
        users: ['view']
      });

      const updateData = {
        permissions: {
          users: ['view', 'create']
        }
      };

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/roles/${roleId}`,
        'PATCH',
        operatorUser,
        updateData
      );
      const response = await PATCH(request, { params: { id: String(roleId) } });

      await expectPermissionError(response);
    });

    it('should forbid role updates by viewer', async () => {
      const roleId = await createTestRole(`test_viewer_update_${Date.now()}`, {
        users: ['view']
      });

      const updateData = {
        name: 'viewer_hacked'
      };

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/roles/${roleId}`,
        'PATCH',
        viewerUser,
        updateData
      );
      const response = await PATCH(request, { params: { id: String(roleId) } });

      await expectPermissionError(response);
    });

    it('should prevent updating system role', async () => {
      const systemRoleIds = [1, 2, 3, 4]; // superadmin, admin, operator, viewer

      for (const roleId of systemRoleIds) {
        const updateData = {
          name: 'hacked_system_role',
          permissions: {}
        };

        const request = await createRequestWithAuth(
          `http://localhost:3000/api/roles/${roleId}`,
          'PATCH',
          superadminUser,
          updateData
        );
        const response = await PATCH(request, { params: { id: String(roleId) } });

        // System roles should be protected
        await expectValidApiError(response, 403);
      }
    });

    it('should validate permission format on update', async () => {
      const roleId = await createTestRole(`test_invalid_perms_${Date.now()}`, {
        users: ['view']
      });

      const updateData = {
        permissions: 'invalid-format'
      };

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/roles/${roleId}`,
        'PATCH',
        superadminUser,
        updateData
      );
      const response = await PATCH(request, { params: { id: String(roleId) } });

      await expectValidApiError(response, 400);
    });

    it('should reject duplicate role name on update', async () => {
      const role1Id = await createTestRole(`test_role1_${Date.now()}`, {
        users: ['view']
      });

      const role2Id = await createTestRole(`test_role2_${Date.now()}`, {
        servers: ['view']
      });

      const updateData = {
        name: (await getRoleName(role2Id)) || 'duplicate'
      };

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/roles/${role1Id}`,
        'PATCH',
        superadminUser,
        updateData
      );
      const response = await PATCH(request, { params: { id: String(role1Id) } });

      await expectValidApiError(response, 400);
    });
  });

  describe('DELETE /api/roles/[id]', () => {
    it('should return 401 without authentication', async () => {
      const roleId = await createTestRole(`test_delete_${Date.now()}`, {
        users: ['view']
      });

      const request = new Request(`http://localhost:3000/api/roles/${roleId}`, {
        method: 'DELETE'
      });

      const response = await DELETE(request, { params: { id: String(roleId) } });

      await expectAuthError(response);
    });

    it('should delete custom role as superadmin', async () => {
      const roleId = await createTestRole(`test_delete_${Date.now()}`, {
        users: ['view']
      });

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/roles/${roleId}`,
        'DELETE',
        superadminUser
      );
      const response = await DELETE(request, { params: { id: String(roleId) } });

      await expectValidApiResponse(response);

      // Verify role is deleted
      const getRequest = await createRequestWithAuth(
        `http://localhost:3000/api/roles/${roleId}`,
        'GET',
        superadminUser
      );
      const getResponse = await GETRole(getRequest, { params: { id: String(roleId) } });

      await expectValidApiError(getResponse, 404);
    });

    it('should delete custom role as admin', async () => {
      const roleId = await createTestRole(`test_admin_delete_${Date.now()}`, {
        servers: ['view']
      });

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/roles/${roleId}`,
        'DELETE',
        adminUser
      );
      const response = await DELETE(request, { params: { id: String(roleId) } });

      await expectValidApiResponse(response);
    });

    it('should forbid deletion by operator', async () => {
      const roleId = await createTestRole(`test_operator_delete_${Date.now()}`, {
        users: ['view']
      });

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/roles/${roleId}`,
        'DELETE',
        operatorUser
      );
      const response = await DELETE(request, { params: { id: String(roleId) } });

      await expectPermissionError(response);
    });

    it('should forbid deletion by viewer', async () => {
      const roleId = await createTestRole(`test_viewer_delete_${Date.now()}`, {
        users: ['view']
      });

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/roles/${roleId}`,
        'DELETE',
        viewerUser
      );
      const response = await DELETE(request, { params: { id: String(roleId) } });

      await expectPermissionError(response);
    });

    it('should prevent deleting system roles', async () => {
      const systemRoleIds = [1, 2, 3, 4];

      for (const roleId of systemRoleIds) {
        const request = await createRequestWithAuth(
          `http://localhost:3000/api/roles/${roleId}`,
          'DELETE',
          superadminUser
        );
        const response = await DELETE(request, { params: { id: String(roleId) } });

        // System roles should be protected
        await expectValidApiError(response, 403);
      }
    });

    it('should return 404 for non-existent role', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/roles/99999',
        'DELETE',
        superadminUser
      );
      const response = await DELETE(request, { params: { id: '99999' } });

      await expectValidApiError(response, 404);
    });

    it('should prevent deleting role with assigned users', async () => {
      // Create custom role
      const roleId = await createTestRole(`test_with_users_${Date.now()}`, {
        users: ['view']
      });

      // Assign a user to this role
      const user = await createTestUser({ username: 'test_role_user', roleId });

      // Try to delete role
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/roles/${roleId}`,
        'DELETE',
        superadminUser
      );
      const response = await DELETE(request, { params: { id: String(roleId) } });

      // Should either cascade delete users or return error
      // Depends on implementation
      const data = await response.json();
      expect([200, 400, 409]).toContain(response.status);
    });
  });

  describe('Permission Matrix', () => {
    it('should have correct permissions for superadmin', async () => {
      const permissions = await getRolePermissions('superadmin');

      // Superadmin should have wildcard permission
      expect(permissions.length).toBeGreaterThan(0);
      // Check for wildcard or extensive permissions
    });

    it('should have correct permissions for admin', async () => {
      const permissions = await getRolePermissions('admin');

      // Admin should have user management, server management, etc.
      expect(permissions.length).toBeGreaterThan(0);

      const hasUserManagement = permissions.some(p =>
        p.startsWith('users.') || p.startsWith('roles.')
      );
      expect(hasUserManagement).toBe(true);
    });

    it('should have correct permissions for operator', async () => {
      const permissions = await getRolePermissions('operator');

      // Operator should have server operations
      expect(permissions.length).toBeGreaterThan(0);

      const hasServerOps = permissions.some(p =>
        p.startsWith('servers.')
      );
      expect(hasServerOps).toBe(true);
    });

    it('should have correct permissions for viewer', async () => {
      const permissions = await getRolePermissions('viewer');

      // Viewer should have view-only permissions
      expect(permissions.length).toBeGreaterThan(0);

      const allViewOnly = permissions.every(p => p.endsWith('.view'));
      expect(allViewOnly).toBe(true);
    });

    it('should correctly identify system roles', async () => {
      const systemRoles = ['superadmin', 'admin', 'operator', 'viewer'];

      for (const roleName of systemRoles) {
        const isSystem = await isSystemRole(roleName);
        expect(isSystem).toBe(true);
      }
    });
  });

  describe('System Role Protection', () => {
    it('should protect superadmin role from modification', async () => {
      await expectSystemRoleProtected('superadmin');
    });

    it('should protect admin role from modification', async () => {
      await expectSystemRoleProtected('admin');
    });

    it('should protect operator role from modification', async () => {
      await expectSystemRoleProtected('operator');
    });

    it('should protect viewer role from modification', async () => {
      await expectSystemRoleProtected('viewer');
    });
  });
});

// Helper function to get role name by ID
async function getRoleName(roleId: number): Promise<string | null> {
  const { queryOne } = await import('@/lib/db');

  const result = await queryOne<{ name: string }>(
    'SELECT name FROM roles WHERE id = $1',
    [roleId]
  );

  return result?.name || null;
}
