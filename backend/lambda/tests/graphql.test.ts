import { describe, it } from 'node:test';
import assert from 'node:assert';
import { graphql, buildSchema } from 'graphql';
import { typeDefs } from '../src/schema/typeDefs.js';

describe('Lambda GraphQL Schema and Resolvers', () => {
  const schema = buildSchema(typeDefs);

  it('should compile GraphQL schema successfully without syntax errors', () => {
    assert.ok(schema);
    const queryType = schema.getQueryType();
    assert.ok(queryType);
    assert.ok(queryType.getFields().healthCheck);
    assert.ok(queryType.getFields().getItems);
    assert.ok(queryType.getFields().getItem);

    const mutationType = schema.getMutationType();
    assert.ok(mutationType);
    assert.ok(mutationType.getFields().createItem);
    assert.ok(mutationType.getFields().updateItem);
    assert.ok(mutationType.getFields().deleteItem);
  });

  it('should execute mock healthCheck query against the schema', async () => {
    const rootValue = {
      healthCheck: () => 'GraphQL Lambda healthy mock test',
    };

    const res = await graphql({
      schema,
      source: '{ healthCheck }',
      rootValue,
    });

    assert.strictEqual(res.errors, undefined);
    assert.strictEqual(res.data?.healthCheck, 'GraphQL Lambda healthy mock test');
  });

  it('should validate query arguments for getItems', async () => {
    const rootValue = {
      getItems: ({ status }: { status?: string }) => [
        {
          id: 'test-1',
          title: 'Unit Test Task',
          status: status || 'PENDING',
          priority: 'HIGH',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    const res = await graphql({
      schema,
      source: 'query { getItems(status: COMPLETED) { id title status priority } }',
      rootValue,
    });

    assert.strictEqual(res.errors, undefined);
    const items = res.data?.getItems as any[];
    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].title, 'Unit Test Task');
    assert.strictEqual(items[0].status, 'COMPLETED');
  });
});
