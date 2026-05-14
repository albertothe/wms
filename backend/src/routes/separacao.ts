import express from "express"
import { productPool } from "../database"
import { logger } from "../utils/logger"

const router = express.Router()

const normalizarTextoOpcional = (valor: unknown): string | null => {
  if (typeof valor !== "string") {
    return valor == null ? null : String(valor)
  }

  const texto = valor.trim()
  return texto.length > 0 ? texto : null
}

const normalizarInteiroOpcional = (valor: unknown): number | null => {
  if (valor == null || valor === "") return null

  const numero = Number(valor)
  return Number.isInteger(numero) ? numero : null
}

router.get("/usuarios", async (_req, res) => {
  try {
    const result = await productPool.query(
      `SELECT DISTINCT usuario
       FROM vs_wms_usuarios_separacao
       WHERE usuario IS NOT NULL AND TRIM(usuario) <> ''
       ORDER BY usuario`,
    )

    res.json(result.rows.map((row) => row.usuario))
  } catch (error) {
    logger.error("Erro ao buscar usuários para separação:", error)
    res.status(500).json({ erro: "Erro ao buscar usuários" })
  }
})

router.post("/atribuir", async (req, res) => {
  const { chave, codloja, np, usuario, destinario, tipoentrega } = req.body

  if (!chave || !codloja || !np || !usuario) {
    return res.status(400).json({ erro: "chave, codloja, np e usuario são obrigatórios" })
  }

  const dbClient = await productPool.connect()

  try {
    await dbClient.query("BEGIN")

    const dadosVenda = await dbClient.query(
      `SELECT
         MAX(destinario)::varchar(100) AS destinario,
         MAX(tipoentrega)::varchar(15) AS tipoentrega
       FROM vs_wms_fpainel_saida
       WHERE chave = $1::varchar(10)`,
      [chave],
    )

    const destinarioNormalizado = normalizarTextoOpcional(destinario ?? dadosVenda.rows[0]?.destinario)
    const tipoEntregaNormalizado = normalizarTextoOpcional(tipoentrega ?? dadosVenda.rows[0]?.tipoentrega)

    if (!destinarioNormalizado || !tipoEntregaNormalizado) {
      await dbClient.query("ROLLBACK")
      return res.status(400).json({ erro: "destinario e tipoentrega são obrigatórios" })
    }

    const separacaoExistente = await dbClient.query(
      `SELECT 1
       FROM wms_separacoes
       WHERE chave::text = $1::text
       LIMIT 1`,
      [chave],
    )

    if (separacaoExistente.rows.length > 0) {
      await dbClient.query("ROLLBACK")
      return res.status(409).json({ erro: "Separação já atribuída para esta venda" })
    }

    const separacao = await dbClient.query(
      `INSERT INTO wms_separacoes
         (chave, codloja, np, destinario, tipoentrega, usuario_atribuido, data_atribuicao, data_inicio, status)
       VALUES ($1::varchar(10), $2::integer, $3::varchar(20), $4::varchar(100), $5::varchar(15), $6::varchar(50), NOW(), NOW(), 'S'::char(1))
       RETURNING *`,
      [chave, codloja, np, destinarioNormalizado, tipoEntregaNormalizado, usuario],
    )

    const itensInseridos = await dbClient.query(
      `INSERT INTO wms_separacao_itens (chave, codloja, np, codproduto, produto, qtde_total, qtde_separada)
       SELECT
         p.chave::varchar(10),
         p.codloja::integer,
         p.np::varchar(20),
         p.codproduto::varchar(30),
         MAX(p.produto)::varchar(200) AS produto,
         SUM(COALESCE(p.qtde_saida, 0))::numeric AS qtde_total,
         0::numeric AS qtde_separada
       FROM vs_wms_fpainel_saida p
       WHERE p.chave = $1::varchar(10)
       GROUP BY p.chave, p.codloja, p.np, p.codproduto`,
      [chave],
    )

    if (itensInseridos.rowCount === 0) {
      await dbClient.query("ROLLBACK")
      return res.status(404).json({ erro: "Venda não encontrada para atribuição" })
    }

    await dbClient.query("COMMIT")

    res.status(201).json({
      mensagem: "Separação atribuída com sucesso",
      separacao: separacao.rows[0],
      itens: itensInseridos.rowCount,
    })
  } catch (error) {
    await dbClient.query("ROLLBACK")
    logger.error("Erro ao atribuir separação:", error)
    res.status(500).json({ erro: "Erro ao atribuir separação" })
  } finally {
    dbClient.release()
  }
})

router.post("/iniciar", async (req, res) => {
  const { chave, codloja, np } = req.body
  const chaveNormalizada = normalizarTextoOpcional(chave)
  const codlojaNormalizada = normalizarInteiroOpcional(codloja)
  const npNormalizado = normalizarTextoOpcional(np)

  if (!chaveNormalizada && (codlojaNormalizada == null || !npNormalizado)) {
    return res.status(400).json({ erro: "chave ou codloja e np são obrigatórios" })
  }

  try {
    const result = await productPool.query(
      `UPDATE wms_separacoes
       SET status = 'S',
           data_inicio = COALESCE(data_inicio, NOW())
      WHERE (chave = $1 OR (codloja = $2 AND np = $3))
         AND status <> 'F'
       RETURNING *`,
      [chaveNormalizada, codlojaNormalizada, npNormalizado],
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
  const { chave, codloja, np, codproduto, qtde_separada } = req.body
  const chaveNormalizada = normalizarTextoOpcional(chave)
  const codlojaNormalizada = normalizarInteiroOpcional(codloja)
  const npNormalizado = normalizarTextoOpcional(np)
  const codprodutoNormalizado = normalizarTextoOpcional(codproduto)
  const qtdeSeparadaNormalizada = Number(qtde_separada)

  if (
    (!chaveNormalizada && (codlojaNormalizada == null || !npNormalizado)) ||
    !codprodutoNormalizado ||
    !Number.isFinite(qtdeSeparadaNormalizada)
  ) {
    return res.status(400).json({ erro: "chave ou codloja/np, codproduto e qtde_separada são obrigatórios" })
  }

  try {
    const separacaoFinalizada = await productPool.query(
      `SELECT status
       FROM wms_separacoes
       WHERE chave::text = $1::text OR (codloja = $2 AND np::text = $3::text)
       LIMIT 1`,
      [chaveNormalizada, codlojaNormalizada, npNormalizado],
    )

    if (separacaoFinalizada.rows[0]?.status === "F") {
      return res.status(409).json({ erro: "Separação finalizada não pode ser alterada" })
    }

    const result = await productPool.query(
      `UPDATE wms_separacao_itens
       SET qtde_separada = LEAST(qtde_total, GREATEST(0::numeric, $4::numeric))
       WHERE codproduto::text = $3::text
         AND (chave::text = $1::text OR (codloja = $2 AND np::text = $5::text))
       RETURNING *`,
      [chaveNormalizada, codlojaNormalizada, codprodutoNormalizado, qtdeSeparadaNormalizada, npNormalizado],
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

router.post("/separar-tudo", async (req, res) => {
  const { chave, codloja, np } = req.body
  const chaveNormalizada = normalizarTextoOpcional(chave)
  const codlojaNormalizada = normalizarInteiroOpcional(codloja)
  const npNormalizado = normalizarTextoOpcional(np)

  if (!chaveNormalizada && (codlojaNormalizada == null || !npNormalizado)) {
    return res.status(400).json({ erro: "chave ou codloja e np são obrigatórios" })
  }

  try {
    const separacao = await productPool.query(
      `SELECT status FROM wms_separacoes
       WHERE chave::text = $1::text OR (codloja = $2 AND np::text = $3::text)
       LIMIT 1`,
      [chaveNormalizada, codlojaNormalizada, npNormalizado],
    )

    if (separacao.rows[0]?.status === "F") {
      return res.status(409).json({ erro: "Separação finalizada não pode ser alterada" })
    }

    const result = await productPool.query(
      `UPDATE wms_separacao_itens
       SET qtde_separada = qtde_total
       WHERE chave::text = $1::text OR (codloja = $2 AND np::text = $3::text)
       RETURNING *`,
      [chaveNormalizada, codlojaNormalizada, npNormalizado],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: "Itens não encontrados" })
    }

    res.json({ mensagem: "Todos os itens separados", itens: result.rowCount })
  } catch (error) {
    logger.error("Erro ao separar todos os itens:", error)
    res.status(500).json({ erro: "Erro ao separar todos os itens" })
  }
})

router.post("/finalizar", async (req, res) => {
  const { chave, codloja, np } = req.body
  const chaveNormalizada = normalizarTextoOpcional(chave)
  const codlojaNormalizada = normalizarInteiroOpcional(codloja)
  const npNormalizado = normalizarTextoOpcional(np)

  if (!chaveNormalizada && (codlojaNormalizada == null || !npNormalizado)) {
    return res.status(400).json({ erro: "chave ou codloja e np são obrigatórios" })
  }

  try {
    const pendencias = await productPool.query(
      `SELECT COUNT(*)::int AS total_pendentes
       FROM wms_separacao_itens
       WHERE (chave::text = $1::text OR (codloja = $2 AND np::text = $3::text))
         AND COALESCE(qtde_separada, 0) < COALESCE(qtde_total, 0)`,
      [chaveNormalizada, codlojaNormalizada, npNormalizado],
    )

    if ((pendencias.rows[0]?.total_pendentes ?? 0) > 0) {
      return res.status(409).json({ erro: "Ainda existem produtos pendentes de separação" })
    }

    const result = await productPool.query(
      `UPDATE wms_separacoes
       SET status = 'F',
           data_fim = NOW()
       WHERE chave::text = $1::text OR (codloja = $2 AND np::text = $3::text)
       RETURNING *`,
      [chaveNormalizada, codlojaNormalizada, npNormalizado],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: "Separação não encontrada" })
    }

    const separacao = result.rows[0]

    if (separacao.tipoentrega === "LojaEntrega") {
      try {
        const dadosView = await productPool.query(
          `SELECT MAX(endereco) AS endereco, MAX(cidade_uf) AS cidade_uf
           FROM vs_wms_fpainel_saida
           WHERE chave = $1`,
          [separacao.chave],
        )

        await productPool.query(
          `INSERT INTO wms_entregas (chave, codloja, np, destinario, endereco, cidade_uf)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (chave) DO NOTHING`,
          [
            separacao.chave,
            separacao.codloja,
            separacao.np,
            separacao.destinario,
            dadosView.rows[0]?.endereco ?? null,
            dadosView.rows[0]?.cidade_uf ?? null,
          ],
        )
      } catch (entregaError) {
        logger.error("Erro ao registrar entrega após finalizar separação:", entregaError)
      }
    }

    res.json({ mensagem: "Separação finalizada", separacao })
  } catch (error) {
    logger.error("Erro ao finalizar separação:", error)
    res.status(500).json({ erro: "Erro ao finalizar separação" })
  }
})

router.get("/itens", async (req, res) => {
  const { chave, codloja, np } = req.query
  const chaveNormalizada = normalizarTextoOpcional(chave)
  const codlojaNormalizada = normalizarInteiroOpcional(codloja)
  const npNormalizado = normalizarTextoOpcional(np)

  if (!chaveNormalizada && (codlojaNormalizada == null || !npNormalizado)) {
    return res.status(400).json({ erro: "chave ou codloja e np são obrigatórios" })
  }

  try {
    const result = await productPool.query(
      `SELECT codproduto, produto, qtde_total, qtde_separada
       FROM wms_separacao_itens
       WHERE chave::text = $1::text OR (codloja = $2 AND np::text = $3::text)
       ORDER BY produto`,
      [chaveNormalizada, codlojaNormalizada, npNormalizado],
    )

    res.json(result.rows)
  } catch (error) {
    logger.error("Erro ao buscar itens da separação:", error)
    res.status(500).json({ erro: "Erro ao buscar itens da separação" })
  }
})

router.get("/", async (req, res) => {
  const usuario = normalizarTextoOpcional(req.query.usuario)
  const tipoentrega = normalizarTextoOpcional(req.query.tipoentrega)

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
         WHERE ($1::varchar(50) IS NULL OR s.usuario_atribuido::text = $1::text)
           AND ($2::varchar(15) IS NULL OR s.tipoentrega::text = $2::text)
       ),
       itens_por_chave AS (
         SELECT
           i.chave,
           COALESCE(SUM(i.qtde_separada), 0) AS total_separado,
           COALESCE(SUM(i.qtde_total), 0) AS total_itens
         FROM wms_separacao_itens i
         INNER JOIN separacoes_filtradas s ON s.chave = i.chave
         GROUP BY i.chave
       ),
       painel_saida_por_chave AS (
         SELECT DISTINCT ps.chave
         FROM vs_wms_fpainel_saida ps
         INNER JOIN separacoes_filtradas s ON s.chave::text = ps.chave::text
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
         (ps.chave IS NOT NULL) AS no_painel_saida,
         COALESCE(i.total_separado, 0) AS total_separado,
         COALESCE(i.total_itens, 0) AS total_itens,
         CASE
           WHEN COALESCE(i.total_itens, 0) = 0 THEN 0
           ELSE ROUND((COALESCE(i.total_separado, 0) / NULLIF(i.total_itens, 0)) * 100, 2)
         END AS progresso
       FROM separacoes_filtradas s
       LEFT JOIN itens_por_chave i ON i.chave = s.chave
       LEFT JOIN painel_saida_por_chave ps ON ps.chave::text = s.chave::text
       ORDER BY COALESCE(s.data_inicio, s.data_atribuicao) DESC`,
      [usuario, tipoentrega],
    )

    res.json(result.rows)
  } catch (error) {
    logger.error("Erro ao buscar separações:", error)
    res.status(500).json({ erro: "Erro ao buscar separações" })
  }
})

export default router
