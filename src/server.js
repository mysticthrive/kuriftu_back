const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());

// CORS configuration to handle multiple origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://173.208.180.160:3000',
  process.env.FRONTEND_URL
].filter(Boolean); // Remove any undefined values

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

console.log('🚫 Rate limiting disabled');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/health', require('./routes/health'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/room-groups', require('./routes/roomGroups'));
app.use('/api/room-types', require('./routes/roomTypes'));
app.use('/api/room-group-room-types', require('./routes/roomGroupRoomTypes'));
app.use('/api/room-type-images', require('./routes/roomTypeImages'));
app.use('/api/room-pricing', require('./routes/roomPricing'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/guests', require('./routes/guests'));
app.use('/api/reservations', require('./routes/reservations'));
app.use('/api/menu-permissions', require('./routes/menuPermissions'));
app.use('/api/gift-cards', require('./routes/giftCards'));
app.use('/api/promo-codes', require('./routes/promoCodes'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
