const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { readDB, writeDB, FILES } = require('../config/database');
const { SECRET_KEY } = require('../config/constants');

// Registro
const register = async (req, res) => {
  try {
    const { email, password, name, userType, phone, address } = req.body;
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
      userType, // 'admin', 'ong', 'jovem', 'cliente'
      phone,
      address,
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
        address,
        phone,
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
        phone,
        ongId: null,
        skills: [],
        availability: true,
        stats: { completedServices: 0, rating: 0, points: 0 },
        location: null
      });
      writeDB(FILES.jovens, jovens);
    }

    const token = jwt.sign({ id: newUser.id, email, userType }, SECRET_KEY);
    res.json({ token, user: { id: newUser.id, email, name, userType } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const users = readDB(FILES.users);
    const user = users.find(u => u.email === email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, userType: user.userType }, SECRET_KEY);
    res.json({ 
      token, 
      user: { id: user.id, email: user.email, name: user.name, userType: user.userType } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  register,
  login
};
