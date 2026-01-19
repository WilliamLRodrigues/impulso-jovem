const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { 
  getStats, 
  getAllUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser,
  exportReport,
  getProfitMargin,
  updateProfitMargin,
  getProfitReport
} = require('../controllers/adminController');

router.get('/stats', authenticateToken, requireAdmin, getStats);
router.get('/users', authenticateToken, requireAdmin, getAllUsers);
router.get('/users/:id', authenticateToken, requireAdmin, getUserById);
router.post('/users', authenticateToken, requireAdmin, createUser);
router.put('/users/:id', authenticateToken, requireAdmin, updateUser);
router.delete('/users/:id', authenticateToken, requireAdmin, deleteUser);
router.get('/export', authenticateToken, requireAdmin, exportReport);
router.get('/profit-margin', authenticateToken, requireAdmin, getProfitMargin);
router.put('/profit-margin', authenticateToken, requireAdmin, updateProfitMargin);
router.get('/profit-report', authenticateToken, requireAdmin, getProfitReport);

module.exports = router;
