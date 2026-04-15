import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import translateRouter from './routes/translate.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ai-service' });
});

// Routes
app.use('/translate', translateRouter);

app.listen(PORT, () => {
  console.log(`AI Service running on port ${PORT}`);
});
