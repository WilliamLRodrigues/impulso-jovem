const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { PORT } = require('./config/constants');
const { initDatabase } = require('./config/database');

// Importar rotas
const authRoutes = require('./routes/auth');
const ongRoutes = require('./routes/ongs');
const jovemRoutes = require('./routes/jovens');
const serviceRoutes = require('./routes/services');
const bookingRoutes = require('./routes/bookings');
const reviewRoutes = require('./routes/reviews');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/upload');

const app = express();

// Configurar CORS - Detecta automaticamente o ambiente
const isProduction = process.env.NODE_ENV === 'production';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

const corsOptions = {
  origin: isProduction 
    ? [frontendUrl, process.env.FRONTEND_URL_ALT] // Em produção, usa variáveis de ambiente
    : ['http://localhost', 'http://localhost:80', 'http://localhost:3000', 'https://impulso-jovem-fe.onrender.com'], // Local: aceita tudo
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(express.json());

// Servir arquivos estáticos da pasta uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Inicializar banco de dados
initDatabase();

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/ongs', ongRoutes);
app.use('/api/jovens', jovemRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Impulso Jovem API'
  });
});

// Rota padrão
app.get('/', (req, res) => {
  res.json({ 
    message: 'Impulso Jovem API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      ongs: '/api/ongs',
      jovens: '/api/jovens',
      services: '/api/services',
      bookings: '/api/bookings',
      reviews: '/api/reviews',
      admin: '/api/admin'
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo deu errado!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor Backend Impulso Jovem rodando!`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 API disponível em: http://localhost:${PORT}/api`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`🌐 Frontend URL: ${frontendUrl}`);
  } else {
    console.log(`💻 Modo local - Acesse via proxy na porta 80 ou diretamente na ${PORT}`);
  }
});

module.exports = app;
