const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');

const routes = require('./routes');
const legacyRoutes = require('./routes/legacyRoutes');
const errorMiddleware = require('./middlewares/errorMiddleware');

const app = express();

// Segurança - relaxar CSP em desenvolvimento para permitir testes
if (process.env.NODE_ENV === 'production') {
  app.use(helmet());
} else {
  app.use(helmet({
    contentSecurityPolicy: false
  }));
}
app.set('trust proxy', 1);

// Logging (desabilitar em testes)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requisições por IP
  message: 'Muitas requisições deste IP, tente novamente mais tarde.'
});
app.use(limiter);

// CORS
app.use(cors());

// Body parser
app.use(express.json());

// Servir arquivos estáticos para facilitar testes via browser
app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Rotas
app.use('/', legacyRoutes);
app.use('/api', routes);

// rota raiz para desenvolvimento: serve index.html se existir
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Health check (útil para Render)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Middleware de erro (deve ser o último)
app.use(errorMiddleware);

module.exports = app;
