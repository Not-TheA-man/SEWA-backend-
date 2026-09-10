const express = require('express');
const { pool } = require('../db');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { first_name, last_name, phone, email, password } = req.body;

    if (!first_name || !last_name || !phone || !email || !password) {
      return res.status(400).json({
        message: 'First name, last name, phone, email, and password are required.',
      });
    }

    const cleanFirstName = String(first_name).trim();
    const cleanLastName = String(last_name).trim();
    const cleanPhone = String(phone).trim();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    if (!cleanFirstName || !cleanLastName || !cleanPhone || !cleanEmail || !cleanPassword) {
      return res.status(400).json({
        message: 'Fields cannot be empty.',
      });
    }

    const result = await pool.query(
      `
        INSERT INTO users (first_name, last_name, phone, email, password)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, first_name, last_name, phone, email, created_at
      `,
      [cleanFirstName, cleanLastName, cleanPhone, cleanEmail, cleanPassword]
    );

    return res.status(201).json({
      message: 'User registered successfully.',
      user: result.rows[0],
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        message: 'This phone number or email is already registered.',
      });
    }

    console.error('Register error:', error);
    return res.status(500).json({
      message: 'Server error while registering user.',
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required.',
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    const result = await pool.query(
      `
        SELECT id, first_name, last_name, phone, email, created_at
        FROM users
        WHERE email = $1 AND password = $2
      `,
      [cleanEmail, cleanPassword]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Invalid email or password.',
      });
    }

    return res.status(200).json({
      message: 'User found.',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      message: 'Server error while logging in.',
    });
  }
});

module.exports = router;
