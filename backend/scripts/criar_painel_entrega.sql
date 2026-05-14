-- Script: Painel Entrega
-- Executar como DBA no banco do WMS

-- 1. Tabela de entregas
CREATE TABLE IF NOT EXISTS wms_entregas (
  id            serial PRIMARY KEY,
  chave         varchar(10) NOT NULL UNIQUE,
  codloja       integer NOT NULL,
  np            varchar(20) NOT NULL,
  destinario    varchar(100) NOT NULL,
  endereco      varchar(200),
  cidade_uf     varchar(100),
  data_criacao  timestamp DEFAULT NOW(),
  data_nf       timestamp,
  data_saiu     timestamp,
  data_entregue timestamp,
  status        varchar(20) NOT NULL DEFAULT 'AguardandoNF'
);

-- 2. Registrar módulo (ajuste o campo "ordem" se necessário)
INSERT INTO wms_modulos (nome, rota, icone, ordem, ativo)
VALUES (
  'Painel Entrega',
  'painelentrega',
  'local_shipping',
  (SELECT COALESCE(MAX(ordem), 0) + 1 FROM wms_modulos),
  true
);

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
  AND na.ativo = true;
