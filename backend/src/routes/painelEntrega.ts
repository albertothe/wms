import express from "express"
import { productPool } from "../database"
import { logger } from "../utils/logger"

const router = express.Router()

const TRANSICOES_VALIDAS: Record<string, string> = {
  SaiuEntrega: "NFEmitida",
  Entregue: "SaiuEntrega",
}

const CAMPO_DATA: Record<string, string> = {
  SaiuEntrega: "data_saiu",
  Entregue: "data_entregue",
}

// Leitura pura — sem tocar na view legada, sem locks
router.get("/", async (_req, res) => {
  try {
    const result = await productPool.query(
      `SELECT
         id, chave, codloja, np, destinario, endereco, cidade_uf,
         status, data_criacao, data_nf, data_saiu, data_entregue,
         msg_saiu_enviada, msg_entregue_enviada
       FROM wms_entregas
       WHERE status <> 'Entregue'
          OR data_entregue >= NOW() - INTERVAL '3 days'
       ORDER BY data_criacao DESC`,
    )

    res.json(result.rows)
  } catch (error) {
    logger.error("Erro ao buscar painel de entregas:", error)
    res.status(500).json({ erro: "Erro ao buscar entregas" })
  }
})

// Detecção de NF emitida — chamado pelo frontend em background,
// separado do polling de leitura para não bloquear a UI
router.post("/sincronizar-nf", async (_req, res) => {
  try {
    const temPendentes = await productPool.query(
      `SELECT 1 FROM wms_entregas WHERE status = 'AguardandoNF' LIMIT 1`,
    )

    if (temPendentes.rows.length === 0) {
      return res.json({ atualizados: 0 })
    }

    const result = await productPool.query(
      `UPDATE wms_entregas
       SET status = 'NFEmitida', data_nf = NOW()
       WHERE status = 'AguardandoNF'
         AND NOT EXISTS (
           SELECT 1
           FROM vs_wms_fpainel_saida ps
           WHERE ps.chave::text = wms_entregas.chave::text
         )`,
    )

    res.json({ atualizados: result.rowCount ?? 0 })
  } catch (error) {
    logger.error("Erro ao sincronizar NF emitida:", error)
    res.status(500).json({ erro: "Erro ao sincronizar NF" })
  }
})

router.post("/status", async (req, res) => {
  const { chave, status } = req.body

  if (!chave || !status) {
    return res.status(400).json({ erro: "chave e status são obrigatórios" })
  }

  const statusPrerequisito = TRANSICOES_VALIDAS[status]
  if (!statusPrerequisito) {
    return res.status(400).json({ erro: "Status inválido. Use SaiuEntrega ou Entregue" })
  }

  try {
    const atual = await productPool.query(
      `SELECT status FROM wms_entregas WHERE chave = $1`,
      [chave],
    )

    if (atual.rows.length === 0) {
      return res.status(404).json({ erro: "Entrega não encontrada" })
    }

    if (atual.rows[0].status !== statusPrerequisito) {
      return res.status(409).json({
        erro: `Status atual deve ser '${statusPrerequisito}' para avançar para '${status}'`,
      })
    }

    const campoData = CAMPO_DATA[status]
    const result = await productPool.query(
      `UPDATE wms_entregas
       SET status = $2, ${campoData} = NOW()
       WHERE chave = $1
       RETURNING *`,
      [chave, status],
    )

    res.json({ mensagem: "Status atualizado", entrega: result.rows[0] })
  } catch (error) {
    logger.error("Erro ao atualizar status da entrega:", error)
    res.status(500).json({ erro: "Erro ao atualizar status" })
  }
})

export default router
