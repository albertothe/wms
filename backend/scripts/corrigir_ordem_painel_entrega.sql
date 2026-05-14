-- Reposiciona o módulo Painel Entrega logo após o Painel Separação no menu.
-- Executar no banco do WMS.

-- Passo 1: abre uma posição logo após o Painel Separação
UPDATE wms_modulos
SET ordem = ordem + 1
WHERE ordem > (
    SELECT ordem FROM wms_modulos
    WHERE nome ILIKE '%separa%'
    ORDER BY ordem DESC
    LIMIT 1
)
AND nome NOT ILIKE '%entrega%';

-- Passo 2: posiciona o Painel Entrega na posição aberta
UPDATE wms_modulos
SET ordem = (
    SELECT ordem FROM wms_modulos
    WHERE nome ILIKE '%separa%'
    ORDER BY ordem DESC
    LIMIT 1
) + 1
WHERE nome ILIKE '%entrega%';
