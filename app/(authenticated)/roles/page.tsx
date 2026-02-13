'use client';

import { useState } from 'react';
import { UserCog, Plus, RefreshCw } from 'lucide-react';
import { useRoles, useCreateRole, useUpdateRole, useDeleteRole } from '@/hooks/use-api-users';
import {
  RoleCard,
  RoleCardSkeletonGrid,
  CreateRoleModal,
  EditRoleModal,
  DeleteRoleModal,
} from '@/components/roles';
import type { Role } from '@/types';

export default function RolesPage() {
  const { data, isLoading, error, refetch } = useRoles();
  const createRoleMutation = useCreateRole();
  const updateRoleMutation = useUpdateRole();
  const deleteRoleMutation = useDeleteRole();

  // Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);

  // Stats calculation
  const roles = data?.roles ?? [];
  const systemCount = roles.filter(r => r.isSystem).length;
  const customCount = roles.filter(r => !r.isSystem).length;

  const handleCreateRole = async (input: { name: string; description?: string; permissions: Record<string, string[]> }) => {
    try {
      await createRoleMutation.mutateAsync(input);
      setCreateModalOpen(false);
    } catch {
      // Error is handled by the mutation
    }
  };

  const handleUpdateRole = async (id: number, input: { name?: string; description?: string; permissions?: Record<string, string[]> }) => {
    try {
      await updateRoleMutation.mutateAsync({ id, data: input });
      setEditingRole(null);
    } catch {
      // Error is handled by the mutation
    }
  };

  const handleDeleteRole = async () => {
    if (!deletingRole) return;
    try {
      await deleteRoleMutation.mutateAsync(deletingRole.id);
      setDeletingRole(null);
    } catch {
      // Error is handled by the mutation
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <UserCog className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Roles</h1>
            <p className="text-muted-foreground">Manage roles and permissions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="p-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-foreground ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Role
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-foreground">{roles.length}</div>
          <div className="text-sm text-muted-foreground">Total Roles</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-foreground">{systemCount}</div>
          <div className="text-sm text-muted-foreground">System Roles</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-foreground">{customCount}</div>
          <div className="text-sm text-muted-foreground">Custom Roles</div>
        </div>
      </div>

      {/* Roles Grid */}
      {isLoading ? (
        <RoleCardSkeletonGrid count={4} />
      ) : error ? (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6 text-center">
          <p className="text-destructive">Failed to load roles</p>
          <button
            onClick={() => refetch()}
            className="mt-2 text-sm text-muted-foreground hover:text-foreground underline"
          >
            Try again
          </button>
        </div>
      ) : roles.length === 0 ? (
        <div className="bg-muted/50 border border-border rounded-lg p-12 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <UserCog className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No roles found</p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="mt-2 text-sm text-primary hover:underline"
          >
            Create your first role
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {roles.map(role => (
            <RoleCard
              key={role.id}
              role={role}
              userCount={role.userCount}
              onEdit={() => setEditingRole(role)}
              onDelete={role.isSystem ? undefined : () => setDeletingRole(role)}
            />
          ))}
        </div>
      )}

      {/* Info Card */}
      <div className="bg-muted/50 rounded-lg border border-border p-4">
        <h4 className="font-medium text-foreground mb-2">About Roles</h4>
        <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
          <li>System roles cannot be deleted or renamed</li>
          <li>Superadmin has full access to all features</li>
          <li>Changes to role permissions apply immediately to all users with that role</li>
          <li>Deleting a role will remove it from all assigned users</li>
        </ul>
      </div>

      {/* Create Role Modal */}
      {createModalOpen && (
        <CreateRoleModal
          onClose={() => setCreateModalOpen(false)}
          onSubmit={handleCreateRole}
          isSubmitting={createRoleMutation.isPending}
        />
      )}

      {/* Edit Role Modal */}
      {editingRole && (
        <EditRoleModal
          key={editingRole.id}
          role={editingRole}
          userCount={editingRole.userCount}
          onClose={() => setEditingRole(null)}
          onSubmit={handleUpdateRole}
          isSubmitting={updateRoleMutation.isPending}
        />
      )}

      {/* Delete Role Modal */}
      {deletingRole && (
        <DeleteRoleModal
          role={deletingRole}
          userCount={deletingRole.userCount ?? 0}
          onClose={() => setDeletingRole(null)}
          onConfirm={handleDeleteRole}
          isDeleting={deleteRoleMutation.isPending}
        />
      )}
    </div>
  );
}
