const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { createReview, getAllReviews } = require('../controllers/reviewController');

router.post('/', authenticateToken, createReview);
router.get('/', authenticateToken, getAllReviews);

module.exports = router;
