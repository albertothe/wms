ALTER TABLE wms_separacoes
ADD COLUMN IF NOT EXISTS chave VARCHAR(10);

ALTER TABLE wms_separacao_itens
ADD COLUMN IF NOT EXISTS chave VARCHAR(10);

UPDATE wms_separacoes s
SET chave = v.chave
FROM (
  SELECT DISTINCT codloja, np, chave
  FROM vs_wms_fpainel_saida
) v
WHERE s.chave IS NULL
  AND s.codloja::text = v.codloja::text
  AND s.np::text = v.np::text;

UPDATE wms_separacao_itens i
SET chave = s.chave
FROM wms_separacoes s
WHERE i.chave IS NULL
  AND i.codloja = s.codloja
  AND i.np = s.np;

ALTER TABLE wms_separacoes
ALTER COLUMN chave SET NOT NULL;

ALTER TABLE wms_separacao_itens
ALTER COLUMN chave SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_wms_separacoes_chave
ON wms_separacoes(chave);

CREATE INDEX IF NOT EXISTS idx_wms_separacao_itens_chave
ON wms_separacao_itens(chave);
