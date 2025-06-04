// backend/src/routes/controleAcesso.ts
import express from "express"
import { productPool } from "../database"

const router = express.Router()

// Níveis de Acesso
router.get("/niveis", async (_req, res) => {
    try {
        const result = await productPool.query("SELECT codigo, descricao, ativo FROM wms_niveis_acesso ORDER BY codigo")
        res.json(result.rows)
    } catch (error) {
        console.error("Erro ao buscar níveis de acesso:", error)
        res.status(500).json({ error: "Erro ao buscar níveis de acesso" })
    }
})

router.post("/niveis", async (req, res) => {
    const { codigo, descricao, ativo } = req.body
    try {
        const result = await productPool.query(
            "INSERT INTO wms_niveis_acesso (codigo, descricao, ativo) VALUES ($1, $2, $3) RETURNING *",
            [codigo, descricao, ativo],
        )
        res.status(201).json(result.rows[0])
    } catch (error) {
        console.error("Erro ao criar nível de acesso:", error)
        res.status(500).json({ error: "Erro ao criar nível de acesso" })
    }
})

router.put("/niveis/:codigo", async (req, res) => {
    const { codigo } = req.params
    const { descricao, ativo } = req.body
    try {
        const result = await productPool.query(
            "UPDATE wms_niveis_acesso SET descricao = $1, ativo = $2 WHERE codigo = $3 RETURNING *",
            [descricao, ativo, codigo],
        )
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Nível de acesso não encontrado" })
        }
        res.json(result.rows[0])
    } catch (error) {
        console.error("Erro ao atualizar nível de acesso:", error)
        res.status(500).json({ error: "Erro ao atualizar nível de acesso" })
    }
})

router.delete("/niveis/:codigo", async (req, res) => {
    const { codigo } = req.params
    try {
        // Verificar se existem permissões associadas
        const permissoesResult = await productPool.query(
            "SELECT COUNT(*) FROM wms_permissoes_nivel WHERE codigo_nivel = $1",
            [codigo],
        )

        if (Number.parseInt(permissoesResult.rows[0].count) > 0) {
            return res.status(400).json({
                error: "Não é possível excluir este nível pois existem permissões associadas a ele",
            })
        }

        const result = await productPool.query("DELETE FROM wms_niveis_acesso WHERE codigo = $1 RETURNING *", [codigo])

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Nível de acesso não encontrado" })
        }

        res.json({ message: "Nível de acesso excluído com sucesso" })
    } catch (error) {
        console.error("Erro ao excluir nível de acesso:", error)
        res.status(500).json({ error: "Erro ao excluir nível de acesso" })
    }
})

// Módulos
router.get("/modulos", async (_req, res) => {
    try {
        const result = await productPool.query("SELECT id, nome, rota, icone, ordem, ativo FROM wms_modulos ORDER BY ordem")
        res.json(result.rows)
    } catch (error) {
        console.error("Erro ao buscar módulos:", error)
        res.status(500).json({ error: "Erro ao buscar módulos" })
    }
})

router.post("/modulos", async (req, res) => {
    const { nome, rota, icone, ordem, ativo } = req.body
    try {
        const result = await productPool.query(
            "INSERT INTO wms_modulos (nome, rota, icone, ordem, ativo) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [nome, rota, icone, ordem, ativo],
        )
        res.status(201).json(result.rows[0])
    } catch (error) {
        console.error("Erro ao criar módulo:", error)
        res.status(500).json({ error: "Erro ao criar módulo" })
    }
})

router.put("/modulos/:id", async (req, res) => {
    const { id } = req.params
    const { nome, rota, icone, ordem, ativo } = req.body
    try {
        const result = await productPool.query(
            "UPDATE wms_modulos SET nome = $1, rota = $2, icone = $3, ordem = $4, ativo = $5 WHERE id = $6 RETURNING *",
            [nome, rota, icone, ordem, ativo, id],
        )
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Módulo não encontrado" })
        }
        res.json(result.rows[0])
    } catch (error) {
        console.error("Erro ao atualizar módulo:", error)
        res.status(500).json({ error: "Erro ao atualizar módulo" })
    }
})

router.delete("/modulos/:id", async (req, res) => {
    const { id } = req.params
    try {
        // Verificar se existem permissões associadas
        const permissoesResult = await productPool.query("SELECT COUNT(*) FROM wms_permissoes_nivel WHERE id_modulo = $1", [
            id,
        ])

        if (Number.parseInt(permissoesResult.rows[0].count) > 0) {
            return res.status(400).json({
                error: "Não é possível excluir este módulo pois existem permissões associadas a ele",
            })
        }

        const result = await productPool.query("DELETE FROM wms_modulos WHERE id = $1 RETURNING *", [id])

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Módulo não encontrado" })
        }

        res.json({ message: "Módulo excluído com sucesso" })
    } catch (error) {
        console.error("Erro ao excluir módulo:", error)
        res.status(500).json({ error: "Erro ao excluir módulo" })
    }
})

// Permissões
router.get("/permissoes", async (_req, res) => {
    try {
        const result = await productPool.query(`
      SELECT 
        p.codigo_nivel, 
        n.descricao as nivel_descricao,
        p.id_modulo, 
        m.nome as modulo_nome,
        p.visualizar, 
        p.incluir,
        p.editar, 
        p.excluir
      FROM wms_permissoes_nivel p
      JOIN wms_niveis_acesso n ON p.codigo_nivel = n.codigo
      JOIN wms_modulos m ON p.id_modulo = m.id
      ORDER BY n.codigo, m.ordem
    `)
        res.json(result.rows)
    } catch (error) {
        console.error("Erro ao buscar permissões:", error)
        res.status(500).json({ error: "Erro ao buscar permissões" })
    }
})

router.get("/permissoes/:nivel", async (req, res) => {
    const { nivel } = req.params
    try {
        const result = await productPool.query(
            `
      SELECT 
        p.codigo_nivel, 
        p.id_modulo, 
        m.nome as modulo_nome,
        m.rota as modulo_rota,
        p.visualizar, 
        p.incluir,
        p.editar, 
        p.excluir
      FROM wms_permissoes_nivel p
      JOIN wms_modulos m ON p.id_modulo = m.id
      WHERE p.codigo_nivel = $1
      ORDER BY m.ordem
    `,
            [nivel],
        )
        res.json(result.rows)
    } catch (error) {
        console.error("Erro ao buscar permissões do nível:", error)
        res.status(500).json({ error: "Erro ao buscar permissões do nível" })
    }
})

router.post("/permissoes", async (req, res) => {
    const { codigo_nivel, id_modulo, visualizar, incluir, editar, excluir } = req.body
    try {
        // Verificar se já existe uma permissão para este nível e módulo
        const existingResult = await productPool.query(
            "SELECT * FROM wms_permissoes_nivel WHERE codigo_nivel = $1 AND id_modulo = $2",
            [codigo_nivel, id_modulo],
        )

        if (existingResult.rows.length > 0) {
            // Atualizar permissão existente
            const updateResult = await productPool.query(
                "UPDATE wms_permissoes_nivel SET visualizar = $1, incluir = $2, editar = $3, excluir = $4 WHERE codigo_nivel = $5 AND id_modulo = $6 RETURNING *",
                [visualizar, incluir, editar, excluir, codigo_nivel, id_modulo],
            )
            return res.json(updateResult.rows[0])
        }

        // Criar nova permissão
        const result = await productPool.query(
            "INSERT INTO wms_permissoes_nivel (codigo_nivel, id_modulo, visualizar, incluir, editar, excluir) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [codigo_nivel, id_modulo, visualizar, incluir, editar, excluir],
        )
        res.status(201).json(result.rows[0])
    } catch (error) {
        console.error("Erro ao configurar permissão:", error)
        res.status(500).json({ error: "Erro ao configurar permissão" })
    }
})

// Configurar permissões em massa para um nível
router.post("/permissoes/configurar", async (req, res) => {
    const { codigo_nivel, permissoes } = req.body

    if (!codigo_nivel || !permissoes || !Array.isArray(permissoes)) {
        return res.status(400).json({ error: "Dados inválidos" })
    }

    try {
        // Iniciar uma transação
        await productPool.query("BEGIN")

        for (const perm of permissoes) {
            const { id_modulo, visualizar, incluir, editar, excluir } = perm

            // Verificar se já existe uma permissão para este nível e módulo
            const existingResult = await productPool.query(
                "SELECT * FROM wms_permissoes_nivel WHERE codigo_nivel = $1 AND id_modulo = $2",
                [codigo_nivel, id_modulo],
            )

            if (existingResult.rows.length > 0) {
                // Atualizar permissão existente
                await productPool.query(
                    "UPDATE wms_permissoes_nivel SET visualizar = $1, incluir = $2, editar = $3, excluir = $4 WHERE codigo_nivel = $5 AND id_modulo = $6",
                    [visualizar, incluir, editar, excluir, codigo_nivel, id_modulo],
                )
            } else {
                // Criar nova permissão
                await productPool.query(
                    "INSERT INTO wms_permissoes_nivel (codigo_nivel, id_modulo, visualizar, incluir, editar, excluir) VALUES ($1, $2, $3, $4, $5, $6)",
                    [codigo_nivel, id_modulo, visualizar, incluir, editar, excluir],
                )
            }
        }

        // Confirmar a transação
        await productPool.query("COMMIT")

        res.json({ message: "Permissões configuradas com sucesso" })
    } catch (error) {
        // Reverter a transação em caso de erro
        await productPool.query("ROLLBACK")
        console.error("Erro ao configurar permissões:", error)
        res.status(500).json({ error: "Erro ao configurar permissões" })
    }
})

export default router
