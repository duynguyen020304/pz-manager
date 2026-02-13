'use client';

import { useEffect } from 'react';

/**
 * MonitoringProvider
 * Initializes the system monitoring service on app startup
 * This component should be mounted once in the authenticated layout
 */
export function MonitoringProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Start the monitoring service
    const startMonitoring = async () => {
      try {
        // Dynamically import to avoid SSR issues
        const { systemMonitor } = await import('@/lib/system-monitor');
        await systemMonitor.start();
      } catch (error) {
        console.error('Failed to start monitoring service:', error);
      }
    };

    startMonitoring();

    // Cleanup on unmount
    return () => {
      import('@/lib/system-monitor').then(({ systemMonitor }) => {
        systemMonitor.stop();
      });
    };
  }, []);

  return <>{children}</>;
}
