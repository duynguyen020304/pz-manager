/**
 * Test role fixtures for E2E tests.
 * Provides reusable test role data for custom roles and permission testing.
 */

/**
 * System role fixtures (read-only, should exist in database).
 */
export const systemRoleFixtures = {
  superadmin: {
    name: 'superadmin',
    permissions: { '*': ['*'] }, // Wildcard: all permissions
    isSystem: true,
    description: 'Full system access'
  },

  admin: {
    name: 'admin',
    permissions: {
      users: ['view', 'create', 'edit', 'delete'],
      roles: ['view', 'create', 'edit', 'delete'],
      servers: ['view', 'create', 'edit', 'delete', 'start', 'stop'],
      backups: ['view', 'create', 'restore', 'delete'],
      logs: ['view'],
      metrics: ['view'],
      schedules: ['view', 'create', 'edit', 'delete']
    },
    isSystem: true,
    description: 'Administrative access'
  },

  operator: {
    name: 'operator',
    permissions: {
      users: ['view'],
      roles: ['view'],
      servers: ['view', 'start', 'stop'],
      backups: ['view', 'restore'],
      logs: ['view'],
      metrics: ['view']
    },
    isSystem: true,
    description: 'Server operations access'
  },

  viewer: {
    name: 'viewer',
    permissions: {
      users: ['view'],
      roles: ['view'],
      servers: ['view'],
      backups: ['view'],
      logs: ['view'],
      metrics: ['view']
    },
    isSystem: true,
    description: 'Read-only access'
  }
};

/**
 * Custom role fixtures for testing.
 * These can be created in tests (not system roles).
 */
export const customRoleFixtures = {
  // Role with only user management permissions
  userManager: {
    name: 'test_user_manager',
    permissions: {
      users: ['view', 'create', 'edit'],
      roles: ['view']
    },
    description: 'Can manage users but not roles'
  },

  // Role with only server management permissions
  serverManager: {
    name: 'test_server_manager',
    permissions: {
      servers: ['view', 'create', 'edit', 'delete', 'start', 'stop'],
      backups: ['view', 'restore']
    },
    description: 'Can manage servers and backups'
  },

  // Role with only backup permissions
  backupOperator: {
    name: 'test_backup_operator',
    permissions: {
      servers: ['view'],
      backups: ['view', 'create', 'restore']
    },
    description: 'Can manage backups only'
  },

  // Role with limited server access (view only)
  serverViewer: {
    name: 'test_server_viewer',
    permissions: {
      servers: ['view'],
      logs: ['view']
    },
    description: 'Can view servers and logs'
  },

  // Role with mod management permissions
  modManager: {
    name: 'test_mod_manager',
    permissions: {
      servers: ['view', 'edit'],
      mods: ['view', 'create', 'delete', 'reorder']
    },
    description: 'Can manage mods on servers'
  }
};

/**
 * Role fixtures for permission testing edge cases.
 */
export const edgeCaseRoleFixtures = {
  // Role with no permissions
  noPermissions: {
    name: 'test_no_permissions',
    permissions: {},
    description: 'No permissions at all'
  },

  // Role with partial permissions (view but not edit)
  partialPermissions: {
    name: 'test_partial_permissions',
    permissions: {
      users: ['view'],
      servers: ['view', 'start'] // Can start but not stop
    },
    description: 'Partial permissions'
  },

  // Role with wildcard on single resource
  singleWildcard: {
    name: 'test_single_wildcard',
    permissions: {
      servers: ['*'] // Can do anything with servers
    },
    description: 'Wildcard on single resource'
  },

  // Role with all view permissions
  allViewer: {
    name: 'test_all_viewer',
    permissions: {
      users: ['view'],
      roles: ['view'],
      servers: ['view'],
      backups: ['view'],
      logs: ['view'],
      metrics: ['view'],
      schedules: ['view']
    },
    description: 'Can view everything'
  }
};

/**
 * Role fixtures for CRUD operations.
 */
export const crudRoleFixtures = {
  create: {
    name: `test_crud_create_${Date.now()}`,
    permissions: {
      users: ['view']
    },
    description: 'Role for create test'
  },

  update: {
    name: `test_crud_update_${Date.now()}`,
    permissions: {
      users: ['view', 'create']
    },
    description: 'Role for update test'
  },

  delete: {
    name: `test_crud_delete_${Date.now()}`,
    permissions: {
      servers: ['view']
    },
    description: 'Role for delete test'
  }
};

/**
 * Role fixtures for pagination tests.
 */
export function generatePaginationRoleFixtures(count: number): Array<{
  name: string;
  permissions: Record<string, string[]>;
  description: string;
}> {
  const roles: Array<{
    name: string;
    permissions: Record<string, string[]>;
    description: string;
  }> = [];

  for (let i = 0; i < count; i++) {
    roles.push({
      name: `test_pagination_role_${i}_${Date.now()}`,
      permissions: {
        servers: ['view']
      },
      description: `Test role ${i} for pagination`
    });
  }

  return roles;
}

/**
 * Role fixtures for search/filter tests.
 */
export const searchRoleFixtures = {
  matchExact: {
    name: 'test_search_exact_role',
    permissions: {
      users: ['view']
    },
    description: 'Role for exact search match'
  },

  matchPartial: {
    name: 'test_search_partial_role_match',
    permissions: {
      servers: ['view']
    },
    description: 'Role for partial search match'
  },

  noMatch: {
    name: 'test_no_match_role',
    permissions: {
      backups: ['view']
    },
    description: 'Role that should not match'
  }
};

/**
 * Role fixtures for permission matrix testing.
 * These test various permission combinations.
 */
export const permissionMatrixFixtures = {
  // User management only
  userOnly: {
    name: 'test_user_only',
    permissions: {
      users: ['view', 'create', 'edit', 'delete']
    }
  },

  // Server management only
  serverOnly: {
    name: 'test_server_only',
    permissions: {
      servers: ['view', 'create', 'edit', 'delete', 'start', 'stop']
    }
  },

  // Backup management only
  backupOnly: {
    name: 'test_backup_only',
    permissions: {
      backups: ['view', 'create', 'restore', 'delete']
    }
  },

  // Logs and metrics only
  observabilityOnly: {
    name: 'test_observability_only',
    permissions: {
      logs: ['view'],
      metrics: ['view']
    }
  },

  // Multiple resources, limited actions
  multiResourceLimited: {
    name: 'test_multi_limited',
    permissions: {
      users: ['view'],
      servers: ['view'],
      backups: ['view'],
      logs: ['view']
    }
  }
};

/**
 * Generate unique test role name.
 */
export function generateUniqueRoleName(suffix?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return suffix ? `test_role_${suffix}_${timestamp}` : `test_role_${timestamp}_${random}`;
}

/**
 * Generate unique test role data.
 */
export function generateUniqueTestRole(
  permissions: Record<string, string[]>,
  suffix?: string
): { name: string; permissions: Record<string, string[]>; description: string } {
  return {
    name: generateUniqueRoleName(suffix),
    permissions,
    description: `Test role created at ${new Date().toISOString()}`
  };
}

/**
 * Role fixtures for validation tests.
 */
export const validationRoleFixtures = {
  valid: {
    name: 'test_valid_role',
    permissions: {
      users: ['view']
    },
    description: 'Valid role'
  },

  nameTooShort: {
    name: 'ab',
    permissions: {
      users: ['view']
    },
    description: 'Name too short'
  },

  nameTooLong: {
    name: 'a'.repeat(100),
    permissions: {
      users: ['view']
    },
    description: 'Name too long'
  },

  invalidPermissions: {
    name: 'test_invalid_permissions',
    permissions: 'not-an-object' as any,
    description: 'Invalid permissions format'
  },

  emptyPermissions: {
    name: 'test_empty_permissions',
    permissions: {},
    description: 'Empty permissions (valid but no access)'
  }
};

/**
 * Role fixtures for bulk operations.
 */
export function generateBulkRoleFixtures(count: number): Array<{
  name: string;
  permissions: Record<string, string[]>;
  description: string;
}> {
  const roles: Array<{
    name: string;
    permissions: Record<string, string[]>;
    description: string;
  }> = [];

  const permissionSets = [
    { users: ['view'] },
    { servers: ['view'] },
    { backups: ['view'] },
    { logs: ['view'] },
    { metrics: ['view'] }
  ];

  for (let i = 0; i < count; i++) {
    roles.push({
      name: `test_bulk_role_${i}_${Date.now()}`,
      permissions: permissionSets[i % permissionSets.length],
      description: `Bulk test role ${i}`
    });
  }

  return roles;
}

/**
 * Role fixtures for system role protection tests.
 */
export const systemRoleProtectionFixtures = {
  // Attempt to modify system role
  modifySystemRole: {
    roleId: 1, // superadmin
    updates: {
      name: 'hacked_superadmin',
      permissions: { users: [] } // Try to remove permissions
    }
  },

  // Attempt to delete system role
  deleteSystemRole: {
    roleId: 2 // admin
  },

  // Valid: create custom role (should work)
  createCustomRole: {
    name: 'test_custom_role',
    permissions: {
      servers: ['view']
    }
  }
};

/**
 * Role fixtures for role hierarchy tests.
 */
export const roleHierarchyFixtures = {
  // Higher privilege role
  higherPrivilege: {
    name: 'test_higher_privilege',
    permissions: {
      users: ['view', 'create', 'edit', 'delete'],
      servers: ['view', 'create', 'edit', 'delete', 'start', 'stop'],
      backups: ['view', 'create', 'restore', 'delete']
    }
  },

  // Lower privilege role
  lowerPrivilege: {
    name: 'test_lower_privilege',
    permissions: {
      users: ['view'],
      servers: ['view'],
      backups: ['view']
    }
  },

  // Medium privilege role
  mediumPrivilege: {
    name: 'test_medium_privilege',
    permissions: {
      users: ['view', 'create'],
      servers: ['view', 'start', 'stop'],
      backups: ['view', 'restore']
    }
  }
};

/**
 * Role fixtures for concurrency tests.
 */
export const concurrentRoleFixtures = [
  {
    name: 'test_concurrent_role_1',
    permissions: { users: ['view'] },
    description: 'Concurrent role 1'
  },
  {
    name: 'test_concurrent_role_2',
    permissions: { servers: ['view'] },
    description: 'Concurrent role 2'
  },
  {
    name: 'test_concurrent_role_3',
    permissions: { backups: ['view'] },
    description: 'Concurrent role 3'
  }
];
