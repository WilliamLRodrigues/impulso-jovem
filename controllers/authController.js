const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { readDB, writeDB, FILES } = require('../config/database');
const { SECRET_KEY } = require('../config/constants');

// Registro
const register = async (req, res) => {
  try {
    const { email, password, name, userType, phone, address } = req.body;
    const users = readDB(FILES.users);

    // Validar que jovens não podem se cadastrar diretamente
    if (userType === 'jovem') {
      return res.status(403).json({ 
        error: 'Jovens não podem se cadastrar diretamente. Entre em contato com uma ONG para ser cadastrado.' 
      });
    }

    // Validar tipos permitidos
    const allowedTypes = ['cliente', 'ong', 'admin'];
    if (!allowedTypes.includes(userType)) {
      return res.status(400).json({ error: 'Tipo de usuário inválido' });
    }

    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now().toString(),
      email,
      password: hashedPassword,
      name,
      userType, // 'admin', 'ong', 'cliente'
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

    console.log('🔐 Tentativa de login:', { email, userExists: !!user });

    if (!user) {
      console.log('❌ Usuário não encontrado');
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log('🔑 Comparação de senha:', { passwordMatch, userType: user.userType });

    if (!passwordMatch) {
      console.log('❌ Senha incorreta');
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, userType: user.userType }, SECRET_KEY);
    console.log('✅ Login bem-sucedido:', { userId: user.id, userType: user.userType, firstLogin: user.firstLogin });
    
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        userType: user.userType,
        firstLogin: user.firstLogin || false // Indica se precisa trocar senha
      } 
    });
  } catch (error) {
    console.error('❌ Erro no login:', error);
    res.status(500).json({ error: error.message });
  }
};

// Obter dados do usuário
const getUserProfile = (req, res) => {
  try {
    const users = readDB(FILES.users);
    const user = users.find(u => u.id === req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    // Retornar sem a senha
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Atualizar dados do usuário
const updateUserProfile = async (req, res) => {
  try {
    const users = readDB(FILES.users);
    const index = users.findIndex(u => u.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    const { password, ...updateData } = req.body;
    
    // Se a senha foi fornecida, fazer hash
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    
    users[index] = { 
      ...users[index], 
      ...updateData, 
      id: req.params.id,
      updatedAt: new Date().toISOString()
    };
    
    writeDB(FILES.users, users);
    
    const { password: _, ...userWithoutPassword } = users[index];
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Trocar senha (primeiro login ou reset)
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.params.id;
    const users = readDB(FILES.users);
    
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    const user = users[userIndex];
    
    // Verificar senha atual
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({ error: 'Senha atual incorreta' });
    }
    
    // Validar nova senha (mínimo 6 caracteres)
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Nova senha deve ter no mínimo 6 caracteres' });
    }
    
    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Atualizar senha e remover flag de primeiro login
    users[userIndex].password = hashedPassword;
    users[userIndex].firstLogin = false;
    users[userIndex].updatedAt = new Date().toISOString();
    
    writeDB(FILES.users, users);
    
    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  register,
  login,
  getUserProfile,
  updateUserProfile,
  changePassword
};
