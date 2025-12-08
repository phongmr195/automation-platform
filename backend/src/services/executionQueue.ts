import { logger } from '../lib/logger';

export const enqueue = async (job: unknown) => {
  // placeholder for enqueueing logic (e.g. using BullMQ producer)
  logger.info("enqueue called with", job);
};
