import { NextResponse } from 'next/server';
import { startConsoleCapture, stopConsoleCapture, getConsoleSnapshot } from '@/lib/console-manager';
import { spawn } from 'child_process';

interface Params {
  params: Promise<{ name: string }>;
}

/**
 * GET /api/servers/[name]/console
 * Server-Sent Events endpoint for streaming console logs
 */
export async function GET(request: Request, { params }: Params) {
  const { name } = await params;
  const encoder = new TextEncoder();

  // Validate server name
  if (!name || typeof name !== 'string') {
    return NextResponse.json(
      { success: false, error: 'Invalid server name' },
      { status: 400 }
    );
  }

  // Sanitize server name to prevent path traversal
  const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, '');
  if (sanitizedName !== name) {
    return NextResponse.json(
      { success: false, error: 'Invalid server name format' },
      { status: 400 }
    );
  }

  try {
    // Start console capture
    const logPath = await startConsoleCapture(name);

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        let tailProcess: ReturnType<typeof spawn> | null = null;
        let lastPosition = 0;

        // Helper to send SSE message
        const sendEvent = (type: string, data: unknown) => {
          const message = `data: ${JSON.stringify({ type, data })}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        // Helper to send raw log lines as they come
        const sendRawLog = (content: string) => {
          // Split by lines and send each line
          const lines = content.split('\n').filter(line => line.length > 0);
          for (const line of lines) {
            const message = `data: ${JSON.stringify({ type: 'log', content: line })}\n\n`;
            controller.enqueue(encoder.encode(message));
          }
        };

        try {
          // Send initial connection message
          sendEvent('connected', { server: name, timestamp: new Date().toISOString() });

          // Get initial buffer (last 100 lines from tmux)
          try {
            const initialContent = await getConsoleSnapshot(name, 100);
            sendEvent('init', { content: initialContent });
          } catch {
            // If we can't get initial snapshot, still continue
            sendEvent('init', { content: '' });
          }

          // Get current log file size
          const { stat } = await import('fs/promises');
          let initialFileSize = 0;
          try {
            const stats = await stat(logPath);
            initialFileSize = stats.size;
            lastPosition = initialFileSize;
          } catch {
            // File might not exist yet, that's ok
          }

          // Start tail process to follow new content
          tailProcess = spawn('tail', ['-f', '-c', `+${lastPosition + 1}`, logPath], {
            env: { ...process.env }
          });

          if (tailProcess.stdout) {
            tailProcess.stdout.on('data', (data: Buffer) => {
              try {
                sendRawLog(data.toString());
              } catch {
                // Stream might be closed
              }
            });
          }

          if (tailProcess.stderr) {
            tailProcess.stderr.on('data', (data: Buffer) => {
              try {
                sendEvent('error', { message: data.toString() });
              } catch {
                // Stream might be closed
              }
            });
          }

          tailProcess.on('error', (error) => {
            try {
              sendEvent('error', { message: `Tail process error: ${error.message}` });
            } catch {
              // Stream might be closed
            }
          });

          tailProcess.on('exit', (code) => {
            try {
              if (code !== 0) {
                sendEvent('error', { message: `Tail process exited with code ${code}` });
              }
            } catch {
              // Stream might be closed
            }
          });

          // Handle client disconnect
          request.signal.addEventListener('abort', () => {
            if (tailProcess) {
              tailProcess.kill();
            }
            // Stop capture (uses reference counting)
            stopConsoleCapture(name).catch(console.error);
            try {
              controller.close();
            } catch {
              // Already closed
            }
          });

        } catch (error) {
          sendEvent('error', {
            message: error instanceof Error ? error.message : 'Unknown error'
          });
          controller.close();
        }
      },
      cancel() {
        // Cleanup when stream is cancelled
        stopConsoleCapture(name).catch(console.error);
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    });

  } catch (error) {
    console.error('Console stream error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start console stream'
      },
      { status: 500 }
    );
  }
}
