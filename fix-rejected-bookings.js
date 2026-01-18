const fs = require('fs');
const path = require('path');

const bookingsFile = path.join(__dirname, 'database', 'bookings.json');

// Ler bookings
const bookings = JSON.parse(fs.readFileSync(bookingsFile, 'utf8'));

console.log('🔍 Procurando agendamentos rejeitados com status incorreto...\n');

let fixed = 0;

bookings.forEach((booking, index) => {
  // Se está pending mas tem rejectedBy (foi rejeitado por jovem atribuído)
  if (booking.status === 'pending' && booking.rejectedBy) {
    console.log(`❌ Encontrado: ID ${booking.id}`);
    console.log(`   Cliente: ${booking.clientName}`);
    console.log(`   Serviço: ${booking.serviceName}`);
    console.log(`   Rejeitado por: ${booking.rejectedBy}`);
    console.log(`   Motivo: ${booking.rejectionReason || 'Não especificado'}`);
    
    bookings[index] = {
      ...booking,
      status: 'cancelled',
      cancelledBy: 'jovem',
      cancelReason: booking.rejectionReason || 'Jovem recusou o serviço'
    };
    
    console.log(`   ✅ Status alterado para: cancelled\n`);
    fixed++;
  }
});

if (fixed > 0) {
  // Salvar alterações
  fs.writeFileSync(bookingsFile, JSON.stringify(bookings, null, 2));
  console.log(`✅ ${fixed} agendamento(s) corrigido(s) com sucesso!`);
} else {
  console.log('✅ Nenhum agendamento precisou ser corrigido.');
}
