'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, X } from 'lucide-react';
import { useRoles } from '@/hooks/use-api-users';
import type { UserWithRole, Role } from '@/types';

interface EditUserModalProps {
  user: UserWithRole;
  onClose: () => void;
  onSubmit: (id: number, data: { username?: string; email?: string; password?: string; roleId?: number; isActive?: boolean }) => void;
  isSubmitting: boolean;
}

export function EditUserModal({ user, onClose, onSubmit, isSubmitting }: EditUserModalProps) {
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [roleId, setRoleId] = useState<number>(user.roleId);
  const [isActive, setIsActive] = useState(user.isActive);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: rolesData } = useRoles();
  const roles = rolesData?.roles || [];

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!username.trim()) {
      newErrors.username = 'Username is required';
    } else if (username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email address';
    }

    if (password && password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (password && password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!roleId) {
      newErrors.role = 'Please select a role';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    // Only send changed fields
    const changes: { username?: string; email?: string; password?: string; roleId?: number; isActive?: boolean } = {};

    if (username !== user.username) changes.username = username.trim();
    if ((email || null) !== user.email) changes.email = email.trim() || undefined;
    if (password) changes.password = password;
    if (roleId !== user.roleId) changes.roleId = roleId;
    if (isActive !== user.isActive) changes.isActive = isActive;

    // If nothing changed, just close
    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }

    onSubmit(user.id, changes);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-card border border-border rounded-xl max-w-md w-full max-h-[90vh] flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Pencil className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Edit User</h2>
              <p className="text-sm text-muted-foreground">{user.username}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1.5 hover:bg-muted rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* Username field */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Username <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={e => {
                setUsername(e.target.value);
                if (errors.username) setErrors({ ...errors, username: '' });
              }}
              placeholder="Enter username"
              className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground text-sm transition-all ${
                errors.username ? 'border-destructive' : 'border-border focus:border-primary'
              }`}
              disabled={isSubmitting}
            />
            {errors.username && (
              <p className="text-xs text-destructive mt-1">{errors.username}</p>
            )}
          </div>

          {/* Email field */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => {
                setEmail(e.target.value);
                if (errors.email) setErrors({ ...errors, email: '' });
              }}
              placeholder="Enter email (optional)"
              className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground text-sm transition-all ${
                errors.email ? 'border-destructive' : 'border-border focus:border-primary'
              }`}
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="text-xs text-destructive mt-1">{errors.email}</p>
            )}
          </div>

          {/* Password field */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                if (errors.password) setErrors({ ...errors, password: '' });
              }}
              placeholder="Leave blank to keep current password"
              className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground text-sm transition-all ${
                errors.password ? 'border-destructive' : 'border-border focus:border-primary'
              }`}
              disabled={isSubmitting}
            />
            {errors.password && (
              <p className="text-xs text-destructive mt-1">{errors.password}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Leave blank to keep the current password
            </p>
          </div>

          {/* Confirm Password field */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
              }}
              placeholder="Confirm new password"
              className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground text-sm transition-all ${
                errors.confirmPassword ? 'border-destructive' : 'border-border focus:border-primary'
              }`}
              disabled={isSubmitting}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-destructive mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Role field */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Role <span className="text-destructive">*</span>
            </label>
            <select
              value={roleId}
              onChange={e => {
                const value = e.target.value ? Number(e.target.value) : roleId;
                setRoleId(value);
                if (errors.role) setErrors({ ...errors, role: '' });
              }}
              className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground text-sm transition-all ${
                errors.role ? 'border-destructive' : 'border-border focus:border-primary'
              }`}
              disabled={isSubmitting}
            >
              <option value="">Select a role</option>
              {roles.map((role: Role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            {errors.role && (
              <p className="text-xs text-destructive mt-1">{errors.role}</p>
            )}
          </div>

          {/* Active checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="editIsActive"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary/50"
              disabled={isSubmitting}
            />
            <label htmlFor="editIsActive" className="text-sm text-foreground">
              Active (user can log in)
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-border">
          <Button
            onClick={onClose}
            variant="secondary"
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="primary"
            className="flex-1"
            disabled={isSubmitting}
            isLoading={isSubmitting}
            leftIcon={!isSubmitting ? <Pencil className="w-4 h-4" /> : undefined}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
