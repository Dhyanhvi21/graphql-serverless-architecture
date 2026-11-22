export const typeDefs = `#graphql
  enum ItemStatus {
    PENDING
    IN_PROGRESS
    COMPLETED
    CANCELLED
  }

  enum ItemPriority {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }

  type User {
    id: ID!
    email: String!
    name: String!
    role: String!
    createdAt: String!
  }

  type Item {
    id: ID!
    title: String!
    description: String
    status: ItemStatus!
    priority: ItemPriority!
    assignedTo: User
    createdAt: String!
    updatedAt: String!
  }

  input CreateItemInput {
    title: String!
    description: String
    priority: ItemPriority
    assignedToId: ID
  }

  input UpdateItemInput {
    id: ID!
    title: String
    description: String
    status: ItemStatus
    priority: ItemPriority
    assignedToId: ID
  }

  type Query {
    healthCheck: String!
    getItem(id: ID!): Item
    getItems(status: ItemStatus, limit: Int, offset: Int): [Item!]!
    getUsers: [User!]!
  }

  type Mutation {
    createUser(email: String!, name: String!, role: String): User!
    createItem(input: CreateItemInput!): Item!
    updateItem(input: UpdateItemInput!): Item!
    deleteItem(id: ID!): Boolean!
  }
`;

