-- Corrige a posição do módulo Painel Entrega no menu:
-- coloca logo após o Painel Separação.
-- Executar apenas se o módulo já foi criado pelo script criar_painel_entrega.sql.

UPDATE wms_modulos
SET ordem = ordem + 1
WHERE ordem > (SELECT ordem FROM wms_modulos WHERE rota = 'painelseparacao')
  AND rota <> 'painelentrega';

UPDATE wms_modulos
SET ordem = (SELECT ordem FROM wms_modulos WHERE rota = 'painelseparacao') + 1
WHERE rota = 'painelentrega';
