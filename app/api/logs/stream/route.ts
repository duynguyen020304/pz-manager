import { NextRequest } from 'next/server';
import { getUnifiedLogsSince } from '@/lib/log-manager';
import { logStreamManager, LogBatch } from '@/lib/log-stream-manager';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const server = searchParams.get('server');
    const typesParam = searchParams.get('types');
    const sinceParam = searchParams.get('since');

    if (!server) {
      return new Response(JSON.stringify({ success: false, error: 'Server parameter is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const types = typesParam ? typesParam.split(',').map(t => t.trim()) : [];
    const since = sinceParam ? new Date(sinceParam) : undefined;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const clientId = `sse-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

        const sendEvent = (event: string, data: unknown) => {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        const initialBatch = await getUnifiedLogsSince(server, types, since, 100);
        
        sendEvent('initial', {
          type: 'initial',
          server,
          timestamp: new Date().toISOString(),
          data: initialBatch,
        });

        logStreamManager.subscribe(server, clientId, types);

        let isClosed = false;

        const handleBatch = (batch: LogBatch) => {
          if (isClosed) return;
          if (batch.server.toLowerCase() !== server.toLowerCase()) return;

          const filteredEntries = types.length > 0
            ? batch.entries.filter(e => types.includes(e.source))
            : batch.entries;

          if (filteredEntries.length > 0) {
            sendEvent('batch', {
              type: 'batch',
              server: batch.server,
              timestamp: batch.timestamp.toISOString(),
              data: filteredEntries,
            });
          }
        };

        logStreamManager.on(`server:${server.toLowerCase()}`, handleBatch);

        const heartbeatInterval = setInterval(() => {
          if (isClosed) return;
          sendEvent('heartbeat', {
            type: 'heartbeat',
            timestamp: new Date().toISOString(),
          });
        }, 5000);

        request.signal.addEventListener('abort', () => {
          isClosed = true;
          clearInterval(heartbeatInterval);
          logStreamManager.off(`server:${server.toLowerCase()}`, handleBatch);
          logStreamManager.unsubscribe(server, clientId);
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Log stream error:', error);
    const message = error instanceof Error ? error.message : 'Failed to start log stream';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
