const pool = require('./src/config/database');
async function run(){
  const email = 'jvangelo1999@gmail.com';
  try {
    const [rows] = await pool.execute('SELECT id,email,perfil,senha_hash FROM usuarios WHERE email = ?', [email]);
    console.log('rows', rows);
  } catch(err) {
    console.error('query error', err.message || err);
  }
  process.exit();
}
run().catch(e=>{console.error('run error',e.message||e);process.exit(1);});