CREATE TABLE IF NOT EXISTS wms_separacoes (
    id SERIAL PRIMARY KEY,
    codloja INTEGER NOT NULL,
    np VARCHAR(20) NOT NULL,
    usuario_atribuido VARCHAR(50),
    data_atribuicao TIMESTAMP,
    data_inicio TIMESTAMP,
    data_fim TIMESTAMP,
    status CHAR(1) DEFAULT 'P'
);

CREATE INDEX IF NOT EXISTS idx_wms_separacoes_venda
ON wms_separacoes(codloja, np);

CREATE TABLE IF NOT EXISTS wms_separacao_itens (
    id SERIAL PRIMARY KEY,
    codloja INTEGER,
    np VARCHAR(20),
    codproduto VARCHAR(30),
    produto VARCHAR(200),
    qtde_total NUMERIC,
    qtde_separada NUMERIC DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_wms_separacao_itens_venda
ON wms_separacao_itens(codloja, np);
