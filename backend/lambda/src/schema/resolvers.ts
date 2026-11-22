import { getDbPool } from '../db/client.js';

export const resolvers = {
  Query: {
    healthCheck: async () => {
      const pool = await getDbPool();
      const res = await pool.query('SELECT NOW() as current_time');
      return `GraphQL Lambda healthy. DB Time: ${res.rows[0].current_time}`;
    },

    getItem: async (_: unknown, { id }: { id: string }) => {
      const pool = await getDbPool();
      const query = `
        SELECT i.*, u.id as user_id, u.email as user_email, u.name as user_name, u.role as user_role, u.created_at as user_created_at
        FROM items i
        LEFT JOIN users u ON i.assigned_to = u.id
        WHERE i.id = $1
      `;
      const result = await pool.query(query, [id]);
      if (result.rows.length === 0) return null;
      const row = result.rows[0];
      return mapItem(row);
    },

    getItems: async (
      _: unknown,
      { status, limit = 50, offset = 0 }: { status?: string; limit?: number; offset?: number }
    ) => {
      const pool = await getDbPool();
      let query = `
        SELECT i.*, u.id as user_id, u.email as user_email, u.name as user_name, u.role as user_role, u.created_at as user_created_at
        FROM items i
        LEFT JOIN users u ON i.assigned_to = u.id
      `;
      const values: unknown[] = [];
      if (status) {
        query += ` WHERE i.status = $1`;
        values.push(status);
        query += ` ORDER BY i.created_at DESC LIMIT $2 OFFSET $3`;
        values.push(limit, offset);
      } else {
        query += ` ORDER BY i.created_at DESC LIMIT $1 OFFSET $2`;
        values.push(limit, offset);
      }

      const result = await pool.query(query, values);
      return result.rows.map(mapItem);
    },

    getUsers: async () => {
      const pool = await getDbPool();
      const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
      return result.rows.map(mapUser);
    },
  },

  Mutation: {
    createUser: async (
      _: unknown,
      { email, name, role = 'user' }: { email: string; name: string; role?: string }
    ) => {
      const pool = await getDbPool();
      const result = await pool.query(
        `INSERT INTO users (email, name, role)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [email, name, role]
      );
      return mapUser(result.rows[0]);
    },

    createItem: async (
      _: unknown,
      { input }: { input: { title: string; description?: string; priority?: string; assignedToId?: string } }
    ) => {
      const pool = await getDbPool();
      const result = await pool.query(
        `INSERT INTO items (title, description, priority, assigned_to)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [input.title, input.description || null, input.priority || 'MEDIUM', input.assignedToId || null]
      );

      // Audit log entry
      await pool.query(
        `INSERT INTO audit_logs (action, entity_type, entity_id, payload)
         VALUES ($1, $2, $3, $4)`,
        ['CREATE_ITEM', 'ITEM', result.rows[0].id, JSON.stringify(result.rows[0])]
      );

      return mapItem(result.rows[0]);
    },

    updateItem: async (
      _: unknown,
      { input }: { input: { id: string; title?: string; description?: string; status?: string; priority?: string; assignedToId?: string } }
    ) => {
      const pool = await getDbPool();
      const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
      const values: unknown[] = [input.id];
      let idx = 2;

      if (input.title !== undefined) {
        updates.push(`title = $${idx++}`);
        values.push(input.title);
      }
      if (input.description !== undefined) {
        updates.push(`description = $${idx++}`);
        values.push(input.description);
      }
      if (input.status !== undefined) {
        updates.push(`status = $${idx++}`);
        values.push(input.status);
      }
      if (input.priority !== undefined) {
        updates.push(`priority = $${idx++}`);
        values.push(input.priority);
      }
      if (input.assignedToId !== undefined) {
        updates.push(`assigned_to = $${idx++}`);
        values.push(input.assignedToId);
      }

      const query = `
        UPDATE items
        SET ${updates.join(', ')}
        WHERE id = $1
        RETURNING *
      `;
      const result = await pool.query(query, values);
      if (result.rows.length === 0) throw new Error(`Item ${input.id} not found`);

      // Audit log entry
      await pool.query(
        `INSERT INTO audit_logs (action, entity_type, entity_id, payload)
         VALUES ($1, $2, $3, $4)`,
        ['UPDATE_ITEM', 'ITEM', input.id, JSON.stringify(result.rows[0])]
      );

      return mapItem(result.rows[0]);
    },

    deleteItem: async (_: unknown, { id }: { id: string }) => {
      const pool = await getDbPool();
      const result = await pool.query('DELETE FROM items WHERE id = $1 RETURNING id', [id]);
      return result.rowCount ? result.rowCount > 0 : false;
    },
  },
};

function mapUser(row: any) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
  };
}

function mapItem(row: any) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : '',
    assignedTo: row.user_id
      ? {
          id: row.user_id,
          email: row.user_email,
          name: row.user_name,
          role: row.user_role,
          createdAt: row.user_created_at ? new Date(row.user_created_at).toISOString() : '',
        }
      : null,
  };
}
