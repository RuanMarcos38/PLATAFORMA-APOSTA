import { pool } from '../config/db.js';
const email=String(process.env.ADMIN_EMAIL||'').trim().toLowerCase();
if(!email){console.error('Defina ADMIN_EMAIL com o e-mail de uma conta já cadastrada.');process.exit(2)}
try{const q=await pool.query("update users set role='admin',updated_at=now() where email=$1 returning id,email,role",[email]);if(!q.rowCount){console.error('Conta não encontrada. Cadastre a conta normalmente antes de promovê-la.');process.exitCode=1}else{await pool.query('insert into admin_audit(actor_user_id,action,target_type,target_id,details) values(null,$1,$2,$3,$4)',['bootstrap_admin_promoted','user',q.rows[0].id,{email:q.rows[0].email}]);console.log('Conta promovida para admin:',q.rows[0].email)}}finally{await pool.end()}
