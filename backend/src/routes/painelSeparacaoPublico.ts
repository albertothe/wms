import express from "express"
import { productPool } from "../database"
import { logger } from "../utils/logger"

const router = express.Router()

router.get("/", async (_req, res) => {
  try {
    const result = await productPool.query(
      `WITH separacoes_filtradas AS (
         SELECT
           s.chave,
           s.codloja,
           s.np,
           s.destinario,
           s.tipoentrega,
           s.usuario_atribuido,
           s.data_inicio,
           s.data_fim,
           s.status,
           s.data_atribuicao
         FROM wms_separacoes s
       ),
       itens_por_chave AS (
         SELECT
           i.chave,
           COALESCE(SUM(i.qtde_separada), 0) AS total_separado,
           COALESCE(SUM(i.qtde_total), 0) AS total_itens
         FROM wms_separacao_itens i
         INNER JOIN separacoes_filtradas s ON s.chave = i.chave
         GROUP BY i.chave
       )
       SELECT
         s.chave,
         s.codloja,
         s.np,
         s.destinario AS cliente,
         s.tipoentrega,
         s.usuario_atribuido AS separador,
         s.data_inicio,
         s.data_fim,
         s.status,
         COALESCE(i.total_separado, 0) AS total_separado,
         COALESCE(i.total_itens, 0) AS total_itens,
         CASE
           WHEN COALESCE(i.total_itens, 0) = 0 THEN 0
           ELSE ROUND((COALESCE(i.total_separado, 0) / NULLIF(i.total_itens, 0)) * 100, 2)
         END AS progresso
       FROM separacoes_filtradas s
       LEFT JOIN itens_por_chave i ON i.chave = s.chave
       ORDER BY COALESCE(s.data_inicio, s.data_atribuicao) DESC
       LIMIT 12`,
    )

    res.json(result.rows)
  } catch (error) {
    logger.error("Erro ao buscar dados públicos do painel de separação:", error)
    res.status(500).json({ erro: "Erro ao buscar painel de separação" })
  }
})

export default router
