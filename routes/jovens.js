const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { createJovem, getAllJovens, getJovemById, updateJovem, deleteJovem, resetJovemPassword } = require('../controllers/jovemController');

router.post('/', authenticateToken, createJovem);
router.get('/', authenticateToken, getAllJovens);
router.post('/:id/reset-password', authenticateToken, resetJovemPassword);
router.post('/:id/add-skill', authenticateToken, (req, res) => {
  const { readDB, writeDB, FILES } = require('../config/database');
  const jovens = readDB(FILES.jovens);
  const { category } = req.body;
  
  const index = jovens.findIndex(j => j.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Jovem não encontrado' });
  }
  
  // Adicionar categoria se não existir
  if (!jovens[index].skills) jovens[index].skills = [];
  if (!jovens[index].skills.includes(category)) {
    jovens[index].skills.push(category);
  }
  
  writeDB(FILES.jovens, jovens);
  res.json(jovens[index]);
});

// Migrar skills antigas (IDs) para categorias
router.post('/:id/migrate-skills', authenticateToken, (req, res) => {
  const { readDB, writeDB, FILES } = require('../config/database');
  const jovens = readDB(FILES.jovens);
  const services = readDB(FILES.services);
  
  const index = jovens.findIndex(j => j.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Jovem não encontrado' });
  }
  
  const jovem = jovens[index];
  if (!jovem.skills || jovem.skills.length === 0) {
    return res.json({ message: 'Nenhuma skill para migrar', jovem });
  }
  
  // Converter IDs antigos para categorias
  const newSkills = [];
  jovem.skills.forEach(skill => {
    // Se for um ID antigo (serviceXXX), converter para categoria
    if (skill.startsWith('service')) {
      const service = services.find(s => s.id === skill);
      if (service && service.category && !newSkills.includes(service.category)) {
        newSkills.push(service.category);
      }
    } else {
      // Se já for uma categoria, manter
      if (!newSkills.includes(skill)) {
        newSkills.push(skill);
      }
    }
  });
  
  jovens[index].skills = newSkills;
  writeDB(FILES.jovens, jovens);
  
  res.json({ message: 'Skills migradas com sucesso', jovem: jovens[index] });
});
router.get('/:id', authenticateToken, getJovemById);
router.put('/:id', authenticateToken, updateJovem);
router.delete('/:id', authenticateToken, deleteJovem);

module.exports = router;
