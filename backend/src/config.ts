export const rpConfig = {
  rpName: 'Passkey Demo',
  rpID: process.env.RP_ID || 'localhost',
  origin: process.env.ORIGIN || 'http://localhost:3000',
  challengeTimeout: 60000, // 60 seconds
};

export const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'passkey-demo-secret-change-in-production',
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
  resave: false,
  saveUninitialized: false,
};

