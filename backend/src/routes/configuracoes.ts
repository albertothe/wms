import express from "express"
import { productPool } from "../database"

const router = express.Router()

// Modificar a função que retorna as configurações públicas
router.get("/public", async (req, res) => {
  try {
    console.log("Buscando configurações públicas da empresa...")

    const query = `
      SELECT 
        id_empresa, 
        nome_empresa, 
        cor_topo
      FROM wms_configuracoes_empresa 
      WHERE id_empresa = 1
    `

    console.log("Executando query pública:", query)

    const result = await productPool.query(query)
    console.log("Resultado da query pública:", result.rows)

    if (result.rows.length > 0) {
      console.log("Configurações públicas encontradas:", result.rows[0])

      // Adicionar modelo de impressão da variável de ambiente
      const config = {
        ...result.rows[0],
        modelo_impressao_prenota: Number.parseInt(process.env.PRENOTA_PRINT_MODEL || "1"),
        tipo_impressao_etiqueta: Number.parseInt(process.env.ETIQUETA_PRINT_TYPE || "1"),
      }

      res.json(config)
    } else {
      console.log("Nenhuma configuração pública encontrada, retornando padrão")
      res.json({
        id_empresa: 1,
        nome_empresa: "Sistema WMS",
        cor_topo: "#0a0a6b",
        modelo_impressao_prenota: Number.parseInt(process.env.PRENOTA_PRINT_MODEL || "1"),
        tipo_impressao_etiqueta: Number.parseInt(process.env.ETIQUETA_PRINT_TYPE || "1"),
      })
    }
  } catch (error) {
    console.error("Erro ao buscar configurações públicas:", error)
    res.status(500).json({
      error: "Erro ao buscar configurações",
      nome_empresa: "Sistema WMS",
      cor_topo: "#0a0a6b",
      modelo_impressao_prenota: Number.parseInt(process.env.PRENOTA_PRINT_MODEL || "1"),
      tipo_impressao_etiqueta: Number.parseInt(process.env.ETIQUETA_PRINT_TYPE || "1"),
    })
  }
})

// Também modificar a rota protegida para incluir a nova configuração
router.get("/", async (req, res) => {
  try {
    console.log("Buscando configurações completas da empresa...")

    const query = `
      SELECT 
        id_empresa, 
        nome_empresa, 
        cor_topo, 
        usa_4_niveis, 
        cod_cd, 
        categoria_inicial, 
        categoria_final
      FROM wms_configuracoes_empresa 
      WHERE id_empresa = 1
    `

    console.log("Executando query completa:", query)

    const result = await productPool.query(query)
    console.log("Resultado da query completa:", result.rows)

    if (result.rows.length > 0) {
      console.log("Configurações completas encontradas:", result.rows[0])

      // Adicionar modelo de impressão da variável de ambiente e campos para compatibilidade
      const config = {
        ...result.rows[0],
        modelo_impressao_prenota: Number.parseInt(process.env.PRENOTA_PRINT_MODEL || "1"),
        tipo_impressao_etiqueta: Number.parseInt(process.env.ETIQUETA_PRINT_TYPE || "1"),
        // Campos para compatibilidade com o componente de impressão
        endereco_empresa: "",
        telefone_empresa: "",
        cnpj_empresa: "",
        logo_empresa: null,
      }

      res.json(config)
    } else {
      console.log("Nenhuma configuração completa encontrada, retornando padrão")
      res.json({
        id_empresa: 1,
        nome_empresa: "Empresa",
        cor_topo: "#0a0a6b",
        usa_4_niveis: false,
        cod_cd: "00",
        categoria_inicial: "01001",
        categoria_final: "99999",
        modelo_impressao_prenota: Number.parseInt(process.env.PRENOTA_PRINT_MODEL || "1"),
        tipo_impressao_etiqueta: Number.parseInt(process.env.ETIQUETA_PRINT_TYPE || "1"),
        // Campos para compatibilidade com o componente de impressão
        endereco_empresa: "",
        telefone_empresa: "",
        cnpj_empresa: "",
        logo_empresa: null,
      })
    }
  } catch (error) {
    console.error("Erro ao buscar configurações completas:", error)
    res.status(500).json({
      error: "Erro ao buscar configurações",
      // Retornar configurações padrão em caso de erro
      nome_empresa: "Sistema WMS",
      cor_topo: "#0a0a6b",
      usa_4_niveis: false,
      modelo_impressao_prenota: Number.parseInt(process.env.PRENOTA_PRINT_MODEL || "1"),
      tipo_impressao_etiqueta: Number.parseInt(process.env.ETIQUETA_PRINT_TYPE || "1"),
    })
  }
})

// Rota para atualizar as configurações da empresa
router.put("/", async (req, res) => {
  const { nome_empresa, cor_topo, usa_4_niveis, cod_cd, categoria_inicial, categoria_final } = req.body

  try {
    console.log("Atualizando configurações da empresa:", req.body)

    // Verificar se já existe um registro
    const checkQuery = "SELECT id_empresa FROM wms_configuracoes_empresa WHERE id_empresa = 1"
    const checkResult = await productPool.query(checkQuery)
    console.log("Verificação de registro existente:", checkResult.rows)

    let query
    let values

    if (checkResult.rows.length > 0) {
      // Atualizar registro existente
      query = `
        UPDATE wms_configuracoes_empresa 
        SET 
          nome_empresa = $1, 
          cor_topo = $2, 
          usa_4_niveis = $3, 
          cod_cd = $4, 
          categoria_inicial = $5, 
          categoria_final = $6
        WHERE id_empresa = 1
        RETURNING *
      `
      values = [nome_empresa, cor_topo, usa_4_niveis, cod_cd, categoria_inicial, categoria_final]
    } else {
      // Inserir novo registro
      query = `
        INSERT INTO wms_configuracoes_empresa 
          (id_empresa, nome_empresa, cor_topo, usa_4_niveis, cod_cd, categoria_inicial, categoria_final)
        VALUES 
          (1, $1, $2, $3, $4, $5, $6)
        RETURNING *
      `
      values = [nome_empresa, cor_topo, usa_4_niveis, cod_cd, categoria_inicial, categoria_final]
    }

    console.log("Executando query de atualização:", query)
    console.log("Valores para atualização:", values)

    const result = await productPool.query(query, values)
    console.log("Configurações atualizadas:", result.rows[0])

    // Adicionar modelo de impressão na resposta
    const configAtualizada = {
      ...result.rows[0],
      modelo_impressao_prenota: Number.parseInt(process.env.PRENOTA_PRINT_MODEL || "1"),
    }

    res.json(configAtualizada)
  } catch (error) {
    console.error("Erro ao atualizar configurações:", error)
    res.status(500).json({ error: "Erro ao atualizar configurações" })
  }
})

export default router
