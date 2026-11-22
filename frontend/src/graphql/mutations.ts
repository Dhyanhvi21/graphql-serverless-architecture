import { gql } from '@apollo/client';

export const CREATE_ITEM = gql`
  mutation CreateItem($input: CreateItemInput!) {
    createItem(input: $input) {
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
      }
    }
  }
`;

export const UPDATE_ITEM = gql`
  mutation UpdateItem($input: UpdateItemInput!) {
    updateItem(input: $input) {
      id
      title
      description
      status
      priority
      updatedAt
    }
  }
`;

export const DELETE_ITEM = gql`
  mutation DeleteItem($id: ID!) {
    deleteItem(id: $id)
  }
`;

export const CREATE_USER = gql`
  mutation CreateUser($email: String!, $name: String!, $role: String) {
    createUser(email: $email, name: $name, role: $role) {
      id
      name
      email
      role
    }
  }
`;

