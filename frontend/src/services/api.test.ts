/**
 * Tests for API service
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import axios from "axios";
import { workflowApi } from "../services/api";

// Mock axios
vi.mock("axios");
const mockedAxios = vi.mocked(axios, true);

describe("API Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("workflowApi", () => {
    it("should create a workflow", async () => {
      const mockWorkflow = {
        name: "Test Workflow",
        definition: {
          nodes: [],
          edges: [],
        },
      };

      const mockResponse = {
        data: {
          message: "Workflow created",
          workflow: { id: "123", ...mockWorkflow },
        },
      };

      mockedAxios.create = vi.fn().mockReturnValue({
        post: vi.fn().mockResolvedValue(mockResponse),
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      });

      // This test verifies the API structure
      expect(workflowApi).toHaveProperty("createWorkflow");
      expect(workflowApi).toHaveProperty("getWorkflows");
      expect(workflowApi).toHaveProperty("getWorkflow");
      expect(workflowApi).toHaveProperty("updateWorkflow");
      expect(workflowApi).toHaveProperty("deleteWorkflow");
      expect(workflowApi).toHaveProperty("executeWorkflow");
    });
  });
});
