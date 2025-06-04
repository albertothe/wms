// backend/src/routes/painelEntrada.ts
import express from "express"
import { productPool } from "../database"

const router = express.Router()

// GET - Listar todas as notas de entrada
router.get("/", async (req, res) => {
    try {
        const result = await productPool.query(`
      SELECT 
        chave,
        data,
        codloja,
        op,
        nota,
        tipo,
        status,
        codemitente,
        emitente,
        endereco,
        bairro,
        cidade_uf,
        codproduto,
        produto,
        unidade,
        controla_lote,
        qtde_entrada,
        vlr_unitario,
        vlr_total,
        lote
      FROM vs_wms_fpainel_entrada
      ORDER BY data DESC, nota DESC
    `)

        res.json(result.rows)
    } catch (error) {
        console.error("Erro ao buscar notas de entrada:", error)
        res.status(500).json({ erro: "Erro ao buscar notas de entrada" })
    }
})

// GET - Buscar detalhes de uma nota específica
router.get("/nota/:nota", async (req, res) => {
    const { nota } = req.params

    try {
        const result = await productPool.query(
            `
      SELECT 
        chave,
        data,
        codloja,
        op,
        nota,
        tipo,
        status,
        codemitente,
        emitente,
        endereco,
        bairro,
        cidade_uf,
        codproduto,
        produto,
        unidade,
        controla_lote,
        qtde_entrada,
        vlr_unitario,
        vlr_total,
        lote
      FROM vs_wms_fpainel_entrada
      WHERE nota = $1
      ORDER BY produto
    `,
            [nota],
        )

        if (result.rows.length === 0) {
            return res.status(404).json({ erro: "Nota não encontrada" })
        }

        res.json(result.rows)
    } catch (error) {
        console.error("Erro ao buscar detalhes da nota:", error)
        res.status(500).json({ erro: "Erro ao buscar detalhes da nota" })
    }
})

// GET - Buscar produtos de uma nota específica
router.get("/nota/:nota/produtos", async (req, res) => {
    const { nota } = req.params

    try {
        const result = await productPool.query(
            `
      SELECT 
        codproduto,
        produto,
        unidade,
        controla_lote,
        SUM(qtde_entrada) as qtde_total,
        AVG(vlr_unitario) as vlr_unitario_medio,
        SUM(vlr_total) as vlr_total
      FROM vs_wms_fpainel_entrada
      WHERE nota = $1
      GROUP BY codproduto, produto, unidade, controla_lote
      ORDER BY produto
    `,
            [nota],
        )

        res.json(result.rows)
    } catch (error) {
        console.error("Erro ao buscar produtos da nota:", error)
        res.status(500).json({ erro: "Erro ao buscar produtos da nota" })
    }
})

// GET - Buscar lotes de um produto em uma nota específica
router.get("/nota/:nota/produto/:codproduto/lotes", async (req, res) => {
    const { nota, codproduto } = req.params

    try {
        const result = await productPool.query(
            `
      SELECT 
        lote,
        SUM(qtde_entrada) as qtde_total,
        AVG(vlr_unitario) as vlr_unitario_medio,
        SUM(vlr_total) as vlr_total
      FROM vs_wms_fpainel_entrada
      WHERE nota = $1 AND codproduto = $2 AND lote IS NOT NULL AND lote != ''
      GROUP BY lote
      ORDER BY lote
    `,
            [nota, codproduto],
        )

        res.json(result.rows)
    } catch (error) {
        console.error("Erro ao buscar lotes do produto:", error)
        res.status(500).json({ erro: "Erro ao buscar lotes do produto" })
    }
})

// GET - Buscar notas por período
router.get("/periodo", async (req, res) => {
    const { dataInicio, dataFim } = req.query

    if (!dataInicio || !dataFim) {
        return res.status(400).json({ erro: "Data de início e fim são obrigatórias" })
    }

    try {
        const result = await productPool.query(
            `
      SELECT 
        DISTINCT ON (nota, data, codloja) 
        nota,
        data,
        codloja,
        op,
        tipo,
        status,
        emitente,
        SUM(qtde_entrada) OVER (PARTITION BY nota, data, codloja) as qtde_total,
        SUM(vlr_total) OVER (PARTITION BY nota, data, codloja) as valor_total
      FROM vs_wms_fpainel_entrada
      WHERE data BETWEEN $1 AND $2
      ORDER BY nota, data, codloja, emitente
    `,
            [dataInicio, dataFim],
        )

        res.json(result.rows)
    } catch (error) {
        console.error("Erro ao buscar notas por período:", error)
        res.status(500).json({ erro: "Erro ao buscar notas por período" })
    }
})

// GET - Buscar estatísticas de entrada por período
router.get("/estatisticas", async (req, res) => {
    const { dataInicio, dataFim } = req.query

    if (!dataInicio || !dataFim) {
        return res.status(400).json({ erro: "Data de início e fim são obrigatórias" })
    }

    try {
        const result = await productPool.query(
            `
      SELECT 
        COUNT(DISTINCT nota) as total_notas,
        COUNT(DISTINCT codproduto) as total_produtos,
        SUM(qtde_entrada) as qtde_total,
        SUM(vlr_total) as valor_total
      FROM vs_wms_fpainel_entrada
      WHERE data BETWEEN $1 AND $2
    `,
            [dataInicio, dataFim],
        )

        res.json(result.rows[0])
    } catch (error) {
        console.error("Erro ao buscar estatísticas:", error)
        res.status(500).json({ erro: "Erro ao buscar estatísticas" })
    }
})

export default router
