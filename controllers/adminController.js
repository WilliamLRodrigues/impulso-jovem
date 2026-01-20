const { readDB, writeDB, FILES } = require('../config/database');
const bcrypt = require('bcryptjs');

const mergeUserProfile = (user, ongs, jovens) => {
  if (user.userType === 'ong') {
    const profile = ongs.find(o => o.userId === user.id || o.id === user.id);
    return {
      ...user,
      ...profile,
      id: user.id,
      userId: user.id,
      name: profile?.name ?? user.name,
      email: profile?.email ?? user.email,
      phone: profile?.phone ?? user.phone,
      address: profile?.address ?? user.address,
      city: profile?.city ?? user.city,
      state: profile?.state ?? user.state,
      country: profile?.country ?? user.country,
      complement: profile?.complement ?? user.complement,
      cep: profile?.cep ?? user.cep,
      cnpj: profile?.cnpj ?? user.cnpj
    };
  }

  if (user.userType === 'jovem') {
    const profile = jovens.find(j => j.userId === user.id || j.id === user.id);
    return {
      ...user,
      ...profile,
      id: user.id,
      userId: user.id,
      name: profile?.name ?? user.name,
      email: profile?.email ?? user.email,
      phone: profile?.phone ?? user.phone,
      address: profile?.address ?? user.address,
      city: profile?.city ?? user.city,
      state: profile?.state ?? user.state,
      country: profile?.country ?? user.country,
      description: profile?.description ?? user.description
    };
  }

  return user;
};

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
  const ongs = readDB(FILES.ongs);
  const jovens = readDB(FILES.jovens);
  res.json(users.map(u => {
    const merged = mergeUserProfile(u, ongs, jovens);
    return { ...merged, password: undefined };
  }));
};

// Obter usuário específico
const getUserById = (req, res) => {
  const users = readDB(FILES.users);
  const ongs = readDB(FILES.ongs);
  const jovens = readDB(FILES.jovens);
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  
  const merged = mergeUserProfile(user, ongs, jovens);
  const { password, ...userData } = merged;
  res.json(userData);
};

// Criar novo usuário
const createUser = async (req, res) => {
  try {
    const {
      email,
      password,
      name,
      userType,
      phone,
      address,
      city,
      state,
      country,
      complement,
      cep,
      cnpj,
      description
    } = req.body;
    const users = readDB(FILES.users);

    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now().toString(),
      email,
      password: hashedPassword,
      name,
      userType,
      phone,
      address,
      city,
      state,
      country,
      complement,
      cep,
      cnpj,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    writeDB(FILES.users, users);

    // Criar perfil específico baseado no tipo
    if (userType === 'ong') {
      const ongs = readDB(FILES.ongs);
      ongs.push({
        id: newUser.id,
        userId: newUser.id,
        name,
        email,
        address,
        phone,
        city,
        state,
        country,
        complement,
        cep,
        cnpj,
        services: [],
        jovens: [],
        stats: { totalServices: 0, activeJovens: 0, rating: 0 }
      });
      writeDB(FILES.ongs, ongs);
    } else if (userType === 'jovem') {
      const jovens = readDB(FILES.jovens);
      jovens.push({
        id: newUser.id,
        userId: newUser.id,
        name,
        email,
        phone,
        address,
        city,
        state,
        country,
        birthDate: req.body.birthDate || '',
        cpf: req.body.cpf || '',
        rg: req.body.rg || '',
        description: description || '',
        ongId: null,
        skills: [],
        availability: true,
        trainingCompletion: {},
        stats: { completedServices: 0, rating: 0, points: 0 },
        location: null
      });
      writeDB(FILES.jovens, jovens);
    }

    const { password: _, ...userResponse } = newUser;
    res.json(userResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Atualizar usuário
const updateUser = async (req, res) => {
  try {
    const users = readDB(FILES.users);
    const index = users.findIndex(u => u.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Usuário não encontrado' });

    const { password, ...updateData } = req.body;
    
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    users[index] = { ...users[index], ...updateData, id: req.params.id };
    writeDB(FILES.users, users);

    // Atualizar perfis relacionados
    const user = users[index];
    if (user.userType === 'ong') {
      const ongs = readDB(FILES.ongs);
      const ongIndex = ongs.findIndex(o => o.userId === user.id);
      if (ongIndex !== -1) {
        ongs[ongIndex] = {
          ...ongs[ongIndex],
          name: user.name,
          email: user.email,
          phone: user.phone,
          address: user.address,
          city: user.city,
          state: user.state,
          country: user.country,
          complement: user.complement,
          cep: user.cep,
          cnpj: user.cnpj
        };
        writeDB(FILES.ongs, ongs);
      }
    } else if (user.userType === 'jovem') {
      const jovens = readDB(FILES.jovens);
      const jovemIndex = jovens.findIndex(j => j.userId === user.id);
      if (jovemIndex !== -1) {
        jovens[jovemIndex] = {
          ...jovens[jovemIndex],
          name: user.name,
          email: user.email,
          phone: user.phone,
          address: user.address,
          city: user.city,
          state: user.state,
          country: user.country,
          birthDate: updateData.birthDate ?? jovens[jovemIndex].birthDate,
          cpf: updateData.cpf ?? jovens[jovemIndex].cpf,
          rg: updateData.rg ?? jovens[jovemIndex].rg,
          description: updateData.description ?? jovens[jovemIndex].description
        };
        writeDB(FILES.jovens, jovens);
      }
    }

    const { password: _, ...userResponse } = users[index];
    res.json(userResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Deletar usuário
const deleteUser = (req, res) => {
  try {
    const users = readDB(FILES.users);
    const index = users.findIndex(u => u.id === req.params.id);
    
    if (index === -1) return res.status(404).json({ error: 'Usuário não encontrado' });

    const user = users[index];

    // Remover perfis relacionados
    if (user.userType === 'ong') {
      const ongs = readDB(FILES.ongs);
      const updatedOngs = ongs.filter(o => o.userId !== user.id);
      writeDB(FILES.ongs, updatedOngs);
    } else if (user.userType === 'jovem') {
      const jovens = readDB(FILES.jovens);
      const updatedJovens = jovens.filter(j => j.userId !== user.id);
      writeDB(FILES.jovens, updatedJovens);
    }

    users.splice(index, 1);
    writeDB(FILES.users, users);
    
    res.json({ message: 'Usuário deletado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Exportar relatório
const exportReport = (req, res) => {
  try {
    const users = readDB(FILES.users);
    const ongs = readDB(FILES.ongs);
    const jovens = readDB(FILES.jovens);
    const services = readDB(FILES.services);
    const bookings = readDB(FILES.bookings);

    const report = {
      timestamp: new Date().toISOString(),
      users: users.map(u => ({ ...u, password: undefined })),
      ongs,
      jovens,
      services,
      bookings,
      summary: {
        totalUsers: users.length,
        totalOngs: ongs.length,
        totalJovens: jovens.length,
        totalServices: services.length,
        totalBookings: bookings.length
      }
    };

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obter margem de lucro
const getProfitMargin = (req, res) => {
  try {
    const settings = readDB(FILES.settings);
    const adminSettings = settings.find(s => s.id === 'admin-settings') || { profitMargin: 0 };
    res.json({ profitMargin: adminSettings.profitMargin || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Atualizar margem de lucro
const updateProfitMargin = (req, res) => {
  try {
    const { profitMargin } = req.body;
    
    if (typeof profitMargin !== 'number' || profitMargin < 0 || profitMargin > 100) {
      return res.status(400).json({ error: 'Margem de lucro deve ser entre 0 e 100' });
    }

    let settings = readDB(FILES.settings);
    const index = settings.findIndex(s => s.id === 'admin-settings');
    
    if (index !== -1) {
      settings[index].profitMargin = profitMargin;
      settings[index].updatedAt = new Date().toISOString();
    } else {
      settings.push({
        id: 'admin-settings',
        profitMargin,
        updatedAt: new Date().toISOString()
      });
    }
    
    writeDB(FILES.settings, settings);
    res.json({ profitMargin, message: 'Margem de lucro atualizada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obter relatório de lucros
const getProfitReport = (req, res) => {
  try {
    const bookings = readDB(FILES.bookings);
    const ongs = readDB(FILES.ongs);
    const settings = readDB(FILES.settings);
    const adminSettings = settings.find(s => s.id === 'admin-settings') || { profitMargin: 0 };
    const profitMargin = adminSettings.profitMargin || 0;

    // Filtrar apenas serviços completados
    const completedBookings = bookings.filter(b => b.status === 'completed');

    // Calcular lucros por ONG
    const profitByOng = {};
    let totalProfit = 0;

    completedBookings.forEach(booking => {
      const servicePrice = booking.finalPrice || 0;
      const profit = (servicePrice * profitMargin) / 100;
      const basePrice = servicePrice - profit;

      if (!profitByOng[booking.ongId]) {
        const ong = ongs.find(o => o.id === booking.ongId);
        profitByOng[booking.ongId] = {
          ongId: booking.ongId,
          ongName: ong?.name || 'ONG Desconhecida',
          totalServices: 0,
          totalRevenue: 0,
          totalProfit: 0,
          baseRevenue: 0
        };
      }

      profitByOng[booking.ongId].totalServices += 1;
      profitByOng[booking.ongId].totalRevenue += servicePrice;
      profitByOng[booking.ongId].totalProfit += profit;
      profitByOng[booking.ongId].baseRevenue += basePrice;
      totalProfit += profit;
    });

    // Converter para array e ordenar por lucro
    const profitByOngArray = Object.values(profitByOng).sort((a, b) => b.totalProfit - a.totalProfit);

    res.json({
      profitMargin,
      totalProfit: Math.round(totalProfit * 100) / 100,
      totalCompletedServices: completedBookings.length,
      profitByOng: profitByOngArray.map(p => ({
        ...p,
        totalRevenue: Math.round(p.totalRevenue * 100) / 100,
        totalProfit: Math.round(p.totalProfit * 100) / 100,
        baseRevenue: Math.round(p.baseRevenue * 100) / 100,
        avgProfitPerService: p.totalServices > 0 ? Math.round((p.totalProfit / p.totalServices) * 100) / 100 : 0
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getStats,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  exportReport,
  getProfitMargin,
  updateProfitMargin,
  getProfitReport
};
