import express from "express"
import { productPool } from "../database"

const router = express.Router()

// Rota para listar produtos
router.get("/", async (_req, res) => {
  try {
    const result = await productPool.query(`
      SELECT 
        codproduto,
        produto,
        complemento,
        unidade,
        codbarra,
        referencia,
        controla_lote,
        qtde_estoque,
        qtde_reserva,
        qtde_disponivel,
        qtde_avaria,
        facing
      FROM vs_wms_fprodutos_estoque
    `)
    res.json(result.rows)
  } catch (err) {
    console.error("Erro ao buscar produtos:", err)
    res.status(500).send("Erro ao buscar produtos")
  }
})

// Nova rota para buscar produtos com estoque sem endereço (mover para depois da rota principal)
router.get("/sem-endereco", async (_req, res) => {
  try {
    const result = await productPool.query(`
      SELECT 
        p.codproduto,
        p.produto,
        p.qtde_estoque,
        p.controla_lote
      FROM vs_wms_fprodutos_estoque p
      WHERE p.qtde_estoque > 0
      AND NOT EXISTS (
        SELECT 1 
        FROM wms_estoque_local el 
        WHERE el.codproduto = p.codproduto
        AND el.quantidade > 0
      )
    `)
    res.json(result.rows)
  } catch (err) {
    console.error("Erro ao buscar produtos sem endereço:", err)
    res.status(500).send("Erro ao buscar produtos sem endereço")
  }
})

// Rota para buscar lotes de um produto
router.get("/:codproduto/lotes", async (req, res) => {
  const { codproduto } = req.params

  try {
    const result = await productPool.query(
      `
      SELECT 
        lote,
        qtde_lote,
        qtde_reserva,
        (qtde_lote - qtde_reserva) AS qtde_disponivel
      FROM vs_wms_flotes
      WHERE codproduto = $1
    `,
      [codproduto],
    )

    res.json(result.rows)
  } catch (err) {
    console.error(`Erro ao buscar lotes do produto ${codproduto}:`, err)
    res.status(500).send("Erro ao buscar lotes do produto")
  }
})

// Rota para buscar endereços por produto e lote
router.get("/:codproduto/enderecos-lote/:lote", async (req, res) => {
  const { codproduto, lote } = req.params

  try {
    const result = await productPool.query(
      `
      SELECT 
        e.codendereco,
        e.rua,
        e.predio,
        e.andar,
        e.apto,
        el.quantidade AS qtde
      FROM wms_estoque_local el
      INNER JOIN wms_enderecos e ON e.codendereco = el.codendereco
      WHERE el.codproduto = $1 AND el.lote = $2
      `,
      [codproduto, lote],
    )
    res.json(result.rows)
  } catch (err) {
    console.error(`Erro ao buscar endereços por lote para produto ${codproduto}, lote ${lote}:`, err)
    res.status(500).send("Erro ao buscar endereços por lote")
  }
})

// POST - Adicionar endereço ao lote do produto
router.post("/:codproduto/:lote", async (req, res) => {
  const { codproduto, lote } = req.params
  const { codendereco, qtde } = req.body

  try {
    await productPool.query(
      `INSERT INTO wms_estoque_local (codproduto, lote, codendereco, quantidade)
       VALUES ($1, $2, $3, $4)`,
      [codproduto, lote, codendereco, qtde],
    )
    res.status(201).send("Endereço adicionado ao lote com sucesso")
  } catch (error) {
    console.error(`Erro ao adicionar endereço ${codendereco} ao produto ${codproduto}, lote ${lote}:`, error)
    res.status(500).send("Erro ao adicionar endereço ao lote")
  }
})

// PUT - editar endereço por lote
router.put("/:codproduto/:lote/:codendereco", async (req, res) => {
  const { codproduto, lote, codendereco } = req.params
  const { qtde } = req.body

  try {
    await productPool.query(
      `UPDATE wms_estoque_local 
       SET quantidade = $1 
       WHERE codproduto = $2 AND lote = $3 AND codendereco = $4`,
      [qtde, codproduto, lote, codendereco],
    )
    res.status(200).send("Quantidade atualizada com sucesso")
  } catch (err) {
    console.error(`Erro ao editar endereço ${codendereco} do produto ${codproduto}, lote ${lote}:`, err)
    res.status(500).send("Erro ao editar endereço do lote")
  }
})

// DELETE - excluir endereço de um lote
router.delete("/:codproduto/:lote/:codendereco", async (req, res) => {
  const { codproduto, lote, codendereco } = req.params

  try {
    await productPool.query(
      `DELETE FROM wms_estoque_local 
       WHERE codproduto = $1 AND lote = $2 AND codendereco = $3`,
      [codproduto, lote, codendereco],
    )
    res.status(204).send()
  } catch (err) {
    console.error(`Erro ao excluir endereço ${codendereco} do produto ${codproduto}, lote ${lote}:`, err)
    res.status(500).send("Erro ao excluir endereço do lote")
  }
})

// Rota para buscar produtos por endereço
router.get("/por-endereco/:codendereco", async (req, res) => {
  const { codendereco } = req.params

  try {
    const result = await productPool.query(
      `
      SELECT 
        p.codproduto,
        p.produto,
        p.complemento,
        p.unidade,
        p.codbarra,
        el.lote,
        el.quantidade
      FROM wms_estoque_local el
      INNER JOIN vs_wms_fprodutos_estoque p ON p.codproduto = el.codproduto
      WHERE el.codendereco = $1
      ORDER BY p.produto
      `,
      [codendereco],
    )
    res.json(result.rows)
  } catch (err) {
    console.error(`Erro ao buscar produtos do endereço ${codendereco}:`, err)
    res.status(500).send("Erro ao buscar produtos do endereço")
  }
})

export default router
