import express from "express"
import { productPool } from "../database"

const router = express.Router()

// Marcar endereço para produto na pré-nota (com baixa no estoque)
router.post("/marcar", async (req, res) => {
  const { codloja, prenota, codproduto, codendereco, quantidade } = req.body

  try {
    const existeQuery = `
      SELECT quantidade FROM wms_endereco_marcado
      WHERE codloja = $1 AND prenota = $2 AND codproduto = $3 AND codendereco = $4
    `
    const existe = await productPool.query(existeQuery, [codloja, prenota, codproduto, codendereco])

    let qtdeAntiga = 0
    if (existe && existe.rowCount && existe.rows[0]?.quantidade !== undefined) {
      qtdeAntiga = Number.parseFloat(existe.rows[0].quantidade)
    }
    const diferenca = quantidade - qtdeAntiga

    let result
    if (existe && existe.rowCount && existe.rowCount > 0) {
      result = await productPool.query(
        `
        UPDATE wms_endereco_marcado
        SET quantidade = $5, dt_marcacao = NOW()
        WHERE codloja = $1 AND prenota = $2 AND codproduto = $3 AND codendereco = $4
        RETURNING *;
      `,
        [codloja, prenota, codproduto, codendereco, quantidade],
      )
    } else {
      result = await productPool.query(
        `
        INSERT INTO wms_endereco_marcado (codloja, prenota, codproduto, codendereco, quantidade, dt_marcacao)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *;
      `,
        [codloja, prenota, codproduto, codendereco, quantidade],
      )
    }

    if (diferenca !== 0) {
      const estoqueAtualRes = await productPool.query(
        `SELECT quantidade FROM wms_estoque_local WHERE codproduto = $1 AND codendereco = $2`,
        [codproduto, codendereco],
      )

      const estoqueAtual = Number.parseFloat(estoqueAtualRes.rows[0]?.quantidade || 0)
      const novoEstoque = estoqueAtual - diferenca

      if (novoEstoque <= 0) {
        await productPool.query(`DELETE FROM wms_estoque_local WHERE codproduto = $1 AND codendereco = $2`, [
          codproduto,
          codendereco,
        ])
      } else {
        await productPool.query(
          `UPDATE wms_estoque_local SET quantidade = $1 WHERE codproduto = $2 AND codendereco = $3`,
          [novoEstoque, codproduto, codendereco],
        )
      }
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error("Erro ao marcar endereço:", err)
    res.status(500).json({ erro: "Erro ao marcar endereço" })
  }
})

// Listar endereços marcados para uma pré-nota
router.get("/:codloja/:prenota", async (req, res) => {
  const { codloja, prenota } = req.params
  try {
    const query = `
      SELECT em.*, e.rua, e.predio
      FROM wms_endereco_marcado em
      JOIN wms_enderecos e ON e.codendereco = em.codendereco
      WHERE em.codloja = $1 AND em.prenota = $2
      ORDER BY em.codproduto, e.rua, e.predio;
    `
    const result = await productPool.query(query, [codloja, prenota])
    res.json(result.rows)
  } catch (err) {
    console.error("Erro ao buscar endereços marcados:", err)
    res.status(500).json({ erro: "Erro ao buscar endereços marcados" })
  }
})

// Atualizar quantidade marcada de um endereço específico
router.put("/:codloja/:prenota/:codproduto/:codendereco", async (req, res) => {
  const { codloja, prenota, codproduto, codendereco } = req.params
  const { quantidade } = req.body

  try {
    const query = `
      UPDATE wms_endereco_marcado
      SET quantidade = $1
      WHERE codloja = $2 AND prenota = $3 AND codproduto = $4 AND codendereco = $5
      RETURNING *;
    `
    const result = await productPool.query(query, [quantidade, codloja, prenota, codproduto, codendereco])
    res.json(result.rows[0])
  } catch (err) {
    console.error("Erro ao atualizar quantidade marcada:", err)
    res.status(500).json({ erro: "Erro ao atualizar quantidade marcada" })
  }
})

// Remover endereço marcado (desmarcar) e devolver ao estoque
router.delete("/:codloja/:prenota/:codproduto/:codendereco", async (req, res) => {
  const { codloja, prenota, codproduto, codendereco } = req.params

  const client = await productPool.connect()
  try {
    await client.query("BEGIN")

    // 1. Busca a quantidade marcada antes de deletar
    const marcadoRes = await client.query(
      `SELECT quantidade FROM wms_endereco_marcado
       WHERE codloja = $1 AND prenota = $2 AND codproduto = $3 AND codendereco = $4`,
      [codloja, prenota, codproduto, codendereco],
    )

    const qtde = Number.parseFloat(marcadoRes.rows[0]?.quantidade || "0")

    // 2. Exclui a marcação
    await client.query(
      `DELETE FROM wms_endereco_marcado
       WHERE codloja = $1 AND prenota = $2 AND codproduto = $3 AND codendereco = $4`,
      [codloja, prenota, codproduto, codendereco],
    )

    // 3. Tenta devolver para o estoque (tenta UPDATE primeiro)
    const updateResult = await client.query(
      `UPDATE wms_estoque_local
       SET quantidade = quantidade + $1
       WHERE codproduto = $2 AND codendereco = $3`,
      [qtde, codproduto, codendereco],
    )

    if (updateResult.rowCount === 0) {
      // Não existia o estoque, então insere
      await client.query(
        `INSERT INTO wms_estoque_local (codproduto, codendereco, quantidade)
         VALUES ($1, $2, $3)`,
        [codproduto, codendereco, qtde],
      )
    }

    await client.query("COMMIT")
    res.sendStatus(204)
  } catch (err) {
    await client.query("ROLLBACK")
    console.error("Erro ao excluir marcação e devolver ao estoque:", err)
    res.status(500).json({ erro: "Erro ao excluir marcação e devolver ao estoque" })
  } finally {
    client.release()
  }
})

export default router
