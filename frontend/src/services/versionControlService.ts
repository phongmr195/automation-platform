import api from './api';
import type { WorkflowCommit, WorkflowBranch, WorkflowDiff, WorkflowSnapshot, WorkflowMergeRequest } from '../types/versionControl';

export const versionControlService = {
  // ============= COMMITS =============
  
  async createCommit(data: {
    workflowId: string;
    versionId?: string;
    branchId?: string;
    message: string;
    tags?: string[];
    definition?: {
      nodes: any;
      connections: any;
      triggers?: any;
      settings?: any;
    };
  }): Promise<WorkflowCommit> {
    const response = await api.post('/version-control/commits', data);
    return response.data;
  },

  async getCommitHistory(branchId: string, limit = 50): Promise<{ commits: WorkflowCommit[]; total: number }> {
    const response = await api.get(`/version-control/branches/${branchId}/commits`, {
      params: { limit }
    });
    return response.data;
  },

  async getCommit(sha: string): Promise<WorkflowCommit> {
    const response = await api.get(`/version-control/commits/${sha}`);
    return response.data;
  },

  // ============= BRANCHES =============

  async createBranch(data: {
    workflowId: string;
    name: string;
    description?: string;
    sourceBranchId?: string;
    isDefault?: boolean;
    isProtected?: boolean;
  }): Promise<WorkflowBranch> {
    const response = await api.post('/version-control/branches', data);
    return response.data;
  },

  async listBranches(workflowId: string): Promise<{ branches: WorkflowBranch[]; total: number }> {
    const response = await api.get(`/version-control/workflows/${workflowId}/branches`);
    return response.data;
  },

  async getBranch(branchId: string): Promise<WorkflowBranch> {
    const response = await api.get(`/version-control/branches/${branchId}`);
    return response.data;
  },

  async updateBranch(branchId: string, data: {
    name?: string;
    description?: string;
    isDefault?: boolean;
    isProtected?: boolean;
  }): Promise<WorkflowBranch> {
    const response = await api.patch(`/version-control/branches/${branchId}`, data);
    return response.data;
  },

  async deleteBranch(branchId: string): Promise<void> {
    await api.delete(`/version-control/branches/${branchId}`);
  },

  // ============= DIFFS =============

  async getDiff(fromSha: string, toSha: string): Promise<WorkflowDiff> {
    const response = await api.get(`/version-control/diff/${fromSha}/${toSha}`);
    return response.data;
  },

  async compareDiff(fromSha: string, toSha: string): Promise<WorkflowDiff> {
    const response = await api.get(`/version-control/diff/${fromSha}/${toSha}`);
    return response.data;
  },

  async listDiffs(workflowId: string): Promise<{ diffs: WorkflowDiff[]; total: number }> {
    const response = await api.get(`/version-control/workflows/${workflowId}/diffs`);
    return response.data;
  },

  // ============= ROLLBACK =============

  async rollback(workflowId: string, targetSha: string): Promise<any> {
    const response = await api.post(`/version-control/workflows/${workflowId}/rollback`, {
      targetSha
    });
    return response.data;
  },

  // ============= SNAPSHOTS =============

  async createSnapshot(data: {
    workflowId: string;
    name: string;
    description?: string;
    commitSha: string;
  }): Promise<WorkflowSnapshot> {
    const response = await api.post('/version-control/snapshots', data);
    return response.data;
  },

  async listSnapshots(workflowId: string): Promise<{ snapshots: WorkflowSnapshot[]; total: number }> {
    const response = await api.get(`/version-control/workflows/${workflowId}/snapshots`);
    return response.data;
  },

  async getSnapshot(snapshotId: string): Promise<WorkflowSnapshot> {
    const response = await api.get(`/version-control/snapshots/${snapshotId}`);
    return response.data;
  },

  async deleteSnapshot(snapshotId: string): Promise<void> {
    await api.delete(`/version-control/snapshots/${snapshotId}`);
  },

  async restoreSnapshot(snapshotId: string): Promise<any> {
    const response = await api.post(`/version-control/snapshots/${snapshotId}/restore`);
    return response.data;
  },

  // ============= MERGE REQUESTS =============

  async createMergeRequest(data: {
    workflowId: string;
    sourceBranchId: string;
    targetBranchId: string;
    title: string;
    description?: string;
  }): Promise<WorkflowMergeRequest> {
    const response = await api.post('/version-control/merge-requests', data);
    return response.data;
  },

  async listMergeRequests(workflowId: string, status?: 'OPEN' | 'MERGED' | 'CLOSED'): Promise<{ mergeRequests: WorkflowMergeRequest[]; total: number }> {
    const response = await api.get(`/version-control/workflows/${workflowId}/merge-requests`, {
      params: { status }
    });
    return response.data;
  },

  async getMergeRequest(mrId: string): Promise<WorkflowMergeRequest> {
    const response = await api.get(`/version-control/merge-requests/${mrId}`);
    return response.data;
  },

  async updateMergeRequest(mrId: string, data: {
    status?: 'OPEN' | 'MERGED' | 'CLOSED';
    reviewedBy?: string;
    mergedBy?: string;
  }): Promise<WorkflowMergeRequest> {
    const response = await api.patch(`/version-control/merge-requests/${mrId}`, data);
    return response.data;
  }
};
