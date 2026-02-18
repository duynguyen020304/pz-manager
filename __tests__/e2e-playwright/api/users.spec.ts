import { test, expect } from '@playwright/test';
import { createTestUser, createUsersForAllRoles, cleanupTestData } from '../helpers/auth';
import { expectSuccessResponse, expectAuthError, expectPermissionError, expectValidationError } from '../helpers/validators';

/**
 * E2E tests for user management using Playwright
 */
test.describe('API: Users', () => {
  let users: Record<string, any>;

  test.beforeAll(async () => {
    users = await createUsersForAllRoles();
  });

  test.beforeEach(async () => {
    // Additional cleanup if needed
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test.describe('GET /api/users', () => {
    test('should return 401 without authentication', async ({ request }) => {
      const response = await request.get('/api/users');
      await expectAuthError(response);
    });

    test('should return list of users for superadmin', async ({ request }) => {
      const response = await request.get('/api/users', {
        headers: {
          Cookie: `session=${users.superadmin.sessionToken}`
        }
      });

      const data = await expectSuccessResponse(response);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });

    test('should return list of users for admin', async ({ request }) => {
      const response = await request.get('/api/users', {
        headers: {
          Cookie: `session=${users.admin.sessionToken}`
        }
      });

      const data = await expectSuccessResponse(response);
      expect(Array.isArray(data)).toBe(true);
    });

    test('should return list of users for viewer', async ({ request }) => {
      const response = await request.get('/api/users', {
        headers: {
          Cookie: `session=${users.viewer.sessionToken}`
        }
      });

      const data = await expectSuccessResponse(response);
      expect(Array.isArray(data)).toBe(true);
    });

    test('should not expose password_hash in response', async ({ request }) => {
      const response = await request.get('/api/users', {
        headers: {
          Cookie: `session=${users.superadmin.sessionToken}`
        }
      });

      const data = await expectSuccessResponse(response);

      if (Array.isArray(data) && data.length > 0) {
        expect(data[0]).not.toHaveProperty('password_hash');
      }
    });
  });

  test.describe('POST /api/users', () => {
    test('should return 401 without authentication', async ({ request }) => {
      const response = await request.post('/api/users', {
        data: {
          username: 'unauthenticated',
          password: 'Password123!',
          email: 'unauth@example.com',
          roleId: 4
        }
      });

      await expectAuthError(response);
    });

    test('should create user as superadmin', async ({ request }) => {
      const newUserData = {
        username: `test_new_${Date.now()}`,
        password: 'NewUser123!',
        email: `newuser_${Date.now()}@example.com`,
        roleId: 4
      };

      const response = await request.post('/api/users', {
        headers: {
          Cookie: `session=${users.superadmin.sessionToken}`
        },
        data: newUserData
      });

      const data = await expectSuccessResponse(response);
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('username', newUserData.username);
    });

    test('should create user as admin', async ({ request }) => {
      const newUserData = {
        username: `test_admin_create_${Date.now()}`,
        password: 'AdminCreate123!',
        email: `admin_create_${Date.now()}@example.com`,
        roleId: 4
      };

      const response = await request.post('/api/users', {
        headers: {
          Cookie: `session=${users.admin.sessionToken}`
        },
        data: newUserData
      });

      await expectSuccessResponse(response);
    });

    test('should forbid user creation by operator', async ({ request }) => {
      const newUserData = {
        username: `test_operator_create_${Date.now()}`,
        password: 'OperatorCreate123!',
        email: 'operator_create@example.com',
        roleId: 4
      };

      const response = await request.post('/api/users', {
        headers: {
          Cookie: `session=${users.operator.sessionToken}`
        },
        data: newUserData
      });

      await expectPermissionError(response);
    });

    test('should forbid user creation by viewer', async ({ request }) => {
      const newUserData = {
        username: `test_viewer_create_${Date.now()}`,
        password: 'ViewerCreate123!',
        email: 'viewer_create@example.com',
        roleId: 4
      };

      const response = await request.post('/api/users', {
        headers: {
          Cookie: `session=${users.viewer.sessionToken}`
        },
        data: newUserData
      });

      await expectPermissionError(response);
    });

    test('should validate required fields', async ({ request }) => {
      const invalidData = {
        username: 'test_incomplete'
      };

      const response = await request.post('/api/users', {
        headers: {
          Cookie: `session=${users.superadmin.sessionToken}`
        },
        data: invalidData
      });

      await expectValidationError(response);
    });

    test('should reject duplicate username', async ({ request }) => {
      const existingUser = await createTestUser({
        username: 'test_duplicate'
      });

      const duplicateData = {
        username: existingUser.username,
        password: 'Duplicate123!',
        email: 'different@example.com',
        roleId: 4
      };

      const response = await request.post('/api/users', {
        headers: {
          Cookie: `session=${users.superadmin.sessionToken}`
        },
        data: duplicateData
      });

      await expectValidationError(response);
    });
  });

  test.describe('GET /api/users/[id]', () => {
    test('should return 401 without authentication', async ({ request }) => {
      const user = await createTestUser();
      const response = await request.get(`/api/users/${user.id}`);
      await expectAuthError(response);
    });

    test('should return user by ID for superadmin', async ({ request }) => {
      const targetUser = await createTestUser({ username: 'test_get_target' });

      const response = await request.get(`/api/users/${targetUser.id}`, {
        headers: {
          Cookie: `session=${users.superadmin.sessionToken}`
        }
      });

      const data = await expectSuccessResponse(response);
      expect(data).toHaveProperty('id', targetUser.id);
      expect(data).toHaveProperty('username', targetUser.username);
    });

    test('should return user by ID for admin', async ({ request }) => {
      const targetUser = await createTestUser({ username: 'test_admin_get' });

      const response = await request.get(`/api/users/${targetUser.id}`, {
        headers: {
          Cookie: `session=${users.admin.sessionToken}`
        }
      });

      await expectSuccessResponse(response);
    });

    test('should return 404 for non-existent user', async ({ request }) => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request.get(`/api/users/${nonExistentId}`, {
        headers: {
          Cookie: `session=${users.superadmin.sessionToken}`
        }
      });

      expect(response.status()).toBe(404);
    });

    test('should not expose password_hash in user detail', async ({ request }) => {
      const user = await createTestUser();

      const response = await request.get(`/api/users/${user.id}`, {
        headers: {
          Cookie: `session=${users.superadmin.sessionToken}`
        }
      });

      const data = await expectSuccessResponse(response);
      expect(data).not.toHaveProperty('password_hash');
    });
  });

  test.describe('PATCH /api/users/[id]', () => {
    test('should return 401 without authentication', async ({ request }) => {
      const user = await createTestUser();

      const response = await request.patch(`/api/users/${user.id}`, {
        data: { username: 'updated' }
      });

      await expectAuthError(response);
    });

    test('should update user as superadmin', async ({ request }) => {
      const targetUser = await createTestUser({ username: 'test_update_target' });
      const updateData = {
        username: `test_updated_${Date.now()}`,
        email: `updated_${Date.now()}@example.com`
      };

      const response = await request.patch(`/api/users/${targetUser.id}`, {
        headers: {
          Cookie: `session=${users.superadmin.sessionToken}`
        },
        data: updateData
      });

      const data = await expectSuccessResponse(response);
      expect(data).toHaveProperty('username', updateData.username);
    });

    test('should update user as admin', async ({ request }) => {
      const targetUser = await createTestUser({ username: 'test_admin_update_target' });
      const updateData = {
        email: `admin_updated_${Date.now()}@example.com`
      };

      const response = await request.patch(`/api/users/${targetUser.id}`, {
        headers: {
          Cookie: `session=${users.admin.sessionToken}`
        },
        data: updateData
      });

      await expectSuccessResponse(response);
    });

    test('should forbid user updates by operator', async ({ request }) => {
      const targetUser = await createTestUser({ username: 'test_operator_update_target' });
      const updateData = {
        email: 'operator_hacked@example.com'
      };

      const response = await request.patch(`/api/users/${targetUser.id}`, {
        headers: {
          Cookie: `session=${users.operator.sessionToken}`
        },
        data: updateData
      });

      await expectPermissionError(response);
    });

    test('should forbid user updates by viewer', async ({ request }) => {
      const targetUser = await createTestUser({ username: 'test_viewer_update_target' });
      const updateData = {
        email: 'viewer_hacked@example.com'
      };

      const response = await request.patch(`/api/users/${targetUser.id}`, {
        headers: {
          Cookie: `session=${users.viewer.sessionToken}`
        },
        data: updateData
      });

      await expectPermissionError(response);
    });
  });

  test.describe('DELETE /api/users/[id]', () => {
    test('should return 401 without authentication', async ({ request }) => {
      const user = await createTestUser();
      const response = await request.delete(`/api/users/${user.id}`);
      await expectAuthError(response);
    });

    test('should delete user as superadmin', async ({ request }) => {
      const targetUser = await createTestUser({ username: 'test_delete_target' });

      const response = await request.delete(`/api/users/${targetUser.id}`, {
        headers: {
          Cookie: `session=${users.superadmin.sessionToken}`
        }
      });

      await expectSuccessResponse(response);

      // Verify user is deleted
      const getResponse = await request.get(`/api/users/${targetUser.id}`, {
        headers: {
          Cookie: `session=${users.superadmin.sessionToken}`
        }
      });

      expect(getResponse.status()).toBe(404);
    });

    test('should delete user as admin', async ({ request }) => {
      const targetUser = await createTestUser({ username: 'test_admin_delete_target' });

      const response = await request.delete(`/api/users/${targetUser.id}`, {
        headers: {
          Cookie: `session=${users.admin.sessionToken}`
        }
      });

      await expectSuccessResponse(response);
    });

    test('should forbid deletion by operator', async ({ request }) => {
      const targetUser = await createTestUser({ username: 'test_operator_delete_target' });

      const response = await request.delete(`/api/users/${targetUser.id}`, {
        headers: {
          Cookie: `session=${users.operator.sessionToken}`
        }
      });

      await expectPermissionError(response);
    });

    test('should forbid deletion by viewer', async ({ request }) => {
      const targetUser = await createTestUser({ username: 'test_viewer_delete_target' });

      const response = await request.delete(`/api/users/${targetUser.id}`, {
        headers: {
          Cookie: `session=${users.viewer.sessionToken}`
        }
      });

      await expectPermissionError(response);
    });

    test('should return 404 for non-existent user', async ({ request }) => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request.delete(`/api/users/${nonExistentId}`, {
        headers: {
          Cookie: `session=${users.superadmin.sessionToken}`
        }
      });

      expect(response.status()).toBe(404);
    });
  });

  test.describe('User Role Assignment', () => {
    test('should allow role assignment by superadmin', async ({ request }) => {
      const targetUser = await createTestUser({
        username: 'test_role_assign',
        roleId: 4 // viewer
      });

      const updateData = {
        roleId: 2 // promote to admin
      };

      const response = await request.patch(`/api/users/${targetUser.id}`, {
        headers: {
          Cookie: `session=${users.superadmin.sessionToken}`
        },
        data: updateData
      });

      const data = await expectSuccessResponse(response);
      expect(data).toHaveProperty('roleId', 2);
    });

    test('should allow role assignment by admin', async ({ request }) => {
      const targetUser = await createTestUser({
        username: 'test_admin_role_assign',
        roleId: 4
      });

      const updateData = {
        roleId: 3 // promote to operator
      };

      const response = await request.patch(`/api/users/${targetUser.id}`, {
        headers: {
          Cookie: `session=${users.admin.sessionToken}`
        },
        data: updateData
      });

      await expectSuccessResponse(response);
    });
  });
});
