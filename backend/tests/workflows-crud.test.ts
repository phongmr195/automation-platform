/**
 * Comprehensive Integration Tests for Workflow CRUD API
 *
 * Note: These tests require the backend server to be running on http://localhost:3000
 * Run `npm run dev` in the backend directory before running these tests
 */

import axios from "axios";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";

describe("Workflow CRUD API", () => {
  let testWorkflowIds: string[] = [];

  // Clean up test data after all tests
  afterAll(async () => {
    for (const id of testWorkflowIds) {
      try {
        await prisma.execution.deleteMany({
          where: { workflowId: id },
        });
      } catch {
        // Ignore errors during cleanup
      }
    }
    await prisma.workflow.deleteMany({
      where: { name: { contains: "Test Workflow" } },
    });
    await prisma.$disconnect();
  });

  describe("POST /workflows - Create Workflow", () => {
    it("should create a workflow with valid data", async () => {
      const workflowData = {
        name: "Test Workflow - Create",
        definition: {
          nodes: [
            {
              id: "node1",
              type: "trigger",
              name: "Start",
              position: { x: 100, y: 100 },
              data: {},
              config: {},
            },
          ],
          edges: [],
        },
      };

      const response = await axios.post(`${BASE_URL}/workflows`, workflowData);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("id");
      expect(response.data.name).toBe(workflowData.name);
      expect(response.data.versions).toBeDefined();
      expect(response.data.versions.length).toBe(1);
      expect(response.data.versions[0].versionNumber).toBe(1);
      expect(response.data.versions[0].isDraft).toBe(true);

      testWorkflowIds.push(response.data.id);
    });

    it("should normalize workflow definition", async () => {
      const workflowData = {
        name: "Test Workflow - Normalize",
        definition: {
          nodes: [
            {
              id: "node1",
              type: "trigger",
              // Missing name, position, data, config
            },
          ],
          edges: [],
        },
      };

      const response = await axios.post(`${BASE_URL}/workflows`, workflowData);

      expect(response.status).toBe(200);
      expect(response.data.versions[0].definition.nodes[0]).toHaveProperty(
        "name"
      );
      expect(response.data.versions[0].definition.nodes[0]).toHaveProperty(
        "position"
      );
      expect(response.data.versions[0].definition.nodes[0]).toHaveProperty(
        "data"
      );
      expect(response.data.versions[0].definition.nodes[0]).toHaveProperty(
        "config"
      );

      testWorkflowIds.push(response.data.id);
    });

    it("should reject invalid workflow definition", async () => {
      const invalidData = {
        name: "Test Workflow - Invalid",
        definition: {
          nodes: "invalid", // Should be an array
          edges: [],
        },
      };

      try {
        await axios.post(`${BASE_URL}/workflows`, invalidData);
        fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }
    });
  });

  describe("GET /workflows/:id - Get Single Workflow", () => {
    let workflowId: string;

    beforeAll(async () => {
      const workflow = await prisma.workflow.create({
        data: {
          name: "Test Workflow - Get",
          versions: {
            create: {
              versionNumber: 1,
              definition: { nodes: [], edges: [] },
              isDraft: true,
            },
          },
        },
      });
      workflowId = workflow.id;
      testWorkflowIds.push(workflowId);
    });

    it("should return workflow by id", async () => {
      const response = await axios.get(`${BASE_URL}/workflows/${workflowId}`);

      expect(response.status).toBe(200);
      expect(response.data.id).toBe(workflowId);
      expect(response.data.name).toBe("Test Workflow - Get");
    });

    it("should return 404 for non-existent workflow", async () => {
      try {
        await axios.get(
          `${BASE_URL}/workflows/00000000-0000-0000-0000-000000000000`
        );
        fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data).toHaveProperty("error");
      }
    });
  });

  describe("PUT /workflows/:id - Update Workflow", () => {
    let workflowId: string;

    beforeAll(async () => {
      const workflow = await prisma.workflow.create({
        data: {
          name: "Test Workflow - Update",
          versions: {
            create: {
              versionNumber: 1,
              definition: { nodes: [], edges: [] },
              isDraft: true,
            },
          },
        },
      });
      workflowId = workflow.id;
      testWorkflowIds.push(workflowId);
    });

    it("should update workflow and create new version", async () => {
      const updateData = {
        name: "Test Workflow - Updated",
        definition: {
          nodes: [
            {
              id: "node1",
              type: "trigger",
              name: "Updated Node",
              position: { x: 200, y: 200 },
              data: {},
              config: {},
            },
          ],
          edges: [],
        },
      };

      const response = await axios.put(
        `${BASE_URL}/workflows/${workflowId}`,
        updateData
      );

      expect(response.status).toBe(200);
      expect(response.data.name).toBe(updateData.name);
      expect(response.data.versions.length).toBeGreaterThan(1);
      expect(
        response.data.versions[response.data.versions.length - 1].versionNumber
      ).toBe(2);
    });

    it("should normalize updated workflow definition", async () => {
      const updateData = {
        name: "Test Workflow - Normalized Update",
        definition: {
          nodes: [
            {
              id: "node1",
              type: "trigger",
              // Missing optional fields
            },
          ],
          edges: [],
        },
      };

      const response = await axios.put(
        `${BASE_URL}/workflows/${workflowId}`,
        updateData
      );

      expect(response.status).toBe(200);
      const latestVersion =
        response.data.versions[response.data.versions.length - 1];
      expect(latestVersion.definition.nodes[0]).toHaveProperty("name");
      expect(latestVersion.definition.nodes[0]).toHaveProperty("position");
    });
  });

  describe("DELETE /workflows/:id - Delete Workflow", () => {
    it("should delete workflow and its executions", async () => {
      // Create a workflow to delete
      const workflow = await prisma.workflow.create({
        data: {
          name: "Test Workflow - Delete",
          versions: {
            create: {
              versionNumber: 1,
              definition: { nodes: [], edges: [] },
              isDraft: true,
            },
          },
        },
        include: { versions: true },
      });

      // Create an execution if we have a version
      if (workflow.versions[0]) {
        await prisma.execution.create({
          data: {
            workflowId: workflow.id,
            versionId: workflow.versions[0].id,
            status: "completed",
            input: {},
            definitionSnapshot: { nodes: [], edges: [] },
          },
        });
      }

      const response = await axios.delete(
        `${BASE_URL}/workflows/${workflow.id}`
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);

      // Verify workflow is deleted
      const deleted = await prisma.workflow.findUnique({
        where: { id: workflow.id },
      });
      expect(deleted).toBeNull();
    });
  });

  describe("POST /workflows/:id/execute - Execute Workflow", () => {
    let workflowId: string;

    beforeAll(async () => {
      const workflow = await prisma.workflow.create({
        data: {
          name: "Test Workflow - Execute",
          versions: {
            create: {
              versionNumber: 1,
              definition: {
                nodes: [
                  {
                    id: "node1",
                    type: "trigger",
                    name: "Start",
                    position: { x: 0, y: 0 },
                    data: {},
                    config: {},
                  },
                ],
                edges: [],
              },
              isDraft: false,
            },
          },
        },
      });

      workflowId = workflow.id;
      testWorkflowIds.push(workflowId);
    });

    it("should execute workflow with published version", async () => {
      const input = { testData: "value" };
      const response = await axios.post(
        `${BASE_URL}/workflows/${workflowId}/execute`,
        input
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("executionId");
      expect(response.data).toHaveProperty("versionId");

      // Verify execution was created
      const execution = await prisma.execution.findUnique({
        where: { id: response.data.executionId },
      });
      expect(execution).toBeDefined();
      expect(execution?.status).toBe("queued");
      expect(execution?.input).toEqual(input);
    });

    it("should execute workflow with latest version if no published version", async () => {
      // Create workflow with only draft version
      const draftWorkflow = await prisma.workflow.create({
        data: {
          name: "Test Workflow - Draft Execute",
          versions: {
            create: {
              versionNumber: 1,
              definition: { nodes: [], edges: [] },
              isDraft: true,
            },
          },
        },
      });

      testWorkflowIds.push(draftWorkflow.id);

      const response = await axios.post(
        `${BASE_URL}/workflows/${draftWorkflow.id}/execute`,
        {}
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("executionId");
      expect(response.data).toHaveProperty("versionId");
    });

    it("should return 404 for non-existent workflow", async () => {
      try {
        await axios.post(
          `${BASE_URL}/workflows/00000000-0000-0000-0000-000000000000/execute`,
          {}
        );
        fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data).toHaveProperty("error");
      }
    });

    it("should store definition snapshot in execution", async () => {
      const response = await axios.post(
        `${BASE_URL}/workflows/${workflowId}/execute`,
        {}
      );

      const execution = await prisma.execution.findUnique({
        where: { id: response.data.executionId },
      });

      expect(execution?.definitionSnapshot).toBeDefined();
      expect(execution?.definitionSnapshot).toHaveProperty("nodes");
      expect(execution?.definitionSnapshot).toHaveProperty("edges");
    });
  });
});
