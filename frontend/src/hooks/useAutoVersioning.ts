import { useEffect, useRef, useState } from 'react';
import { versionControlService } from '../services/versionControlService';
import type { WorkflowNode, NodeConnection } from '../types/workflow';

interface AutoVersioningOptions {
  workflowId: string;
  enabled?: boolean;
  autoCommitMessage?: string;
  onVersionCreated?: (commitSha: string) => void;
  onError?: (error: Error) => void;
}

interface WorkflowState {
  nodes: WorkflowNode[];
  connections: NodeConnection[];
  settings?: any;
  triggers?: any[];
}

/**
 * Hook for automatic workflow versioning
 * Creates commits when significant changes are detected
 */
export const useAutoVersioning = ({
  workflowId,
  enabled = true,
  autoCommitMessage = 'Auto-save checkpoint',
  onVersionCreated,
  onError
}: AutoVersioningOptions) => {
  const [isVersioning, setIsVersioning] = useState(false);
  const [lastCommitSha, setLastCommitSha] = useState<string | null>(null);
  const previousStateRef = useRef<WorkflowState | null>(null);
  const branchIdRef = useRef<string | null>(null);

  // Initialize - get default branch
  useEffect(() => {
    if (!enabled || !workflowId) return;

    const initBranch = async () => {
      try {
        const { branches } = await versionControlService.listBranches(workflowId);
        const defaultBranch = branches.find(b => b.isDefault) || branches[0];
        
        if (!defaultBranch) {
          // Create main branch if none exists
          const newBranch = await versionControlService.createBranch({
            workflowId,
            name: 'main',
            description: 'Main branch',
            isDefault: true
          });
          branchIdRef.current = newBranch.id;
        } else {
          branchIdRef.current = defaultBranch.id;
        }
      } catch (error) {
        console.error('Failed to initialize branch:', error);
      }
    };

    initBranch();
  }, [workflowId, enabled]);

  /**
   * Check if changes are significant enough to warrant a new version
   */
  const hasSignificantChanges = (
    previous: WorkflowState | null,
    current: WorkflowState
  ): boolean => {
    if (!previous) return true;

    // Check node count changes
    if (previous.nodes.length !== current.nodes.length) return true;

    // Check connection count changes
    if (previous.connections.length !== current.connections.length) return true;

    // Check for modified nodes (deep comparison)
    const prevNodeMap = new Map(previous.nodes.map(n => [n.id, n]));
    for (const currentNode of current.nodes) {
      const prevNode = prevNodeMap.get(currentNode.id);
      if (!prevNode || JSON.stringify(prevNode) !== JSON.stringify(currentNode)) {
        return true;
      }
    }

    // Check for modified connections
    const prevConnMap = new Map(previous.connections.map(c => [c.id, c]));
    for (const currentConn of current.connections) {
      const prevConn = prevConnMap.get(currentConn.id);
      if (!prevConn || JSON.stringify(prevConn) !== JSON.stringify(currentConn)) {
        return true;
      }
    }

    return false;
  };

  /**
   * Create an auto-version commit
   */
  const createAutoVersion = async (
    currentState: WorkflowState,
    customMessage?: string
  ): Promise<string | null> => {
    if (!enabled || !branchIdRef.current) {
      return null;
    }

    // Skip if no significant changes
    if (!hasSignificantChanges(previousStateRef.current, currentState)) {
      return lastCommitSha;
    }

    try {
      setIsVersioning(true);

      // Create commit with workflow definition (backend will auto-create version)
      const commit = await versionControlService.createCommit({
        workflowId,
        branchId: branchIdRef.current,
        message: customMessage || autoCommitMessage,
        tags: ['auto-save'],
        definition: {
          nodes: currentState.nodes,
          connections: currentState.connections,
          triggers: currentState.triggers || [],
          settings: currentState.settings || {}
        }
      });

      // Update state
      previousStateRef.current = currentState;
      setLastCommitSha(commit.sha);

      onVersionCreated?.(commit.sha);

      return commit.sha;
    } catch (error) {
      console.error('Auto-versioning failed:', error);
      onError?.(error as Error);
      return null;
    } finally {
      setIsVersioning(false);
    }
  };

  /**
   * Manually trigger versioning
   */
  const triggerVersion = async (
    currentState: WorkflowState,
    message: string
  ) => {
    return createAutoVersion(currentState, message);
  };

  return {
    isVersioning,
    lastCommitSha,
    createAutoVersion,
    triggerVersion
  };
};
