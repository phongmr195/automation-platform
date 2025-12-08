export interface WorkflowCommit {
  id: string;
  workflowId: string;
  versionId: string;
  branchId?: string;
  sha: string;
  message: string;
  author: string;
  authorId?: string;
  parentSha?: string;
  changes?: any;
  tags: string[];
  createdAt: string;
  version?: {
    id: string;
    versionNumber: number;
    definition: any;
  };
  branch?: WorkflowBranch;
  parent?: WorkflowCommit;
  children?: WorkflowCommit[];
}

export interface WorkflowBranch {
  id: string;
  workflowId: string;
  name: string;
  description?: string;
  headSha?: string;
  isDefault: boolean;
  isProtected: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  headCommit?: WorkflowCommit;
  commits?: WorkflowCommit[];
}

export interface WorkflowDiff {
  id: string;
  workflowId: string;
  fromSha: string;
  toSha: string;
  diffType: 'NODES_CHANGED' | 'CONNECTIONS_CHANGED' | 'SETTINGS_CHANGED' | 'COMPLETE_REWRITE' | 'MINOR_CHANGE';
  diffData: {
    nodes: {
      added: any[];
      removed: any[];
      modified: Array<{
        id: string;
        before: any;
        after: any;
      }>;
    };
    connections: {
      added: any[];
      removed: any[];
    };
    settings: {
      before: any;
      after: any;
    } | null;
  };
  nodesAdded: number;
  nodesRemoved: number;
  nodesModified: number;
  connectionsAdded: number;
  connectionsRemoved: number;
  settingsChanged: boolean;
  createdAt: string;
}

export interface WorkflowSnapshot {
  id: string;
  workflowId: string;
  name: string;
  description?: string;
  commitSha: string;
  definition: any;
  createdBy?: string;
  createdAt: string;
}

export interface WorkflowMergeRequest {
  id: string;
  workflowId: string;
  sourceBranchId: string;
  targetBranchId: string;
  title: string;
  description?: string;
  status: 'OPEN' | 'MERGED' | 'CLOSED';
  conflicts?: any;
  createdBy?: string;
  reviewedBy?: string;
  mergedBy?: string;
  createdAt: string;
  mergedAt?: string;
  closedAt?: string;
}
