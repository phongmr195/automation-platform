/**
 * Helper utilities for node execution
 */

import type { NodeExecutionResult } from "../types";

/**
 * Wrap node execution to automatically track duration
 */
export async function withDuration<T extends { success: boolean; data?: any; error?: string }>(
  fn: () => Promise<T>
): Promise<NodeExecutionResult> {
  const startTime = Date.now();
  
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    
    return {
      ...result,
      output: result.data,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    return {
      success: false,
      error: error.message,
      duration,
    };
  }
}
