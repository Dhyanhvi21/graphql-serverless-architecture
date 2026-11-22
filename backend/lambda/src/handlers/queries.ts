import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getDbPool } from '../db/client.js';

/**
 * Dedicated Lambda function optimized for Read/Query operations.
 * Allows independent scaling, concurrency allocation, and caching policies.
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=10, stale-while-revalidate=30', // Edge caching for reads
  };

  try {
    const pool = await getDbPool();
    const queryParams = event.queryStringParameters || {};
    const status = queryParams.status;
    const limit = parseInt(queryParams.limit || '50', 10);
    const offset = parseInt(queryParams.offset || '0', 10);

    let sql = `
      SELECT i.*, u.id as user_id, u.email as user_email, u.name as user_name
      FROM items i
      LEFT JOIN users u ON i.assigned_to = u.id
    `;
    const params: unknown[] = [];

    if (status) {
      sql += ' WHERE i.status = $1 ORDER BY i.created_at DESC LIMIT $2 OFFSET $3';
      params.push(status, limit, offset);
    } else {
      sql += ' ORDER BY i.created_at DESC LIMIT $1 OFFSET $2';
      params.push(limit, offset);
    }

    const result = await pool.query(sql, params);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        data: {
          items: result.rows,
          count: result.rowCount,
        },
      }),
    };
  } catch (error: any) {
    console.error('Query Handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ errors: [{ message: error.message }] }),
    };
  }
};

