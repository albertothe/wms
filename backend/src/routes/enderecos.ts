// backend/src/routes/enderecos.ts
import express from "express"
import { productPool } from "../database"
import { listarEnderecosPorProduto } from "../controllers/enderecosController"
import { verificarPermissao } from "../middleware/auth"

const router = express.Router()

// GET - listar todos os endereços
router.get("/", async (req, res) => {
  try {
    const result = await productPool.query("SELECT * FROM wms_enderecos ORDER BY codendereco")
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ erro: "Erro ao buscar endereços" })
  }
})

// GET - listar endereços por produto (expansão na tabela de produtos)
router.get("/enderecos-por-produto/:codproduto", listarEnderecosPorProduto)

// Função utilitária para montar o código do endereço
const construirCodendereco = (rua: string, predio: string, andar?: string, apto?: string): string => {
  let codigo = `R${rua.trim().toUpperCase()}P${predio.trim().toUpperCase()}`
  if (andar && apto) {
    codigo += `A${andar.trim().toUpperCase()}A${apto.trim().toUpperCase()}`
  }
  return codigo
}

// POST - adicionar novo endereço base
router.post("/", verificarPermissao("incluir"), async (req, res) => {
  const { rua, predio, andar, apto } = req.body
  const codendereco = construirCodendereco(rua, predio, andar, apto)

  try {
    const result = await productPool.query(
      `INSERT INTO wms_enderecos (codendereco, rua, predio, andar, apto)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [codendereco, rua, predio, andar || null, apto || null],
    )
    res.status(201).json(result.rows[0])
  } catch (err: any) {
    if (err.code === "23505") {
      return res.status(400).json({ erro: "Endereço já existe." })
    }
    res.status(500).json({ erro: "Erro ao inserir endereço" })
  }
})

// PUT - atualizar endereço base (rua, prédio, andar, apto e codendereco)
router.put("/:id", verificarPermissao("editar"), async (req, res) => {
  const { id } = req.params
  const { rua, predio, andar, apto } = req.body
  const novoCodendereco = construirCodendereco(rua, predio, andar, apto)

  try {
    const existe = await productPool.query("SELECT 1 FROM wms_enderecos WHERE codendereco = $1", [novoCodendereco])

    if ((existe.rowCount ?? 0) > 0 && novoCodendereco !== id) {
      return res.status(400).json({ erro: "Já existe um endereço com esse código." })
    }

    const result = await productPool.query(
      `UPDATE wms_enderecos
       SET codendereco = $1, rua = $2, predio = $3, andar = $4, apto = $5
       WHERE codendereco = $6
       RETURNING *`,
      [novoCodendereco, rua, predio, andar || null, apto || null, id],
    )

    res.json(result.rows[0])
  } catch (err) {
    console.error("Erro ao atualizar endereço:", err)
    res.status(500).json({ erro: "Erro ao atualizar endereço" })
  }
})

// POST - Adicionar endereço ao lote do produto
router.post("/produto/lote", verificarPermissao("incluir"), async (req, res) => {
  const { codproduto, lote, codendereco, qtde } = req.body

  try {
    const { rowCount } = await productPool.query(
      `SELECT 1 FROM wms_estoque_local WHERE codproduto = $1 AND lote = $2 AND codendereco = $3`,
      [codproduto, lote, codendereco],
    )

    if ((rowCount ?? 0) > 0) {
      await productPool.query(
        `UPDATE wms_estoque_local
         SET quantidade = quantidade + $4
         WHERE codproduto = $1 AND lote = $2 AND codendereco = $3`,
        [codproduto, lote, codendereco, qtde],
      )
    } else {
      await productPool.query(
        `INSERT INTO wms_estoque_local (codproduto, lote, codendereco, quantidade)
         VALUES ($1, $2, $3, $4)`,
        [codproduto, lote, codendereco, qtde],
      )
    }

    res.status(201).json({ mensagem: "Endereço adicionado com sucesso ao lote." })
  } catch (error: any) {
    console.error("Erro ao adicionar endereço ao lote:", error.message || error)
    res.status(500).json({ erro: "Erro ao adicionar endereço ao lote", detalhe: error.message || error })
  }
})

router.put("/:codproduto/:lote/:codendereco", verificarPermissao("editar"), async (req, res) => {
  const codproduto = req.params.codproduto?.trim()
  const lote = req.params.lote?.trim()
  const codendereco = req.params.codendereco?.trim()
  const { qtde } = req.body

  if (!codproduto || !lote || !codendereco || qtde === undefined) {
    return res.status(400).json({ erro: "Parâmetros inválidos ou incompletos" })
  }

  try {
    await productPool.query(
      `
      UPDATE wms_estoque_local
      SET quantidade = $1
      WHERE codproduto = $2 AND lote = $3 AND codendereco = $4
    `,
      [qtde, codproduto, lote, codendereco],
    )

    res.sendStatus(204)
  } catch (err) {
    console.error("Erro ao editar endereço:", err)
    res.status(500).json({ erro: "Erro ao editar endereço" })
  }
})

// DELETE - remover endereço de um produto
router.delete("/:codproduto/:lote/:codendereco", verificarPermissao("excluir"), async (req, res) => {
  const { codproduto, lote, codendereco } = req.params

  try {
    await productPool.query(
      `
      DELETE FROM wms_estoque_local
      WHERE codproduto = $1 AND lote = $2 AND codendereco = $3
    `,
      [codproduto, lote, codendereco],
    )

    res.sendStatus(204)
  } catch (err) {
    console.error("Erro ao excluir endereço:", err)
    res.status(500).json({ erro: "Erro ao excluir endereço" })
  }
})

// DELETE - excluir endereço base
router.delete("/:id", verificarPermissao("excluir"), async (req, res) => {
  const { id } = req.params
  try {
    await productPool.query("DELETE FROM wms_enderecos WHERE codendereco = $1", [id])
    res.sendStatus(204)
  } catch (err) {
    res.status(500).json({ erro: "Erro ao excluir endereço" })
  }
})

// GET - relatório de produtos por endereço
router.get("/relatorio", async (req, res) => {
  try {
    const result = await productPool.query(`
      SELECT
        e.codendereco, 
        e.rua, 
        e.predio,
        e.andar,
        e.apto,
        el.codproduto, 
        p.c_descr AS produto, 
        el.lote,
        el.quantidade
      FROM wms_enderecos e
      JOIN wms_estoque_local el ON el.codendereco = e.codendereco
      JOIN a_produt p ON p.c_codigo = el.codproduto
      WHERE el.quantidade > 0
      ORDER BY
        e.codendereco, 
        e.rua, 
        e.predio, 
        e.andar, 
        e.apto, 
        el.lote, 
        el.codproduto;
    `)
    res.json(result.rows)
  } catch (error: any) {
    console.error("Erro ao buscar relatório:", error.message || error)
    res.status(500).json({ erro: "Erro ao gerar relatório", detalhe: error.message || error })
  }
})

export default router
