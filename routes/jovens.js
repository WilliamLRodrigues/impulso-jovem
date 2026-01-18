const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { createJovem, getAllJovens, getJovemById, updateJovem, deleteJovem, resetJovemPassword } = require('../controllers/jovemController');

router.post('/', authenticateToken, createJovem);
router.get('/', authenticateToken, getAllJovens);
router.post('/:id/reset-password', authenticateToken, resetJovemPassword);
router.get('/:id', authenticateToken, getJovemById);
router.put('/:id', authenticateToken, updateJovem);
router.delete('/:id', authenticateToken, deleteJovem);

module.exports = router;
