import express, { type Application } from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
// @ts-ignore
import { setupWSConnection, setPersistence } from 'y-websocket/bin/utils';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import * as Y from 'yjs';
import sessionRouter from './routes/session.js';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3004;
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.use('/api/collaboration', sessionRouter);

const server = createServer(app);

const wss = new WebSocketServer({ noServer: true });

setPersistence({
  bindState: async (docName: string, ydoc: Y.Doc) => {
    try {
      const session = await prisma.session.findUnique({
        where: { id: docName }
      });
      if (session && session.docState) {
        Y.applyUpdate(ydoc, session.docState);
      }
    } catch (err) {
      console.error(`[DB] Failed to bind state for ${docName}:`, err);
    }
  },
  writeState: async (docName: string, ydoc: Y.Doc) => {
    try {
      const state = Y.encodeStateAsUpdate(ydoc);
      await prisma.session.update({
        where: { id: docName },
        data: { docState: Buffer.from(state) }
      });
    } catch (err) {
      console.error(`[DB] Failed to write state for ${docName}:`, err);
    }
  }
});

wss.on('connection', (conn: any, req: any, { docName }: any) => {
  console.log(`[WS] Connection established for docName: ${docName}`);
  setupWSConnection(conn, req, { docName, gc: true });
});

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '', `http://${request.headers.host}`);
  // expected ws url: /api/collaboration/ws/:sessionId
  if (url.pathname.startsWith('/api/collaboration/ws/')) {
    const docName = url.pathname.split('/').pop() || 'default';
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request, { docName });
    });
  } else {
    socket.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`Collaboration service listening on port ${PORT}`);
});
