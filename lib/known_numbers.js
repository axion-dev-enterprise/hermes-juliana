const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || 'postgresql://localhost:5432/hermes_juliana'
});

// Cache em memória para performance (TTL: 5 minutos)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Verifica se um número está autorizado e retorna suas permissões
 * @param {string} phoneNumber - Número do telefone (formato: +555496410288)
 * @returns {Object|null} - Objeto com permissões ou null se não autorizado
 */
async function checkKnownNumber(phoneNumber) {
  // Normalizar número (remover espaços, traços)
  const normalized = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  // Verificar cache
  const cached = cache.get(normalized);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  try {
    const result = await pool.query(`
      SELECT id, phone_number, name, role, permissions, source, is_active
      FROM known_numbers
      WHERE phone_number = $1 AND is_active = true
    `, [normalized]);
    
    const data = result.rows[0] || null;
    
    // Atualizar cache
    cache.set(normalized, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  } catch (error) {
    console.error('[KNOWN_NUMBERS] Erro ao verificar número:', error.message);
    return null;
  }
}

/**
 * Verifica se um número tem uma permissão específica
 * @param {string} phoneNumber - Número do telefone
 * @param {string} permission - Permissão a verificar (chat, dev, cicd, deploy, admin, financial)
 * @returns {boolean}
 */
async function hasPermission(phoneNumber, permission) {
  const known = await checkKnownNumber(phoneNumber);
  if (!known) return false;
  return known.permissions.includes(permission);
}

/**
 * Verifica se um número pode executar uma ação
 * @param {string} phoneNumber - Número do telefone
 * @param {string} action - Ação a executar
 * @returns {Object} - { allowed: boolean, reason?: string }
 */
async function checkActionPermission(phoneNumber, action) {
  const known = await checkKnownNumber(phoneNumber);
  
  if (!known) {
    return { allowed: false, reason: 'Número não autorizado. Solicite acesso ao administrador.' };
  }
  
  // Mapeamento de ações para permissões necessárias
  const actionPermissions = {
    'chat': ['chat'],
    'dev': ['dev', 'admin'],
    'cicd': ['cicd', 'admin'],
    'deploy': ['deploy', 'admin'],
    'financial': ['financial', 'admin'],
    'admin': ['admin']
  };
  
  const requiredPermissions = actionPermissions[action] || ['admin'];
  const hasPermission = requiredPermissions.some(p => known.permissions.includes(p));
  
  if (!hasPermission) {
    return { 
      allowed: false, 
      reason: `Permissão '${action}' não autorizada. Suas permissões: ${known.permissions.join(', ')}` 
    };
  }
  
  return { allowed: true };
}

/**
 * Limpa o cache (para uso após atualizações)
 */
function clearCache() {
  cache.clear();
}

module.exports = {
  checkKnownNumber,
  hasPermission,
  checkActionPermission,
  clearCache
};
