/**
 * Agent Memory Manager
 * Handles short-term and long-term memory for AI agents
 */

import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import type { AgentMemory, MemoryEntry } from './types';

const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
const prisma = new PrismaClient();

export class AgentMemoryManager {
  private memories: Map<string, AgentMemoryImpl> = new Map();

  /**
   * Get or create memory instance for a session
   */
  async getMemory(sessionId: string, agentId: string): Promise<AgentMemory> {
    const key = `${agentId}:${sessionId}`;
    
    if (!this.memories.has(key)) {
      const memory = new AgentMemoryImpl(sessionId, agentId);
      await memory.initialize();
      this.memories.set(key, memory);
    }

    return this.memories.get(key)!;
  }

  /**
   * Clear memory for a session
   */
  async clearMemory(sessionId: string, agentId: string): Promise<void> {
    const key = `${agentId}:${sessionId}`;
    const memory = this.memories.get(key);
    
    if (memory) {
      await memory.clear('all');
      this.memories.delete(key);
    }
  }

  /**
   * Export memory for backup/transfer
   */
  async exportMemory(sessionId: string, agentId: string): Promise<{
    shortTerm: MemoryEntry[];
    longTerm: MemoryEntry[];
  }> {
    const memory = await this.getMemory(sessionId, agentId);
    return {
      shortTerm: memory.shortTerm,
      longTerm: memory.longTerm,
    };
  }
}

class AgentMemoryImpl implements AgentMemory {
  sessionId: string;
  agentId: string;
  shortTerm: MemoryEntry[] = [];
  longTerm: MemoryEntry[] = [];

  constructor(sessionId: string, agentId: string) {
    this.sessionId = sessionId;
    this.agentId = agentId;
  }

  /**
   * Initialize memory from storage
   */
  async initialize(): Promise<void> {
    // Load short-term from Redis
    const shortTermKey = `agent:memory:short:${this.agentId}:${this.sessionId}`;
    const shortTermData = await redis.get(shortTermKey);
    if (shortTermData) {
      this.shortTerm = JSON.parse(shortTermData);
    }

    // Load long-term from database
    try {
      const longTermRecords = await prisma.agentMemory.findMany({
        where: {
          agentId: this.agentId,
          type: 'long_term',
        },
        orderBy: {
          importance: 'desc',
        },
        take: 50, // Limit to top 50 most important memories
      });

      this.longTerm = longTermRecords.map(record => ({
        id: record.id,
        type: record.memoryType as any,
        content: record.content,
        embedding: record.embedding as number[] | undefined,
        importance: record.importance || undefined,
        timestamp: record.createdAt,
        metadata: record.metadata as any,
      }));
    } catch (error) {
      // Table might not exist yet
      console.warn('Could not load long-term memory:', error);
    }
  }

  /**
   * Retrieve memories by query (semantic search)
   */
  async retrieve(query: string, limit: number = 10): Promise<MemoryEntry[]> {
    if (!query) {
      // Return recent memories
      return [
        ...this.shortTerm.slice(-limit / 2),
        ...this.longTerm.slice(0, limit / 2),
      ];
    }

    // Simple keyword matching (can be enhanced with embeddings)
    const allMemories = [...this.shortTerm, ...this.longTerm];
    const scored = allMemories.map(entry => ({
      entry,
      score: this.calculateRelevance(entry.content, query),
    }));

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.entry);
  }

  /**
   * Store new memory entry
   */
  async store(entry: MemoryEntry, type: 'short' | 'long'): Promise<void> {
    if (type === 'short') {
      this.shortTerm.push(entry);
      
      // Keep only last 100 entries
      if (this.shortTerm.length > 100) {
        this.shortTerm = this.shortTerm.slice(-100);
      }

      // Save to Redis
      const shortTermKey = `agent:memory:short:${this.agentId}:${this.sessionId}`;
      await redis.setex(
        shortTermKey,
        3600 * 24, // 24 hours TTL
        JSON.stringify(this.shortTerm)
      );
    } else {
      this.longTerm.push(entry);

      // Save to database
      try {
        await prisma.agentMemory.create({
          data: {
            id: entry.id,
            agentId: this.agentId,
            sessionId: this.sessionId,
            type: 'long_term',
            memoryType: entry.type,
            content: entry.content,
            embedding: entry.embedding as any,
            importance: entry.importance || 0.5,
            metadata: entry.metadata as any,
          },
        });
      } catch (error) {
        console.error('Failed to store long-term memory:', error);
      }
    }
  }

  /**
   * Clear memory
   */
  async clear(type: 'short' | 'long' | 'all'): Promise<void> {
    if (type === 'short' || type === 'all') {
      this.shortTerm = [];
      const shortTermKey = `agent:memory:short:${this.agentId}:${this.sessionId}`;
      await redis.del(shortTermKey);
    }

    if (type === 'long' || type === 'all') {
      this.longTerm = [];
      try {
        await prisma.agentMemory.deleteMany({
          where: {
            agentId: this.agentId,
            sessionId: this.sessionId,
          },
        });
      } catch (error) {
        console.error('Failed to clear long-term memory:', error);
      }
    }
  }

  /**
   * Calculate relevance score between content and query
   */
  private calculateRelevance(content: string, query: string): number {
    const contentLower = content.toLowerCase();
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/);

    let score = 0;
    for (const term of queryTerms) {
      if (contentLower.includes(term)) {
        score += 1;
      }
    }

    return score / queryTerms.length;
  }
}

/**
 * Memory consolidation utility
 * Consolidates short-term memories into long-term storage
 */
export class MemoryConsolidator {
  /**
   * Consolidate session memories
   */
  static async consolidate(sessionId: string, agentId: string): Promise<void> {
    const manager = new AgentMemoryManager();
    const memory = await manager.getMemory(sessionId, agentId);

    // Find important short-term memories
    const importantMemories = memory.shortTerm.filter(
      entry => (entry.importance || 0) >= 0.7
    );

    // Move to long-term storage
    for (const entry of importantMemories) {
      await memory.store(entry, 'long');
    }

    // Clear consolidated memories from short-term
    memory.shortTerm = memory.shortTerm.filter(
      entry => (entry.importance || 0) < 0.7
    );

    console.log(`Consolidated ${importantMemories.length} memories for agent ${agentId}`);
  }

  /**
   * Prune old low-importance memories
   */
  static async prune(agentId: string, maxAge: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAge);

    try {
      const result = await prisma.agentMemory.deleteMany({
        where: {
          agentId,
          importance: { lt: 0.3 },
          createdAt: { lt: cutoffDate },
        },
      });

      console.log(`Pruned ${result.count} old memories for agent ${agentId}`);
    } catch (error) {
      console.error('Failed to prune memories:', error);
    }
  }
}
