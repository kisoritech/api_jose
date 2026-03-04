require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Cores para console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
};

// Função para print a logo de inicialização
function printStartupScreen() {
  console.clear();
  
  const logo = `
    ╔═══════════════════════════════════════════════════════════════╗
    ║                                                               ║
    ║          🚀 API NODE.JS - GESTÃO DE ESTOQUE & VENDAS         ║
    ║                   Express + PostgreSQL                       ║
    ║                                                               ║
    ╚═══════════════════════════════════════════════════════════════╝
  `;

  console.log(`${colors.cyan}${logo}${colors.reset}`);

  // Informações do servidor
  const info = [
    {
      label: '📊 Ambiente',
      value: NODE_ENV.toUpperCase(),
      color: NODE_ENV === 'production' ? colors.yellow : colors.green,
    },
    {
      label: '🗄️  Banco de Dados',
      value: 'POSTGRESQL',
      color: colors.blue,
    },
    {
      label: '🔌 Porta',
      value: PORT,
      color: colors.green,
    },
    {
      label: '⏰ Horário de Inicialização',
      value: new Date().toLocaleString('pt-BR'),
      color: colors.cyan,
    },
  ];

  console.log(`${colors.bright}${colors.white}INFORMAÇÕES DO SERVIDOR:${colors.reset}\n`);

  info.forEach((item) => {
    console.log(`  ${item.color}${item.label}${colors.reset}: ${colors.bright}${item.value}${colors.reset}`);
  });

  console.log(`\n${colors.green}${colors.bright}✓ Servidor iniciado com sucesso!${colors.reset}\n`);

  // URLs úteis
  console.log(`${colors.bright}${colors.white}URLs ÚTEIS:${colors.reset}`);
  console.log(`  📍 Local:        ${colors.cyan}http://localhost:${PORT}${colors.reset}`);
  console.log(`  🏥 Health Check: ${colors.cyan}http://localhost:${PORT}/health${colors.reset}`);
  console.log(`  🔐 Auth:         ${colors.cyan}POST http://localhost:${PORT}/api/auth/login${colors.reset}`);
  console.log(`  👥 Clientes:     ${colors.cyan}GET  http://localhost:${PORT}/api/clientes${colors.reset}`);
  console.log(`  📦 Produtos:     ${colors.cyan}GET  http://localhost:${PORT}/api/produtos${colors.reset}`);

  console.log(`\n${colors.bright}${colors.white}PRÓXIMOS PASSOS:${colors.reset}`);
  console.log(`  1️⃣  Populate banco: ${colors.yellow}npm run seed${colors.reset}`);
  console.log(`  2️⃣  Testar login:  ${colors.yellow}curl -X POST http://localhost:${PORT}/api/auth/login ...${colors.reset}`);
  console.log(`  3️⃣  Ver exemplos:  ${colors.yellow}cat TESTING_GUIDE.md${colors.reset}`);

  console.log(`\n${colors.dim}Pressione CTRL+C para parar o servidor${colors.reset}\n`);

  console.log(`${colors.bright}${colors.green}═══════════════════════════════════════════════════════════════${colors.reset}\n`);
}

// Iniciar servidor
const server = app.listen(PORT, () => {
  printStartupScreen();
});

// Tratamento de erros
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n${colors.yellow}❌ Erro: Porta ${PORT} já está em uso!${colors.reset}`);
    console.error(`   Tente outra porta: PORT=3001 npm run dev\n`);
  } else {
    console.error(`${colors.yellow}❌ Erro ao iniciar servidor:${colors.reset}`, err);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}⏹️  Encerrando servidor...${colors.reset}`);
  server.close(() => {
    console.log(`${colors.green}✓ Servidor finalizado${colors.reset}\n`);
    process.exit(0);
  });
});
