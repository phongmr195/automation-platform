import { Worker } from 'bullmq'
import IORedis from 'ioredis'

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null
})

const worker = new Worker('executions', async (job) => {
  console.log('Processing job', job.id, job.name, job.data)
}, { connection })

worker.on('completed', (job) => console.log('Job completed', job.id))
worker.on('failed', (job, err) => console.error('Job failed', job?.id, err))

console.log('Worker started')
