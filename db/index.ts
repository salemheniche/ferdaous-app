import 'server-only'
import { cache } from 'react'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

// One postgres client PER REQUEST via React cache() — safe for both
// serverless (Vercel / Netlify) and long-lived Node.js processes.
const getClient = cache(() => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set')
  }
  return postgres(process.env.DATABASE_URL, {
    prepare: false,   // required for pgBouncer / Neon pooler
    max: 1,           // one connection per request isolate
    idle_timeout: 20, // seconds — reclaim idle connections quickly
    connect_timeout: 10,
    ssl: process.env.DATABASE_URL.includes('sslmode=require') ? 'require' : undefined,
  })
})

function getDb() {
  return drizzle(getClient())
}

// Lazy proxy — DB connection established at runtime, not at module-eval / build time
export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_target, prop: string | symbol) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
