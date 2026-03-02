const pool = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function run(){
  const [rows] = await pool.execute("SELECT id, senha_hash FROM usuarios");
  for(const r of rows){
    if (!r.senha_hash.startsWith('$2')){
      const newHash = await bcrypt.hash(r.senha_hash, 8);
      await pool.execute('UPDATE usuarios SET senha_hash = ? WHERE id = ?', [newHash, r.id]);
      console.log('hashed user', r.id);
    }
  }
  console.log('done');
  process.exit();
}
run().catch(e=>{console.error(e);process.exit(1);});