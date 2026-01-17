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

// Atualizar ONG
const updateOng = (req, res) => {
  const ongs = readDB(FILES.ongs);
  const index = ongs.findIndex(o => o.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'ONG não encontrada' });

  ongs[index] = { ...ongs[index], ...req.body, id: req.params.id };
  writeDB(FILES.ongs, ongs);
  res.json(ongs[index]);
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
  updateOng,
  addJovemToOng
};
