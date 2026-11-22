import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Pool, PoolConfig } from 'pg';

let poolInstance: Pool | null = null;
let cachedCredentials: Record<string, string> | null = null;

const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

async function getDbCredentials() {
  if (cachedCredentials) return cachedCredentials;

  const secretArn = process.env.DB_SECRET;
  if (!secretArn) {
    return {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || '5432',
      username: process.env.DB_USER || 'dbadmin',
      password: process.env.DB_PASSWORD || 'localpassword123',
      dbname: process.env.DB_NAME || 'graphql_prod_db',
    };
  }

  try {
    const res = await secretsClient.send(new GetSecretValueCommand({ SecretId: secretArn }));
    if (res.SecretString) {
      cachedCredentials = JSON.parse(res.SecretString);
      return cachedCredentials!;
    }
    throw new Error('SecretString empty in Secrets Manager');
  } catch (err) {
    console.error('Error fetching secret:', err);
    throw err;
  }
}

export async function getDbPool(): Promise<Pool> {
  if (poolInstance) return poolInstance;

  const creds = await getDbCredentials();

  const config: PoolConfig = {
    host: process.env.DB_HOST || creds.host,
    port: parseInt(creds.port || '5432', 10),
    user: creds.username,
    password: creds.password,
    database: creds.dbname,
    max: 20, // ECS Fargate container can handle up to 20 connections per task
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  };

  poolInstance = new Pool(config);

  poolInstance.on('error', (err) => {
    console.error('Unexpected pool error on idle client', err);
    poolInstance = null;
  });

  return poolInstance;
}

export async function checkDbHealth(): Promise<boolean> {
  try {
    const pool = await getDbPool();
    await pool.query('SELECT 1');
    return true;
  } catch (err) {
    console.error('Database health check failed:', err);
    return false;
  }
}

export async function closeDbPool(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
  }
}

