const { readDB, writeDB, FILES } = require('../config/database');

// Listar ONGs
const getAllOngs = (req, res) => {
  const ongs = readDB(FILES.ongs);
  res.json(ongs);
};

// Obter ONG específica
const getOngById = (req, res) => {
  const ongs = readDB(FILES.ongs);
  const ong = ongs.find(o => o.id === req.params.id);
  if (!ong) return res.status(404).json({ error: 'ONG não encontrada' });
  res.json(ong);
};

// Criar ONG
const createOng = (req, res) => {
  try {
    const { name, address, phone, email } = req.body;
    const ongs = readDB(FILES.ongs);

    const newOng = {
      id: Date.now().toString(),
      name,
      address,
      phone,
      email,
      services: [],
      jovens: [],
      stats: { totalServices: 0, activeJovens: 0, rating: 0 },
      createdAt: new Date().toISOString()
    };

    ongs.push(newOng);
    writeDB(FILES.ongs, ongs);
    res.json(newOng);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Atualizar ONG
const updateOng = (req, res) => {
  const ongs = readDB(FILES.ongs);
  const index = ongs.findIndex(o => o.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'ONG não encontrada' });

  ongs[index] = { ...ongs[index], ...req.body, id: req.params.id };
  writeDB(FILES.ongs, ongs);
  res.json(ongs[index]);
};

// Deletar ONG
const deleteOng = (req, res) => {
  try {
    const ongs = readDB(FILES.ongs);
    const jovens = readDB(FILES.jovens);
    const index = ongs.findIndex(o => o.id === req.params.id);
    
    if (index === -1) return res.status(404).json({ error: 'ONG não encontrada' });

    // Desvincular jovens da ONG
    const updatedJovens = jovens.map(j => 
      j.ongId === req.params.id ? { ...j, ongId: null } : j
    );
    writeDB(FILES.jovens, updatedJovens);

    // Remover ONG
    ongs.splice(index, 1);
    writeDB(FILES.ongs, ongs);
    
    res.json({ message: 'ONG deletada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Vincular jovem à ONG
const addJovemToOng = (req, res) => {
  const { jovemId } = req.body;
  const ongs = readDB(FILES.ongs);
  const jovens = readDB(FILES.jovens);

  const ong = ongs.find(o => o.id === req.params.id);
  const jovem = jovens.find(j => j.id === jovemId);

  if (!ong || !jovem) return res.status(404).json({ error: 'ONG ou Jovem não encontrado' });

  if (!ong.jovens.includes(jovemId)) {
    ong.jovens.push(jovemId);
    writeDB(FILES.ongs, ongs);
  }

  jovem.ongId = req.params.id;
  writeDB(FILES.jovens, jovens);

  res.json({ message: 'Jovem vinculado com sucesso', ong, jovem });
};

module.exports = {
  getAllOngs,
  getOngById,
  createOng,
  updateOng,
  deleteOng,
  addJovemToOng
};
