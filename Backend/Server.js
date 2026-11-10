const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const userRoutes = require('./Routes/UserRoutes');
const ImageRoutes = require('./Routes/ImageSendRoute');
const ChatRoutes = require('./Routes/ChatRoutes');
const connectDB = require('./Config/DbConnect');

const app = express();
const PORT = process.env.APP_PORT || 1000;
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = new Set([
  'http://localhost:5173',
  process.env.FRONTEND_URL?.trim().replace(/\/+$/, ''),
].filter(Boolean));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS.'));
  },
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Private-Chat-Token'],
  credentials: true,
}));
if (isProduction) app.set('trust proxy', 1);
app.use(session({
  secret: process.env.CLIENT_SECRET || 'apple',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  },
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/api', userRoutes);
app.use('/api', ImageRoutes);
app.use('/api/chat', ChatRoutes);

app.use('/server', (req, res) => {
  res.json('hello from server');
});

const startServer = async () => {
  if (!process.env.ACCESS_SECRET || !process.env.REFRESH_SECRET || !process.env.CLIENT_SECRET) {
    throw new Error("Set ACCESS_SECRET, REFRESH_SECRET, and CLIENT_SECRET in the backend environment before starting the API.");
  }
  if (isProduction && !process.env.FRONTEND_URL?.trim()) {
    throw new Error("Set FRONTEND_URL to your deployed frontend origin in the production backend environment.");
  }
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server started at ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error(`Backend startup failed: ${error.message}`);
  process.exitCode = 1;
});
