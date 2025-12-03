/**
 * Integration Tests for Workflow Search and Filters
 */

import axios from "axios";

const BASE_URL = "http://localhost:3000";

describe("Workflow Search and Filters API", () => {
  describe("GET /workflows with pagination", () => {
    it("should return workflows with pagination metadata", async () => {
      const response = await axios.get(`${BASE_URL}/workflows?page=1&limit=10`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("workflows");
      expect(response.data).toHaveProperty("pagination");
      expect(response.data.pagination).toHaveProperty("total");
      expect(response.data.pagination).toHaveProperty("page");
      expect(response.data.pagination).toHaveProperty("limit");
      expect(response.data.pagination).toHaveProperty("totalPages");
      expect(response.data.pagination.page).toBe(1);
      expect(response.data.pagination.limit).toBe(10);
    });

    it("should respect limit parameter", async () => {
      const response = await axios.get(`${BASE_URL}/workflows?limit=5`);

      expect(response.data.workflows.length).toBeLessThanOrEqual(5);
      expect(response.data.pagination.limit).toBe(5);
    });
  });

  describe("GET /workflows with search", () => {
    it("should filter workflows by name (case-insensitive)", async () => {
      const response = await axios.get(`${BASE_URL}/workflows?search=crypto`);

      expect(response.status).toBe(200);
      expect(response.data.workflows).toBeDefined();

      // All returned workflows should have 'crypto' in name
      response.data.workflows.forEach((workflow: any) => {
        expect(workflow.name.toLowerCase()).toContain("crypto");
      });
    });

    it("should return empty array when search has no matches", async () => {
      const response = await axios.get(
        `${BASE_URL}/workflows?search=nonexistentworkflow12345`
      );

      expect(response.status).toBe(200);
      expect(response.data.workflows).toEqual([]);
      expect(response.data.pagination.total).toBe(0);
    });
  });

  describe("GET /workflows with status filter", () => {
    it("should filter published workflows", async () => {
      const response = await axios.get(
        `${BASE_URL}/workflows?status=published`
      );

      expect(response.status).toBe(200);
      expect(response.data.workflows).toBeDefined();

      // Each workflow should have at least one published version
      response.data.workflows.forEach((workflow: any) => {
        const hasPublishedVersion = workflow.versions.some(
          (v: any) => !v.isDraft
        );
        expect(hasPublishedVersion).toBe(true);
      });
    });

    it("should filter draft workflows", async () => {
      const response = await axios.get(`${BASE_URL}/workflows?status=draft`);

      expect(response.status).toBe(200);
      expect(response.data.workflows).toBeDefined();
    });
  });

  describe("GET /workflows with sorting", () => {
    it("should sort by createdAt descending (default)", async () => {
      const response = await axios.get(`${BASE_URL}/workflows?limit=10`);

      expect(response.status).toBe(200);
      const workflows = response.data.workflows;

      if (workflows.length > 1) {
        for (let i = 0; i < workflows.length - 1; i++) {
          const current = new Date(workflows[i].createdAt);
          const next = new Date(workflows[i + 1].createdAt);
          expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
        }
      }
    });

    it("should sort by name ascending", async () => {
      const response = await axios.get(
        `${BASE_URL}/workflows?sort=name&order=asc&limit=10`
      );

      expect(response.status).toBe(200);
      const workflows = response.data.workflows;

      if (workflows.length > 1) {
        for (let i = 0; i < workflows.length - 1; i++) {
          expect(workflows[i].name.toLowerCase()).toBeLessThanOrEqual(
            workflows[i + 1].name.toLowerCase()
          );
        }
      }
    });

    it("should sort by updatedAt descending", async () => {
      const response = await axios.get(
        `${BASE_URL}/workflows?sort=updatedAt&order=desc`
      );

      expect(response.status).toBe(200);
      expect(response.data.workflows).toBeDefined();
    });
  });

  describe("GET /workflows with combined filters", () => {
    it("should combine search, status, sort, and pagination", async () => {
      const response = await axios.get(
        `${BASE_URL}/workflows?search=crypto&status=published&sort=name&order=asc&page=1&limit=5`
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("workflows");
      expect(response.data).toHaveProperty("pagination");
      expect(response.data.workflows.length).toBeLessThanOrEqual(5);
    });
  });

  describe("GET /workflows with workflow counts", () => {
    it("should include version and execution counts", async () => {
      const response = await axios.get(`${BASE_URL}/workflows?limit=1`);

      expect(response.status).toBe(200);

      if (response.data.workflows.length > 0) {
        const workflow = response.data.workflows[0];
        expect(workflow).toHaveProperty("_count");
        expect(workflow._count).toHaveProperty("versions");
        expect(workflow._count).toHaveProperty("executions");
        expect(typeof workflow._count.versions).toBe("number");
        expect(typeof workflow._count.executions).toBe("number");
      }
    });

    it("should include latest version", async () => {
      const response = await axios.get(`${BASE_URL}/workflows?limit=1`);

      expect(response.status).toBe(200);

      if (response.data.workflows.length > 0) {
        const workflow = response.data.workflows[0];
        expect(workflow).toHaveProperty("versions");
        expect(Array.isArray(workflow.versions)).toBe(true);
        expect(workflow.versions.length).toBeLessThanOrEqual(1);
      }
    });
  });
});
