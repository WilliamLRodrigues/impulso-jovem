const bcrypt = require('bcryptjs');
const fs = require('fs');

// Gerar nova senha
const tempPassword = Math.floor(100000 + Math.random() * 900000).toString();
console.log('🔑 Nova senha temporária:', tempPassword);

// Hashear senha
const hashedPassword = bcrypt.hashSync(tempPassword, 10);

// Atualizar users.json
const users = JSON.parse(fs.readFileSync('./database/users.json', 'utf8'));
const userIndex = users.findIndex(u => u.email === 'jovem@impulso.com');
if (userIndex !== -1) {
  users[userIndex].password = hashedPassword;
  users[userIndex].firstLogin = true;
  fs.writeFileSync('./database/users.json', JSON.stringify(users, null, 2));
  console.log('✅ Senha atualizada no users.json');
}

// Atualizar jovens.json
const jovens = JSON.parse(fs.readFileSync('./database/jovens.json', 'utf8'));
const jovemIndex = jovens.findIndex(j => j.email === 'jovem@impulso.com');
if (jovemIndex !== -1) {
  jovens[jovemIndex].tempPassword = tempPassword;
  fs.writeFileSync('./database/jovens.json', JSON.stringify(jovens, null, 2));
  console.log('✅ Senha atualizada no jovens.json');
}

console.log('\n✅ CONCLUÍDO! Use a senha acima para fazer login.');
