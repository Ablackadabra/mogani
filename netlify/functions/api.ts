import serverless from 'serverless-http';
import { connectLambda } from '@netlify/blobs';
import { createApiApp } from '../../server/app';

interface NetlifyLambdaEvent {
  path?: string;
  rawPath?: string;
  rawUrl?: string;
  httpMethod?: string;
  headers?: Record<string, string>;
  blobs?: string;
  [key: string]: unknown;
}

const apiController = createApiApp({ serverless: true });
const serverlessHandler = serverless(apiController.app, {
  binary: ['video/*', 'audio/*', 'image/*', 'application/octet-stream'],
});

function normalizeFunctionPath(rawPath: string | undefined): string {
  if (!rawPath) return '/api/health';
  let cleaned = rawPath.replace(/^\/\.netlify\/functions\/api(?=\/|$)/, '');
  if (!cleaned || cleaned === '/') {
    return '/api/health';
  }
  if (!cleaned.startsWith('/api/') && cleaned !== '/api' && !cleaned.startsWith('/uploads/')) {
    cleaned = `/api${cleaned.startsWith('/') ? '' : '/'}${cleaned}`;
  }
  return cleaned;
}

export async function handler(
  event: NetlifyLambdaEvent,
  context: Record<string, unknown>
) {
  if (event && typeof event.blobs === 'string' && event.blobs.length > 0) {
    try {
      connectLambda({
        blobs: event.blobs,
        headers: event.headers || {},
      });
    } catch {
      // Fallback to /tmp disk storage if Netlify Blobs context header is unavailable
    }
  }

  const normalizedPath = normalizeFunctionPath(event.path || event.rawPath);
  const normalizedEvent: NetlifyLambdaEvent = {
    ...event,
    path: normalizedPath,
    ...(typeof event.rawPath === 'string' ? { rawPath: normalizedPath } : {}),
  };

  try {
    const response = await serverlessHandler(normalizedEvent, context);
    await apiController.flushSaves();
    return response;
  } catch (err) {
    await apiController.flushSaves().catch(() => {});
    const message = err instanceof Error ? err.message : 'Internal server error';
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: message }),
    };
  }
}
