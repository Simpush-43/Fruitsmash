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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: true, credentials: true }));
app.use(session({
  secret: process.env.CLIENT_SECRET || 'apple',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, sameSite: 'lax' },
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
  if (!process.env.ACCESS_SECRET || !process.env.REFRESH_SECRET) {
    throw new Error("Set ACCESS_SECRET and REFRESH_SECRET in Backend/.env before starting the API.");
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
