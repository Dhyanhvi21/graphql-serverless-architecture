import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildSchema, graphql } from 'graphql';
import { typeDefs } from '../src/schema.js';

describe('ECS Fargate Private GraphQL Server Schema', () => {
  const schema = buildSchema(typeDefs);

  it('should build schema with Item and User types', () => {
    assert.ok(schema);
    const itemType = schema.getType('Item');
    assert.ok(itemType, 'Item type should exist in schema');

    const userType = schema.getType('User');
    assert.ok(userType, 'User type should exist in schema');
  });

  it('should resolve healthCheck query', async () => {
    const root = {
      healthCheck: () => 'Private ECS GraphQL Server active.',
    };

    const response = await graphql({
      schema,
      source: '{ healthCheck }',
      rootValue: root,
    });

    assert.strictEqual(response.errors, undefined);
    assert.strictEqual(response.data?.healthCheck, 'Private ECS GraphQL Server active.');
  });
});
