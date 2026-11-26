import serverless from 'serverless-http';
import { createApiApp } from '../../server/app';

const apiController = createApiApp({ serverless: true });
const serverlessHandler = serverless(apiController.app, {
  binary: ['video/*', 'audio/*', 'image/*', 'application/octet-stream'],
});

interface ServerlessResponse {
  statusCode?: number;
  headers?: Record<string, string | number | boolean>;
  multiValueHeaders?: Record<string, Array<string | number | boolean>>;
  body?: string;
  isBase64Encoded?: boolean;
}

function normalizePath(rawPathname: string): string {
  const stripped = rawPathname.replace(/^\/\.netlify\/functions\/api(?=\/|$)/, '');
  if (!stripped || stripped === '/') {
    return '/api/health';
  }
  if (stripped.startsWith('/api/') || stripped === '/api' || stripped.startsWith('/uploads/')) {
    return stripped;
  }
  return `/api${stripped.startsWith('/') ? '' : '/'}${stripped}`;
}

export const config = {
  path: ['/api/*', '/uploads/*'],
};

export default async function handler(req: Request, context: Record<string, unknown> = {}): Promise<Response> {
  const url = new URL(req.url);
  const path = normalizePath(url.pathname);

  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  const queryStringParameters: Record<string, string> = {};
  const multiValueQueryStringParameters: Record<string, string[]> = {};
  url.searchParams.forEach((value, key) => {
    queryStringParameters[key] = value;
    if (!multiValueQueryStringParameters[key]) {
      multiValueQueryStringParameters[key] = [];
    }
    multiValueQueryStringParameters[key].push(value);
  });

  let body: string | undefined;
  let isBase64Encoded = false;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const buf = Buffer.from(await req.arrayBuffer());
    if (buf.length > 0) {
      body = buf.toString('base64');
      isBase64Encoded = true;
    }
  }

  const event = {
    httpMethod: req.method,
    path,
    rawPath: path,
    rawUrl: url.toString(),
    headers,
    queryStringParameters,
    multiValueQueryStringParameters,
    body,
    isBase64Encoded,
  };

  try {
    const result = (await serverlessHandler(event, context)) as ServerlessResponse;
    await apiController.flushSaves();

    const responseHeaders = new Headers();
    if (result.headers) {
      for (const [k, v] of Object.entries(result.headers)) {
        if (v !== undefined && v !== null) {
          responseHeaders.set(k, String(v));
        }
      }
    }
    if (result.multiValueHeaders) {
      for (const [k, vals] of Object.entries(result.multiValueHeaders)) {
        for (const v of vals) {
          responseHeaders.append(k, String(v));
        }
      }
    }

    const status = Number(result.statusCode) || 200;
    const responseBody =
      result.isBase64Encoded && typeof result.body === 'string'
        ? Buffer.from(result.body, 'base64')
        : result.body ?? '';

    return new Response(responseBody, { status, headers: responseHeaders });
  } catch (err) {
    await apiController.flushSaves().catch(() => {});
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
