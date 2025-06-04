// backend/src/routes/dashboard.ts
import express from "express"
import { productPool } from "../database"

const router = express.Router()

// Rota para estatísticas de produtos
router.get("/estatisticas/produtos", async (_req, res) => {
  try {
    console.log("Buscando estatísticas de produtos...")

    // Consulta para obter estatísticas de produtos
    const query = `
      SELECT 
        COUNT(DISTINCT codproduto) as total_produtos,
        COUNT(DISTINCT CASE WHEN qtde_estoque > 0 THEN codproduto END) as produtos_com_estoque
      FROM vs_wms_fprodutos_estoque
    `

    const result = await productPool.query(query)
    console.log("Resultado da consulta de produtos:", result.rows[0])

    res.json({
      total_produtos: Number.parseInt(result.rows[0].total_produtos) || 0,
      produtos_com_estoque: Number.parseInt(result.rows[0].produtos_com_estoque) || 0,
    })
  } catch (err) {
    console.error("Erro ao buscar estatísticas de produtos:", err)
    res.status(500).json({ erro: "Erro ao buscar estatísticas de produtos" })
  }
})

// Rota para estatísticas de endereços - OTIMIZADA
router.get("/estatisticas/enderecos", async (_req, res) => {
  try {
    console.log("Buscando estatísticas de endereços...")

    // Consulta otimizada para obter todas as estatísticas em uma única query
    const query = `
      WITH endereco_stats AS (
        SELECT 
          (SELECT COUNT(*) FROM wms_enderecos) as total_enderecos,
          COUNT(DISTINCT codendereco) as enderecos_ocupados,
          COUNT(DISTINCT codproduto) as total_produtos_distintos
        FROM wms_estoque_local
        WHERE quantidade > 0
      )
      SELECT * FROM endereco_stats
    `

    const result = await productPool.query(query)
    console.log("Resultado da consulta de endereços:", result.rows[0])

    res.json({
      total_enderecos: Number.parseInt(result.rows[0].total_enderecos) || 0,
      enderecos_ocupados: Number.parseInt(result.rows[0].enderecos_ocupados) || 0,
      total_produtos: Number.parseInt(result.rows[0].total_produtos_distintos) || 0,
    })
  } catch (err) {
    console.error("Erro ao buscar estatísticas de endereços:", err)
    res.status(500).json({
      erro: "Erro ao buscar estatísticas de endereços",
      enderecos_ocupados: 0,
      total_enderecos: 0,
      total_produtos: 0,
    })
  }
})

// Rota para estatísticas de painel de entrada
router.get("/estatisticas/painel-entrada", async (_req, res) => {
  try {
    console.log("Buscando estatísticas do painel de entrada...")

    // Consulta otimizada para obter todas as estatísticas em uma única query
    const query = `
      SELECT 
        COUNT(DISTINCT nota) as total_notas,
        COUNT(DISTINCT CASE WHEN UPPER(tipo) LIKE '%TRANSF%' THEN nota END) as total_transferencias,
        COUNT(DISTINCT CASE WHEN UPPER(tipo) LIKE '%COMPR%' THEN nota END) as total_compras
      FROM vs_wms_fpainel_entrada
    `

    const result = await productPool.query(query)
    console.log("Resultado da consulta do painel de entrada:", result.rows[0])

    res.json({
      total_notas: Number.parseInt(result.rows[0].total_notas) || 0,
      total_transferencias: Number.parseInt(result.rows[0].total_transferencias) || 0,
      total_compras: Number.parseInt(result.rows[0].total_compras) || 0,
    })
  } catch (err) {
    console.error("Erro ao buscar estatísticas do painel de entrada:", err)
    res.status(500).json({
      erro: "Erro ao buscar estatísticas do painel de entrada",
      total_notas: 0,
      total_transferencias: 0,
      total_compras: 0,
    })
  }
})

// Rota para estatísticas de painel de saída
router.get("/estatisticas/painel-saida", async (_req, res) => {
  try {
    console.log("Buscando estatísticas do painel de saída...")

    // Consulta otimizada para obter todas as estatísticas em uma única query
    const query = `
      SELECT 
        COUNT(DISTINCT prenota) as total_prenotas,
        COUNT(DISTINCT CASE WHEN UPPER(tipo) LIKE '%TRANSF%' THEN prenota END) as total_transferencias,
        COUNT(DISTINCT CASE WHEN UPPER(tipo) LIKE '%VEND%' THEN prenota END) as total_vendas
      FROM vs_wms_fpainel_saida
    `

    const result = await productPool.query(query)
    console.log("Resultado da consulta do painel de saída:", result.rows[0])

    res.json({
      total_prenotas: Number.parseInt(result.rows[0].total_prenotas) || 0,
      total_transferencias: Number.parseInt(result.rows[0].total_transferencias) || 0,
      total_vendas: Number.parseInt(result.rows[0].total_vendas) || 0,
    })
  } catch (err) {
    console.error("Erro ao buscar estatísticas do painel de saída:", err)
    res.status(500).json({
      erro: "Erro ao buscar estatísticas do painel de saída",
      total_prenotas: 0,
      total_transferencias: 0,
      total_vendas: 0,
    })
  }
})

// Nova rota para buscar entradas recentes
router.get("/entradas-recentes", async (_req, res) => {
  try {
    console.log("Buscando entradas recentes...")

    const query = `
      SELECT 
        nota, 
        emitente, 
        tipo, 
        TO_CHAR(data, 'DD/MM/YYYY') as data_emissao,
        status
      FROM vs_wms_fpainel_entrada
      ORDER BY data_emissao DESC, nota DESC
      LIMIT 5
    `

    const result = await productPool.query(query)
    console.log(`Encontradas ${result.rows.length} entradas recentes`)

    res.json(result.rows)
  } catch (err) {
    console.error("Erro ao buscar entradas recentes:", err)
    res.status(500).json({ erro: "Erro ao buscar entradas recentes" })
  }
})

// Nova rota para buscar saídas recentes
router.get("/saidas-recentes", async (_req, res) => {
  try {
    console.log("Buscando saídas recentes...")

    const query = `
      SELECT 
        prenota, 
        destinario as cliente, 
        tipo, 
        TO_CHAR(data, 'DD/MM/YYYY') as data_emissao,
        status
      FROM vs_wms_fpainel_saida
      ORDER BY data_emissao DESC, prenota DESC
      LIMIT 5
    `

    const result = await productPool.query(query)
    console.log(`Encontradas ${result.rows.length} saídas recentes`)

    res.json(result.rows)
  } catch (err) {
    console.error("Erro ao buscar saídas recentes:", err)
    res.status(500).json({ erro: "Erro ao buscar saídas recentes" })
  }
})

export default router
