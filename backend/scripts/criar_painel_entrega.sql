-- Script: Painel Entrega
-- Executar como DBA no banco do WMS

-- 1. Tabela de entregas
CREATE TABLE IF NOT EXISTS wms_entregas (
  id            serial,
  chave         varchar(10) NOT NULL,
  codloja       integer NOT NULL,
  np            varchar(20) NOT NULL,
  destinario    varchar(100) NOT NULL,
  endereco      varchar(200),
  cidade_uf     varchar(100),
  data_criacao  timestamp DEFAULT NOW(),
  data_nf       timestamp,
  data_saiu     timestamp,
  data_entregue timestamp,
  status        varchar(20) NOT NULL DEFAULT 'AguardandoNF',
  CONSTRAINT wms_entregas_pkey PRIMARY KEY (id),
  CONSTRAINT wms_entregas_chave_unique UNIQUE (chave)
);

-- 2. Registrar módulo logo após o Painel Separação
INSERT INTO wms_modulos (nome, rota, icone, ordem, ativo)
SELECT
  'Painel Entrega',
  'painelentrega',
  'local_shipping',
  COALESCE((SELECT ordem FROM wms_modulos WHERE rota = 'painelseparacao'), 0) + 1,
  true
WHERE NOT EXISTS (SELECT 1 FROM wms_modulos WHERE rota = 'painelentrega');

-- Abre espaço para o novo módulo ficar logo após o Painel Separação
UPDATE wms_modulos
SET ordem = ordem + 1
WHERE ordem > COALESCE((SELECT ordem FROM wms_modulos WHERE rota = 'painelseparacao'), 0)
  AND rota <> 'painelentrega';

-- Garante que a ordem do Painel Entrega seja logo após Painel Separação
UPDATE wms_modulos
SET ordem = COALESCE((SELECT ordem FROM wms_modulos WHERE rota = 'painelseparacao'), 0) + 1
WHERE rota = 'painelentrega';

-- 3. Conceder permissões a todos os níveis de acesso ativos
INSERT INTO wms_permissoes_nivel (codigo_nivel, id_modulo, visualizar, incluir, editar, excluir)
SELECT
  na.codigo,
  m.id,
  true,   -- visualizar
  false,  -- incluir
  true,   -- editar (necessário para atualizar status de entrega)
  false   -- excluir
FROM wms_niveis_acesso na
CROSS JOIN wms_modulos m
WHERE m.rota = 'painelentrega'
  AND na.ativo = true
  AND NOT EXISTS (
    SELECT 1 FROM wms_permissoes_nivel p
    WHERE p.codigo_nivel = na.codigo AND p.id_modulo = m.id
  );
