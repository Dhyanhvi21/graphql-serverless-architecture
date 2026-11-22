import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getDbPool } from '../db/client.js';

/**
 * Dedicated Lambda function optimized for Write/Mutation operations.
 * Executes transactional updates against RDS PostgreSQL with audit logging.
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { action, payload } = body;

    const pool = await getDbPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      let mutationResult: any = null;

      if (action === 'CREATE_ITEM') {
        const { title, description, priority, assignedToId } = payload;
        const insertRes = await client.query(
          `INSERT INTO items (title, description, priority, assigned_to)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [title, description || null, priority || 'MEDIUM', assignedToId || null]
        );
        mutationResult = insertRes.rows[0];

        // Audit log
        await client.query(
          `INSERT INTO audit_logs (action, entity_type, entity_id, payload)
           VALUES ($1, $2, $3, $4)`,
          ['CREATE_ITEM', 'ITEM', mutationResult.id, JSON.stringify(mutationResult)]
        );
      } else if (action === 'UPDATE_ITEM_STATUS') {
        const { id, status } = payload;
        const updateRes = await client.query(
          `UPDATE items SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
          [status, id]
        );
        mutationResult = updateRes.rows[0];

        await client.query(
          `INSERT INTO audit_logs (action, entity_type, entity_id, payload)
           VALUES ($1, $2, $3, $4)`,
          ['UPDATE_ITEM_STATUS', 'ITEM', id, JSON.stringify(mutationResult)]
        );
      } else {
        throw new Error(`Unsupported mutation action: ${action}`);
      }

      await client.query('COMMIT');

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ data: mutationResult }),
      };
    } catch (txError: any) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Mutation Handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ errors: [{ message: error.message }] }),
    };
  }
};

