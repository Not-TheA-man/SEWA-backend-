const express = require('express');
const cors = require('cors');
const { pool } = require('./db');
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

const PORT = 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SEWA DTU backend running on http://0.0.0.0:${PORT}`);
});
