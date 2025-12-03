/**
 * Mock data for testing
 */

export const mockWorkflowCard = {
  id: "test-workflow-1",
  name: "Test Workflow",
  description: "A test workflow for testing",
  status: "DRAFT" as const,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-02T00:00:00Z",
  _count: {
    versions: 2,
    executions: 5,
  },
};

export const mockPublishedWorkflowCard = {
  ...mockWorkflowCard,
  id: "test-workflow-2",
  name: "Published Workflow",
  status: "PUBLISHED" as const,
};

export const mockWorkflowCards = [
  mockWorkflowCard,
  mockPublishedWorkflowCard,
  {
    ...mockWorkflowCard,
    id: "test-workflow-3",
    name: "Another Test Workflow",
    description: null,
  },
];

export const mockPaginatedResponse = {
  workflows: mockWorkflowCards,
  pagination: {
    total: 3,
    page: 1,
    limit: 12,
    totalPages: 1,
  },
};
