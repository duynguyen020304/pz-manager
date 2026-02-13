import { NextRequest, NextResponse } from 'next/server';
import { ingestAllLogs, startWatchingAll, stopAllWatchers, getWatchStatus } from '@/lib/log-watcher';
import { requireAuth } from '@/lib/auth';
import { loadConfig } from '@/lib/config-manager';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    await requireAuth(request);

    // Return current watch status
    const status = getWatchStatus();

    return NextResponse.json({
      success: true,
      data: {
        watchers: status,
        activeCount: status.filter(s => s.isActive).length,
      },
    });
  } catch (error) {
    console.error('Failed to get watch status:', error);
    const message = error instanceof Error ? error.message : 'Failed to get watch status';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    await requireAuth(request);

    const body = await request.json().catch(() => ({}));
    const { action, servers: providedServers, watchRunning } = body;

    // Determine servers to watch
    let serversToWatch: string[] = [];
    
    if (watchRunning === true) {
      // Special flag to watch only running servers
      serversToWatch = ['running'];
    } else if (providedServers && Array.isArray(providedServers) && providedServers.length > 0) {
      serversToWatch = providedServers;
    } else {
      // Default: watch all configured servers
      const config = await loadConfig();
      serversToWatch = config.servers || [];
    }

    switch (action) {
      case 'ingest_all':
        // Trigger full log ingestion
        const result = await ingestAllLogs(serversToWatch);
        return NextResponse.json({
          success: true,
          data: {
            entriesIngested: result.totalEntries,
            errors: result.errors,
          },
        });

      case 'start_watching':
        // Start real-time file watching (async)
        await startWatchingAll(serversToWatch);
        return NextResponse.json({
          success: true,
          data: { message: 'Started watching log files', servers: serversToWatch },
        });

      case 'stop_watching':
        // Stop all file watching
        stopAllWatchers();
        return NextResponse.json({
          success: true,
          data: { message: 'Stopped all log file watchers' },
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Use: ingest_all, start_watching, or stop_watching' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Failed to perform log action:', error);
    const message = error instanceof Error ? error.message : 'Failed to perform log action';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
