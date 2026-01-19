const { readDB, writeDB, FILES } = require('../config/database');
const { SERVICE_STATUS } = require('../config/constants');

// Função para calcular preço com margem de lucro
const calculatePriceWithMargin = (basePrice) => {
  try {
    const settings = readDB(FILES.settings);
    const adminSettings = settings.find(s => s.id === 'admin-settings') || { profitMargin: 0 };
    const profitMargin = adminSettings.profitMargin || 0;
    
    const finalPrice = basePrice + (basePrice * profitMargin / 100);
    return Math.round(finalPrice * 100) / 100;
  } catch (error) {
    console.error('Erro ao calcular margem:', error);
    return basePrice;
  }
};

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

  // Adicionar preço com margem para clientes
  const servicesWithMargin = filtered.map(service => ({
    ...service,
    basePrice: service.price,
    price: calculatePriceWithMargin(service.price)
  }));

  res.json(servicesWithMargin);
};

// Obter serviço específico
const getServiceById = (req, res) => {
  const services = readDB(FILES.services);
  const service = services.find(s => s.id === req.params.id);
  if (!service) return res.status(404).json({ error: 'Serviço não encontrado' });
  
  // Adicionar preço com margem
  const serviceWithMargin = {
    ...service,
    basePrice: service.price,
    price: calculatePriceWithMargin(service.price)
  };
  
  res.json(serviceWithMargin);
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
