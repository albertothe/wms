-- Script para criar tabela de auditoria de enderecos
CREATE TABLE IF NOT EXISTS wms_auditoria_enderecos (
    id SERIAL PRIMARY KEY,
    codendereco VARCHAR(30) NOT NULL,
    codproduto VARCHAR(30) NOT NULL,
    lote VARCHAR(30),
    quantidade NUMERIC(12,2) NOT NULL,
    tipo VARCHAR(10) NOT NULL,
    usuario VARCHAR(50),
    datahora TIMESTAMP DEFAULT NOW()
);
