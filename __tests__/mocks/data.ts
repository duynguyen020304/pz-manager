import { vi } from 'vitest';
import type { User, UserWithRole, Role, Session } from '@/types';

export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    roleId: 2,
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

export function createMockUserWithRole(overrides: Partial<UserWithRole> = {}): UserWithRole {
  return {
    ...createMockUser(overrides),
    role: createMockRole(),
    ...overrides,
  };
}

export function createMockRole(overrides: Partial<Role> = {}): Role {
  return {
    id: 1,
    name: 'admin',
    description: 'Administrator role',
    permissions: {
      servers: ['view', 'start', 'stop'],
      backups: ['view', 'create'],
    },
    isSystem: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

export function createMockSession(overrides: Partial<Session> = {}): Session {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    userId: 1,
    token: 'test-session-token',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    ipAddress: null,
    userAgent: null,
    ...overrides,
  };
}

export function mockDatabase() {
  const mockQuery = vi.fn();
  const mockQueryOne = vi.fn();
  const mockTransaction = vi.fn();
  
  return {
    query: mockQuery,
    queryOne: mockQueryOne,
    transaction: mockTransaction,
    reset: () => {
      mockQuery.mockClear();
      mockQueryOne.mockClear();
      mockTransaction.mockClear();
    },
  };
}

export const mockRoles: Role[] = [
  {
    id: 1,
    name: 'superadmin',
    description: 'Full system access',
    permissions: { '*': ['*'] },
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    name: 'admin',
    description: 'Administrator',
    permissions: {
      servers: ['view', 'start', 'stop', 'configure'],
      backups: ['view', 'create', 'restore', 'delete'],
      users: ['view', 'create', 'edit'],
      roles: ['view'],
    },
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 3,
    name: 'operator',
    description: 'Operator',
    permissions: {
      servers: ['view', 'start', 'stop'],
      backups: ['view'],
      logs: ['view'],
    },
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 4,
    name: 'viewer',
    description: 'Viewer',
    permissions: {
      servers: ['view'],
      backups: ['view'],
      logs: ['view'],
    },
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const mockUsers: User[] = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    roleId: 1,
    isActive: true,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    username: 'testuser',
    email: 'test@example.com',
    roleId: 2,
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 3,
    username: 'disabled',
    email: 'disabled@example.com',
    roleId: 3,
    isActive: false,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];
