-- Tabela de números conhecidos com permissões
CREATE TABLE IF NOT EXISTS known_numbers (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  permissions JSONB DEFAULT '["chat"]'::jsonb,
  source VARCHAR(50) DEFAULT 'manual',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índice para busca por número
CREATE INDEX IF NOT EXISTS idx_known_numbers_phone ON known_numbers(phone_number);

-- Comentários na tabela
COMMENT ON TABLE known_numbers IS 'Números autorizados a interagir com o Hermes Juliana via WhatsApp';
COMMENT ON COLUMN known_numbers.permissions IS 'Permissões: chat, dev, cicd, deploy, admin, financial';
COMMENT ON COLUMN known_numbers.role IS 'Papel: user, developer, admin, operator';
