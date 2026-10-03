import { NextResponse } from 'next/server';
import { checkDatabaseConnection } from '@/config/database';
import { env } from '@/config/env';

export const dynamic = 'force-dynamic';

export async function GET() {
  const dbHealth = await checkDatabaseConnection();

  const isHealthy = dbHealth.connected;
  const status = isHealthy ? 'healthy' : 'degraded';
  const statusCode = isHealthy ? 200 : 503;

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      environment: env.NODE_ENV,
      services: {
        database: {
          status: dbHealth.connected ? 'up' : 'down',
          latencyMs: dbHealth.latencyMs,
          error:
            env.NODE_ENV === 'production' && dbHealth.error
              ? 'Database connection unavailable'
              : dbHealth.error,
        },
      },
    },
    { status: statusCode }
  );
}
