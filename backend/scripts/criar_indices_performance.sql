-- Índices de performance para Painel Separação e Painel Entrega
-- Executar no banco do WMS FORA de uma transação (psql direto)
-- CONCURRENTLY não bloqueia a tabela durante a criação

-- ─── wms_separacoes ────────────────────────────────────────────────────────

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_separacoes_status_data_fim
  ON wms_separacoes (status, data_fim);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_separacoes_usuario
  ON wms_separacoes (usuario_atribuido);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_separacoes_tipoentrega
  ON wms_separacoes (tipoentrega);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_separacoes_chave
  ON wms_separacoes (chave);

-- ─── wms_separacao_itens ───────────────────────────────────────────────────

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_separacao_itens_chave
  ON wms_separacao_itens (chave);

-- ─── wms_entregas ──────────────────────────────────────────────────────────

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entregas_status
  ON wms_entregas (status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entregas_status_data_entregue
  ON wms_entregas (status, data_entregue);
