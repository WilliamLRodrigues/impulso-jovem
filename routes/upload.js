const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { authenticateToken } = require('../middleware/auth');

// Upload de documentos
router.post('/document', authenticateToken, upload.single('document'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
  }
  
  res.json({
    message: 'Arquivo enviado com sucesso',
    filename: req.file.filename,
    path: `/uploads/${req.file.filename}`,
    size: req.file.size
  });
});

// Upload de múltiplos documentos
router.post('/documents', authenticateToken, upload.array('documents', 5), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
  }
  
  const files = req.files.map(file => ({
    filename: file.filename,
    path: `/uploads/${file.filename}`,
    size: file.size
  }));
  
  res.json({
    message: 'Arquivos enviados com sucesso',
    files: files
  });
});

// Upload de foto do jovem
router.post('/photo', authenticateToken, upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhuma foto foi enviada' });
  }
  
  res.json({
    message: 'Foto enviada com sucesso',
    filename: req.file.filename,
    path: `/uploads/${req.file.filename}`,
    size: req.file.size
  });
});

// Upload de fotos do serviço (cliente)
router.post('/service-photos', authenticateToken, upload.array('photos', 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Nenhuma foto foi enviada' });
  }
  
  const photos = req.files.map(file => ({
    filename: file.filename,
    url: `/uploads/${file.filename}`,
    size: file.size
  }));
  
  res.json({
    message: 'Fotos enviadas com sucesso',
    photos: photos
  });
});

module.exports = router;
