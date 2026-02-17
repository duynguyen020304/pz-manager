# E2E Testing Infrastructure - Implementation Summary

## What Was Built

### 1. Test Dependencies Installed ✅
- `supertest` + `@types/supertest` - HTTP assertions
- `msw` - API mocking framework  
- `mock-fs` + `@types/mock-fs` - File system mocking
- Added test scripts to package.json:
  - `npm run test:e2e` - Run E2E tests
  - `npm run test:e2e:watch` - Watch mode
  - `npm run test:e2e:coverage` - With coverage

### 2. Test Directory Structure Created ✅
```
__tests__/e2e/
├── api/
│   ├── servers.test.ts           # Server CRUD tests
│   └── server-lifecycle.test.ts  # Start/stop/status tests
├── helpers/
│   └── auth.ts                   # Authentication helpers
├── mocks/
│   ├── tmux.ts                   # tmux command mocking
│   ├── processes.ts              # Process management mocking
│   └── index.ts                  # Mock utilities aggregation
├── fixtures/
│   └── index.ts                  # Test data fixtures
└── setup.ts                      # E2E test setup
```

### 3. Mock Infrastructure Created ✅

#### tmux.ts
- Mock tmux session management
- Tracks created/killed sessions
- Simulates tmux commands (new-session, kill-session, has-session, send-keys, capture-pane)

#### processes.ts  
- Mock process management (pgrep, ps, ss)
- Simulates PID detection and port binding
- Tracks running processes and their ports

#### auth.ts
- Helper functions for creating test users
- Session creation for authenticated requests
- Role-based user creation (superadmin, admin, operator, viewer)

#### fixtures.ts
- Test data for servers, users, INI configs, mods, snapshots

### 4. Initial Test Files Created ✅

#### servers.test.ts - Server CRUD Tests
- GET /api/servers (empty list, populated list)
- POST /api/servers (create valid/invalid, duplicates)
- DELETE /api/servers (remove, error cases)
- Authentication rejection tests

#### server-lifecycle.test.ts - Lifecycle Tests
- POST /api/servers/[name]/start
- POST /api/servers/[name]/stop
- POST /api/servers/[name]/abort
- GET /api/servers/[name]/status
- GET /api/servers/status

## Issues Encountered

### 1. Next.js cookies() API
**Problem**: The `cookies()` function from `next/headers` doesn't work in test environment because it relies on Next.js request context.

**Impact**: Authentication fails because session cookies can't be read.

**Potential Solutions**:
- Mock the `next/headers` module entirely
- Use MSW (Mock Service Worker) to intercept requests
- Test at a lower level without Next.js routing

### 2. mock-fs Conflicts
**Problem**: mock-fs replaces the entire file system, causing conflicts with:
- Node.js internal file operations
- pg-mem database operations
- Dynamic imports

**Impact**: "EBADF, bad file descriptor" errors when reading config files.

**Potential Solutions**:
- Use temporary directories instead of mock-fs
- Mock specific modules (config-manager) rather than file system
- Use vitest's vi.mock() for module-level mocking

### 3. Database Session Collisions
**Problem**: pg-mem has issues with duplicate UUID generation in rapid test execution.

**Impact**: Session creation fails with duplicate key errors.

**Potential Solutions**:
- Reset database more thoroughly between tests
- Use deterministic UUIDs for test sessions
- Add delay between test executions

### 4. Async Job Testing
**Problem**: Server start/stop operations are asynchronous with job tracking.

**Impact**: Tests can't easily verify job completion.

**Potential Solutions**:
- Mock the job execution to be synchronous in tests
- Add test-specific endpoints to query job status
- Use longer timeouts and polling in tests

## Recommended Next Steps

### Option 1: Fix Current Approach (Module-Level Mocking)
Instead of mocking the file system, mock the modules that use it:

```typescript
// Mock config-manager
vi.mock('@/lib/config-manager', () => ({
  getServers: vi.fn(() => Promise.resolve(['test-server'])),
  addServer: vi.fn(() => Promise.resolve()),
  removeServer: vi.fn(() => Promise.resolve()),
  loadConfig: vi.fn(() => Promise.resolve({ servers: [] }))
}));

// Mock auth
vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(() => Promise.resolve({ id: 1, roleId: 2 })),
  getCurrentUser: vi.fn(() => Promise.resolve(mockUser))
}));
```

### Option 2: Integration Testing Approach
Test the full stack with real (but isolated) resources:
- Use real file system in temp directories
- Use real PostgreSQL test database
- Mock only external dependencies (tmux, steamcmd)

### Option 3: API Contract Testing
Focus on testing request/response contracts:
- Validate API endpoints accept correct parameters
- Validate response shapes
- Test error scenarios
- Don't test internal implementation details

## Files That Are Ready

✅ **package.json** - Test scripts added
✅ **vitest.config.ts** - E2E setup file included
✅ **mocks/tmux.ts** - Complete tmux mocking
✅ **mocks/processes.ts** - Complete process mocking
✅ **fixtures/index.ts** - Test data ready
✅ **helpers/auth.ts** - Auth helpers (needs module mocking)

## Files That Need Refinement

⚠️ **mocks/index.ts** - Remove mock-fs integration, keep only utility functions
⚠️ **setup.ts** - Simplify, remove problematic vi.mock() calls
⚠️ **api/servers.test.ts** - Update to use module mocking
⚠️ **api/server-lifecycle.test.ts** - Update to use module mocking

## Quick Win: Simple Working Test Example

Here's a minimal working test pattern:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { GET } from '@/app/api/servers/route';

// Mock the modules
vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(() => Promise.resolve({ 
    id: '1', 
    username: 'test',
    role: { name: 'admin', permissions: {} }
  }))
}));

vi.mock('@/lib/config-manager', () => ({
  getServers: vi.fn(() => Promise.resolve(['server1', 'server2']))
}));

vi.mock('@/lib/file-utils', () => ({
  detectAvailableServers: vi.fn(() => Promise.resolve([
    { name: 'server1', valid: true, hasIni: true, hasDb: true }
  ]))
}));

describe('GET /api/servers', () => {
  it('should return list of servers', async () => {
    const request = new Request('http://localhost:3000/api/servers');
    const response = await GET(request as any);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(2);
  });
});
```

## Conclusion

The E2E testing infrastructure is **substantially complete**. The main components are in place:
- Dependencies installed
- Directory structure created
- Mock utilities implemented
- Test files drafted
- Test scripts configured

The remaining work is to **refine the mocking strategy** to work around Next.js and file system limitations. The recommended approach is to use **module-level mocking** rather than trying to mock the entire runtime environment.

**Estimated remaining effort**: 2-4 hours to refactor tests with proper module mocking and get them all passing.
