// backend/src/controllers/enderecosController.ts
import type { Request, Response } from "express"
import { productPool } from "../database"

// Listar endereços por produto
export const listarEnderecosPorProduto = async (req: Request, res: Response) => {
  const { codproduto } = req.params

  try {
    const result = await productPool.query(
      `
      SELECT 
        el.codendereco,
        e.rua,
        e.predio,
        e.andar,
        e.apto,
        el.lote,
        el.quantidade as qtde
      FROM wms_estoque_local el
      JOIN wms_enderecos e ON e.codendereco = el.codendereco
      WHERE el.codproduto = $1
      ORDER BY el.lote, el.codendereco
    `,
      [codproduto],
    )

    res.json(result.rows)
  } catch (error) {
    console.error("Erro ao buscar endereços do produto:", error)
    res.status(500).json({ erro: "Erro ao buscar endereços do produto" })
  }
}

// Listar endereços por produto e lote
export const listarEnderecosPorLote = async (req: Request, res: Response) => {
  const { codproduto, lote } = req.params

  try {
    const result = await productPool.query(
      `
      SELECT 
        el.codendereco,
        e.rua,
        e.predio,
        e.andar,
        e.apto,
        el.quantidade as qtde
      FROM wms_estoque_local el
      JOIN wms_enderecos e ON e.codendereco = el.codendereco
      WHERE el.codproduto = $1 AND el.lote = $2
      ORDER BY el.codendereco
    `,
      [codproduto, lote],
    )

    res.json(result.rows)
  } catch (error) {
    console.error("Erro ao buscar endereços do lote:", error)
    res.status(500).json({ erro: "Erro ao buscar endereços do lote" })
  }
}

// Verificar disponibilidade de endereço
export const verificarDisponibilidadeEndereco = async (req: Request, res: Response) => {
  const { codendereco } = req.params

  try {
    const result = await productPool.query(
      `
      SELECT 
        SUM(quantidade) as total_ocupado,
        (SELECT capacidade FROM wms_enderecos WHERE codendereco = $1) as capacidade
      FROM wms_estoque_local
      WHERE codendereco = $1
    `,
      [codendereco],
    )

    const { total_ocupado, capacidade } = result.rows[0]
    const disponivel = capacidade ? capacidade - (total_ocupado || 0) : null

    res.json({
      codendereco,
      total_ocupado: total_ocupado || 0,
      capacidade,
      disponivel,
    })
  } catch (error) {
    console.error("Erro ao verificar disponibilidade do endereço:", error)
    res.status(500).json({ erro: "Erro ao verificar disponibilidade do endereço" })
  }
}
