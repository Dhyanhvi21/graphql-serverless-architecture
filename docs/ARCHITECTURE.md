# System Architecture Overview

## Executive Summary
This document details the architectural design and implementation of a scalable, highly secure, serverless GraphQL architecture deployed on Amazon Web Services (AWS). The system integrates a modern React frontend with a hybrid backend comprising AWS Lambda serverless functions and a containerized private GraphQL server on AWS ECS Fargate, backed by an isolated AWS RDS PostgreSQL database.

---

## 1. High-Level Architecture Diagram

```mermaid
flowchart TB
    subgraph Users["End Users & Clients"]
        Browser["User Web Browser"]
    end

    subgraph EdgeTier["AWS Edge & CDN Tier (Global)"]
        CF["Amazon CloudFront CDN\n(TLS 1.3 / Security Headers / Caching)"]
        OAC["Origin Access Control (OAC)"]
        S3["Amazon S3 Static Bucket\n(React SPA / Versioned / Encrypted)"]
        CF --> OAC --> S3
    end

    subgraph CICD["CI/CD Pipeline (GitHub Actions)"]
        GHA["GitHub Actions Runner\n(OIDC Keyless Auth)"]
        ECR["Amazon ECR\n(Docker Image Registry)"]
    end

    subgraph VPC["AWS Virtual Private Cloud (10.0.0.0/16)"]
        subgraph PublicSubnets["Public Subnets (AZ-a / AZ-b)"]
            NAT["NAT Gateway (Egress to AWS APIs)"]
            IGW["Internet Gateway"]
            NAT --> IGW
        end

        subgraph PrivateAppSubnets["Private Application Subnets (AZ-a / AZ-b)"]
            subgraph ServerlessLambda["Serverless Lambda Tier"]
                APIGW["Amazon API Gateway\n(HTTP & WebSocket API)"]
                L_Graphql["Lambda: GraphQL Core Handler"]
                L_Query["Lambda: Query Resolver"]
                L_Mutation["Lambda: Mutation Resolver"]
                L_Sub["Lambda: WebSocket Subscriptions"]
                APIGW --> L_Graphql
                APIGW --> L_Query
                APIGW --> L_Mutation
                APIGW --> L_Sub
            end

            subgraph ECSFargate["Private ECS Fargate Tier"]
                ALB_Internal["Internal ALB\n(Private Load Balancer)"]
                FargateTasks["ECS Fargate Tasks\n(Apollo Server / Node 20 Alpine)"]
                ALB_Internal --> FargateTasks
            end
        end

        subgraph PrivateDBSubnets["Isolated Database Subnets (AZ-a / AZ-b)"]
            RDS_Primary[("RDS PostgreSQL Primary\n(Multi-AZ Engine v15)")]
            RDS_Standby[("RDS PostgreSQL Standby\n(Automated Failover)")]
            RDS_Primary -.- RDS_Standby
        end
    end

    subgraph SecurityAndMonitoring["Security & Observability"]
        SM["AWS Secrets Manager\n(DB Credentials & Auto-Rotation)"]
        KMS["AWS KMS\n(Customer Managed CMK)"]
        CW["Amazon CloudWatch\n(Logs, Metrics, Alarms, Dashboard)"]
        SNS["Amazon SNS\n(DevOps Alert Notifications)"]
        CW --> SNS
    end

    %% Client Interactions
    Browser -->|HTTPS / Assets| CF
    Browser -->|GraphQL Queries & Mutations| APIGW
    Browser -->|WebSocket Subscriptions| APIGW

    %% Backend to Database & Secrets
    L_Graphql -->|SQL over TLS 5432| RDS_Primary
    L_Query -->|SQL over TLS 5432| RDS_Primary
    L_Mutation -->|Transactional SQL| RDS_Primary
    FargateTasks -->|SQL over TLS 5432| RDS_Primary

    L_Graphql -.->|Fetch Credentials| SM
    FargateTasks -.->|Fetch Credentials| SM
    SM -.->|Decrypt| KMS

    %% Egress via NAT
    L_Graphql --> NAT
    FargateTasks --> NAT

    %% CI/CD Deployments
    GHA -->|Sync Static Build| S3
    GHA -->|Invalidate Cache| CF
    GHA -->|Push Docker Image| ECR
    ECR -->|Pull Image| FargateTasks
    GHA -->|Deploy Serverless/SAM| APIGW

    %% CloudWatch Monitoring
    L_Graphql -.->|Logs & Metrics| CW
    FargateTasks -.->|Container Logs| CW
    RDS_Primary -.->|Performance Insights| CW
```

---

## 2. Component Breakdown & Responsibilities

| Tier / Component | Technology | Role & Key Features |
| :--- | :--- | :--- |
| **Frontend CDN** | Amazon CloudFront | Delivers React SPA with sub-second latency globally. Configured with TLS 1.3, strict security headers (HSTS, CSP, X-Frame-Options: DENY), and cost-optimized PriceClass_100. |
| **Static Storage** | Amazon S3 | Private static asset hosting via **Origin Access Control (OAC)**. S3 Bucket versioning enabled for instantaneous rollback. |
| **Serverless API** | AWS API Gateway | Provides HTTP API for low-latency GraphQL queries and REST endpoints, and WebSocket API for real-time GraphQL subscriptions. |
| **Serverless Compute** | AWS Lambda (Node.js 20 ARM64) | Micro-functions executing in VPC private subnets. Split by operation (Core GraphQL, Queries, Mutations, Subscriptions) for independent scaling and isolation. |
| **Container Compute** | AWS ECS Fargate | Private, containerized Apollo Server deployed across multiple AZs behind an internal ALB. Configured with Deployment Circuit Breaker for automatic rollback. |
| **Relational Database**| AWS RDS PostgreSQL 15 | Multi-AZ deployment in isolated database subnets. Configured with storage auto-scaling (20GB to 100GB), SSL enforcement, and automated backups. |
| **Secrets Management**| AWS Secrets Manager & KMS | Stores and generates database credentials with customer-managed encryption (KMS CMK). Local caching in Lambda prevents API throttling. |
| **Observability** | Amazon CloudWatch & SNS | Real-time monitoring of invocations, errors, latency, CPU, and DB connections, triggering alerts to an SNS topic. |
| **CI/CD Automation** | GitHub Actions (OIDC) | Keyless, automated pipeline for building, testing, security scanning (Trivy), and deploying with rollback mechanisms. |

---

## 3. Network Topology & Traffic Segregation

The network architecture adheres to the standard AWS Multi-Tier VPC pattern across 2 Availability Zones (`us-east-1a` and `us-east-1b`):

```
VPC CIDR: 10.0.0.0/16
├── Public Subnets (10.0.1.0/24, 10.0.2.0/24)
│   ├── Internet Gateway (IGW)
│   └── NAT Gateway (Elastic IP allocated)
│
├── Private Application Subnets (10.0.10.0/24, 10.0.20.0/24)
│   ├── Route: 0.0.0.0/0 -> NAT Gateway
│   ├── AWS Lambda Elastic Network Interfaces (ENIs)
│   ├── AWS ECS Fargate Tasks
│   └── Internal Application Load Balancer
│
└── Private Isolated Database Subnets (10.0.30.0/24, 10.0.40.0/24)
    ├── Route: Local VPC only (No Internet Gateway / No NAT route)
    ├── RDS PostgreSQL Primary Instance
    └── RDS PostgreSQL Multi-AZ Standby Instance
```

### Security Group Ingress / Egress Matrix

| Security Group | Inbound Rules | Outbound Rules | Purpose |
| :--- | :--- | :--- | :--- |
| **ALB SG** | Port 80/443 from VPC CIDR (`10.0.0.0/16`) | All traffic (`0.0.0.0/0`) | Internal ALB routing |
| **ECS Tasks SG** | Port 4000 from **ALB SG** only | All traffic (`0.0.0.0/0`) via NAT | Apollo Server container |
| **Lambda SG** | None (invocation via AWS internal control plane) | All traffic (`0.0.0.0/0`) via NAT | Lambda execution in VPC |
| **RDS SG** | Port 5432 strictly from **ECS Tasks SG** and **Lambda SG** | None | PostgreSQL database isolation |

---

## 4. End-to-End Request Flows

### A. GraphQL Query / Mutation Flow
1. User interacts with React app hosted on CloudFront CDN.
2. Apollo Client sends GraphQL POST request to Amazon API Gateway.
3. API Gateway routes request to `GraphQLFunction` Lambda running in Private App Subnet.
4. Lambda retrieves DB credentials from local memory cache (or Secrets Manager on cold start).
5. Lambda acquires connection from PostgreSQL connection pool (`pg.Pool`).
6. Query/mutation executes against RDS PostgreSQL in Isolated DB Subnet over encrypted TLS.
7. Result returns through API Gateway to Apollo Client in browser.

### B. Real-Time Subscription Flow
1. React client establishes persistent WSS connection to API Gateway WebSocket endpoint.
2. `$connect` route invokes `SubscriptionFunction` Lambda, storing `connectionId` in RDS table `websocket_connections`.
3. When a mutation occurs, the server publishes an event to subscribed connections.
4. `SubscriptionFunction` broadcasts payload using `@aws-sdk/client-apigatewaymanagementapi`.
5. Upon client disconnect, `$disconnect` cleans up the record from the database.
