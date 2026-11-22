import { gql } from '@apollo/client';

export const HEALTH_CHECK = gql`
  query HealthCheck {
    healthCheck
  }
`;

export const GET_ITEMS = gql`
  query GetItems($status: ItemStatus, $limit: Int, $offset: Int) {
    getItems(status: $status, limit: $limit, offset: $offset) {
      id
      title
      description
      status
      priority
      createdAt
      updatedAt
      assignedTo {
        id
        name
        email
        role
      }
    }
  }
`;

export const GET_USERS = gql`
  query GetUsers {
    getUsers {
      id
      name
      email
      role
      createdAt
    }
  }
`;

