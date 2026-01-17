const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { createJovem, getAllJovens, getJovemById, updateJovem } = require('../controllers/jovemController');

router.post('/', authenticateToken, createJovem);
router.get('/', authenticateToken, getAllJovens);
router.get('/:id', authenticateToken, getJovemById);
router.put('/:id', authenticateToken, updateJovem);

module.exports = router;
