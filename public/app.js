const baseUrlInput = document.getElementById('baseUrl');
const tokenKey = 'api_test_ui_token';

function setToken(t){
  const input=document.getElementById('tokenInput');
  if(t){
    localStorage.setItem(tokenKey, t);
    input.value = t;
    showStatus('Token armazenado', 'success');
  } else {
    localStorage.removeItem(tokenKey);
    input.value = '';
    showStatus('Token removido', 'info');
  }
}

function getToken(){
  return localStorage.getItem(tokenKey);
}

function showStatus(msg,type='info'){
  const el=document.getElementById('statusMessage');
  el.textContent=msg;
  if(type==='error') el.style.color='red';
  else if(type==='success') el.style.color='green';
  else el.style.color='#222';
}

// Inicializa token se existir
if(getToken()) setToken(getToken());

document.getElementById('btnCopy').addEventListener('click', async ()=>{
  const t = getToken();
  if(!t) return alert('Nenhum token para copiar');
  await navigator.clipboard.writeText(t);
  showStatus('Token copiado!', 'success');
});

document.getElementById('btnClear').addEventListener('click', ()=> setToken(null));

async function request(path, opts={}){
  const url = (baseUrlInput.value||'').replace(/\/$/, '') + path;
  const headers = opts.headers || {};
  if(opts.auth !== false){
    const t = getToken();
    if(t) headers['Authorization'] = 'Bearer '+t;
  }
  if(opts.body && typeof opts.body === 'object'){
    headers['Content-Type'] = 'application/json';
  }
  try{
    const res = await fetch(url, {method: opts.method||'GET', headers, body: opts.body?JSON.stringify(opts.body):undefined});
    const text = await res.text();
    let parsed = text;
    try{ parsed = JSON.parse(text); }
    catch(e){}
    return {status: res.status, ok: res.ok, body: parsed};
  }catch(err){
    return {error: err.message};
  }
}

document.getElementById('btnLogin').addEventListener('click', async ()=>{
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  if(!email || !password) return alert('Preencha email e senha');
  const r = await request('/api/auth/login', {method:'POST', body:{email,password}, auth:false});
  if(r.error){
    showStatus(r.error,'error');
    document.getElementById('response').textContent = r.error;
    return
  }
  if(r.status===200 && r.body && r.body.token){
    setToken(r.body.token);
    showStatus('Login bem sucedido','success');
    document.getElementById('response').textContent = JSON.stringify(r.body, null, 2);
  } else {
    showStatus('Falha no login','error');
    document.getElementById('response').textContent = JSON.stringify(r, null, 2);
  }
});

document.getElementById('btnRegister').addEventListener('click', async ()=>{
  const nome = document.getElementById('regNome').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  const perfil = document.getElementById('regPerfil').value;
  if(!nome||!email||!password) return alert('Preencha nome, email e senha');
  const r = await request('/api/auth/register', {method:'POST', body:{nome,email,password,perfil}, auth:false});
  document.getElementById('response').textContent = JSON.stringify(r, null, 2);
  if(r.status===201 && r.body && r.body.token){ 
    setToken(r.body.token);
    showStatus('Registro realizado e token recebido','success');
  } else if(r.status && r.status!==201){
    showStatus('Falha no registro','error');
  }
});

document.getElementById('btnSend').addEventListener('click', async ()=>{
  const method = document.getElementById('method').value;
  const endpoint = document.getElementById('endpoint').value;
  let body = document.getElementById('body').value.trim();
  let parsedBody = null;
  if(body) try{ parsedBody = JSON.parse(body); } catch(e){ return alert('Body inválido: JSON mal formado') }
  const r = await request(endpoint, {method, body: parsedBody, auth:true});
  document.getElementById('response').textContent = JSON.stringify(r, null, 2);
  if(r.ok) showStatus('Requisição sucedida','success');
  else showStatus('Erro na requisição: '+r.status,'error');
});

document.getElementById('btnSendNoAuth').addEventListener('click', async ()=>{
  const method = document.getElementById('method').value;
  const endpoint = document.getElementById('endpoint').value;
  let body = document.getElementById('body').value.trim();
  let parsedBody = null;
  if(body) try{ parsedBody = JSON.parse(body); } catch(e){ return alert('Body inválido: JSON mal formado') }
  const r = await request(endpoint, {method, body: parsedBody, auth:false});
  document.getElementById('response').textContent = JSON.stringify(r, null, 2);
  if(r.ok) showStatus('Requisição sem auth sucedida','success');
  else showStatus('Erro na requisição: '+r.status,'error');
});
