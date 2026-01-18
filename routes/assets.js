const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Servir arquivos de upload através da API (oculta caminho real)
router.get('/uploads/:filename', (req, res) => {
  const filename = req.params.filename;
  const fullPath = path.join(__dirname, '..', 'uploads', filename);
  
  // Verificar se arquivo existe
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'Arquivo não encontrado' });
  }
  
  // Servir arquivo
  res.sendFile(fullPath);
});

module.exports = router;
