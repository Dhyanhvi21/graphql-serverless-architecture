import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Pool, PoolConfig } from 'pg';

let poolInstance: Pool | null = null;
let cachedCredentials: Record<string, string> | null = null;

const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

/**
 * Fetches database credentials from AWS Secrets Manager with local caching.
 * Reduces Secrets Manager API latency and cost.
 */
async function getDbCredentials() {
  if (cachedCredentials) {
    return cachedCredentials;
  }

  const secretArn = process.env.DB_SECRET_ARN;
  if (!secretArn) {
    // Fallback to direct environment variables for local testing
    return {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || '5432',
      username: process.env.DB_USER || 'dbadmin',
      password: process.env.DB_PASSWORD || 'localpassword123',
      dbname: process.env.DB_NAME || 'graphql_prod_db',
    };
  }

  try {
    const response = await secretsClient.send(
      new GetSecretValueCommand({ SecretId: secretArn })
    );

    if (!response.SecretString) {
      throw new Error('SecretString is empty in Secrets Manager');
    }

    cachedCredentials = JSON.parse(response.SecretString);
    return cachedCredentials!;
  } catch (err) {
    console.error('Error fetching secret from Secrets Manager:', err);
    throw err;
  }
}

/**
 * Returns a singleton connection pool optimized for AWS Lambda.
 * Sets max connections to 5 per Lambda instance to prevent RDS connection exhaustion.
 */
export async function getDbPool(): Promise<Pool> {
  if (poolInstance) {
    return poolInstance;
  }

  const creds = await getDbCredentials();

  const config: PoolConfig = {
    host: process.env.DB_HOST || creds.host,
    port: parseInt(creds.port || '5432', 10),
    user: creds.username,
    password: creds.password,
    database: creds.dbname,
    max: 5, // Keep connection count per Lambda container low
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  };

  poolInstance = new Pool(config);

  poolInstance.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
    poolInstance = null; // Re-create on next invocation if crashed
  });

  return poolInstance;
}
