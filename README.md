# Impulso Jovem - Backend API

Backend da plataforma Impulso Jovem, uma solução digital para inclusão produtiva de jovens em situação de vulnerabilidade.

## 🚀 Tecnologias

- Node.js
- Express.js
- JSON File Database
- JWT Authentication
- bcryptjs

## 📁 Estrutura de Pastas

```
backend/
├── config/           # Configurações da aplicação
├── controllers/      # Lógica de negócio
├── middleware/       # Middlewares (autenticação, etc)
├── routes/          # Definição de rotas
├── database/        # Arquivos JSON do banco de dados
└── index.js         # Servidor principal
```

## 🔧 Instalação

```bash
cd backend
npm install
```

## ▶️ Executar

```bash
# Modo produção
npm start

# Modo desenvolvimento (com nodemon)
npm run dev
```

## 🌐 Endpoints

### Autenticação
- `POST /api/auth/register` - Registro de usuário
- `POST /api/auth/login` - Login

### ONGs
- `GET /api/ongs` - Listar ONGs
- `GET /api/ongs/:id` - Obter ONG específica
- `PUT /api/ongs/:id` - Atualizar ONG
- `POST /api/ongs/:id/jovens` - Vincular jovem à ONG

### Jovens
- `GET /api/jovens` - Listar jovens
- `GET /api/jovens/:id` - Obter jovem específico
- `PUT /api/jovens/:id` - Atualizar jovem

### Serviços
- `POST /api/services` - Criar serviço
- `GET /api/services` - Listar serviços
- `GET /api/services/:id` - Obter serviço específico
- `PUT /api/services/:id` - Atualizar serviço
- `POST /api/services/:id/accept` - Aceitar serviço

### Agendamentos
- `POST /api/bookings` - Criar agendamento
- `GET /api/bookings` - Listar agendamentos
- `GET /api/bookings/:id` - Obter agendamento específico
- `PUT /api/bookings/:id` - Atualizar agendamento

### Avaliações
- `POST /api/reviews` - Criar avaliação
- `GET /api/reviews` - Listar avaliações

### Admin
- `GET /api/admin/stats` - Estatísticas gerais
- `GET /api/admin/users` - Listar todos os usuários

## 🔐 Autenticação

A API usa JWT (JSON Web Tokens) para autenticação. Inclua o token no header:

```
Authorization: Bearer <token>
```

## 👥 Tipos de Usuário

- `admin` - Administrador
- `ong` - Organização
- `jovem` - Jovem prestador de serviço
- `cliente` - Cliente solicitante

## 📊 Banco de Dados

Os dados são armazenados em arquivos JSON em `database/`:
- `users.json` - Usuários
- `ongs.json` - ONGs
- `jovens.json` - Jovens
- `services.json` - Serviços
- `bookings.json` - Agendamentos
- `reviews.json` - Avaliações
