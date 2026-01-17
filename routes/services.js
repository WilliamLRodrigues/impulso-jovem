const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { 
  createService, 
  getAllServices, 
  getServiceById, 
  updateService, 
  acceptService,
  deleteService
} = require('../controllers/serviceController');

router.post('/', authenticateToken, createService);
router.get('/', authenticateToken, getAllServices);
router.get('/:id', authenticateToken, getServiceById);
router.put('/:id', authenticateToken, updateService);
router.delete('/:id', authenticateToken, deleteService);
router.post('/:id/accept', authenticateToken, acceptService);

module.exports = router;
