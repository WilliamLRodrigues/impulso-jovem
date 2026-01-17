const { readDB, writeDB, FILES } = require('../config/database');

// Criar jovem
const createJovem = (req, res) => {
  const jovens = readDB(FILES.jovens);
  const newJovem = {
    id: Date.now().toString(),
    ...req.body,
    createdAt: new Date().toISOString(),
    stats: {
      completedServices: 0,
      rating: 0,
      points: 0
    },
    availability: true
  };
  jovens.push(newJovem);
  writeDB(FILES.jovens, jovens);
  res.json(newJovem);
};

// Listar jovens
const getAllJovens = (req, res) => {
  const jovens = readDB(FILES.jovens);
  const { ongId } = req.query;
  
  if (ongId) {
    return res.json(jovens.filter(j => j.ongId === ongId));
  }
  res.json(jovens);
};

// Obter jovem específico
const getJovemById = (req, res) => {
  const jovens = readDB(FILES.jovens);
  const jovem = jovens.find(j => j.id === req.params.id);
  if (!jovem) return res.status(404).json({ error: 'Jovem não encontrado' });
  res.json(jovem);
};

// Atualizar jovem
const updateJovem = (req, res) => {
  const jovens = readDB(FILES.jovens);
  const index = jovens.findIndex(j => j.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Jovem não encontrado' });

  jovens[index] = { ...jovens[index], ...req.body, id: req.params.id };
  writeDB(FILES.jovens, jovens);
  res.json(jovens[index]);
};

module.exports = {
  createJovem,
  getAllJovens,
  getJovemById,
  updateJovem
};
