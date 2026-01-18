const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Debug: Listar arquivos na pasta uploads
router.get('/debug/list', (req, res) => {
  const uploadsPath = path.join(__dirname, '..', 'uploads');
  
  if (!fs.existsSync(uploadsPath)) {
    return res.json({ 
      error: 'Pasta uploads não existe',
      path: uploadsPath 
    });
  }
  
  const files = fs.readdirSync(uploadsPath);
  res.json({ 
    uploadsPath,
    totalFiles: files.length,
    files 
  });
});

// Servir arquivos de upload através da API (oculta caminho real)
router.get('/uploads/:filename', (req, res) => {
  const filename = req.params.filename;
  const fullPath = path.join(__dirname, '..', 'uploads', filename);
  
  console.log('🔍 Requisição de arquivo:', filename);
  console.log('📂 Caminho completo:', fullPath);
  
  // Verificar se arquivo existe
  if (!fs.existsSync(fullPath)) {
    console.log('❌ Arquivo não encontrado:', fullPath);
    return res.status(404).json({ error: 'Arquivo não encontrado' });
  }
  
  console.log('✅ Arquivo encontrado, enviando:', filename);
  // Servir arquivo
  res.sendFile(fullPath);
});

module.exports = router;
