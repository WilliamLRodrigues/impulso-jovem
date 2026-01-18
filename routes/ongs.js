const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getAllOngs, getOngById, createOng, updateOng, deleteOng, addJovemToOng } = require('../controllers/ongController');

router.get('/', authenticateToken, getAllOngs);
router.get('/:id', authenticateToken, getOngById);
router.post('/', authenticateToken, createOng);
router.put('/:id', authenticateToken, updateOng);
router.delete('/:id', authenticateToken, deleteOng);
router.post('/:id/jovens', authenticateToken, addJovemToOng);

module.exports = router;
