require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Initialize express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(compression());
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Import routes
console.log('Loading routes...');
const routes = require('./routes');
console.log('Routes loaded:', routes);

// Use routes
app.use('/api', routes);
console.log('Routes mounted at /api');

// Basic route
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'DagangCerdas API is running!',
    timestamp: new Date().toISOString()
  });
});

// Placeholder notification endpoint
// TODO: sambungkan ke tabel notifications di PostgreSQL
app.get('/api/notifications', (req, res) => {
  const { userId } = req.query;

  const now = new Date().toISOString();

  const notifications = [
    {
      id: 1,
      title: 'Selamat datang di DagangCerdas',
      message: 'Notifikasi ini masih dummy, nanti akan diambil dari database.',
      created_at: now,
      user_id: userId || null
    }
  ];

  res.json(notifications);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!'
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app; // For testing