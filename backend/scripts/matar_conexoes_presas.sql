-- Mata conexões presas/travadas no banco do WMS.
-- Executar ANTES de criar os índices caso algum index tenha ficado bloqueado.

-- 1. Ver conexões ativas há mais de 5 minutos
SELECT pid, now() - query_start AS duracao, state, query
FROM pg_stat_activity
WHERE state IN ('active', 'idle in transaction')
  AND query_start < NOW() - INTERVAL '5 minutes'
  AND query NOT ILIKE '%pg_stat_activity%'
ORDER BY duracao DESC;

-- 2. Matar as conexões travadas (substitua pelos PIDs do resultado acima
--    OU use o bloco abaixo para matar todas as longas de uma vez)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state IN ('active', 'idle in transaction')
  AND query_start < NOW() - INTERVAL '5 minutes'
  AND query NOT ILIKE '%pg_stat_activity%'
  AND pid <> pg_backend_pid();
