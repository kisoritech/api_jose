const baseUrlInput = document.getElementById('baseUrl');
const tokenKey = 'api_test_ui_token';

function parseNumberInput(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

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

function buildProductPayload() {
  const nome = document.getElementById('productNome').value.trim();
  const tipo = document.getElementById('productTipo').value;
  const codigo_barras = document.getElementById('productCodigoBarras').value.trim();
  const descricao = document.getElementById('productDescricao').value.trim();
  const preco_venda = parseNumberInput(document.getElementById('productPrecoVenda').value);
  const preco_custo = parseNumberInput(document.getElementById('productPrecoCusto').value);
  const valor_locacao = parseNumberInput(document.getElementById('productValorLocacao').value);
  const quantidade = parseNumberInput(document.getElementById('productQuantidade').value);

  const payload = {
    nome,
    tipo
  };

  if (descricao) payload.descricao = descricao;
  if (codigo_barras) payload.codigo_barras = codigo_barras;
  if (preco_venda !== null) payload.preco_venda = preco_venda;
  if (preco_custo !== null) payload.preco_custo = preco_custo;
  if (valor_locacao !== null) payload.valor_locacao = valor_locacao;
  if (quantidade !== null) payload.quantidade = quantidade;

  return payload;
}

function updateProductSummary() {
  const payload = buildProductPayload();
  const summary = document.getElementById('productSummary');

  if (!payload.nome) {
    summary.textContent = 'Preencha pelo menos o nome do produto para montar o resumo.';
    return;
  }

  if (!Number.isFinite(payload.preco_venda)) {
    summary.textContent = `O produto "${payload.nome}" ainda precisa de um preco de venda valido antes do envio.`;
    return;
  }

  const quantidade = Number.isFinite(payload.quantidade) ? payload.quantidade : 0;
  const valorBase = Number.isFinite(payload.preco_custo) && payload.preco_custo > 0
    ? payload.preco_custo
    : payload.preco_venda;

  summary.textContent = quantidade > 0
    ? `Ao cadastrar "${payload.nome}", a API vai criar o produto e registrar uma entrada inicial de ${quantidade} unidade(s) em transacoes com valor base ${valorBase}.`
    : `Ao cadastrar "${payload.nome}", a API vai criar o produto sem estoque inicial. Depois voce pode abastecer o estoque por movimentacao.`;
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

document.getElementById('btnCreateProduct').addEventListener('click', async () => {
  const body = buildProductPayload();

  if (!body.nome || !Number.isFinite(body.preco_venda)) {
    return alert('Preencha pelo menos nome e preco de venda do produto.');
  }

  if (body.quantidade !== undefined && (!Number.isInteger(body.quantidade) || body.quantidade < 0)) {
    return alert('O estoque inicial deve ser um numero inteiro maior ou igual a zero.');
  }

  if (body.preco_custo !== undefined && (!Number.isFinite(body.preco_custo) || body.preco_custo < 0)) {
    return alert('O preco de custo deve ser um numero maior ou igual a zero.');
  }

  if (body.valor_locacao !== undefined && (!Number.isFinite(body.valor_locacao) || body.valor_locacao < 0)) {
    return alert('O valor de locacao deve ser um numero maior ou igual a zero.');
  }

  const response = await request('/api/produtos', {
    method: 'POST',
    body,
    auth: true
  });

  setResponse(response);
  if (response.ok) {
    const produtoId = response.body?.body?.id || response.body?.id;
    showStatus('Produto cadastrado com sucesso', 'success');
    if (produtoId) {
      document.getElementById('saleProduto').value = produtoId;
      document.getElementById('rentProduto').value = produtoId;
    }
  } else {
    showStatus(`Erro ao cadastrar produto: ${response.body?.error || response.status || response.error}`, 'error');
  }
});

document.getElementById('btnProductToBuilder').addEventListener('click', () => {
  const payload = buildProductPayload();
  document.getElementById('method').value = 'POST';
  document.getElementById('endpoint').value = '/api/produtos';
  document.getElementById('body').value = JSON.stringify(payload, null, 2);
  updateProductSummary();
  showStatus('Payload do produto enviado para o construtor de requisicoes', 'success');
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

[
  'productNome',
  'productTipo',
  'productCodigoBarras',
  'productDescricao',
  'productPrecoVenda',
  'productPrecoCusto',
  'productValorLocacao',
  'productQuantidade'
].forEach((id) => {
  document.getElementById(id).addEventListener('input', updateProductSummary);
});

updateProductSummary();
