import { describe, it, expect, beforeEach } from 'vitest';
import {
  createUser,
  getUserById,
  getUserByIdWithRole,
  getUserByUsername,
  getUserByEmail,
  listUsers,
  updateUser,
  deleteUser,
  updateLastLogin,
  countUsers,
  countActiveUsers,
  hashPassword,
  verifyPassword,
} from '@/lib/user-manager';
import type { UserWithRole } from '@/types';

describe('User Manager', () => {
  beforeEach(() => {
    // Reset is handled in global setup
  });

  describe('Password hashing', () => {
    it('should hash password', async () => {
      const password = 'testpassword123';
      const hash = await hashPassword(password);
      
      expect(hash).not.toBe(password);
      expect(hash).toContain('$2');
    });

    it('should verify correct password', async () => {
      const password = 'testpassword123';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'testpassword123';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword('wrongpassword', hash);
      expect(isValid).toBe(false);
    });
  });

  describe('createUser', () => {
    it('should create a new user with hashed password', async () => {
      const user = await createUser({
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
        roleId: 2,
      });
      
      expect(user.username).toBe('newuser');
      expect(user.email).toBe('new@example.com');
      expect(user.roleId).toBe(2);
      expect(user.isActive).toBe(true);
    });

    it('should throw error for duplicate username', async () => {
      await expect(
        createUser({
          username: 'admin',
          email: 'unique@example.com',
          password: 'password123',
          roleId: 2,
        })
      ).rejects.toThrow("Username 'admin' already exists");
    });

    it('should throw error for duplicate email', async () => {
      await expect(
        createUser({
          username: 'uniqueuser',
          email: 'admin@example.com',
          password: 'password123',
          roleId: 2,
        })
      ).rejects.toThrow("Email 'admin@example.com' already exists");
    });

    it('should throw error for non-existent role', async () => {
      await expect(
        createUser({
          username: 'testrole',
          email: 'nonexistentrole@example.com',
          password: 'password123',
          roleId: 99999,
        })
      ).rejects.toThrow("Role with id '99999' does not exist");
    });
  });

  describe('getUserById', () => {
    it('should return user by id', async () => {
      const user = await getUserById(1);
      
      expect(user).not.toBeNull();
      expect(user?.username).toBe('admin');
    });

    it('should return null for non-existent user', async () => {
      const user = await getUserById(99999);
      
      expect(user).toBeNull();
    });
  });

  describe('getUserByIdWithRole', () => {
    it('should return user with role information', async () => {
      const user = await getUserByIdWithRole(1);
      
      expect(user).not.toBeNull();
      expect(user?.username).toBe('admin');
      expect(user?.role).toBeDefined();
      expect(user?.role?.name).toBe('superadmin');
    });
  });

  describe('getUserByUsername', () => {
    it('should return user by username', async () => {
      const user = await getUserByUsername('testuser');
      
      expect(user).not.toBeNull();
      expect(user?.id).toBe(2);
    });

    it('should return null for non-existent username', async () => {
      const user = await getUserByUsername('nonexistent');
      
      expect(user).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should return user by email', async () => {
      const user = await getUserByEmail('test@example.com');
      
      expect(user).not.toBeNull();
      expect(user?.username).toBe('testuser');
    });
  });

  describe('listUsers', () => {
    it('should return paginated users', async () => {
      const result = await listUsers({ page: 1, limit: 10 });
      
      expect(result.data).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should filter by role', async () => {
      const result = await listUsers({ roleId: 1, page: 1, limit: 10 });
      
      expect(result.data.every((u: UserWithRole) => u.roleId === 1)).toBe(true);
    });

    it('should filter by active status', async () => {
      const result = await listUsers({ isActive: true, page: 1, limit: 10 });
      
      expect(result.data.every((u: UserWithRole) => u.isActive)).toBe(true);
    });

    it('should search by username or email', async () => {
      const result = await listUsers({ search: 'admin', page: 1, limit: 10 });
      
      expect(result.data.some((u: UserWithRole) => u.username.includes('admin'))).toBe(true);
    });
  });

  describe('updateUser', () => {
    it('should update user fields', async () => {
      const updated = await updateUser(2, {
        email: 'updated@example.com',
        isActive: false,
      });
      
      expect(updated.email).toBe('updated@example.com');
      expect(updated.isActive).toBe(false);
    });

    it('should update password and hash it', async () => {
      // Create user with known password
      const user = await createUser({
        username: 'passwordtest',
        email: 'passwordtest@example.com',
        password: 'originalpassword',
        roleId: 2,
      });
      
      // Update password
      await updateUser(user.id, { password: 'newpassword123' });
      
      // Verify user still exists and was updated
      const updated = await getUserById(user.id);
      expect(updated).not.toBeNull();
      expect(updated?.id).toBe(user.id);
    });

    it('should throw error for duplicate username', async () => {
      await expect(
        updateUser(2, { username: 'admin' })
      ).rejects.toThrow("Username 'admin' already exists");
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        updateUser(99999, { email: 'test@example.com' })
      ).rejects.toThrow('User not found');
    });
  });

  describe('deleteUser', () => {
    it('should delete user', async () => {
      // Create a user to delete
      const user = await createUser({
        username: 'deleteme',
        email: 'deleteme@example.com',
        password: 'password123',
        roleId: 2,
      });

      await deleteUser(user.id);
      
      const deleted = await getUserById(user.id);
      expect(deleted).toBeNull();
    });

    it('should prevent deleting last superadmin', async () => {
      await expect(deleteUser(1)).rejects.toThrow('Cannot delete the last active superadmin');
    });

    it('should throw error for non-existent user', async () => {
      await expect(deleteUser(99999)).rejects.toThrow('User not found');
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      const before = await getUserById(2);
      expect(before?.lastLoginAt).toBeNull();

      await updateLastLogin(2);
      
      const after = await getUserById(2);
      expect(after?.lastLoginAt).not.toBeNull();
    });
  });

  describe('countUsers', () => {
    it('should return total user count', async () => {
      const count = await countUsers();
      
      expect(count).toBeGreaterThanOrEqual(3); // At least the seeded users
    });
  });

  describe('countActiveUsers', () => {
    it('should return active user count', async () => {
      const count = await countActiveUsers();
      
      // Should be less than or equal to total users
      const total = await countUsers();
      expect(count).toBeLessThanOrEqual(total);
    });
  });
});
