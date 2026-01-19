const { readDB, writeDB, FILES } = require('../config/database');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Função auxiliar para deletar arquivo se existir
const deleteFileIfExists = (filePath) => {
  if (!filePath) return;
  
  // Remove o prefixo /uploads/ do caminho
  const fileName = filePath.replace('/uploads/', '');
  const fullPath = path.join(__dirname, '../uploads', fileName);
  
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
      console.log(`✅ Arquivo deletado: ${fileName}`);
    } catch (error) {
      console.error(`❌ Erro ao deletar arquivo ${fileName}:`, error.message);
    }
  }
};

// Função para gerar senha aleatória de 6 dígitos
const generatePassword = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Criar jovem
const createJovem = async (req, res) => {
  try {
    const jovens = readDB(FILES.jovens);
    const users = readDB(FILES.users);
    
    const { email, name } = req.body;
    
    // Verificar se email já existe
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }
    
    // Gerar senha aleatória de 6 dígitos
    const generatedPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);
    
    // Criar usuário
    const newUser = {
      id: Date.now().toString(),
      email,
      password: hashedPassword,
      name,
      userType: 'jovem',
      firstLogin: true, // Flag para forçar troca de senha
      createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    writeDB(FILES.users, users);
    
    // Criar perfil do jovem
    const newJovem = {
      id: newUser.id,
      userId: newUser.id,
      ...req.body,
      createdAt: new Date().toISOString(),
      trainingCompletion: {},
      stats: {
        completedServices: 0,
        rating: 0,
        points: 0
      },
      availability: true
    };
    
    jovens.push(newJovem);
    writeDB(FILES.jovens, jovens);
    
    // Retornar jovem com senha temporária (apenas nesta resposta)
    res.json({ 
      ...newJovem, 
      temporaryPassword: generatedPassword,
      message: 'Jovem cadastrado com sucesso. Anote a senha temporária.' 
    });
  } catch (error) {
    console.error('Erro ao criar jovem:', error);
    res.status(500).json({ error: 'Erro ao criar jovem' });
  }
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

  const oldJovem = jovens[index];
  
  // Se a foto foi alterada, deletar a foto antiga
  if (req.body.photo && oldJovem.photo && req.body.photo !== oldJovem.photo) {
    deleteFileIfExists(oldJovem.photo);
    console.log(`🔄 Foto antiga substituída para jovem ${oldJovem.name}`);
  }
  
  // Se a foto foi removida (campo vazio), deletar a foto
  if (req.body.photo === '' && oldJovem.photo) {
    deleteFileIfExists(oldJovem.photo);
    console.log(`🗑️ Foto removida para jovem ${oldJovem.name}`);
  }

  jovens[index] = { ...jovens[index], ...req.body, id: req.params.id };
  writeDB(FILES.jovens, jovens);
  res.json(jovens[index]);
};

// Excluir jovem
const deleteJovem = (req, res) => {
  const jovens = readDB(FILES.jovens);
  const users = readDB(FILES.users);
  const bookings = readDB(FILES.bookings);
  
  const index = jovens.findIndex(j => j.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Jovem não encontrado' });

  const deletedJovem = jovens[index];
  
  // Deletar foto do jovem
  if (deletedJovem.photo) {
    deleteFileIfExists(deletedJovem.photo);
  }
  
  // Deletar documentos do jovem
  if (deletedJovem.documents && Array.isArray(deletedJovem.documents)) {
    deletedJovem.documents.forEach(doc => {
      if (doc.path) {
        deleteFileIfExists(doc.path);
      }
    });
  }
  
  // Remover jovem do banco de dados
  jovens.splice(index, 1);
  writeDB(FILES.jovens, jovens);
  
  // Remover usuário associado do sistema de autenticação
  const userIndex = users.findIndex(u => u.id === req.params.id);
  if (userIndex !== -1) {
    users.splice(userIndex, 1);
    writeDB(FILES.users, users);
    console.log(`🗑️ Usuário de autenticação removido para jovem ${deletedJovem.name}`);
  }
  
  // Remover ou cancelar agendamentos associados ao jovem
  const updatedBookings = bookings.filter(b => b.jovemId !== req.params.id);
  if (updatedBookings.length !== bookings.length) {
    writeDB(FILES.bookings, updatedBookings);
    console.log(`🗑️ Agendamentos do jovem ${deletedJovem.name} removidos`);
  }
  
  console.log(`🗑️ Jovem ${deletedJovem.name} (ID: ${deletedJovem.id}) excluído completamente do sistema`);
  res.json({ message: 'Jovem, arquivos e dados associados excluídos com sucesso', jovem: deletedJovem });
};

// Resetar senha do jovem (pela ONG)
const resetJovemPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const users = readDB(FILES.users);
    const jovens = readDB(FILES.jovens);
    
    const userIndex = users.findIndex(u => u.id === id && u.userType === 'jovem');
    if (userIndex === -1) {
      return res.status(404).json({ error: 'Jovem não encontrado' });
    }
    
    const jovem = jovens.find(j => j.id === id);
    if (!jovem) {
      return res.status(404).json({ error: 'Perfil do jovem não encontrado' });
    }
    
    // Gerar nova senha de 6 dígitos
    const newPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Atualizar senha e forçar troca no próximo login
    users[userIndex].password = hashedPassword;
    users[userIndex].firstLogin = true;
    
    writeDB(FILES.users, users);
    
    res.json({ 
      message: 'Senha resetada com sucesso',
      temporaryPassword: newPassword,
      jovemName: jovem.name,
      jovemEmail: users[userIndex].email
    });
  } catch (error) {
    console.error('Erro ao resetar senha:', error);
    res.status(500).json({ error: 'Erro ao resetar senha' });
  }
};

module.exports = {
  createJovem,
  getAllJovens,
  getJovemById,
  updateJovem,
  deleteJovem,
  resetJovemPassword
};
