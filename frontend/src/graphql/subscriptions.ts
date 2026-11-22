import { gql } from '@apollo/client';

export const ITEM_CREATED_SUBSCRIPTION = gql`
  subscription OnItemCreated {
    itemCreated {
      id
      title
      description
      status
      priority
      createdAt
    }
  }
`;

export const ITEM_UPDATED_SUBSCRIPTION = gql`
  subscription OnItemUpdated {
    itemUpdated {
      id
      title
      status
      priority
      updatedAt
    }
  }
`;

