import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// POST /api/collaboration/sessions
app.post('/api/collaboration/sessions', async (req: Request, res: Response): Promise<any> => {
  try {
    const { user1Id, user2Id, questionId, language } = req.body;
    
    if (!user1Id || !user2Id || !questionId || !language) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const session = await prisma.session.create({
      data: {
        user1Id,
        user2Id,
        questionId,
        language
      }
    });

    return res.status(201).json(session);
  } catch (error) {
    console.error('Failed to create session:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/collaboration/sessions/:id
app.get('/api/collaboration/sessions/:id', async (req: Request, res: Response): Promise<any> => {
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

app.listen(PORT, () => {
  console.log(`Collaboration service REST API listening on port ${PORT}`);
});
