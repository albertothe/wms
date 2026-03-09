import express from "express"
import { productPool } from "../database"
import { logger } from "../utils/logger"

const router = express.Router()

router.get("/usuarios", async (_req, res) => {
  try {
    const result = await productPool.query(
      `SELECT DISTINCT c_usuario
       FROM a_usuari
       WHERE c_usuario IS NOT NULL AND TRIM(c_usuario) <> ''
       ORDER BY c_usuario`,
    )

    res.json(result.rows.map((row) => row.c_usuario))
  } catch (error) {
    logger.error("Erro ao buscar usuários para separação:", error)
    res.status(500).json({ erro: "Erro ao buscar usuários" })
  }
})

router.post("/atribuir", async (req, res) => {
  const { codloja, np, usuario } = req.body

  if (!codloja || !np || !usuario) {
    return res.status(400).json({ erro: "codloja, np e usuario são obrigatórios" })
  }

  try {
    await productPool.query("BEGIN")

    const existente = await productPool.query(
      `SELECT id FROM wms_separacoes
       WHERE codloja = $1 AND np = $2
       LIMIT 1`,
      [codloja, np],
    )

    if (existente.rows.length > 0) {
      await productPool.query("ROLLBACK")
      return res.status(409).json({ erro: "Separação já atribuída para esta venda" })
    }

    const separacao = await productPool.query(
      `INSERT INTO wms_separacoes (codloja, np, usuario_atribuido, data_atribuicao, status)
       VALUES ($1, $2, $3, NOW(), 'P')
       RETURNING *`,
      [codloja, np, usuario],
    )

    const itensInseridos = await productPool.query(
      `INSERT INTO wms_separacao_itens (codloja, np, codproduto, produto, qtde_total, qtde_separada)
       SELECT
         p.codloja,
         p.np,
         p.codproduto,
         MAX(p.produto) AS produto,
         SUM(COALESCE(p.qtde_saida, 0)) AS qtde_total,
         0 AS qtde_separada
       FROM vs_wms_fpainel_saida p
       WHERE p.codloja = $1 AND p.np = $2
       GROUP BY p.codloja, p.np, p.codproduto`,
      [codloja, np],
    )

    if (itensInseridos.rowCount === 0) {
      await productPool.query("ROLLBACK")
      return res.status(404).json({ erro: "Venda não encontrada para atribuição" })
    }

    await productPool.query("COMMIT")

    res.status(201).json({
      mensagem: "Separação atribuída com sucesso",
      separacao: separacao.rows[0],
      itens: itensInseridos.rowCount,
    })
  } catch (error) {
    await productPool.query("ROLLBACK")
    logger.error("Erro ao atribuir separação:", error)
    res.status(500).json({ erro: "Erro ao atribuir separação" })
  }
})

router.post("/iniciar", async (req, res) => {
  const { codloja, np } = req.body

  if (!codloja || !np) {
    return res.status(400).json({ erro: "codloja e np são obrigatórios" })
  }

  try {
    const result = await productPool.query(
      `UPDATE wms_separacoes
       SET status = 'S',
           data_inicio = COALESCE(data_inicio, NOW())
       WHERE codloja = $1
         AND np = $2
         AND status <> 'F'
       RETURNING *`,
      [codloja, np],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: "Separação não encontrada" })
    }

    res.json({ mensagem: "Separação iniciada", separacao: result.rows[0] })
  } catch (error) {
    logger.error("Erro ao iniciar separação:", error)
    res.status(500).json({ erro: "Erro ao iniciar separação" })
  }
})

router.post("/item", async (req, res) => {
  const { codloja, np, codproduto, qtde_separada } = req.body

  if (!codloja || !np || !codproduto || qtde_separada === undefined) {
    return res.status(400).json({ erro: "codloja, np, codproduto e qtde_separada são obrigatórios" })
  }

  try {
    const result = await productPool.query(
      `UPDATE wms_separacao_itens
       SET qtde_separada = LEAST(qtde_total, GREATEST(0, $4))
       WHERE codloja = $1 AND np = $2 AND codproduto = $3
       RETURNING *`,
      [codloja, np, codproduto, qtde_separada],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: "Item não encontrado" })
    }

    res.json({ mensagem: "Item atualizado", item: result.rows[0] })
  } catch (error) {
    logger.error("Erro ao atualizar item de separação:", error)
    res.status(500).json({ erro: "Erro ao atualizar item" })
  }
})

router.post("/finalizar", async (req, res) => {
  const { codloja, np } = req.body

  if (!codloja || !np) {
    return res.status(400).json({ erro: "codloja e np são obrigatórios" })
  }

  try {
    const result = await productPool.query(
      `UPDATE wms_separacoes
       SET status = 'F',
           data_fim = NOW()
       WHERE codloja = $1 AND np = $2
       RETURNING *`,
      [codloja, np],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: "Separação não encontrada" })
    }

    res.json({ mensagem: "Separação finalizada", separacao: result.rows[0] })
  } catch (error) {
    logger.error("Erro ao finalizar separação:", error)
    res.status(500).json({ erro: "Erro ao finalizar separação" })
  }
})

router.get("/itens", async (req, res) => {
  const { codloja, np } = req.query

  if (!codloja || !np) {
    return res.status(400).json({ erro: "codloja e np são obrigatórios" })
  }

  try {
    const result = await productPool.query(
      `SELECT codproduto, produto, qtde_total, qtde_separada
       FROM wms_separacao_itens
       WHERE codloja = $1 AND np = $2
       ORDER BY produto`,
      [codloja, np],
    )

    res.json(result.rows)
  } catch (error) {
    logger.error("Erro ao buscar itens da separação:", error)
    res.status(500).json({ erro: "Erro ao buscar itens da separação" })
  }
})

router.get("/", async (_req, res) => {
  try {
    const result = await productPool.query(
      `SELECT
         s.codloja,
         s.np,
         MAX(v.destinario) AS cliente,
         s.usuario_atribuido AS separador,
         s.data_inicio,
         s.data_fim,
         s.status,
         COALESCE(SUM(i.qtde_separada), 0) AS total_separado,
         COALESCE(SUM(i.qtde_total), 0) AS total_itens,
         CASE
           WHEN COALESCE(SUM(i.qtde_total), 0) = 0 THEN 0
           ELSE ROUND((COALESCE(SUM(i.qtde_separada), 0) / NULLIF(SUM(i.qtde_total), 0)) * 100, 2)
         END AS progresso
       FROM wms_separacoes s
       LEFT JOIN wms_separacao_itens i ON i.codloja = s.codloja AND i.np = s.np
       LEFT JOIN vs_wms_fpainel_saida v ON v.codloja = s.codloja AND v.np = s.np
       GROUP BY s.codloja, s.np, s.usuario_atribuido, s.data_inicio, s.data_fim, s.status
       ORDER BY COALESCE(s.data_inicio, s.data_atribuicao) DESC`,
    )

    res.json(result.rows)
  } catch (error) {
    logger.error("Erro ao buscar separações:", error)
    res.status(500).json({ erro: "Erro ao buscar separações" })
  }
})

export default router
