// Separating the runtime 'express' from the 'type' definitions
import express, { type Request, type Response, type Application } from 'express';
import cors, { type CorsOptions } from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;

// 1. Define your options with the CorsOptions type
const corsOptions: CorsOptions = {
  origin: 'http://localhost:5173', // Your Vite dev server
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,               // Allow cookies/sessions
  optionsSuccessStatus: 200        // Some legacy browsers choke on 204
};

app.use(cors(corsOptions));
  
// Middleware to parse JSON bodies
app.use(express.json());

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// A sample route
app.get('/user', (req: Request, res: Response) => {
  res.send('TypeScript Backend is running! 🚀');
});

app.get('/user/auth/github', (req, res) => {
  console.log('Initiating GitHub OAuth flow');
  const rootUrl = 'https://github.com/login/oauth/authorize';
  const options = {
    client_id: process.env.GITHUB_CLIENT_ID!,
    redirect_uri: 'http://localhost/dashboard',
    scope: 'user:email', // Request permission to see their email
  };
  
  const queryString = new URLSearchParams(options).toString();
  res.redirect(`${rootUrl}?${queryString}`);
});