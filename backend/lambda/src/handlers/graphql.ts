import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { graphql, buildSchema } from 'graphql';
import { typeDefs } from '../schema/typeDefs.js';
import { resolvers } from '../schema/resolvers.js';

const schema = buildSchema(typeDefs);

const rootValue = {
  healthCheck: resolvers.Query.healthCheck,
  getItem: resolvers.Query.getItem,
  getItems: resolvers.Query.getItems,
  getUsers: resolvers.Query.getUsers,
  createUser: resolvers.Mutation.createUser,
  createItem: resolvers.Mutation.createItem,
  updateItem: resolvers.Mutation.updateItem,
  deleteItem: resolvers.Mutation.deleteItem,
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  };

  // CORS preflight handling
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { query, variables, operationName } = body;

    if (!query) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ errors: [{ message: 'GraphQL query is required in request body' }] }),
      };
    }

    const result = await graphql({
      schema,
      source: query,
      rootValue,
      variableValues: variables,
      operationName,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };
  } catch (error: any) {
    console.error('Unhandled GraphQL Lambda error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        errors: [{ message: error.message || 'Internal server error' }],
      }),
    };
  }
};

