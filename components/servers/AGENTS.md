# AGENTS.md - components/servers/

## OVERVIEW
Server management UI components for displaying, configuring, and controlling Project Zomboid servers.

## STRUCTURE

| Category | Files | Purpose |
|----------|-------|---------|
| Display | server-card.tsx, server-list-view.tsx, server-card-skeleton.tsx, view-mode-toggle.tsx | Server list/grid rendering and loading states |
| Modals | add-server-modal.tsx, delete-confirm-modal.tsx, mod-manager-modal.tsx | Dialogs for CRUD operations and mod management |
| Configuration | quick-config-panel.tsx, advanced-settings-drawer.tsx, sandbox-vars-editor.tsx, difficulty-preset-selector.tsx, dynamic-ini-input.tsx | Server and sandbox configuration UIs |
| Utilities | sortable-mod-item.tsx | Drag-and-drop mod list items |

## WHERE TO LOOK

- **Server display cards** → server-card.tsx (status, actions, mod list)
- **List/grid organization** → server-list-view.tsx (with view-mode-toggle.tsx)
- **Add new server** → add-server-modal.tsx
- **Mod management** → mod-manager-modal.tsx, sortable-mod-item.tsx
- **Quick server config** → quick-config-panel.tsx
- **Advanced INI editing** → advanced-settings-drawer.tsx, dynamic-ini-input.tsx
- **Sandbox variables** → sandbox-vars-editor.tsx, difficulty-preset-selector.tsx
- **Loading states** → server-card-skeleton.tsx

## CONVENTIONS

### Client Components
All server components are client components (require `'use client'`):
- State management with useState/useEffect
- React Query hooks for server data
- Event handlers for user interactions

### Modal Pattern
Modal files follow `*-modal.tsx` naming:
- Props include `onClose: () => void`
- Fixed overlay with `z-50` and `bg-black/50`
- Centered or slide-in animation containers
- Header with title and close button
- Scrollable content area
- Footer with action buttons

### Editor Pattern
Editor files follow `*-editor.tsx` naming:
- Complex forms with validation
- Local state mirrors server config
- Save/cancel flow with change detection
- May open from quick panels

### Styling
- Use Tailwind semantic colors: `bg-card`, `border-border`, `text-foreground`
- Compact card layouts with `p-4` padding
- Status badges with contextual colors
- Hover transitions: `hover:bg-muted transition-colors`

### Props Interface Pattern
```typescript
interface ServerCardProps {
  server: ServerType;
  status?: ServerStatus;
  onDelete: () => void;
  // ... callbacks for actions
}
```
