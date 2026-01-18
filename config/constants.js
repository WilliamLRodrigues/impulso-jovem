module.exports = {
  PORT: process.env.PORT || 5001,
  SECRET_KEY: process.env.SECRET_KEY || 'impulso-jovem-secret-key-2026',
  
  USER_TYPES: {
    ADMIN: 'admin',
    ONG: 'ong',
    JOVEM: 'jovem',
    CLIENTE: 'cliente'
  },

  SERVICE_STATUS: {
    AVAILABLE: 'available',
    ASSIGNED: 'assigned',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
  },

  BOOKING_STATUS: {
    PENDING: 'pending',
    ASSIGNED: 'assigned',
    CONFIRMED: 'confirmed',
    CHECKED_IN: 'checked_in',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    REJECTED: 'rejected'
  }
};
