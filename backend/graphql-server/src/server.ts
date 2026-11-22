import express from 'express';
import http from 'http';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { typeDefs } from './schema.js';
import { resolvers } from './resolvers.js';
import { checkDbHealth, closeDbPool } from './db.js';

const PORT = parseInt(process.env.PORT || '4000', 10);

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  // Security middleware
  app.use(cors());
  app.use(express.json());

  // Health check endpoint for ALB and ECS Fargate health checks
  app.get('/health', async (_req, res) => {
    const isDbHealthy = await checkDbHealth();
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    if (isDbHealthy) {
      res.status(200).json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(uptime),
        database: 'CONNECTED',
        memory: {
          heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
        },
      });
    } else {
      res.status(503).json({
        status: 'DEGRADED',
        database: 'DISCONNECTED',
      });
    }
  });

  // Apollo GraphQL Server Setup
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: process.env.NODE_ENV !== 'production', // Disable in prod for security
  });

  await server.start();

  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req }) => ({
        token: req.headers.authorization,
        requestId: req.headers['x-request-id'] || `req-${Date.now()}`,
      }),
    })
  );

  // Start HTTP listener
  await new Promise<void>((resolve) => httpServer.listen({ port: PORT }, resolve));
  console.log(`🚀 Private ECS Fargate GraphQL server ready at http://localhost:${PORT}/graphql`);
  console.log(`🏥 Health check live at http://localhost:${PORT}/health`);

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    httpServer.close(async () => {
      console.log('HTTP server closed.');
      await server.stop();
      console.log('Apollo Server stopped.');
      await closeDbPool();
      console.log('Database connections closed. Exiting process.');
      process.exit(0);
    });

    // Force exit if not closed within 10s
    setTimeout(() => {
      console.error('Forced shutdown due to timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('Fatal error starting GraphQL server:', err);
  process.exit(1);
});
