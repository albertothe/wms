-- Índices de performance para Painel Separação e Painel Entrega
-- Executar no banco do WMS (operação segura — CREATE INDEX IF NOT EXISTS)

-- ─── wms_separacoes ────────────────────────────────────────────────────────

-- Filtro principal: exclui finalizadas antigas (status + data_fim)
CREATE INDEX IF NOT EXISTS idx_separacoes_status_data_fim
  ON wms_separacoes (status, data_fim);

-- Filtro por separador
CREATE INDEX IF NOT EXISTS idx_separacoes_usuario
  ON wms_separacoes (usuario_atribuido);

-- Filtro por tipo de entrega
CREATE INDEX IF NOT EXISTS idx_separacoes_tipoentrega
  ON wms_separacoes (tipoentrega);

-- JOIN com wms_separacao_itens e vs_wms_fpainel_saida
CREATE INDEX IF NOT EXISTS idx_separacoes_chave
  ON wms_separacoes (chave);

-- ─── wms_separacao_itens ───────────────────────────────────────────────────

-- JOIN e agregação por chave (GROUP BY / SUM)
CREATE INDEX IF NOT EXISTS idx_separacao_itens_chave
  ON wms_separacao_itens (chave);

-- ─── wms_entregas ──────────────────────────────────────────────────────────

-- Verificação rápida de AguardandoNF (evita varredura total)
CREATE INDEX IF NOT EXISTS idx_entregas_status
  ON wms_entregas (status);

-- Filtro de 3 dias para Entregue
CREATE INDEX IF NOT EXISTS idx_entregas_status_data_entregue
  ON wms_entregas (status, data_entregue);
