# 🚀 QUICK START - Deploy no Render (5 minutos)

## ⏱️ Tempo estimado: 5 minutos

---

## ✅ Pré-requisitos (2 min)

- [x] Conta GitHub
- [x] Conta Render (grátis em [render.com](https://render.com))

---

## 📋 Passo 1: GitHub (2 min)

```bash
# Na pasta do projeto
git init
git add .
git commit -m "API pronta para produção"
git branch -M main
git remote add origin https://github.com/seu-usuario/api.git
git push -u origin main
```

---

## 🌐 Passo 2: Render Dashboard (1 min)

1. Vá para [render.com/dashboard](https://render.com/dashboard)
2. Clique **New** (+) → **Web Service**
3. Selecione **Github**
4. Procure por **api** e clique **Connect**

---

## ⚙️ Passo 3: Configuração

Preencha os campos:

| Campo | Valor |
|-------|-------|
| Name | `api` |
| Region | São Paulo (ou sua região) |
| Branch | `main` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Environment | `Node` |
| Plan | `Free` |

**Clique `Create Web Service`** ✅

---

## 🔐 Passo 4: Environment Variables (1 min)

Enquanto faz build, adicione variáveis:

No painel → **Environment**

Adicione (Render fornecerá DATABASE_URL automaticamente):

```
NODE_ENV=production
PORT=10000

JWT_SECRET=coloque_um_secret_muito_seguro_aqui
JWT_EXPIRES_IN=8h
```

---

## ✨ Passo 5: Deploy (aguarde)

Render fará o build e deploy automaticamente ~1-2 min.

Você verá:
```
Build successful ✓
Server running on port 10000 ✓
```

---

## 🎉 Pronto!

Sua API estará em:
```
https://api.render.com  (seu URL real)
```

---

## 🧪 Teste a API

```bash
# Health check
curl https://api.render.com/health
# Resposta: { "status": "OK" }

# Registrar usuário
curl -X POST https://api.render.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Teste",
    "email": "teste@test.com",
    "password": "123456",
    "perfil": "vendedor"
  }'
```

---

## ❌ Algo deu errado?

### Erro: ECONNREFUSED (banco não conecta)

```bash
# Verifica:
1. DB_HOST está correto? (copia do Railway/PlanetScale)
2. DB_USER e DB_PASSWORD estão certas?
3. DB_SSL=true está correto?
4. Banco permite conexão externa? (check firewall)
```

**Solução**: Revise as variáveis no painel e redeploy

### Erro: Build failed

```bash
# Log completo em:
Dashboard → api → Logs (aba "Deploy")
```

---

## 🔄 Fazer deploy novamente

```bash
# Depois que alterar o código:
git add .
git commit -m "Fix: algo"
git push

# Render fará deploy automaticamente em 30s!
```

---

## 📊 Monitorando

**Acessar logs em tempo real:**
- Dashboard → api → Logs

**Ver métricas:**
- Dashboard → api → Metrics

---

## 🎓 Próximo: Adicioned features

Depois que estiver rodando:

- [ ] Adicionar validações mais robustas
- [ ] Implementar caching (Redis)
- [ ] Setup de bancos de dados com migration
- [ ] Implementar CORS mais restritivo
- [ ] Add webhook para atualizações automáticas

---

## 📚 Docs

- [Render Web Service Docs](https://render.com/docs/deploy-node-express-app)

---

**Sucesso! 🎊**

Sua API profissional está no ar! 🚀

Compartilhe o link: `https://api.render.com` (seu URL real)
