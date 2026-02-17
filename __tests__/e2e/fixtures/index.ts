export const serverFixtures = {
  validServer: {
    name: 'test-server-1',
    path: '/root/server-cache/test-server-1',
    valid: true,
    hasIni: true,
    hasDb: true
  },
  invalidServer: {
    name: 'test-server-2',
    path: '/root/server-cache/test-server-2',
    valid: false,
    hasIni: false,
    hasDb: false
  },
  stoppedServer: {
    name: 'stopped-server',
    state: 'stopped' as const,
    pid: undefined
  },
  runningServer: {
    name: 'running-server',
    state: 'running' as const,
    pid: 12345,
    ports: { defaultPort: 16261, udpPort: 16262, rconPort: 27015 }
  }
};

export const userFixtures = {
  superadmin: {
    username: 'superadmin',
    password: 'superadmin123',
    role: 'superadmin'
  },
  admin: {
    username: 'admin',
    password: 'admin123',
    role: 'admin'
  },
  operator: {
    username: 'operator',
    password: 'operator123',
    role: 'operator'
  },
  viewer: {
    username: 'viewer',
    password: 'viewer123',
    role: 'viewer'
  }
};

export const iniConfigFixtures = {
  default: {
    PublicName: 'Test Server',
    PublicDescription: 'A test server',
    MaxPlayers: '16',
    PVP: 'true',
    SafehouseAllowRespawn: 'true',
    Password: '',
    AdminPassword: 'admin123',
    Mods: '',
    WorkshopItems: '',
    Map: 'Muldraugh, KY',
    DefaultPort: '16261',
    UDPPort: '16262',
    RCONPort: '27015'
  },
  withMods: {
    PublicName: 'Modded Server',
    PublicDescription: 'Server with mods',
    MaxPlayers: '32',
    PVP: 'false',
    SafehouseAllowRespawn: 'false',
    Password: 'secret',
    AdminPassword: 'admin456',
    Mods: 'Mod1;Mod2;Mod3',
    WorkshopItems: '1234567890=Mod1;0987654321=Mod2;1122334455=Mod3',
    Map: 'Muldraugh, KY',
    DefaultPort: '16261',
    UDPPort: '16262',
    RCONPort: '27015'
  }
};

export const modFixtures = {
  workshopItem1: {
    workshopId: '1234567890',
    modId: 'TestMod1',
    name: 'Test Mod 1',
    order: 1
  },
  workshopItem2: {
    workshopId: '0987654321',
    modId: 'TestMod2',
    name: 'Test Mod 2',
    order: 2
  },
  workshopItem3: {
    workshopId: '1122334455',
    modId: 'TestMod3',
    name: 'Test Mod 3',
    order: 3
  }
};

export const snapshotFixtures = {
  snapshot1: {
    schedule: 'daily',
    timestamp: '2026-02-16T10-00-00',
    path: '/opt/zomboid-backups/snapshots/daily/test-server-1/2026-02-16T10-00-00',
    size: 104857600,
    fileCount: 150,
    formattedSize: '100 MB',
    formattedTimestamp: '2026-02-16 10:00:00',
    server: 'test-server-1'
  },
  snapshot2: {
    schedule: 'weekly',
    timestamp: '2026-02-15T12-00-00',
    path: '/opt/zomboid-backups/snapshots/weekly/test-server-1/2026-02-15T12-00-00',
    size: 209715200,
    fileCount: 300,
    formattedSize: '200 MB',
    formattedTimestamp: '2026-02-15 12:00:00',
    server: 'test-server-1'
  }
};
