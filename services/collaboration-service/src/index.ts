import express, { type Application } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import sessionRouter from './routes/session.js';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3004;

app.use(cors());
app.use(express.json());

// Mount the router under /api/collaboration
app.use('/api/collaboration', sessionRouter);

const server = createServer(app);

server.listen(PORT, () => {
  console.log(`Collaboration service listening on port ${PORT}`);
});
