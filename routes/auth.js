const express = require('express');
const router = express.Router();
const { register, login, getUserProfile, updateUserProfile, changePassword } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/user/:id', authenticateToken, getUserProfile);
router.put('/user/:id', authenticateToken, updateUserProfile);
router.post('/user/:id/change-password', authenticateToken, changePassword);

module.exports = router;
