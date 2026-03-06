// src/lib/prisma.ts
import pg from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;

const pool = new pg.Pool({ 
  connectionString,
  max: 20, // Max number of concurrent connections in the pool
  idleTimeoutMillis: 30000, // How long a connection can sit idle before closing
  connectionTimeoutMillis: 2000, // How long to wait for a connection before failing
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;