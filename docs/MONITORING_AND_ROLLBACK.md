# Monitoring, Auto-Scaling & Rollback Runbook

This runbook covers CloudWatch observability, auto-scaling thresholds, and multi-tier rollback procedures.

---

## 1. CloudWatch Alarms Matrix

| Target Resource | Metric | Evaluation | Threshold | Action |
| :--- | :--- | :--- | :--- | :--- |
| **Lambda Handlers** | `Errors` | 1 minute | `> 0` | SNS Alert + Trigger CodeDeploy Canary Rollback |
| **Lambda Handlers** | `Duration` | 2 minutes | `> 5000 ms` | SNS Alert (Investigate query latency) |
| **Lambda Handlers** | `Throttles` | 1 minute | `> 0` | SNS Alert (Adjust concurrency limits) |
| **ECS Fargate** | `CPUUtilization` | 2 minutes | `> 80%` | SNS Alert + Auto-scale out tasks |
| **ECS Fargate** | `MemoryUtilization` | 2 minutes | `> 80%` | SNS Alert + Auto-scale out tasks |
| **RDS PostgreSQL** | `CPUUtilization` | 2 minutes | `> 75%` | SNS Alert (Review slow queries) |
| **RDS PostgreSQL** | `FreeStorageSpace` | 5 minutes | `< 5 GB` | Critical SNS Alert (Storage autoscaling) |
| **RDS PostgreSQL** | `DatabaseConnections`| 1 minute | `> 80` | SNS Alert (Review connection pool metrics) |

---

## 2. Auto-Scaling Policies

### ECS Fargate Service
- **CPU Target Tracking**: Automatically adjusts task count to maintain average CPU utilization at **70%**.
- **Memory Target Tracking**: Maintains average memory utilization at **75%**.
- **Limits**: Minimum 2 tasks (multi-AZ redundancy); Maximum 10 tasks (cost guardrail).
- **Cooldowns**: Scale-out: 60s; Scale-in: 300s (prevents flapping).

### Lambda Concurrency
- Auto-scales on demand up to regional limits.
- Provisioned Concurrency can be enabled on `graphqlHandler` to eliminate cold starts on latency-critical endpoints.

### RDS Storage Autoscaling
- Automatically scales up from 20 GB to 100 GB as storage needs expand.

---

## 3. Rollback Procedures

### Frontend SPA Rollback
If a newly deployed bundle causes client-side errors:
```bash
# S3 objects are versioned and backupped before sync
aws s3 sync s3://<s3_frontend_bucket>/backups/<TIMESTAMP>/ s3://<s3_frontend_bucket>/ --delete
aws cloudfront create-invalidation --distribution-id <DIST_ID> --paths "/*"
```

### Lambda Canary Rollback
AWS CodeDeploy automatically shifts traffic back to the prior stable alias if the `LambdaErrorAlarm` fires during the 5-minute canary window.

To manually trigger a rollback:
```bash
cd backend/lambda
npx serverless rollback --stage prod
```

### ECS Fargate Container Rollback
ECS Deployment Circuit Breaker automatically monitors task health checks (`/health`). If newly started tasks crash or fail health checks, ECS marks the deployment failed and reverts to the previous task definition revision.
