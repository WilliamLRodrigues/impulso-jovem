const { readDB, writeDB, FILES } = require('../config/database');
const { SERVICE_STATUS } = require('../config/constants');

// Criar serviço
const createService = (req, res) => {
  const services = readDB(FILES.services);
  const newService = {
    id: Date.now().toString(),
    ...req.body,
    createdAt: new Date().toISOString(),
    status: SERVICE_STATUS.AVAILABLE
  };
  services.push(newService);
  writeDB(FILES.services, services);
  res.json(newService);
};

// Listar serviços
const getAllServices = (req, res) => {
  const services = readDB(FILES.services);
  const { status, clientId, jovemId, category } = req.query;

  let filtered = services;
  if (status) filtered = filtered.filter(s => s.status === status);
  if (clientId) filtered = filtered.filter(s => s.clientId === clientId);
  if (jovemId) filtered = filtered.filter(s => s.jovemId === jovemId);
  if (category) filtered = filtered.filter(s => s.category === category);

  res.json(filtered);
};

// Obter serviço específico
const getServiceById = (req, res) => {
  const services = readDB(FILES.services);
  const service = services.find(s => s.id === req.params.id);
  if (!service) return res.status(404).json({ error: 'Serviço não encontrado' });
  res.json(service);
};

// Atualizar serviço
const updateService = (req, res) => {
  const services = readDB(FILES.services);
  const index = services.findIndex(s => s.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Serviço não encontrado' });

  services[index] = { ...services[index], ...req.body, id: req.params.id };
  writeDB(FILES.services, services);
  res.json(services[index]);
};

// Aceitar serviço (Jovem)
const acceptService = (req, res) => {
  const services = readDB(FILES.services);
  const { jovemId } = req.body;
  const index = services.findIndex(s => s.id === req.params.id);
  
  if (index === -1) return res.status(404).json({ error: 'Serviço não encontrado' });
  
  services[index].jovemId = jovemId;
  services[index].status = SERVICE_STATUS.ASSIGNED;
  services[index].acceptedAt = new Date().toISOString();
  
  writeDB(FILES.services, services);
  res.json(services[index]);
};

// Deletar serviço
const deleteService = (req, res) => {
  const services = readDB(FILES.services);
  const index = services.findIndex(s => s.id === req.params.id);
  
  if (index === -1) return res.status(404).json({ error: 'Serviço não encontrado' });
  
  services.splice(index, 1);
  writeDB(FILES.services, services);
  res.json({ message: 'Serviço excluído com sucesso' });
};

module.exports = {
  createService,
  getAllServices,
  getServiceById,
  updateService,
  acceptService,
  deleteService
};
