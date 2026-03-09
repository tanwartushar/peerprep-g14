import express from 'express';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import axios from 'axios';
import { createProxyMiddleware } from 'http-proxy-middleware';

dotenv.config();

const app = express();
app.use(cookieParser());

const ACCESS_SECRET = process.env.ACCESS_SECRET_TOKEN!;
const PORT = process.env.PORT || 3000;

// Middleware to verify JWT
const verifyGateway = async (req: any, res: any, next: any) => {
  const accessToken = req.cookies.accessToken;
  const refreshToken = req.cookies.refreshToken; // Assuming you stored it in a cookie too

  // 1. If no access token, but we have a refresh token, try to refresh immediately
  if (!accessToken && refreshToken) {
    return await handleRefresh(req, res, next);
  }

  if (!accessToken) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(accessToken, ACCESS_SECRET) as { userId: string };
    req.headers['x-user-id'] = decoded.userId;
    next();
  } catch (err: any) {
    // 2. If token expired, try to refresh
    if (err.name === 'TokenExpiredError' && refreshToken) {
      return await handleRefresh(req, res, next);
    }
    return res.status(401).json({ message: "Invalid token" });
  }
};

const handleRefresh = async (req: any, res: any, next: any) => {
  const refreshToken = req.cookies.refreshToken;

  try {
    // 3. Call your User Service internal refresh endpoint
    // Use the Docker service name 'user-service'
    const response = await axios.post('http://user-service:3001/auth/refresh', {
      refreshToken: refreshToken
    });

    const { newAccessToken, userId } = response.data;

    // 4. Set the new access token in the user's browser
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000 // 15 mins
    });

    // 5. Inject the userId and move to the next middleware/proxy
    req.headers['x-user-id'] = userId;
    next();
  } catch (error) {
    // If refresh token is also invalid/expired, user MUST log in again
    return res.status(401).json({ message: "Session expired, please login again" });
  }
};

// PROXY LOGIC
// If the path starts with /api/users, send to user-service
app.use('/users', verifyGateway, createProxyMiddleware({
  target: 'http://user-service:3001',
  changeOrigin: true,
  pathRewrite: { '^/api/users': '' }, // Clean path for the target service
}));


app.listen(PORT, () => console.log(`Auth Service running on port ${PORT}`));