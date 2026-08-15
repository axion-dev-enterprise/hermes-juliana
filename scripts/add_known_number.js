const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || 'postgresql://localhost:5432/hermes_juliana'
});

async function addKnownNumber(phoneNumber, name, role, permissions, source) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const result = await client.query(`
      INSERT INTO known_numbers (phone_number, name, role, permissions, source)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (phone_number) 
      DO UPDATE SET 
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        permissions = EXCLUDED.permissions,
        source = EXCLUDED.source,
        updated_at = NOW()
      RETURNING id, phone_number, name, role, permissions, source, is_active, created_at
    `, [phoneNumber, name, role, JSON.stringify(permissions), source]);
    
    await client.query('COMMIT');
    console.log('✅ Número adicionado/atualizado com sucesso:');
    console.log(JSON.stringify(result.rows[0], null, 2));
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao adicionar número:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Configuração para Juliana Witter
const juliana = {
  phoneNumber: '+555496410288',
  name: 'Juliana Witter',
  role: 'developer',
  permissions: ['chat', 'dev', 'cicd', 'deploy'],
  source: 'workana'
};

// Executar se chamado diretamente
if (require.main === module) {
  addKnownNumber(
    juliana.phoneNumber,
    juliana.name,
    juliana.role,
    juliana.permissions,
    juliana.source
  )
  .then(() => {
    console.log('\n📋 Permissões concedidas:');
    console.log('• chat - Conversar com o agente');
    console.log('• dev - Solicitar desenvolvimento de código');
    console.log('• cicd - Configurar pipelines CI/CD');
    console.log('• deploy - Executar deploys');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Falha:', error.message);
    process.exit(1);
  });
}

module.exports = { addKnownNumber };
