# UI Components

## OVERVIEW

Reusable UI primitive components for the Zomboid Server Manager.

## STRUCTURE

Components are organized by function:

- **Controls**: button, stepper-control, ram-slider
- **Feedback**: progress-bar, loading-skeleton, warning-box, empty-state
- **Selection**: selectable-card, toggle-card, filter-tabs
- **Layout**: collapsible-section

## WHERE TO LOOK

| Need | File |
|------|------|
| Buttons | `button.tsx` - Primary, secondary, destructive, ghost variants |
| Loading states | `loading-skeleton.tsx` - Animated pulse placeholders |
| Progress indicators | `progress-bar.tsx` - Horizontal bars with percentage |
| Selection UI | `selectable-card.tsx` - Single select cards |
| Toggles | `toggle-card.tsx` - iOS-style toggle switches |
| Filters | `filter-tabs.tsx` - Tabbed filtering with counts |
| Expandable content | `collapsible-section.tsx` - Show/hide sections |
| Callouts | `warning-box.tsx` - Warning, destructive, info alerts |
| Empty states | `empty-state.tsx` - Centered empty content display |
| RAM allocation | `ram-slider.tsx` - Dual-handle slider with presets |

## CONVENTIONS

- All components use `'use client'` directive
- Props extend HTML attributes where possible (e.g., `ButtonProps extends ButtonHTMLAttributes`)
- Use Tailwind semantic colors: `bg-primary`, `text-foreground`, `border-border`
- Support ref forwarding with `forwardRef` for interactive elements
- Components accept `className` for style overrides
- Include proper ARIA attributes (`role`, `aria-*`)
- Use `disabled` prop consistently with opacity and cursor styles
