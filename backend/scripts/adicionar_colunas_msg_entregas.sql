-- Adiciona colunas de controle de envio de mensagens em wms_entregas.
-- Executar no banco do WMS.

ALTER TABLE wms_entregas
  ADD COLUMN IF NOT EXISTS msg_saiu_enviada   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS msg_entregue_enviada boolean NOT NULL DEFAULT false;
