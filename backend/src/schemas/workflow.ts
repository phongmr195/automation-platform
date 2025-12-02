import { z } from "zod";

export const NodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string().optional(),
  position: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .optional(),
  data: z.record(z.string(), z.any()).optional(),
  config: z.record(z.string(), z.any()).optional(),
});

export const EdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
});

export const WorkflowDefinitionSchema = z.object({
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
});
