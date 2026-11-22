import { ApolloClient, InMemoryCache, HttpLink, from } from '@apollo/client';
import { onError } from '@apollo/client/link/error';

// Determine GraphQL endpoint from environment or default to local/gateway
const GRAPHQL_ENDPOINT =
  import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql';

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) =>
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${JSON.stringify(locations)}, Path: ${path}`
      )
    );
  }
  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
  }
});

// HTTP link to serverless GraphQL endpoint
const httpLink = new HttpLink({
  uri: GRAPHQL_ENDPOINT,
  headers: {
    'Client-Source': 'React-S3-CloudFront',
  },
});

export const apolloClient = new ApolloClient({
  link: from([errorLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          getItems: {
            merge(_existing, incoming) {
              return incoming;
            },
          },
        },
      },
    },
  }),
});
