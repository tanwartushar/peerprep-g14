import { Router, type Request, type Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
const { Pool } = pg;

const router = Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

// POST /api/collaboration/sessions
router.post('/sessions', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id, user1Id, user2Id, questionId, language } = req.body;
    
    if (!user1Id || !user2Id || !questionId || !language) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const session = await prisma.session.create({
      data: {
        ...(id ? { id } : {}),
        user1Id,
        user2Id,
        questionId,
        language
      }
    });

    return res.status(201).json(session);
  } catch (error: any) {
    if (error.code === 'P2002') {
      console.warn('Handling concurrent session creation gracefully (P2002)');
      return res.status(409).json({ error: 'Session already exists' });
    }
    console.error('Failed to create session:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/collaboration/sessions/:id
router.get('/sessions/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const sessionId = req.params.id;
    
    const session = await prisma.session.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    return res.status(200).json(session);
  } catch (error) {
    console.error('Failed to get session:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
