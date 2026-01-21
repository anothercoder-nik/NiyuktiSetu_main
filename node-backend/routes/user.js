const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../config/database');

// GET /profile - Get user profile (protected route)
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT id, name, email, verified FROM users WHERE email = ?',
            [req.user.email]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(users[0]);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ message: 'Failed to fetch profile', error: error.message });
    }
});

// PUT /profile - Update user profile (protected route)
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Name is required' });
        }

        await db.query('UPDATE users SET name = ? WHERE email = ?', [name, req.user.email]);

        res.status(200).json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Failed to update profile', error: error.message });
    }
});

module.exports = router;
