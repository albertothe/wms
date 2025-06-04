-- Script para verificar e corrigir os módulos no banco de dados

-- Verificar se o módulo "/painelsaida" existe
SELECT * FROM wms_modulos WHERE rota = '/painelsaida';

-- Se não existir, inserir o módulo
INSERT INTO wms_modulos (nome, rota, icone, ativo, ordem)
SELECT 'Painel de Saída', '/painelsaida', 'local_shipping', true, 
       (SELECT COALESCE(MAX(ordem), 0) + 1 FROM wms_modulos)
WHERE NOT EXISTS (SELECT 1 FROM wms_modulos WHERE rota = '/painelsaida');

-- Obter o ID do módulo
DO $$
DECLARE
    modulo_id INT;
    niveis CURSOR FOR SELECT codigo FROM wms_niveis_acesso;
    nivel_codigo VARCHAR;
BEGIN
    SELECT id INTO modulo_id FROM wms_modulos WHERE rota = '/painelsaida';
    
    IF modulo_id IS NOT NULL THEN
        -- Para cada nível de acesso, verificar e inserir permissões se não existirem
        OPEN niveis;
        LOOP
            FETCH niveis INTO nivel_codigo;
            EXIT WHEN NOT FOUND;
            
            IF NOT EXISTS (SELECT 1 FROM wms_permissoes_nivel 
                          WHERE codigo_nivel = nivel_codigo AND id_modulo = modulo_id) THEN
                INSERT INTO wms_permissoes_nivel (codigo_nivel, id_modulo, visualizar, editar, excluir)
                VALUES (nivel_codigo, modulo_id, true, true, true);
            END IF;
        END LOOP;
        CLOSE niveis;
    END IF;
END $$;

-- Verificar as permissões para o módulo
SELECT n.codigo, n.descricao, p.visualizar, p.editar, p.excluir
FROM wms_niveis_acesso n
LEFT JOIN wms_permissoes_nivel p ON n.codigo = p.codigo_nivel
LEFT JOIN wms_modulos m ON p.id_modulo = m.id
WHERE m.rota = '/painelsaida';
