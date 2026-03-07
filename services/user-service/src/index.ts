// Separating the runtime 'express' from the 'type' definitions
import express, { type Request, type Response, type Application } from 'express';
import cors, { type CorsOptions } from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

import prisma from './prisma.js';


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
app.get('/user/hello', (req: Request, res: Response) => {
  res.send('TypeScript Backend is running! 🚀');
});

// 1. Initial trigger: Redirects user to GitHub
app.get('/user/auth/github', (req, res) => {
  const rootUrl = 'https://github.com/login/oauth/authorize';
  const options = {
    client_id: process.env.GITHUB_CLIENT_ID!,
    // IMPORTANT: This must match what is registered in GitHub Developer Settings
    redirect_uri: 'http://localhost/user/user/login',
    scope: 'user:email',
  };

  const queryString = new URLSearchParams(options).toString();
  res.redirect(`${rootUrl}?${queryString}`);
});

app.get('/user/user/login', async (req, res) => {
  const { code } = req.query;

  try {
    // 1. Exchange code for Access Token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code
      })
    });

    const { access_token } = await tokenResponse.json();

    // 2. Get General Profile (contains 'name')
    const userResponse = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    const userData = await userResponse.json();

    // 3. Get Emails (needed if their email is private)
    const emailResponse = await fetch('https://api.github.com/user/emails', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    const emails = await emailResponse.json();

    // Find the primary, verified email
    const primaryEmail = emails.find((e: { primary: any; verified: any; }) => e.primary && e.verified)?.email || emails[0]?.email;

    // The data you wanted:
    const name = userData.name || userData.login; // Fallback to username if name is blank
    const email = primaryEmail;

    const user = await prisma.user.upsert({
      where: {
        email: email,
      },
      update: {
        // If they already exist, update their email/name in case they changed it on GitHub
        email: email,
        name: name,
        updatedAt: new Date(),
      },
      create: {
        // If they don't exist, Prisma creates a new record and generates a new UUID 'id'
        email: email,
        name: name,
        authProvider: 'github',
        providerId: userData.id.toString(), // Store GitHub's unique user ID for reference
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const accessToken = jwt.sign({ userId: user.id, role: 'user' }, process.env.ACCESS_TOKEN_SECRET as string, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: user.id, role: 'user' }, process.env.REFRESH_TOKEN_SECRET as string, { expiresIn: '7d' });

    const token = await prisma.user_refresh_token.create({
      data: {
        userId: user.id,
        token_hash: refreshToken, // Remember to hash this first!
        expire_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days expiry
      }
    });

    console.log(`Authenticated: Userid:${user.id} Name:${user.name} Email:${user.email}`);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,    // Prevents JavaScript from accessing the cookie (No XSS)
      sameSite: 'lax', // Prevents the cookie from being sent in cross-site requests (No CSRF)
      maxAge: 15 * 60 * 1000 // 15 minutes in milliseconds
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
    });

    // Redirect back to frontend with the info
    res.redirect(`http://localhost/dashboard?userId=${user.id}`);

  } catch (err) {
    res.status(500).json({ error: `Failed to retrieve user data + ${JSON.stringify(err)}` });
  }
});