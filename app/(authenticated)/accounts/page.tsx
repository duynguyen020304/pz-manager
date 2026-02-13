'use client';

import { useState } from 'react';
import { Users, Plus, Search, RefreshCw, Filter } from 'lucide-react';
import { useUsers, useRoles, useCreateUser, useUpdateUser, useDeleteUser } from '@/hooks/use-api-users';
import { useDebounce } from '@/hooks/use-debounce';
import {
  UserTableSkeleton,
  UserActionsDropdown,
  CreateUserModal,
  EditUserModal,
  DeleteUserModal
} from '@/components/accounts';
import type { UserWithRole, Role } from '@/types';

export default function AccountsPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<boolean | null>(null);
  const limit = 10;

  // Debounce search to reduce API calls
  const debouncedSearch = useDebounce(searchInput, 300);

  const { data, isLoading, error, refetch } = useUsers({
    page,
    limit,
    search: debouncedSearch || undefined,
    roleId: roleFilter ?? undefined,
    isActive: statusFilter ?? undefined,
  });

  const { data: rolesData } = useRoles();
  const roles = rolesData?.roles || [];

  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserWithRole | null>(null);

  // Reset page when filters change
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    setPage(1);
  };

  const handleRoleFilterChange = (value: string) => {
    setRoleFilter(value ? Number(value) : null);
    setPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    if (value === '') {
      setStatusFilter(null);
    } else {
      setStatusFilter(value === 'true');
    }
    setPage(1);
  };

  // Handlers
  const handleCreateUser = async (userData: { username: string; email?: string; password: string; roleId: number; isActive: boolean }) => {
    try {
      await createUserMutation.mutateAsync(userData);
      setCreateModalOpen(false);
    } catch {
      // Error is handled by the mutation
    }
  };

  const handleUpdateUser = async (id: number, userData: { username?: string; email?: string; password?: string; roleId?: number; isActive?: boolean }) => {
    try {
      await updateUserMutation.mutateAsync({ id, data: userData });
      setEditingUser(null);
    } catch {
      // Error is handled by the mutation
    }
  };

  const handleDeleteUser = async (id: number) => {
    try {
      await deleteUserMutation.mutateAsync(id);
      setDeletingUser(null);
    } catch {
      // Error is handled by the mutation
    }
  };

  const handleToggleActive = async (user: UserWithRole) => {
    try {
      await updateUserMutation.mutateAsync({
        id: user.id,
        data: { isActive: !user.isActive }
      });
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
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Accounts</h1>
            <p className="text-muted-foreground">Manage users and their roles</p>
          </div>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Stats Cards */}
      {data?.stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Total Users</p>
            <p className="text-2xl font-bold text-foreground">{data.stats.total}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Active Users</p>
            <p className="text-2xl font-bold text-green-600">{data.stats.active}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Inactive Users</p>
            <p className="text-2xl font-bold text-red-600">{data.stats.inactive}</p>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />

          {/* Role Filter */}
          <select
            value={roleFilter ?? ''}
            onChange={(e) => handleRoleFilterChange(e.target.value)}
            className="px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Roles</option>
            {roles.map((role: Role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter === null ? '' : statusFilter.toString()}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            className="px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>

          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="p-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-foreground ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">User</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Last Login</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <UserTableSkeleton count={5} />
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-destructive">
                    Failed to load users
                  </td>
                </tr>
              ) : data?.users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-muted-foreground">
                        {searchInput || roleFilter !== null || statusFilter !== null
                          ? 'No users match your filters'
                          : 'No users found'}
                      </p>
                      {!searchInput && roleFilter === null && statusFilter === null && (
                        <button
                          onClick={() => setCreateModalOpen(true)}
                          className="text-primary hover:underline text-sm"
                        >
                          Add your first user
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                data?.users.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{user.username}</p>
                          {user.email && (
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                        {user.role?.name || 'No Role'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          user.isActive
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                        }`}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <UserActionsDropdown
                        user={user}
                        onEdit={setEditingUser}
                        onDelete={setDeletingUser}
                        onToggleActive={handleToggleActive}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, data.pagination.total)} of{' '}
              {data.pagination.total} users
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {data.pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                disabled={page === data.pagination.totalPages}
                className="px-3 py-1 text-sm border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {createModalOpen && (
        <CreateUserModal
          onClose={() => setCreateModalOpen(false)}
          onSubmit={handleCreateUser}
          isSubmitting={createUserMutation.isPending}
        />
      )}

      {editingUser && (
        <EditUserModal
          key={editingUser.id}
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSubmit={handleUpdateUser}
          isSubmitting={updateUserMutation.isPending}
        />
      )}

      {deletingUser && (
        <DeleteUserModal
          user={deletingUser}
          onClose={() => setDeletingUser(null)}
          onConfirm={handleDeleteUser}
          isDeleting={deleteUserMutation.isPending}
        />
      )}
    </div>
  );
}
