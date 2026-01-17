const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getAllOngs, getOngById, updateOng, addJovemToOng } = require('../controllers/ongController');

router.get('/', authenticateToken, getAllOngs);
router.get('/:id', authenticateToken, getOngById);
router.put('/:id', authenticateToken, updateOng);
router.post('/:id/jovens', authenticateToken, addJovemToOng);

module.exports = router;
