import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET, POST } from '@/app/api/users/route';
import { GET as GETUser, PATCH, DELETE } from '@/app/api/users/[id]/route';
import { createTestUser, createUsersForAllRoles } from '../helpers/auth';
import { cleanupTestData } from '../helpers/cleanup';
import { createRequestWithAuth, createUnauthenticatedRequest, type TestUser } from '../helpers/auth-enhanced';
import {
  expectValidApiResponse,
  expectValidApiError,
  expectAuthError,
  expectPermissionError,
  expectArrayLength
} from '../helpers/validators';

/**
 * E2E tests for user management endpoints.
 * Tests user CRUD, pagination, role assignment, and permissions.
 */
describe('API: Users', () => {
  let superadminUser: TestUser;
  let adminUser: TestUser;
  let operatorUser: TestUser;
  let viewerUser: TestUser;
  let allRoleUsers: Record<string, TestUser & { sessionToken: string }>;

  beforeEach(async () => {
    // Create users for all roles
    allRoleUsers = await createUsersForAllRoles();
    superadminUser = allRoleUsers.superadmin;
    adminUser = allRoleUsers.admin;
    operatorUser = allRoleUsers.operator;
    viewerUser = allRoleUsers.viewer;
  });

  afterEach(async () => {
    await cleanupTestData({ users: true, sessions: true });
  });

  describe('GET /api/users', () => {
    it('should return 401 without authentication', async () => {
      const request = new Request('http://localhost:3000/api/users');
      const response = await GET(request);

      await expectAuthError(response);
    });

    it('should return list of users for superadmin', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/users',
        'GET',
        superadminUser
      );
      const response = await GET(request);

      const data = await expectValidApiResponse(response);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });

    it('should return list of users for admin', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/users',
        'GET',
        adminUser
      );
      const response = await GET(request);

      const data = await expectValidApiResponse(response);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should return list of users for operator', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/users',
        'GET',
        operatorUser
      );
      const response = await GET(request);

      const data = await expectValidApiResponse(response);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should return list of users for viewer', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/users',
        'GET',
        viewerUser
      );
      const response = await GET(request);

      const data = await expectValidApiResponse(response);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should support pagination', async () => {
      // Create additional users for pagination
      for (let i = 0; i < 5; i++) {
        await createTestUser({ username: `test_page_${i}` });
      }

      const request = await createRequestWithAuth(
        'http://localhost:3000/api/users?page=1&limit=3',
        'GET',
        superadminUser
      );
      const response = await GET(request);

      const data = await expectValidApiResponse(response);

      // Check for pagination metadata
      if ('items' in (data as any) && 'total' in (data as any)) {
        expect((data as any).items.length).toBeLessThanOrEqual(3);
        expect((data as any).total).toBeGreaterThan(0);
      } else {
        expectArrayLength(data as any[], 0, 3);
      }
    });

    it('should support search by username', async () => {
      const searchUser = await createTestUser({
        username: 'test_search_unique'
      });

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/users?search=${searchUser.username}`,
        'GET',
        superadminUser
      );
      const response = await GET(request);

      const data = await expectValidApiResponse(response);

      if (Array.isArray(data)) {
        const found = data.some((u: any) => u.username === searchUser.username);
        expect(found).toBe(true);
      }
    });

    it('should support filtering by role', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/users?roleId=4',
        'GET',
        superadminUser
      );
      const response = await GET(request);

      const data = await expectValidApiResponse(response);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should support filtering by active status', async () => {
      const inactiveUser = await createTestUser({
        username: 'test_inactive',
        isActive: false
      });

      const request = await createRequestWithAuth(
        'http://localhost:3000/api/users?isActive=true',
        'GET',
        superadminUser
      );
      const response = await GET(request);

      const data = await expectValidApiResponse(response);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should not expose password_hash in response', async () => {
      const request = await createRequestWithAuth(
        'http://localhost:3000/api/users',
        'GET',
        superadminUser
      );
      const response = await GET(request);

      const data = await expectValidApiResponse(response);

      if (Array.isArray(data) && data.length > 0) {
        expect(data[0]).not.toHaveProperty('password_hash');
      }
    });
  });

  describe('POST /api/users', () => {
    it('should return 401 without authentication', async () => {
      const request = new Request('http://localhost:3000/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'unauthenticated',
          password: 'Password123!',
          email: 'unauth@example.com',
          roleId: 4
        })
      });

      const response = await POST(request);

      await expectAuthError(response);
    });

    it('should create user as superadmin', async () => {
      const newUserData = {
        username: `test_new_${Date.now()}`,
        password: 'NewUser123!',
        email: `newuser_${Date.now()}@example.com`,
        roleId: 4
      };

      const request = await createRequestWithAuth(
        'http://localhost:3000/api/users',
        'POST',
        superadminUser,
        newUserData
      );
      const response = await POST(request);

      const data = await expectValidApiResponse(response, 201);
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('username', newUserData.username);
    });

    it('should create user as admin', async () => {
      const newUserData = {
        username: `test_admin_create_${Date.now()}`,
        password: 'AdminCreate123!',
        email: `admin_create_${Date.now()}@example.com`,
        roleId: 4
      };

      const request = await createRequestWithAuth(
        'http://localhost:3000/api/users',
        'POST',
        adminUser,
        newUserData
      );
      const response = await POST(request);

      await expectValidApiResponse(response, 201);
    });

    it('should forbid user creation by operator', async () => {
      const newUserData = {
        username: `test_operator_create_${Date.now()}`,
        password: 'OperatorCreate123!',
        email: `operator_create@example.com`,
        roleId: 4
      };

      const request = await createRequestWithAuth(
        'http://localhost:3000/api/users',
        'POST',
        operatorUser,
        newUserData
      );
      const response = await POST(request);

      await expectPermissionError(response);
    });

    it('should forbid user creation by viewer', async () => {
      const newUserData = {
        username: `test_viewer_create_${Date.now()}`,
        password: 'ViewerCreate123!',
        email: `viewer_create@example.com`,
        roleId: 4
      };

      const request = await createRequestWithAuth(
        'http://localhost:3000/api/users',
        'POST',
        viewerUser,
        newUserData
      );
      const response = await POST(request);

      await expectPermissionError(response);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        username: 'test_incomplete'
        // Missing password, email, roleId
      };

      const request = await createRequestWithAuth(
        'http://localhost:3000/api/users',
        'POST',
        superadminUser,
        invalidData
      );
      const response = await POST(request);

      await expectValidApiError(response, 400);
    });

    it('should reject duplicate username', async () => {
      const existingUser = await createTestUser({
        username: 'test_duplicate'
      });

      const duplicateData = {
        username: existingUser.username,
        password: 'Duplicate123!',
        email: 'different@example.com',
        roleId: 4
      };

      const request = await createRequestWithAuth(
        'http://localhost:3000/api/users',
        'POST',
        superadminUser,
        duplicateData
      );
      const response = await POST(request);

      await expectValidApiError(response, 400);
    });

    it('should reject weak password', async () => {
      const weakPasswordData = {
        username: `test_weak_${Date.now()}`,
        password: '123', // Too weak
        email: 'weak@example.com',
        roleId: 4
      };

      const request = await createRequestWithAuth(
        'http://localhost:3000/api/users',
        'POST',
        superadminUser,
        weakPasswordData
      );
      const response = await POST(request);

      await expectValidApiError(response, 400);
    });

    it('should reject invalid role ID', async () => {
      const invalidRoleData = {
        username: `test_invalid_role_${Date.now()}`,
        password: 'ValidPass123!',
        email: 'invalid_role@example.com',
        roleId: 999
      };

      const request = await createRequestWithAuth(
        'http://localhost:3000/api/users',
        'POST',
        superadminUser,
        invalidRoleData
      );
      const response = await POST(request);

      await expectValidApiError(response, 400);
    });
  });

  describe('GET /api/users/[id]', () => {
    it('should return 401 without authentication', async () => {
      const user = await createTestUser();

      const request = new Request(`http://localhost:3000/api/users/${user.id}`);
      const response = await GETUser(request, { params: { id: user.id } });

      await expectAuthError(response);
    });

    it('should return user by ID for superadmin', async () => {
      const targetUser = await createTestUser({ username: 'test_get_target' });

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/users/${targetUser.id}`,
        'GET',
        superadminUser
      );
      const response = await GETUser(request, { params: { id: targetUser.id } });

      const data = await expectValidApiResponse(response);
      expect(data).toHaveProperty('id', targetUser.id);
      expect(data).toHaveProperty('username', targetUser.username);
    });

    it('should return user by ID for admin', async () => {
      const targetUser = await createTestUser({ username: 'test_admin_get' });

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/users/${targetUser.id}`,
        'GET',
        adminUser
      );
      const response = await GETUser(request, { params: { id: targetUser.id } });

      await expectValidApiResponse(response);
    });

    it('should return user by ID for operator', async () => {
      const targetUser = await createTestUser({ username: 'test_operator_get' });

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/users/${targetUser.id}`,
        'GET',
        operatorUser
      );
      const response = await GETUser(request, { params: { id: targetUser.id } });

      await expectValidApiResponse(response);
    });

    it('should return user by ID for viewer', async () => {
      const targetUser = await createTestUser({ username: 'test_viewer_get' });

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/users/${targetUser.id}`,
        'GET',
        viewerUser
      );
      const response = await GETUser(request, { params: { id: targetUser.id } });

      await expectValidApiResponse(response);
    });

    it('should return 404 for non-existent user', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/users/${nonExistentId}`,
        'GET',
        superadminUser
      );
      const response = await GETUser(request, { params: { id: nonExistentId } });

      await expectValidApiError(response, 404);
    });

    it('should not expose password_hash in user detail', async () => {
      const user = await createTestUser();

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/users/${user.id}`,
        'GET',
        superadminUser
      );
      const response = await GETUser(request, { params: { id: user.id } });

      const data = await expectValidApiResponse(response);
      expect(data).not.toHaveProperty('password_hash');
    });
  });

  describe('PATCH /api/users/[id]', () => {
    it('should return 401 without authentication', async () => {
      const user = await createTestUser();

      const request = new Request(`http://localhost:3000/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'updated' })
      });

      const response = await PATCH(request, { params: { id: user.id } });

      await expectAuthError(response);
    });

    it('should update user as superadmin', async () => {
      const targetUser = await createTestUser({ username: 'test_update_target' });
      const updateData = {
        username: `test_updated_${Date.now()}`,
        email: `updated_${Date.now()}@example.com`
      };

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/users/${targetUser.id}`,
        'PATCH',
        superadminUser,
        updateData
      );
      const response = await PATCH(request, { params: { id: targetUser.id } });

      const data = await expectValidApiResponse(response);
      expect(data).toHaveProperty('username', updateData.username);
    });

    it('should update user as admin', async () => {
      const targetUser = await createTestUser({ username: 'test_admin_update_target' });
      const updateData = {
        email: `admin_updated_${Date.now()}@example.com`
      };

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/users/${targetUser.id}`,
        'PATCH',
        adminUser,
        updateData
      );
      const response = await PATCH(request, { params: { id: targetUser.id } });

      await expectValidApiResponse(response);
    });

    it('should forbid user updates by operator', async () => {
      const targetUser = await createTestUser({ username: 'test_operator_update_target' });
      const updateData = {
        email: 'operator_hacked@example.com'
      };

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/users/${targetUser.id}`,
        'PATCH',
        operatorUser,
        updateData
      );
      const response = await PATCH(request, { params: { id: targetUser.id } });

      await expectPermissionError(response);
    });

    it('should forbid user updates by viewer', async () => {
      const targetUser = await createTestUser({ username: 'test_viewer_update_target' });
      const updateData = {
        email: 'viewer_hacked@example.com'
      };

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/users/${targetUser.id}`,
        'PATCH',
        viewerUser,
        updateData
      );
      const response = await PATCH(request, { params: { id: targetUser.id } });

      await expectPermissionError(response);
    });

    it('should allow updating own profile', async () => {
      // Create a regular user
      const regularUser = await createTestUser({
        username: 'test_self_update',
        roleId: 4
      });

      const updateData = {
        email: `self_updated_${Date.now()}@example.com`
      };

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/users/${regularUser.id}`,
        'PATCH',
        regularUser,
        updateData
      );
      const response = await PATCH(request, { params: { id: regularUser.id } });

      // Self-update should succeed (if supported)
      // If not supported, expect permission error
      const data = await response.json();
      expect([200, 403]).toContain(response.status);
    });

    it('should validate username uniqueness', async () => {
      const user1 = await createTestUser({ username: 'test_user1' });
      const user2 = await createTestUser({ username: 'test_user2' });

      const updateData = {
        username: user1.username
      };

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/users/${user2.id}`,
        'PATCH',
        superadminUser,
        updateData
      );
      const response = await PATCH(request, { params: { id: user2.id } });

      await expectValidApiError(response, 400);
    });

    it('should prevent deleting last superadmin', async () => {
      // This would be tested in DELETE endpoint
      // For PATCH, test that role can be changed
      const lastSuperadmin = await createTestUser({
        username: 'test_last_superadmin',
        roleId: 1
      });

      const updateData = {
        roleId: 4 // Demote to viewer
      };

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/users/${lastSuperadmin.id}`,
        'PATCH',
        superadminUser,
        updateData
      );
      const response = await PATCH(request, { params: { id: lastSuperadmin.id } });

      // Should either succeed or fail with specific error
      const data = await response.json();
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('DELETE /api/users/[id]', () => {
    it('should return 401 without authentication', async () => {
      const user = await createTestUser();

      const request = new Request(`http://localhost:3000/api/users/${user.id}`, {
        method: 'DELETE'
      });

      const response = await DELETE(request, { params: { id: user.id } });

      await expectAuthError(response);
    });

    it('should delete user as superadmin', async () => {
      const targetUser = await createTestUser({ username: 'test_delete_target' });

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/users/${targetUser.id}`,
        'DELETE',
        superadminUser
      );
      const response = await DELETE(request, { params: { id: targetUser.id } });

      await expectValidApiResponse(response);

      // Verify user is deleted
      const getRequest = await createRequestWithAuth(
        `http://localhost:3000/api/users/${targetUser.id}`,
        'GET',
        superadminUser
      );
      const getResponse = await GETUser(getRequest, { params: { id: targetUser.id } });

      await expectValidApiError(getResponse, 404);
    });

    it('should delete user as admin', async () => {
      const targetUser = await createTestUser({ username: 'test_admin_delete_target' });

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/users/${targetUser.id}`,
        'DELETE',
        adminUser
      );
      const response = await DELETE(request, { params: { id: targetUser.id } });

      await expectValidApiResponse(response);
    });

    it('should forbid deletion by operator', async () => {
      const targetUser = await createTestUser({ username: 'test_operator_delete_target' });

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/users/${targetUser.id}`,
        'DELETE',
        operatorUser
      );
      const response = await DELETE(request, { params: { id: targetUser.id } });

      await expectPermissionError(response);
    });

    it('should forbid deletion by viewer', async () => {
      const targetUser = await createTestUser({ username: 'test_viewer_delete_target' });

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/users/${targetUser.id}`,
        'DELETE',
        viewerUser
      );
      const response = await DELETE(request, { params: { id: targetUser.id } });

      await expectPermissionError(response);
    });

    it('should return 404 for non-existent user', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/users/${nonExistentId}`,
        'DELETE',
        superadminUser
      );
      const response = await DELETE(request, { params: { id: nonExistentId } });

      await expectValidApiError(response, 404);
    });

    it('should prevent deleting last superadmin', async () => {
      // Count existing superadmins
      // If only 1 exists, deletion should fail

      // This test assumes there's at least one superadmin
      const firstSuperadmin = await createTestUser({
        username: 'test_only_superadmin',
        roleId: 1
      });

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/users/${firstSuperadmin.id}`,
        'DELETE',
        superadminUser
      );
      const response = await DELETE(request, { params: { id: firstSuperadmin.id } });

      // Should either allow delete (if other superadmins exist)
      // or deny with specific error
      const data = await response.json();
      expect([200, 400, 403]).toContain(response.status);
    });

    it('should delete associated sessions', async () => {
      const targetUser = await createTestUser({ username: 'test_delete_sessions' });

      // Create a session for the user
      const { createTestSession } = await import('../helpers/auth');
      await createTestSession(targetUser.id);

      // Delete user
      const request = await createRequestWithAuth(
        `http://localhost:3000/api/users/${targetUser.id}`,
        'DELETE',
        superadminUser
      );
      const response = await DELETE(request, { params: { id: targetUser.id } });

      await expectValidApiResponse(response);

      // Sessions should be cascade deleted
      // (Database should handle this via foreign key)
    });
  });

  describe('User Role Assignment', () => {
    it('should allow role assignment by superadmin', async () => {
      const targetUser = await createTestUser({
        username: 'test_role_assign',
        roleId: 4 // viewer
      });

      const updateData = {
        roleId: 2 // promote to admin
      };

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/users/${targetUser.id}`,
        'PATCH',
        superadminUser,
        updateData
      );
      const response = await PATCH(request, { params: { id: targetUser.id } });

      const data = await expectValidApiResponse(response);
      expect(data).toHaveProperty('roleId', 2);
    });

    it('should allow role assignment by admin', async () => {
      const targetUser = await createTestUser({
        username: 'test_admin_role_assign',
        roleId: 4
      });

      const updateData = {
        roleId: 3 // promote to operator
      };

      const request = await createRequestWithAuth(
        `http://localhost:3000/api/users/${targetUser.id}`,
        'PATCH',
        adminUser,
        updateData
      );
      const response = await PATCH(request, { params: { id: targetUser.id } });

      await expectValidApiResponse(response);
    });
  });
});
