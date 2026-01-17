const { readDB, FILES } = require('../config/database');

// Dashboard stats
const getStats = (req, res) => {
  const users = readDB(FILES.users);
  const ongs = readDB(FILES.ongs);
  const jovens = readDB(FILES.jovens);
  const services = readDB(FILES.services);
  const bookings = readDB(FILES.bookings);

  res.json({
    totalUsers: users.length,
    totalOngs: ongs.length,
    totalJovens: jovens.length,
    totalClients: users.filter(u => u.userType === 'cliente').length,
    totalServices: services.length,
    completedServices: services.filter(s => s.status === 'completed').length,
    activeBookings: bookings.filter(b => b.status === 'in_progress').length,
    availableJovens: jovens.filter(j => j.availability).length
  });
};

// Listar todos os usuários
const getAllUsers = (req, res) => {
  const users = readDB(FILES.users);
  res.json(users.map(u => ({ ...u, password: undefined })));
};

module.exports = {
  getStats,
  getAllUsers
};
