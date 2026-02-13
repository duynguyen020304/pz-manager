import { describe, it, expect, beforeEach } from 'vitest';
import {
  createRole,
  getRoleById,
  getRoleByName,
  getAllRoles,
  updateRole,
  deleteRole,
  hasPermission,
  hasAllPermissions,
  getRoleUserCount,
} from '@/lib/role-manager';
import type { Role } from '@/types';

describe('Role Manager', () => {
  beforeEach(() => {
    // Reset is handled in global setup
  });

  describe('getAllRoles', () => {
    it('should return all roles including default system roles', async () => {
      const roles = await getAllRoles();
      
      expect(roles).toHaveLength(4);
      expect(roles.map((r: Role) => r.name)).toContain('superadmin');
      expect(roles.map((r: Role) => r.name)).toContain('admin');
      expect(roles.map((r: Role) => r.name)).toContain('operator');
      expect(roles.map((r: Role) => r.name)).toContain('viewer');
    });
  });

  describe('getRoleById', () => {
    it('should return role by id', async () => {
      const role = await getRoleById(1);
      
      expect(role).not.toBeNull();
      expect(role?.name).toBe('superadmin');
      expect(role?.isSystem).toBe(true);
    });

    it('should return null for non-existent role', async () => {
      const role = await getRoleById(99999);
      
      expect(role).toBeNull();
    });
  });

  describe('getRoleByName', () => {
    it('should return role by name', async () => {
      const role = await getRoleByName('admin');
      
      expect(role).not.toBeNull();
      expect(role?.id).toBe(2);
      expect(role?.isSystem).toBe(true);
    });

    it('should return null for non-existent role name', async () => {
      const role = await getRoleByName('nonexistent');
      
      expect(role).toBeNull();
    });
  });

  describe('createRole', () => {
    it('should create a new role with permissions', async () => {
      const newRole = await createRole({
        name: 'moderator',
        description: 'Moderator role',
        permissions: {
          servers: ['view'],
          logs: ['view', 'delete'],
        },
      });
      
      expect(newRole.name).toBe('moderator');
      expect(newRole.description).toBe('Moderator role');
      expect(newRole.permissions.servers).toContain('view');
      expect(newRole.isSystem).toBe(false);
    });

    it('should throw error for duplicate role name', async () => {
      await expect(
        createRole({
          name: 'admin',
          description: 'Duplicate',
          permissions: {},
        })
      ).rejects.toThrow("Role with name 'admin' already exists");
    });
  });

  describe('updateRole', () => {
    it('should update role permissions', async () => {
      // Create a custom role first
      const role = await createRole({
        name: 'testrole',
        description: 'Test role',
        permissions: { servers: ['view'] },
      });

      const updated = await updateRole(role.id, {
        description: 'Updated description',
        permissions: {
          servers: ['view', 'start', 'stop'],
          backups: ['view'],
        },
      });
      
      expect(updated.description).toBe('Updated description');
      expect(updated.permissions.servers).toContain('start');
    });

    it('should prevent renaming system roles', async () => {
      await expect(
        updateRole(1, { name: 'newname' })
      ).rejects.toThrow('Cannot rename system roles');
    });

    it('should throw error for non-existent role', async () => {
      await expect(
        updateRole(99999, { description: 'test' })
      ).rejects.toThrow('Role not found');
    });
  });

  describe('deleteRole', () => {
    it('should delete custom role', async () => {
      const role = await createRole({
        name: 'deleteme',
        description: 'To be deleted',
        permissions: {},
      });

      await deleteRole(role.id);
      
      const deleted = await getRoleById(role.id);
      expect(deleted).toBeNull();
    });

    it('should prevent deleting system roles', async () => {
      await expect(deleteRole(1)).rejects.toThrow('Cannot delete system roles');
    });

    it('should throw error for non-existent role', async () => {
      await expect(deleteRole(99999)).rejects.toThrow('Role not found');
    });
  });

  describe('hasPermission', () => {
    it('should return true when user has specific permission', () => {
      const adminRole: Role = {
        id: 2,
        name: 'admin',
        description: 'Admin',
        permissions: {
          servers: ['view', 'start', 'stop'],
          backups: ['view'],
        },
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      expect(hasPermission(adminRole, 'servers', 'view')).toBe(true);
      expect(hasPermission(adminRole, 'servers', 'start')).toBe(true);
    });

    it('should return false when user does not have permission', () => {
      const viewerRole: Role = {
        id: 4,
        name: 'viewer',
        description: 'Viewer',
        permissions: {
          servers: ['view'],
        },
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      expect(hasPermission(viewerRole, 'servers', 'delete')).toBe(false);
      expect(hasPermission(viewerRole, 'backups', 'view')).toBe(false);
    });

    it('should allow superadmin all permissions', () => {
      const superRole: Role = {
        id: 1,
        name: 'superadmin',
        description: 'Super Admin',
        permissions: { '*': ['*'] },
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      expect(hasPermission(superRole, 'any_resource', 'any_action')).toBe(true);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true when user has all specified permissions', () => {
      const adminRole: Role = {
        id: 2,
        name: 'admin',
        description: 'Admin',
        permissions: {
          servers: ['view', 'start'],
          backups: ['view'],
        },
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      expect(hasAllPermissions(adminRole, [
        { resource: 'servers', action: 'view' },
        { resource: 'backups', action: 'view' },
      ])).toBe(true);
    });

    it('should return false when user is missing any permission', () => {
      const adminRole: Role = {
        id: 2,
        name: 'admin',
        description: 'Admin',
        permissions: {
          servers: ['view'],
        },
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      expect(hasAllPermissions(adminRole, [
        { resource: 'servers', action: 'view' },
        { resource: 'servers', action: 'delete' },
      ])).toBe(false);
    });
  });

  describe('getRoleUserCount', () => {
    it('should return number of users with role', async () => {
      const count = await getRoleUserCount(1);
      
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});
