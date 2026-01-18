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
const assetsRoutes = require('./routes/assets');

const app = express();

// ========================
// CORS (Render / Production)
// ========================
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_ALT,
  'http://localhost:3000',
  'http://localhost',
  'http://localhost:80'
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Permite requests sem origin (Postman, curl, health checks)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));

// ⚠️ Express/Router (path-to-regexp v6) não aceita '*' aqui
// Use regex para cobrir qualquer rota no preflight
app.options(/.*/, cors(corsOptions));

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
app.use('/api/assets', assetsRoutes);

// Health check (múltiplas rotas para compatibilidade)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Impulso Jovem API'
  });
});

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
      admin: '/api/admin',
      upload: '/api/upload'
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack || err);
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
    console.log(`🌐 Allowed origins: ${allowedOrigins.join(', ')}`);
  } else {
    console.log(`💻 Modo local - Acesse via proxy na porta 80 ou diretamente na ${PORT}`);
  }
});

module.exports = app;
