import express from 'express';
import session from 'express-session';
import cors from 'cors';
import authRouter from './routes/auth';
import { sessionConfig, rpConfig } from './config';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(express.json());

// CORS configuration - allow frontend origin with credentials
app.use(cors({
  origin: rpConfig.origin,
  credentials: true,
}));

// Session middleware
app.use(session(sessionConfig));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', rpID: rpConfig.rpID });
});

// Auth routes
app.use('/api/auth', authRouter);

// Start server
app.listen(PORT, () => {
  console.log(`🔐 Passkey Demo Backend running on http://localhost:${PORT}`);
  console.log(`📍 RP ID: ${rpConfig.rpID}`);
  console.log(`🌐 Origin: ${rpConfig.origin}`);
});

