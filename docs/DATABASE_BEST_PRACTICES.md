# Database Setup & Connection Management

Engineering notes on PostgreSQL configuration, security isolation, and serverless connection pooling.

---

## 1. Network & Security Isolation

- **Subnet Placement**: RDS PostgreSQL is placed exclusively in isolated database subnets (`10.0.30.0/24`, `10.0.40.0/24`). These subnets have no default route (`0.0.0.0/0`) to the Internet Gateway or NAT Gateway.
- **Port 5432 Ingress**: Inbound traffic on port 5432 is restricted to the Lambda Security Group (`lambda-sg`) and ECS Task Security Group (`ecs-tasks-sg`).
- **Enforced TLS**: The database parameter group sets `rds.force_ssl = 1`. Any connection without TLS encryption is rejected at the database engine level.
- **Encryption at Rest**: Storage volumes (`gp3`) are encrypted using a customer-managed AWS KMS key.

---

## 2. Serverless Connection Pooling Strategy

In traditional architectures, long-lived application servers maintain a static connection pool. With AWS Lambda, concurrent invocations can quickly exhaust PostgreSQL's `max_connections` limit.

### Our Approach:
1. **Global Pool Singleton**:
   In `backend/lambda/src/db/client.ts`, the `pg.Pool` instance is declared outside the handler function so warm Lambda containers reuse existing connections:
   ```typescript
   let poolInstance: Pool | null = null;

   export async function getDbPool(): Promise<Pool> {
     if (poolInstance) return poolInstance;
     // ...
     poolInstance = new Pool({
       max: 5, // Keep connection count per Lambda low
       idleTimeoutMillis: 30000,
       connectionTimeoutMillis: 5000,
       ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
     });
     return poolInstance;
   }
   ```
2. **In-Memory Credential Caching**:
   Instead of calling AWS Secrets Manager on every request, credentials are cached in memory across warm invocations. This reduces response latency and eliminates Secrets Manager API costs.
3. **Scaling Beyond 10k RPS**:
   For very high concurrency workloads, an AWS RDS Proxy can be placed in front of PostgreSQL to pool and multiplex connections across thousands of concurrent Lambdas.

---

## 3. High Availability & Backups

- **Multi-AZ Replication**: Enabled via `multi_az = true`. A synchronous standby is maintained in a secondary availability zone with automatic failover in under 60 seconds without application code changes.
- **Storage Autoscaling**: Configured with `allocated_storage = 20` and `max_allocated_storage = 100`. AWS dynamically increases disk capacity as storage thresholds approach 80% to prevent disk-full incidents.
- **Automated Backups**: Backups are retained for 7 days, allowing Point-in-Time Recovery (PITR) to any second within the retention window.
