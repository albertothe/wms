ALTER TABLE wms_separacoes
ADD COLUMN IF NOT EXISTS destinario VARCHAR(100);

ALTER TABLE wms_separacoes
ADD COLUMN IF NOT EXISTS tipoentrega VARCHAR(15);

UPDATE wms_separacoes s
SET destinario = v.destinario,
    tipoentrega = v.tipoentrega
FROM (
  SELECT chave::varchar(10) AS chave,
         MAX(destinario)::varchar(100) AS destinario,
         MAX(tipoentrega)::varchar(15) AS tipoentrega
  FROM vs_wms_fpainel_saida
  GROUP BY chave
) v
WHERE v.chave = s.chave
  AND (s.destinario IS NULL OR s.tipoentrega IS NULL);

ALTER TABLE wms_separacoes
ALTER COLUMN destinario SET NOT NULL;

ALTER TABLE wms_separacoes
ALTER COLUMN tipoentrega SET NOT NULL;
