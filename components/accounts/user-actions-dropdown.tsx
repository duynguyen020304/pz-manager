'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Pencil, UserCheck, UserX, Trash2 } from 'lucide-react';
import type { UserWithRole } from '@/types';

interface UserActionsDropdownProps {
  user: UserWithRole;
  onEdit: (user: UserWithRole) => void;
  onDelete: (user: UserWithRole) => void;
  onToggleActive: (user: UserWithRole) => void;
}

export function UserActionsDropdown({ user, onEdit, onDelete, onToggleActive }: UserActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-muted rounded-lg transition-colors"
      >
        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-10 animate-fade-in">
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                onEdit(user);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <Pencil className="w-4 h-4" />
              Edit User
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                onToggleActive(user);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            >
              {user.isActive ? (
                <>
                  <UserX className="w-4 h-4" />
                  Deactivate
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  Activate
                </>
              )}
            </button>

            <div className="border-t border-border my-1" />

            <button
              onClick={() => {
                setIsOpen(false);
                onDelete(user);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete User
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
