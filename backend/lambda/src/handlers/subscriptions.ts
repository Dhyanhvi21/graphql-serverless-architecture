import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from 'aws-lambda';
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
  GoneException,
} from '@aws-sdk/client-apigatewaymanagementapi';
import { getDbPool } from '../db/client.js';

/**
 * Handles GraphQL Subscriptions via AWS API Gateway WebSocket API.
 * Routes: $connect, $disconnect, subscribe, and publish broadcast events.
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { routeKey, connectionId } = event.requestContext;
  const pool = await getDbPool();

  try {
    switch (routeKey) {
      case '$connect': {
        console.log(`WebSocket client connected: ${connectionId}`);
        await pool.query(
          `INSERT INTO websocket_connections (connection_id, topic)
           VALUES ($1, $2)
           ON CONFLICT (connection_id) DO UPDATE SET topic = $2`,
          [connectionId, 'item_updates']
        );
        return { statusCode: 200, body: 'Connected' };
      }

      case '$disconnect': {
        console.log(`WebSocket client disconnected: ${connectionId}`);
        await pool.query(
          'DELETE FROM websocket_connections WHERE connection_id = $1',
          [connectionId]
        );
        return { statusCode: 200, body: 'Disconnected' };
      }

      case 'subscribe': {
        const body = event.body ? JSON.parse(event.body) : {};
        const topic = body.topic || 'item_updates';
        await pool.query(
          'UPDATE websocket_connections SET topic = $1 WHERE connection_id = $2',
          [topic, connectionId]
        );
        return { statusCode: 200, body: JSON.stringify({ message: `Subscribed to ${topic}` }) };
      }

      case 'broadcast': {
        // Broadcasts message to all connected clients subscribed to topic
        const body = event.body ? JSON.parse(event.body) : {};
        const { topic = 'item_updates', data } = body;

        const result = await pool.query(
          'SELECT connection_id FROM websocket_connections WHERE topic = $1',
          [topic]
        );

        const domain = event.requestContext.domainName;
        const stage = event.requestContext.stage;
        const callbackUrl = `https://${domain}/${stage}`;
        const wsClient = new ApiGatewayManagementApiClient({ endpoint: callbackUrl });

        const sendPromises = result.rows.map(async (row) => {
          try {
            await wsClient.send(
              new PostToConnectionCommand({
                ConnectionId: row.connection_id,
                Data: Buffer.from(JSON.stringify({ topic, data })),
              })
            );
          } catch (err) {
            if (err instanceof GoneException) {
              console.log(`Cleaning stale connection: ${row.connection_id}`);
              await pool.query('DELETE FROM websocket_connections WHERE connection_id = $1', [row.connection_id]);
            } else {
              console.error(`Failed to send to ${row.connection_id}`, err);
            }
          }
        });

        await Promise.all(sendPromises);
        return { statusCode: 200, body: JSON.stringify({ count: result.rows.length }) };
      }

      default:
        return { statusCode: 400, body: `Unknown route: ${routeKey}` };
    }
  } catch (error: any) {
    console.error('Subscription handler error:', error);
    return { statusCode: 500, body: error.message };
  }
};
