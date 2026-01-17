const { readDB, writeDB, FILES } = require('../config/database');
const { BOOKING_STATUS } = require('../config/constants');

// Criar agendamento (solicitação de serviço por cliente)
const createBooking = (req, res) => {
  const bookings = readDB(FILES.bookings);
  const services = readDB(FILES.services);
  const jovens = readDB(FILES.jovens);
  
  // Buscar o serviço solicitado
  const service = services.find(s => s.id === req.body.serviceId);
  if (!service) {
    return res.status(404).json({ error: 'Serviço não encontrado' });
  }
  
  // Encontrar jovens com a skill necessária para este serviço
  const recommendedJovens = jovens.filter(j => 
    j.availability && 
    j.skills && 
    j.skills.includes(service.category)
  ).sort((a, b) => (b.stats?.rating || 0) - (a.stats?.rating || 0)); // Ordenar por rating
  
  const newBooking = {
    id: Date.now().toString(),
    ...req.body,
    serviceCategory: service.category,
    recommendedJovens: recommendedJovens.map(j => ({
      id: j.id,
      name: j.name,
      rating: j.stats?.rating || 0,
      completedServices: j.stats?.completedServices || 0,
      ongId: j.ongId
    })),
    createdAt: new Date().toISOString(),
    status: BOOKING_STATUS.PENDING
  };
  
  bookings.push(newBooking);
  writeDB(FILES.bookings, bookings);
  res.json(newBooking);
};

// Listar agendamentos
const getAllBookings = (req, res) => {
  const bookings = readDB(FILES.bookings);
  const { clientId, jovemId, status } = req.query;

  let filtered = bookings;
  if (clientId) filtered = filtered.filter(b => b.clientId === clientId);
  if (jovemId) filtered = filtered.filter(b => b.jovemId === jovemId);
  if (status) filtered = filtered.filter(b => b.status === status);

  res.json(filtered);
};

// Obter agendamento específico
const getBookingById = (req, res) => {
  const bookings = readDB(FILES.bookings);
  const booking = bookings.find(b => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: 'Agendamento não encontrado' });
  res.json(booking);
};

// Atualizar agendamento
const updateBooking = (req, res) => {
  const bookings = readDB(FILES.bookings);
  const index = bookings.findIndex(b => b.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Agendamento não encontrado' });

  bookings[index] = { ...bookings[index], ...req.body, id: req.params.id };
  writeDB(FILES.bookings, bookings);
  res.json(bookings[index]);
};

// Aceitar agendamento (ONG ou Jovem)
const acceptBooking = (req, res) => {
  const bookings = readDB(FILES.bookings);
  const { jovemId, acceptedBy } = req.body; // acceptedBy pode ser 'ong' ou 'jovem'
  const index = bookings.findIndex(b => b.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Agendamento não encontrado' });
  }
  
  bookings[index].jovemId = jovemId;
  bookings[index].status = BOOKING_STATUS.CONFIRMED;
  bookings[index].acceptedBy = acceptedBy;
  bookings[index].acceptedAt = new Date().toISOString();
  
  writeDB(FILES.bookings, bookings);
  res.json(bookings[index]);
};

// Listar bookings pendentes para ONG
const getPendingBookingsForOng = (req, res) => {
  const bookings = readDB(FILES.bookings);
  const jovens = readDB(FILES.jovens);
  const { ongId } = req.params;
  
  // Buscar jovens da ONG
  const ongJovens = jovens.filter(j => j.ongId === ongId);
  const ongJovensIds = ongJovens.map(j => j.id);
  
  // Buscar bookings pendentes que têm jovens da ONG recomendados
  const pendingBookings = bookings.filter(b => 
    b.status === BOOKING_STATUS.PENDING &&
    b.recommendedJovens &&
    b.recommendedJovens.some(rj => ongJovensIds.includes(rj.id))
  );
  
  res.json(pendingBookings);
};

// Listar bookings pendentes para Jovem
const getPendingBookingsForJovem = (req, res) => {
  const bookings = readDB(FILES.bookings);
  const { jovemId } = req.params;
  
  // Buscar bookings pendentes onde o jovem está recomendado
  const pendingBookings = bookings.filter(b => 
    b.status === BOOKING_STATUS.PENDING &&
    b.recommendedJovens &&
    b.recommendedJovens.some(rj => rj.id === jovemId)
  );
  
  res.json(pendingBookings);
};

module.exports = {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBooking,
  acceptBooking,
  getPendingBookingsForOng,
  getPendingBookingsForJovem
};
