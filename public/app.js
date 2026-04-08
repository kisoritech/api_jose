const baseUrlInput = document.getElementById('baseUrl');
const tokenKey = 'api_test_ui_token';

function setToken(token) {
  const input = document.getElementById('tokenInput');
  if (token) {
    localStorage.setItem(tokenKey, token);
    input.value = token;
    showStatus('Token armazenado', 'success');
  } else {
    localStorage.removeItem(tokenKey);
    input.value = '';
    showStatus('Token removido', 'info');
  }
}

function getToken() {
  return localStorage.getItem(tokenKey);
}

function showStatus(message, type = 'info') {
  const el = document.getElementById('statusMessage');
  el.textContent = message;
  if (type === 'error') el.style.color = 'red';
  else if (type === 'success') el.style.color = 'green';
  else el.style.color = '#222';
}

function setResponse(data) {
  document.getElementById('response').textContent = typeof data === 'string'
    ? data
    : JSON.stringify(data, null, 2);
}

function parseJsonInput(value) {
  const body = value.trim();
  if (!body) return null;
  return JSON.parse(body);
}

function toIsoFromLocalInput(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function request(path, opts = {}) {
  const url = (baseUrlInput.value || '').trim().replace(/\/$/, '') + path;
  const headers = opts.headers || {};

  if (opts.auth !== false) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  if (opts.body && typeof opts.body === 'object') {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(url, {
      method: opts.method || 'GET',
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });

    const text = await res.text();
    let parsed = text;

    try {
      parsed = JSON.parse(text);
    } catch (e) {
      // Resposta nao veio em JSON.
    }

    return { status: res.status, ok: res.ok, body: parsed };
  } catch (err) {
    return { error: err.message };
  }
}

if (getToken()) setToken(getToken());

document.getElementById('btnCopy').addEventListener('click', async () => {
  const token = getToken();
  if (!token) return alert('Nenhum token para copiar');
  await navigator.clipboard.writeText(token);
  showStatus('Token copiado', 'success');
});

document.getElementById('btnClear').addEventListener('click', () => setToken(null));

document.getElementById('btnLogin').addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  if (!email || !password) {
    return alert('Preencha email e senha');
  }

  const response = await request('/api/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false
  });

  if (response.error) {
    showStatus(response.error, 'error');
    return setResponse(response.error);
  }

  if (response.ok && response.body?.token) {
    setToken(response.body.token);
    showStatus('Login bem sucedido', 'success');
  } else if (response.body?.error) {
    showStatus(response.body.error, 'error');
  } else {
    showStatus('Falha no login', 'error');
  }

  setResponse(response);
});

document.getElementById('btnRegister').addEventListener('click', async () => {
  const nome = document.getElementById('regNome').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  const perfil = document.getElementById('regPerfil').value;

  if (!nome || !email || !password) {
    return alert('Preencha nome, email e senha');
  }

  const response = await request('/api/auth/register', {
    method: 'POST',
    body: { nome, email, password, perfil },
    auth: false
  });

  if (response.ok && response.body?.token) {
    setToken(response.body.token);
    showStatus('Registro realizado', 'success');
  } else if (response.body?.error) {
    showStatus(response.body.error, 'error');
  } else if (response.error) {
    showStatus(response.error, 'error');
  } else {
    showStatus('Falha no registro', 'error');
  }

  setResponse(response);
});

document.getElementById('btnSend').addEventListener('click', async () => {
  const method = document.getElementById('method').value;
  const endpoint = document.getElementById('endpoint').value;

  let parsedBody = null;
  try {
    parsedBody = parseJsonInput(document.getElementById('body').value);
  } catch (e) {
    return alert('Body invalido: JSON mal formado');
  }

  const response = await request(endpoint, {
    method,
    body: parsedBody,
    auth: true
  });

  setResponse(response);
  if (response.ok) showStatus('Requisicao sucedida', 'success');
  else showStatus(`Erro na requisicao: ${response.body?.error || response.status || response.error}`, 'error');
});

document.getElementById('btnSendNoAuth').addEventListener('click', async () => {
  const method = document.getElementById('method').value;
  const endpoint = document.getElementById('endpoint').value;

  let parsedBody = null;
  try {
    parsedBody = parseJsonInput(document.getElementById('body').value);
  } catch (e) {
    return alert('Body invalido: JSON mal formado');
  }

  const response = await request(endpoint, {
    method,
    body: parsedBody,
    auth: false
  });

  setResponse(response);
  if (response.ok) showStatus('Requisicao sem token sucedida', 'success');
  else showStatus(`Erro na requisicao: ${response.body?.error || response.status || response.error}`, 'error');
});

document.getElementById('btnCreateSale').addEventListener('click', async () => {
  const cliente_id = parseInt(document.getElementById('saleCliente').value, 10);
  const produto_id = parseInt(document.getElementById('saleProduto').value, 10);
  const quantidade = parseInt(document.getElementById('saleQtde').value, 10);
  const valor_unitario = parseFloat(document.getElementById('saleValor').value);
  const forma_pagamento = document.getElementById('salePagamento').value;
  const frete_valor = parseFloat(document.getElementById('saleFrete').value || '0');

  if (!cliente_id || !produto_id || !quantidade || Number.isNaN(valor_unitario)) {
    return alert('Preencha cliente, produto, quantidade e valor corretamente.');
  }

  const body = {
    cliente_id,
    forma_pagamento,
    frete_valor,
    itens: [
      {
        produto_id,
        quantidade,
        valor_unitario
      }
    ]
  };

  const response = await request('/api/vendas', {
    method: 'POST',
    body,
    auth: true
  });

  setResponse(response);
  if (response.ok) showStatus('Venda registrada com sucesso', 'success');
  else showStatus(`Erro ao registrar venda: ${response.body?.error || response.status || response.error}`, 'error');
});

document.getElementById('btnCreateRent').addEventListener('click', async () => {
  const cliente_id = parseInt(document.getElementById('rentCliente').value, 10);
  const produto_id = parseInt(document.getElementById('rentProduto').value, 10);
  const quantidade = parseInt(document.getElementById('rentQtde').value, 10);
  const valor_unitario = parseFloat(document.getElementById('rentValor').value);
  const data_inicio = toIsoFromLocalInput(document.getElementById('rentInicio').value);
  const data_prevista_devolucao = toIsoFromLocalInput(document.getElementById('rentFim').value);

  if (!cliente_id || !produto_id || !quantidade || Number.isNaN(valor_unitario) || !data_inicio || !data_prevista_devolucao) {
    return alert('Preencha cliente, produto, quantidade, valor e datas da locacao corretamente.');
  }

  const body = {
    cliente_id,
    produto_id,
    quantidade,
    valor_unitario,
    data_inicio,
    data_prevista_devolucao
  };

  const response = await request('/api/locacoes', {
    method: 'POST',
    body,
    auth: true
  });

  setResponse(response);
  if (response.ok) showStatus('Locacao registrada com sucesso', 'success');
  else showStatus(`Erro ao registrar locacao: ${response.body?.error || response.status || response.error}`, 'error');
});

document.querySelectorAll('.quick-action').forEach((button) => {
  button.addEventListener('click', async () => {
    const endpoint = button.dataset.endpoint;
    const auth = button.dataset.auth !== 'false';
    const response = await request(endpoint, { method: 'GET', auth });

    setResponse(response);
    if (response.ok) showStatus(`Consulta carregada: ${endpoint}`, 'success');
    else showStatus(`Erro na consulta: ${response.body?.error || response.status || response.error}`, 'error');
  });
});
