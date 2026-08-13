const SESSION_STATES = {
  IDLE: 'IDLE',
  RUNNING: 'RUNNING',
  EXECUTING_ACTION: 'EXECUTING_ACTION',
  AWAITING_VERIFICATION: 'AWAITING_VERIFICATION',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED'
};

async function updateSessionState(pool, sessionId, state, dagMetadata = {}) {
  if (!sessionId) return;
  const validState = SESSION_STATES[state] || SESSION_STATES.RUNNING;
  try {
    await pool.query(`
      UPDATE chat_sessions
      SET state = $2, active_dag_json = $3::jsonb, fsm_updated_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `, [sessionId, validState, JSON.stringify(dagMetadata || {})]);
  } catch (err) {
    console.warn('[SESSION FSM UPDATE WARN]:', err.message);
  }
}

async function getSessionState(pool, sessionId) {
  if (!sessionId) return { state: SESSION_STATES.IDLE, active_dag_json: {} };
  try {
    const res = await pool.query(
      'SELECT state, active_dag_json, fsm_updated_at FROM chat_sessions WHERE id = $1',
      [sessionId]
    );
    if (res.rows[0]) {
      return {
        state: res.rows[0].state || SESSION_STATES.IDLE,
        active_dag_json: res.rows[0].active_dag_json || {},
        fsm_updated_at: res.rows[0].fsm_updated_at
      };
    }
  } catch (err) {
    console.warn('[SESSION FSM GET WARN]:', err.message);
  }
  return { state: SESSION_STATES.IDLE, active_dag_json: {} };
}

function calculateCosineSimilarity(vecA = [], vecB = []) {
  if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length === 0 || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i += 1) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function retrieveRelevantMemories(pool, promptText, limit = 5) {
  if (!promptText || typeof promptText !== 'string') return [];
  const words = promptText.toLowerCase().replace(/[^a-z0-9-áàâãéèêíïóôõöúçñ\s]/gi, ' ').split(/\s+/).filter(w => w.length > 3);
  try {
    const res = await pool.query('SELECT content, memory_type, confidence FROM user_memories ORDER BY created_at DESC LIMIT 50');
    if (!res.rows.length) return [];
    const scored = res.rows.map(m => {
      const textLower = (m.content || '').toLowerCase();
      let matchScore = 0;
      for (const w of words) {
        if (textLower.includes(w)) matchScore += 1;
      }
      return { ...m, score: matchScore };
    });
    return scored.filter(m => m.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
  } catch (err) {
    console.warn('[RAG MEMORY RETRIEVAL WARN]:', err.message);
    return [];
  }
}

module.exports = {
  SESSION_STATES,
  updateSessionState,
  getSessionState,
  calculateCosineSimilarity,
  retrieveRelevantMemories
};
