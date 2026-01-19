const { readDB, writeDB, FILES } = require('../config/database');
const { BOOKING_STATUS } = require('../config/constants');
const { sendBookingConfirmation, sendJovemAcceptedNotification, sendThankYouEmail } = require('../services/emailService');
const fs = require('fs');
const path = require('path');

// Função para calcular preço com margem de lucro
const calculatePriceWithMargin = (basePrice) => {
  try {
    const settings = readDB(FILES.settings);
    const adminSettings = settings.find(s => s.id === 'admin-settings') || { profitMargin: 0 };
    const profitMargin = adminSettings.profitMargin || 0;
    
    const finalPrice = basePrice + (basePrice * profitMargin / 100);
    return Math.round(finalPrice * 100) / 100; // Arredondar para 2 casas decimais
  } catch (error) {
    console.error('Erro ao calcular margem:', error);
    return basePrice;
  }
};

// Função para deletar fotos do serviço
const deleteServicePhotos = (photoUrls) => {
  if (!photoUrls || photoUrls.length === 0) return;
  
  photoUrls.forEach(photoUrl => {
    try {
      // Extrair nome do arquivo da URL (/uploads/filename.jpg)
      const filename = photoUrl.split('/').pop();
      const filePath = path.join(__dirname, '..', 'uploads', filename);
      
      // Verificar se arquivo existe antes de deletar
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`📸 Foto deletada: ${filename}`);
      }
    } catch (error) {
      console.error(`Erro ao deletar foto ${photoUrl}:`, error);
    }
  });
};

// Função para verificar se um jovem está disponível no horário solicitado
const isJovemAvailable = (jovem, requestedDate, requestedTime, bookings) => {
  // Verificar se jovem está ativo
  if (!jovem.availability) return false;

  // Verificar configurações de disponibilidade com novo formato (workingSchedule)
  if (jovem.workingSchedule) {
    const requestDate = new Date(requestedDate);
    const dayOfWeek = requestDate.toLocaleDateString('pt-BR', { weekday: 'long' }).toLowerCase();
    
    // Verificar se o dia existe no schedule e está habilitado
    const daySchedule = jovem.workingSchedule[dayOfWeek];
    if (!daySchedule || !daySchedule.enabled) {
      return false;
    }

    // Verificar horário de trabalho deste dia específico
    if (requestedTime) {
      const [requestHour, requestMinute] = requestedTime.split(':').map(Number);
      const requestTimeMinutes = requestHour * 60 + requestMinute;

      const [startHour, startMinute] = (daySchedule.start || '08:00').split(':').map(Number);
      const startTimeMinutes = startHour * 60 + startMinute;

      const [endHour, endMinute] = (daySchedule.end || '18:00').split(':').map(Number);
      const endTimeMinutes = endHour * 60 + endMinute;

      if (requestTimeMinutes < startTimeMinutes || requestTimeMinutes > endTimeMinutes) {
        return false;
      }
    }
  }
  // Fallback para formato antigo (workingHours + availableDays)
  else if (jovem.workingHours && jovem.availableDays) {
    const requestDate = new Date(requestedDate);
    const dayOfWeek = requestDate.toLocaleDateString('pt-BR', { weekday: 'long' }).toLowerCase();
    
    // Verificar se trabalha neste dia da semana
    if (!jovem.availableDays.includes(dayOfWeek)) {
      return false;
    }

    // Verificar horário de trabalho
    if (requestedTime) {
      const [requestHour, requestMinute] = requestedTime.split(':').map(Number);
      const requestTimeMinutes = requestHour * 60 + requestMinute;

      const [startHour, startMinute] = (jovem.workingHours.start || '08:00').split(':').map(Number);
      const startTimeMinutes = startHour * 60 + startMinute;

      const [endHour, endMinute] = (jovem.workingHours.end || '18:00').split(':').map(Number);
      const endTimeMinutes = endHour * 60 + endMinute;

      if (requestTimeMinutes < startTimeMinutes || requestTimeMinutes > endTimeMinutes) {
        return false;
      }
    }
  }

  // Verificar se já tem agendamento neste horário
  const hasConflict = bookings.some(booking => {
    if (booking.jovemId !== jovem.id) return false;
    if (booking.status === 'cancelled' || booking.status === 'completed') return false;
    
    // Verificar conflito de data
    if (booking.date === requestedDate) {
      // Se tem horário específico, verificar conflito de horário
      if (booking.time && requestedTime) {
        // Considerar um buffer de 2 horas
        const bookingTime = booking.time.split(':').map(Number);
        const bookingMinutes = bookingTime[0] * 60 + bookingTime[1];
        
        const requestTime = requestedTime.split(':').map(Number);
        const requestMinutes = requestTime[0] * 60 + requestTime[1];
        
        // Conflito se estiver dentro de 2 horas
        return Math.abs(bookingMinutes - requestMinutes) < 120;
      }
      return true; // Conflito de data sem horário específico
    }
    return false;
  });

  return !hasConflict;
};

// Criar agendamento (solicitação de serviço por cliente) com atribuição automática
const createBooking = (req, res) => {
  const bookings = readDB(FILES.bookings);
  const services = readDB(FILES.services);
  const jovens = readDB(FILES.jovens);
  const users = readDB(FILES.users);
  
  const { serviceId, date, time, clientId } = req.body;
  
  // Buscar o serviço solicitado
  const service = services.find(s => s.id === serviceId);
  if (!service) {
    return res.status(404).json({ error: 'Serviço não encontrado' });
  }
  
  // Buscar dados de localização do cliente
  const client = users.find(u => u.id === clientId);
  const clientState = client?.state;
  const clientCity = client?.city;
  
  // Encontrar jovens elegíveis para este serviço
  const eligibleJovens = jovens.filter(j => {
    // Verificar disponibilidade geral
    if (!j.availability) return false;
    
    // Verificar localização (mesmo estado e cidade)
    if (clientState && clientCity) {
      if (j.state !== clientState || j.city !== clientCity) {
        return false;
      }
    }
    
    // Verificar se tem a skill necessária (agora skills são IDs de serviços)
    if (!j.skills || !j.skills.includes(serviceId)) {
      // Fallback: verificar por categoria (compatibilidade com formato antigo)
      if (!j.skills || !j.skills.includes(service.category)) {
        return false;
      }
    }
    
    // Verificar disponibilidade de horário e conflitos
    return isJovemAvailable(j, date, time, bookings);
  });

  // Ordenar por rating e menor número de serviços (distribuir trabalho)
  const sortedJovens = eligibleJovens.sort((a, b) => {
    const ratingDiff = (b.stats?.rating || 0) - (a.stats?.rating || 0);
    if (Math.abs(ratingDiff) > 0.5) return ratingDiff;
    
    // Se rating similar, priorizar quem tem menos serviços
    return (a.stats?.completedServices || 0) - (b.stats?.completedServices || 0);
  });

  // Atribuição automática ao melhor jovem disponível
  const assignedJovem = sortedJovens[0] || null;
  
  const newBooking = {
    id: Date.now().toString(),
    ...req.body,
    serviceCategory: service.category,
    jovemId: assignedJovem ? assignedJovem.id : null,
    jovemName: assignedJovem ? assignedJovem.name : null,
    jovemPhoto: assignedJovem ? assignedJovem.photo : null,
    jovemStats: assignedJovem ? assignedJovem.stats : null,
    ongId: assignedJovem ? assignedJovem.ongId : null,
    autoAssigned: !!assignedJovem,
    recommendedJovens: sortedJovens.slice(0, 5).map(j => ({
      id: j.id,
      name: j.name,
      rating: j.stats?.rating || 0,
      completedServices: j.stats?.completedServices || 0,
      ongId: j.ongId,
      available: true
    })),
    createdAt: new Date().toISOString(),
    status: assignedJovem ? BOOKING_STATUS.ASSIGNED : BOOKING_STATUS.PENDING
  };
  
  bookings.push(newBooking);
  writeDB(FILES.bookings, bookings);
  
  // Enviar email de confirmação para o cliente
  if (client && client.email) {
    const ongs = readDB(FILES.ongs);
    const ong = assignedJovem ? ongs.find(o => o.id === assignedJovem.ongId) : null;
    
    sendBookingConfirmation(
      client.email,
      client.name,
      service.name,
      date,
      time,
      ong ? ong.name : 'ONG Parceira'
    ).catch(err => console.error('Erro ao enviar email:', err));
  }
  
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
  const jovens = readDB(FILES.jovens);
  const users = readDB(FILES.users);
  const { jovemId, acceptedBy } = req.body; // acceptedBy pode ser 'ong' ou 'jovem'
  const index = bookings.findIndex(b => b.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Agendamento não encontrado' });
  }
  
  const booking = bookings[index];
  
  // Gerar PIN automaticamente ao aceitar (tanto ONG quanto Jovem)
  const checkInPin = Math.floor(1000 + Math.random() * 9000).toString();
  
  // Buscar dados do jovem para adicionar ao booking
  const jovem = jovens.find(j => j.id === jovemId);
  
  if (!jovem) {
    return res.status(404).json({ error: 'Jovem não encontrado' });
  }
  
  bookings[index] = {
    ...booking,
    jovemId: jovemId,
    jovemName: jovem.name,
    jovemPhoto: jovem.photo,
    jovemStats: jovem.stats,
    ongId: jovem.ongId,
    status: BOOKING_STATUS.CONFIRMED,
    acceptedBy: acceptedBy || 'ong',
    acceptedAt: new Date().toISOString(),
    checkInPin: checkInPin,
    checkInPinGeneratedAt: new Date().toISOString()
  };
  
  writeDB(FILES.bookings, bookings);
  
  // Enviar email notificando cliente que serviço foi aceito
  const client = users.find(u => u.id === booking.clientId);
  
  if (client && client.email) {
    sendJovemAcceptedNotification(
      client.email,
      client.name,
      booking.serviceName,
      jovem.name,
      booking.date,
      booking.time,
      checkInPin
    ).catch(err => console.error('Erro ao enviar email:', err));
  }
  
  res.json(bookings[index]);
};

// Listar bookings pendentes para ONG
const getPendingBookingsForOng = (req, res) => {
  const bookings = readDB(FILES.bookings);
  const jovens = readDB(FILES.jovens);
  const users = readDB(FILES.users);
  const services = readDB(FILES.services);
  const { ongId } = req.params;
  
  // Buscar jovens da ONG
  const ongJovens = jovens.filter(j => j.ongId === ongId);
  const ongJovensIds = ongJovens.map(j => j.id);
  
  // Buscar TODAS as bookings pendentes ou assigned que possam ser atribuídas aos jovens da ONG
  const pendingBookings = bookings
    .filter(b => {
      // Incluir apenas pendentes e assigned (jovem já pode ter sido atribuído mas ainda não aceitou)
      if (b.status !== BOOKING_STATUS.PENDING && b.status !== BOOKING_STATUS.ASSIGNED) {
        return false;
      }
      
      // Se já está atribuído a um jovem da ONG, incluir
      if (b.jovemId && ongJovensIds.includes(b.jovemId)) {
        return true;
      }
      
      // Se tem jovens recomendados da ONG, incluir
      if (b.recommendedJovens && b.recommendedJovens.some(rj => ongJovensIds.includes(rj.id))) {
        return true;
      }
      
      // Se não tem recomendados mas a ONG tem jovens com a skill e localização necessária, incluir
      const service = services.find(s => s.id === b.serviceId);
      if (!service) return false;
      
      const client = users.find(u => u.id === b.clientId);
      const hasEligibleJovem = ongJovens.some(j => {
        // Verificar disponibilidade
        if (!j.availability) return false;
        
        // Verificar localização
        if (client && client.state && client.city) {
          if (j.state !== client.state || j.city !== client.city) {
            return false;
          }
        }
        
        // Verificar skill (por ID de serviço ou categoria)
        if (j.skills && (j.skills.includes(b.serviceId) || j.skills.includes(service.category))) {
          return true;
        }
        
        return false;
      });
      
      return hasEligibleJovem;
    })
    .map(booking => {
      // Adicionar informações do cliente
      const client = users.find(u => u.id === booking.clientId);
      
      // Filtrar/buscar jovens recomendados da ONG
      let ongRecommendedJovens = [];
      
      if (booking.recommendedJovens) {
        // Filtrar jovens recomendados que são da ONG
        ongRecommendedJovens = booking.recommendedJovens.filter(rj => ongJovensIds.includes(rj.id));
      }
      
      // Se não tem recomendados ou tem poucos, buscar jovens elegíveis da ONG
      if (ongRecommendedJovens.length === 0) {
        const service = services.find(s => s.id === booking.serviceId);
        
        ongRecommendedJovens = ongJovens
          .filter(j => {
            if (!j.availability) return false;
            
            if (client && client.state && client.city) {
              if (j.state !== client.state || j.city !== client.city) return false;
            }
            
            if (service && j.skills) {
              return j.skills.includes(booking.serviceId) || j.skills.includes(service.category);
            }
            
            return false;
          })
          .map(j => ({
            id: j.id,
            name: j.name,
            rating: j.stats?.rating || 0,
            completedServices: j.stats?.completedServices || 0,
            ongId: j.ongId,
            available: true
          }))
          .sort((a, b) => b.rating - a.rating)
          .slice(0, 5);
      }
      
      return {
        ...booking,
        clientInfo: client ? {
          name: client.name,
          phone: client.phone,
          address: client.address,
          city: client.city,
          state: client.state,
          fullAddress: `${client.address}, ${client.city} - ${client.state}`
        } : null,
        ongRecommendedJovens
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Mais recentes primeiro
  
  res.json(pendingBookings);
};

// Listar bookings pendentes para Jovem
const getPendingBookingsForJovem = (req, res) => {
  const bookings = readDB(FILES.bookings);
  const users = readDB(FILES.users);
  const { jovemId } = req.params;
  
  // Buscar bookings pendentes onde o jovem está recomendado ou atribuído
  const pendingBookings = bookings
    .filter(b => 
      (b.status === BOOKING_STATUS.PENDING || b.status === BOOKING_STATUS.ASSIGNED) &&
      (b.jovemId === jovemId || (b.recommendedJovens && b.recommendedJovens.some(rj => rj.id === jovemId)))
    )
    .map(booking => {
      // Adicionar informações completas do cliente
      const client = users.find(u => u.id === booking.clientId);
      if (client) {
        return {
          ...booking,
          clientInfo: {
            name: client.name,
            phone: client.phone,
            address: client.address,
            city: client.city,
            state: client.state,
            fullAddress: `${client.address}, ${client.city} - ${client.state}`
          }
        };
      }
      return booking;
    });
  
  res.json(pendingBookings);
};

// Obter horários disponíveis de um jovem para um serviço
const getAvailableSlots = (req, res) => {
  const { jovemId, serviceId, date } = req.query;
  const jovens = readDB(FILES.jovens);
  const bookings = readDB(FILES.bookings);
  const services = readDB(FILES.services);
  
  const jovem = jovens.find(j => j.id === jovemId);
  if (!jovem) {
    return res.status(404).json({ error: 'Jovem não encontrado' });
  }
  
  const service = services.find(s => s.id === serviceId);
  const serviceDuration = service ? service.duration : 2; // duração padrão em horas
  
  // Obter configuração de horário do jovem
  const requestDate = new Date(date);
  const dayOfWeek = requestDate.toLocaleDateString('pt-BR', { weekday: 'long' }).toLowerCase();
  
  let workStart = '08:00';
  let workEnd = '18:00';
  let isDayAvailable = true;
  
  if (jovem.workingSchedule && jovem.workingSchedule[dayOfWeek]) {
    const daySchedule = jovem.workingSchedule[dayOfWeek];
    if (!daySchedule.enabled) {
      isDayAvailable = false;
    } else {
      workStart = daySchedule.start || '08:00';
      workEnd = daySchedule.end || '18:00';
    }
  } else if (jovem.workingHours) {
    workStart = jovem.workingHours.start || '08:00';
    workEnd = jovem.workingHours.end || '18:00';
    if (jovem.availableDays && !jovem.availableDays.includes(dayOfWeek)) {
      isDayAvailable = false;
    }
  }
  
  if (!isDayAvailable) {
    return res.json({ available: false, slots: [], message: 'Jovem não trabalha neste dia' });
  }
  
  // Gerar slots de horário a cada 1 hora
  const slots = [];
  const [startHour, startMinute] = workStart.split(':').map(Number);
  const [endHour, endMinute] = workEnd.split(':').map(Number);
  
  for (let hour = startHour; hour < endHour; hour++) {
    const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
    
    // Verificar se não há conflito com bookings existentes
    const hasConflict = bookings.some(booking => {
      if (booking.jovemId !== jovemId) return false;
      if (booking.status === 'cancelled' || booking.status === 'completed' || booking.status === 'rejected') return false;
      if (booking.date !== date) return false;
      
      if (booking.time) {
        const bookingHour = parseInt(booking.time.split(':')[0]);
        const bookingDuration = booking.duration || serviceDuration;
        // Verificar se há sobreposição
        return hour < (bookingHour + bookingDuration) && (hour + serviceDuration) > bookingHour;
      }
      return true; // Se booking não tem horário específico, bloqueia o dia todo
    });
    
    if (!hasConflict) {
      slots.push({ time: timeSlot, available: true });
    }
  }
  
  res.json({ available: true, slots, workStart, workEnd });
};

// Obter serviços disponíveis com jovens e ONGs na área do cliente
const getAvailableServicesForClient = (req, res) => {
  const { clientId } = req.query;
  const users = readDB(FILES.users);
  const services = readDB(FILES.services);
  const jovens = readDB(FILES.jovens);
  const ongs = readDB(FILES.ongs);
  const settings = readDB(FILES.settings);
  
  console.log('🔍 Buscando serviços disponíveis para clientId:', clientId);
  
  // Obter margem de lucro
  const adminSettings = settings.find(s => s.id === 'admin-settings') || { profitMargin: 0 };
  const profitMargin = adminSettings.profitMargin || 0;
  console.log('💰 Margem de lucro configurada:', profitMargin + '%');
  
  const client = users.find(u => u.id === clientId);
  if (!client) {
    console.log('❌ Cliente não encontrado');
    return res.status(404).json({ error: 'Cliente não encontrado' });
  }
  
  const clientState = client.state;
  const clientCity = client.city;
  console.log('📍 Cliente localização:', { state: clientState, city: clientCity });
  
  // Filtrar serviços que têm jovens disponíveis na mesma localização
  console.log('🔍 Total de serviços:', services.length);
  console.log('🔍 Serviços cadastrados:', JSON.stringify(services.map(s => ({ 
    id: s.id, 
    title: s.title, 
    status: s.status,
    jovemId: s.jovemId,
    category: s.category 
  })), null, 2));
  console.log('🔍 Serviços disponíveis (status=available):', services.filter(s => s.status === 'available').length);
  console.log('🔍 Total de jovens:', jovens.length);
  console.log('🔍 Jovens cadastrados:', JSON.stringify(jovens.map(j => ({
    id: j.id,
    name: j.name,
    availability: j.availability,
    state: j.state,
    city: j.city,
    skills: j.skills
  })), null, 2));
  
  const availableServices = services
    .filter(s => s.status === 'available')
    .map(service => {
      console.log(`\n📦 Processando serviço: ${service.id} - ${service.title}`);
      
      // Encontrar jovens que podem fazer este serviço na área do cliente
      const availableJovens = jovens.filter(j => {
        if (!j.availability) {
          console.log(`  ❌ Jovem ${j.id} - não disponível`);
          return false;
        }
        if (clientState && clientCity && (j.state !== clientState || j.city !== clientCity)) {
          console.log(`  ❌ Jovem ${j.id} - localização diferente (${j.state}/${j.city})`);
          return false;
        }
        const hasSkill = j.skills && (j.skills.includes(service.id) || j.skills.includes(service.category));
        if (!hasSkill) {
          console.log(`  ❌ Jovem ${j.id} - não tem skill necessária`);
          return false;
        }
        console.log(`  ✅ Jovem ${j.id} - elegível`);
        return true;
      });
      
      console.log(`  📊 Total jovens elegíveis: ${availableJovens.length}`);
      
      if (availableJovens.length === 0) return null;
      
      // Calcular preço com margem
      const basePrice = service.price || 0;
      const finalPrice = basePrice + (basePrice * profitMargin / 100);
      const priceWithMargin = Math.round(finalPrice * 100) / 100;
      
      console.log(`  💰 Preço base: R$ ${basePrice.toFixed(2)} → Com margem (${profitMargin}%): R$ ${priceWithMargin.toFixed(2)}`);
      
      // Adicionar informações dos jovens e ONGs
      const jovemsInfo = availableJovens.map(j => {
        const ong = ongs.find(o => o.id === j.ongId);
        return {
          id: j.id,
          name: j.name,
          rating: j.stats?.rating || 0,
          completedServices: j.stats?.completedServices || 0,
          ongId: j.ongId,
          ongName: ong?.name || 'ONG não vinculada',
          ongPhone: ong?.phone,
          ongEmail: ong?.email,
          ongCnpj: ong?.cnpj,
          ongCep: ong?.cep,
          ongAddress: ong?.address,
          ongComplement: ong?.complement,
          ongCity: ong?.city,
          ongState: ong?.state,
        basePrice: basePrice,
        price: priceWithMargin,
          ongFullAddress: ong ? `${ong.address}${ong.complement ? ', ' + ong.complement : ''}, ${ong.city} - ${ong.state}${ong.cep ? ' - CEP: ' + ong.cep : ''}` : '',
          skills: j.skills
        };
      });
      
      return {
        ...service,
        basePrice: basePrice,
        price: priceWithMargin,
        availableJovens: jovemsInfo,
        hasAvailability: jovemsInfo.length > 0
      };
    })
    .filter(s => s !== null);
  
  console.log(`\n✅ Total de serviços disponíveis para retornar: ${availableServices.length}`);
  res.json(availableServices);
};

// Jovem aceitar agendamento
const acceptBookingByJovem = (req, res) => {
  const bookings = readDB(FILES.bookings);
  const { jovemId } = req.body;
  const bookingId = req.params.id;
  
  const index = bookings.findIndex(b => b.id === bookingId);
  if (index === -1) {
    return res.status(404).json({ error: 'Agendamento não encontrado' });
  }
  
  const booking = bookings[index];
  
  // Verificar se o jovem está na lista de recomendados ou é o jovem atribuído
  const isRecommended = booking.recommendedJovens?.some(rj => rj.id === jovemId);
  const isAssigned = booking.jovemId === jovemId;
  
  if (!isRecommended && !isAssigned) {
    return res.status(403).json({ error: 'Você não está autorizado a aceitar este agendamento' });
  }
  
  // Gerar PIN automaticamente ao aceitar
  const checkInPin = Math.floor(1000 + Math.random() * 9000).toString();
  
  // Buscar dados do jovem para adicionar ao booking
  const jovens = readDB(FILES.jovens);
  const jovem = jovens.find(j => j.id === jovemId);
  
  bookings[index] = {
    ...booking,
    jovemId: jovemId,
    jovemName: jovem ? jovem.name : booking.jovemName,
    jovemPhoto: jovem ? jovem.photo : null,
    jovemStats: jovem ? jovem.stats : null,
    status: 'confirmed',
    acceptedBy: 'jovem',
    acceptedAt: new Date().toISOString(),
    checkInPin: checkInPin,
    checkInPinGeneratedAt: new Date().toISOString()
  };
  
  writeDB(FILES.bookings, bookings);
  
  // Enviar email notificando cliente que jovem aceitou
  const users = readDB(FILES.users);
  const client = users.find(u => u.id === booking.clientId);
  
  if (client && client.email && jovem) {
    sendJovemAcceptedNotification(
      client.email,
      client.name,
      booking.serviceName,
      jovem.name,
      booking.date,
      booking.time,
      checkInPin
    ).catch(err => console.error('Erro ao enviar email:', err));
  }
  
  res.json(bookings[index]);
};

// Jovem rejeitar agendamento
const rejectBookingByJovem = (req, res) => {
  const bookings = readDB(FILES.bookings);
  const { jovemId, reason } = req.body;
  const bookingId = req.params.id;
  
  const index = bookings.findIndex(b => b.id === bookingId);
  if (index === -1) {
    return res.status(404).json({ error: 'Agendamento não encontrado' });
  }
  
  const booking = bookings[index];
  
  // Verificar se o jovem está na lista de recomendados ou é o jovem atribuído
  const isRecommended = booking.recommendedJovens?.some(rj => rj.id === jovemId);
  const isAssigned = booking.jovemId === jovemId;
  
  if (!isRecommended && !isAssigned) {
    return res.status(403).json({ error: 'Você não está autorizado a rejeitar este agendamento' });
  }
  
  // Se era o jovem atribuído, cancelar o agendamento
  if (isAssigned) {
    bookings[index] = {
      ...booking,
      status: 'cancelled',
      cancelledBy: 'jovem',
      cancelReason: reason || 'Jovem recusou o serviço',
      rejectedBy: jovemId,
      rejectionReason: reason,
      rejectedAt: new Date().toISOString()
    };
  } else {
    // Remover jovem da lista de recomendados
    bookings[index] = {
      ...booking,
      recommendedJovens: booking.recommendedJovens.filter(rj => rj.id !== jovemId),
      rejections: [...(booking.rejections || []), {
        jovemId,
        reason,
        rejectedAt: new Date().toISOString()
      }]
    };
  }
  
  writeDB(FILES.bookings, bookings);
  res.json(bookings[index]);
};

// Gerar PIN de check-in (Jovem ao chegar no local)
const generateCheckInPin = (req, res) => {
  const bookings = readDB(FILES.bookings);
  const bookingId = req.params.id;
  const { jovemId } = req.body;
  
  const index = bookings.findIndex(b => b.id === bookingId);
  if (index === -1) {
    return res.status(404).json({ error: 'Agendamento não encontrado' });
  }
  
  const booking = bookings[index];
  
  // Verificar se o jovem é o responsável
  if (booking.jovemId !== jovemId) {
    return res.status(403).json({ error: 'Você não está autorizado' });
  }
  
  // Verificar se já não está em andamento
  if (booking.status === 'in_progress' || booking.status === 'completed') {
    return res.status(400).json({ error: 'Serviço já iniciado ou concluído' });
  }
  
  // Gerar PIN de 4 dígitos
  const checkInPin = Math.floor(1000 + Math.random() * 9000).toString();
  
  bookings[index] = {
    ...booking,
    checkInPin,
    checkInPinGeneratedAt: new Date().toISOString(),
    status: 'confirmed' // Mantém confirmado até cliente validar PIN
  };
  
  writeDB(FILES.bookings, bookings);
  res.json({ 
    success: true, 
    checkInPin,
    message: 'PIN gerado com sucesso. Informe ao cliente.' 
  });
};

// Validar PIN e confirmar check-in (Cliente)
const validateCheckInPin = (req, res) => {
  const bookings = readDB(FILES.bookings);
  const bookingId = req.params.id;
  const { pin, clientId } = req.body;
  
  const index = bookings.findIndex(b => b.id === bookingId);
  if (index === -1) {
    return res.status(404).json({ error: 'Agendamento não encontrado' });
  }
  
  const booking = bookings[index];
  
  // Verificar se é o cliente correto
  if (booking.clientId !== clientId) {
    return res.status(403).json({ error: 'Você não está autorizado' });
  }
  
  // Verificar PIN
  if (booking.checkInPin !== pin) {
    return res.status(400).json({ error: 'PIN incorreto' });
  }
  
  // Marcar como iniciado
  bookings[index] = {
    ...booking,
    status: 'in_progress',
    checkInTime: new Date().toISOString()
  };
  
  writeDB(FILES.bookings, bookings);
  res.json({ 
    success: true, 
    message: 'Check-in confirmado! Serviço iniciado.',
    booking: bookings[index]
  });
};

// Finalizar serviço com avaliação (Cliente)
const completeServiceByClient = (req, res) => {
  const bookings = readDB(FILES.bookings);
  const jovens = readDB(FILES.jovens);
  const services = readDB(FILES.services);
  const reviews = readDB(FILES.reviews);
  const bookingId = req.params.id;
  const { clientId, rating, review, photos, price } = req.body;
  
  const index = bookings.findIndex(b => b.id === bookingId);
  if (index === -1) {
    return res.status(404).json({ error: 'Agendamento não encontrado' });
  }
  
  const booking = bookings[index];
  
  // Verificar se é o cliente correto
  if (booking.clientId !== clientId) {
    return res.status(403).json({ error: 'Você não está autorizado' });
  }
  
  // Verificar se serviço está em andamento
  if (booking.status !== 'in_progress') {
    return res.status(400).json({ error: 'Serviço não está em andamento' });
  }
  
  // Validar rating
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Avaliação deve ser entre 1 e 5' });
  }
  
  // Buscar serviço para pegar o preço
  const service = services.find(s => s.id === booking.serviceId);
  const basePrice = price || service?.price || 0;
  const finalPrice = calculatePriceWithMargin(basePrice);
  
  // Atualizar booking
  bookings[index] = {
    ...booking,
    status: 'completed',
    completedAt: new Date().toISOString(),
    rating,
    clientReview: review,
    completedPhotos: photos || [],
    basePrice: basePrice,
    finalPrice: finalPrice
  };
  
  // NÃO deletar fotos do cliente - elas precisam ficar disponíveis no histórico
  // Caso queira economizar espaço, implementar limpeza automática após 30+ dias
  
  // Criar review
  const newReview = {
    id: Date.now().toString(),
    bookingId: bookingId,
    serviceId: booking.serviceId,
    jovemId: booking.jovemId,
    clientId: clientId,
    rating: rating,
    comment: review,
    photos: photos || [],
    createdAt: new Date().toISOString()
  };
  reviews.push(newReview);
  
  // Atualizar estatísticas do jovem
  const jovemIndex = jovens.findIndex(j => j.id === booking.jovemId);
  if (jovemIndex !== -1) {
    const jovem = jovens[jovemIndex];
    const currentStats = jovem.stats || {
      completedServices: 0,
      rating: 0,
      points: 0,
      totalEarnings: 0
    };
    
    const totalServices = currentStats.completedServices + 1;
    const currentTotalRating = (currentStats.rating || 0) * (currentStats.completedServices || 0);
    const newAverageRating = (currentTotalRating + rating) / totalServices;
    
    jovens[jovemIndex].stats = {
      ...currentStats,
      completedServices: totalServices,
      rating: parseFloat(newAverageRating.toFixed(2)),
      points: (currentStats.points || 0) + (rating * 10), // 10 pontos por estrela
      totalEarnings: (currentStats.totalEarnings || 0) + servicePrice
    };
  }
  
  writeDB(FILES.bookings, bookings);
  writeDB(FILES.jovens, jovens);
  writeDB(FILES.reviews, reviews);
  
  // Enviar email de agradecimento para o cliente
  const users = readDB(FILES.users);
  const ongs = readDB(FILES.ongs);
  const client = users.find(u => u.id === clientId);
  const jovem = jovens.find(j => j.id === booking.jovemId);
  const ong = jovem ? ongs.find(o => o.id === jovem.ongId) : null;
  
  if (client && client.email && jovem) {
    sendThankYouEmail(
      client.email,
      client.name,
      booking.serviceName,
      jovem.name,
      ong ? ong.name : 'ONG Parceira',
      rating
    ).catch(err => console.error('Erro ao enviar email:', err));
  }
  
  res.json({ 
    success: true, 
    message: 'Serviço finalizado com sucesso!',
    booking: bookings[index],
    earnings: servicePrice
  });
};

// Cancelar agendamento pelo cliente (mesmo após aceito pelo jovem)
const cancelBookingByClient = (req, res) => {
  const { id } = req.params;
  const { clientId, reason } = req.body;

  const bookings = readDB(FILES.bookings);
  const index = bookings.findIndex(b => b.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Agendamento não encontrado' });
  }

  const booking = bookings[index];

  // Verificar se é o cliente correto (comparação com conversão para string)
  if (booking.clientId?.toString() !== clientId?.toString()) {
    return res.status(403).json({ error: 'Não autorizado' });
  }

  // Não permitir cancelar se já foi iniciado ou concluído
  if (booking.status === 'in_progress' || booking.status === 'completed') {
    return res.status(400).json({ 
      error: 'Não é possível cancelar um serviço em andamento ou concluído' 
    });
  }

  bookings[index] = {
    ...booking,
    status: 'cancelled',
    cancellationReason: reason || 'Cancelado pelo cliente',
    cancelledBy: 'client',
    cancelledAt: new Date().toISOString()
  };

  // Deletar fotos enviadas pelo cliente (economizar espaço)
  if (booking.clientPhotos && booking.clientPhotos.length > 0) {
    deleteServicePhotos(booking.clientPhotos);
  }

  writeDB(FILES.bookings, bookings);

  res.json({ 
    success: true, 
    message: 'Agendamento cancelado com sucesso',
    booking: bookings[index]
  });
};

// Reagendar serviço pelo cliente (requer nova aceitação do jovem)
const rescheduleBookingByClient = (req, res) => {
  const { id } = req.params;
  const { clientId, newDate, newTime } = req.body;

  if (!newDate) {
    return res.status(400).json({ error: 'Nova data é obrigatória' });
  }

  const bookings = readDB(FILES.bookings);
  const jovens = readDB(FILES.jovens);
  const index = bookings.findIndex(b => b.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Agendamento não encontrado' });
  }

  const booking = bookings[index];

  // Verificar se é o cliente correto (comparação com conversão para string)
  if (booking.clientId?.toString() !== clientId?.toString()) {
    return res.status(403).json({ error: 'Não autorizado' });
  }

  // Não permitir reagendar se já foi iniciado ou concluído
  if (booking.status === 'in_progress' || booking.status === 'completed') {
    return res.status(400).json({ 
      error: 'Não é possível reagendar um serviço em andamento ou concluído' 
    });
  }

  // Verificar se o jovem está disponível na nova data/hora
  if (booking.jovemId) {
    const jovem = jovens.find(j => j.id === booking.jovemId);
    if (jovem && !isJovemAvailable(jovem, newDate, newTime, bookings)) {
      return res.status(400).json({ 
        error: 'O jovem não está disponível nesta nova data/horário' 
      });
    }
  }

  // Atualizar booking - volta para status 'assigned' para o jovem aceitar novamente
  bookings[index] = {
    ...booking,
    date: newDate,
    time: newTime || booking.time,
    status: 'assigned', // Requer nova aceitação do jovem
    checkInPin: null, // Limpar PIN antigo
    rescheduledAt: new Date().toISOString(),
    previousDate: booking.date,
    previousTime: booking.time,
    rescheduledCount: (booking.rescheduledCount || 0) + 1
  };

  writeDB(FILES.bookings, bookings);

  res.json({ 
    success: true, 
    message: 'Agendamento reagendado! O jovem precisa aceitar a nova data.',
    booking: bookings[index]
  });
};

module.exports = {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBooking,
  acceptBooking,
  getPendingBookingsForOng,
  getPendingBookingsForJovem,
  getAvailableSlots,
  getAvailableServicesForClient,
  acceptBookingByJovem,
  rejectBookingByJovem,
  generateCheckInPin,
  validateCheckInPin,
  completeServiceByClient,
  cancelBookingByClient,
  rescheduleBookingByClient
};
