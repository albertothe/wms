CREATE TABLE IF NOT EXISTS wms_separacoes (
    id SERIAL PRIMARY KEY,
    chave VARCHAR(10) NOT NULL,
    codloja INTEGER NOT NULL,
    np VARCHAR(20) NOT NULL,
    destinario VARCHAR(100) NOT NULL,
    tipoentrega VARCHAR(15) NOT NULL,
    usuario_atribuido VARCHAR(50),
    data_atribuicao TIMESTAMP,
    data_inicio TIMESTAMP,
    data_fim TIMESTAMP,
    status CHAR(1) DEFAULT 'P'
);

CREATE INDEX IF NOT EXISTS idx_wms_separacoes_venda
ON wms_separacoes(codloja, np);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wms_separacoes_chave
ON wms_separacoes(chave);

CREATE TABLE IF NOT EXISTS wms_separacao_itens (
    id SERIAL PRIMARY KEY,
    chave VARCHAR(10) NOT NULL,
    codloja INTEGER,
    np VARCHAR(20),
    codproduto VARCHAR(30),
    produto VARCHAR(200),
    qtde_total NUMERIC,
    qtde_separada NUMERIC DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_wms_separacao_itens_venda
ON wms_separacao_itens(codloja, np);

CREATE INDEX IF NOT EXISTS idx_wms_separacao_itens_chave
ON wms_separacao_itens(chave);
