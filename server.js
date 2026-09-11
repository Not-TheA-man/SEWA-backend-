const express = require('express');
const cors = require('cors');
const { pool, initializeDatabase } = require('./db');
const authRoutes = require('./routes/auth');

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('SEWA DTU Backend is running!');
});

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');

    res.json({
      status: 'OK',
      message: 'SEWA DTU backend and database are connected!',
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: 'ERROR',
      message: 'Database connection failed',
    });
  }
});

app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`SEWA DTU backend running on http://0.0.0.0:${PORT}`);
  try {
    await initializeDatabase();
  } catch (err) {
    console.warn('Could not initialize database automatically on startup (DB may not be reachable):', err.message);
  }
});
