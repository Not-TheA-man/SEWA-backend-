const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const { pool } = require('../db');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
        INSERT INTO users (first_name, last_name, phone, email, password, auth_provider)
        VALUES ($1, $2, $3, $4, $5, 'local')
        RETURNING id, first_name, last_name, phone, email, google_id, avatar_url, auth_provider, created_at
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
        SELECT id, first_name, last_name, phone, email, google_id, avatar_url, auth_provider, created_at
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

/**
 * Google Sign-In Endpoint
 * Accepts: { credential } or { id_token } or { token }
 * (Sent by Google Identity Services / One Tap / Sign in with Google buttons)
 */
router.post('/google', async (req, res) => {
  try {
    const token = req.body.credential || req.body.id_token || req.body.token;

    if (!token) {
      return res.status(400).json({
        message: 'Google token (credential or id_token) is required.',
      });
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID || undefined,
      });
      payload = ticket.getPayload();
    } catch (verifyError) {
      console.error('Google token verification failed:', verifyError.message);
      return res.status(401).json({
        message: 'Invalid Google token.',
        error: verifyError.message,
      });
    }

    if (!payload || !payload.email) {
      return res.status(400).json({
        message: 'Unable to retrieve user information from Google token.',
      });
    }

    const googleId = payload.sub;
    const email = String(payload.email).trim().toLowerCase();
    const firstName = payload.given_name || payload.name?.split(' ')[0] || 'GoogleUser';
    const lastName = payload.family_name || payload.name?.split(' ').slice(1).join(' ') || '';
    const avatarUrl = payload.picture || null;

    // Check if user exists by google_id or email
    const existingUser = await pool.query(
      `
        SELECT id, first_name, last_name, phone, email, google_id, avatar_url, auth_provider, created_at
        FROM users
        WHERE google_id = $1 OR email = $2
      `,
      [googleId, email]
    );

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];

      // If user signed up via email previously, link their Google account
      if (!user.google_id || !user.avatar_url) {
        const updatedUser = await pool.query(
          `
            UPDATE users
            SET google_id = COALESCE(google_id, $1),
                avatar_url = COALESCE(avatar_url, $2)
            WHERE id = $3
            RETURNING id, first_name, last_name, phone, email, google_id, avatar_url, auth_provider, created_at
          `,
          [googleId, avatarUrl, user.id]
        );
        return res.status(200).json({
          message: 'Google login successful (account linked).',
          user: updatedUser.rows[0],
        });
      }

      return res.status(200).json({
        message: 'Google login successful.',
        user: user,
      });
    }

    // Create new user for Google Sign-In
    const newUser = await pool.query(
      `
        INSERT INTO users (first_name, last_name, email, google_id, avatar_url, auth_provider)
        VALUES ($1, $2, $3, $4, $5, 'google')
        RETURNING id, first_name, last_name, phone, email, google_id, avatar_url, auth_provider, created_at
      `,
      [firstName, lastName, email, googleId, avatarUrl]
    );

    return res.status(201).json({
      message: 'Google sign-in successful (new user created).',
      user: newUser.rows[0],
    });
  } catch (error) {
    console.error('Google Auth error:', error);
    return res.status(500).json({
      message: 'Server error during Google authentication.',
    });
  }
});

module.exports = router;
