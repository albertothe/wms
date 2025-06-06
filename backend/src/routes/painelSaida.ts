// backend/src/routes/painelSaida.ts
import express, { type Request } from "express"
import { productPool } from "../database"
import { logger } from "../utils/logger"
import { auditarEndereco } from "../services/auditoriaEnderecoService"

interface RequestComUsuario extends Request {
  usuario?: { usuario: string }
}

const router = express.Router()

// Rota para listar capas (sem os produtos)
router.get("/", async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT
        data,
        codloja, 
        op,
        prenota,
        np,
        tipo,
        status,
        separacao,
        coddestinario,
        destinario,
        chave
      FROM vs_wms_fpainel_saida
      ORDER BY data DESC
    `
    const result = await productPool.query(query)
    res.json(result.rows)
  } catch (err) {
    logger.error("Erro ao buscar capas de pré-notas:", err)
    res.status(500).json({ erro: "Erro ao buscar pré-notas" })
  }
})

// Ao buscar os detalhes da pré-nota por chave, certifique-se de incluir o lote
router.get("/:chave", async (req, res) => {
  try {
    const { chave } = req.params

    // Buscar os produtos da pré-nota
    const produtos = await productPool.query(
      `
      SELECT 
        p.codproduto, 
        p.produto, 
        p.qtde_saida, 
        p.vlr_unitario, 
        p.vlr_total, 
        p.controla_lote,
        p.lote  -- Certifique-se de incluir o lote escolhido
      FROM 
        vs_wms_fpainel_saida p
      WHERE 
        p.chave = $1
    `,
      [chave],
    )

    // Buscar os endereços marcados
    const enderecosMarcados = await productPool.query(
      `
      SELECT codproduto, lote, codendereco, quantidade FROM wms_endereco_marcado WHERE chave = $1
    `,
      [chave],
    )

    res.json({
      produtos: produtos.rows,
      enderecosMarcados: enderecosMarcados.rows,
    })
  } catch (error) {
    logger.error("Erro ao buscar detalhes da pré-nota:", error)
    res.status(500).json({ error: "Erro ao buscar detalhes da pré-nota" })
  }
})

// NOVA ROTA: Dados para impressão da pré-nota
router.get("/:chave/imprimir", async (req, res) => {
  try {
    const { chave } = req.params
    logger.debug("Buscando dados para impressão da pré-nota com chave:", chave)

    // 1. Buscar dados da capa da pré-nota
    const capaPrenota = await productPool.query(
      `
      SELECT DISTINCT
        data,
        codloja,
        op,
        prenota,
        np,
        tipo,
        status,
        separacao,
        coddestinario,
        destinario,
        chave
      FROM vs_wms_fpainel_saida
      WHERE TRIM(chave) = $1
      LIMIT 1
    `,
      [chave],
    )

    if (capaPrenota.rows.length === 0) {
      return res.status(404).json({ erro: "Pré-nota não encontrada" })
    }

    const capa = capaPrenota.rows[0]

    // 2. Buscar produtos da pré-nota
    const produtos = await productPool.query(
      `
      SELECT 
        p.codproduto, 
        p.produto, 
        p.qtde_saida, 
        p.vlr_unitario, 
        p.vlr_total, 
        p.controla_lote,
        p.lote,
        p.unidade
      FROM 
        vs_wms_fpainel_saida p
      WHERE 
        p.chave = $1
      GROUP BY 
        p.codproduto, p.produto, p.qtde_saida, p.vlr_unitario, p.vlr_total, p.controla_lote, p.lote, p.unidade
    `,
      [chave],
    )

    // 3. Buscar endereços marcados para cada produto
    const enderecosMarcados = await productPool.query(
      `
      SELECT 
        em.codproduto, 
        em.lote, 
        em.codendereco, 
        em.quantidade,
        e.rua,
        e.predio,
        e.andar,
        e.apto
      FROM 
        wms_endereco_marcado em
      JOIN 
        wms_enderecos e ON em.codendereco = e.codendereco
      WHERE 
        em.chave = $1
    `,
      [chave],
    )

    // 4. NOVO: Buscar todos os endereços disponíveis no estoque para cada produto
    const produtosIds = produtos.rows.map((p) => p.codproduto)

    let enderecosEstoque = []
    if (produtosIds.length > 0) {
      const enderecosResult = await productPool.query(
        `
        SELECT 
          el.codproduto,
          el.lote,
          el.codendereco,
          el.quantidade,
          e.rua,
          e.predio,
          e.andar,
          e.apto
        FROM 
          wms_estoque_local el
        JOIN 
          wms_enderecos e ON el.codendereco = e.codendereco
        WHERE 
          el.codproduto = ANY($1)
        ORDER BY
          el.codproduto, e.rua, e.predio, e.andar, e.apto
        `,
        [produtosIds],
      )

      enderecosEstoque = enderecosResult.rows
    }

    // 5. Calcular totais
    const totalQuantidade = produtos.rows.reduce((acc, prod) => acc + Number(prod.qtde_saida), 0)
    const totalValor = produtos.rows.reduce((acc, prod) => acc + Number(prod.vlr_total), 0)

    // 6. Formatar dados para impressão
    const dadosImpressao = {
      capa: {
        numero: capa.prenota,
        emitente: capa.destinario,
        dataEmissao: capa.data,
        dataEntrada: capa.data, // Usar a mesma data como exemplo
        observacoes: `Pré-nota: ${capa.prenota}, Nota: ${capa.np}, Tipo: ${capa.tipo}, Status: ${capa.status}`,
        loja: capa.codloja,
        op: capa.op,
        separacao: capa.separacao,
        np: capa.np,
      },
      produtos: produtos.rows.map((prod) => ({
        codigo: prod.codproduto,
        descricao: prod.produto,
        unidade: prod.unidade || "UN",
        quantidade: Number(prod.qtde_saida),
        valorUnitario: Number(prod.vlr_unitario),
        valorTotal: Number(prod.vlr_total),
        lote: prod.lote || "-",
        controla_lote: prod.controla_lote,
      })),
      enderecos: enderecosMarcados.rows.map((end) => ({
        codigo: end.codendereco,
        rua: end.rua,
        predio: end.predio,
        andar: end.andar,
        apto: end.apto,
        quantidade: Number(end.quantidade),
        codproduto: end.codproduto,
        lote: end.lote,
        marcado: true,
      })),
      enderecosEstoque: enderecosEstoque.map((end) => ({
        codigo: end.codendereco,
        rua: end.rua,
        predio: end.predio,
        andar: end.andar,
        apto: end.apto,
        quantidade: Number(end.quantidade),
        codproduto: end.codproduto,
        lote: end.lote,
        marcado: false,
      })),
      totais: {
        quantidade: totalQuantidade,
        valor: totalValor,
      },
    }

    logger.info("Dados para impressão preparados com sucesso")
    res.json(dadosImpressao)
  } catch (error) {
    logger.error("Erro ao buscar dados para impressão:", error)
    res.status(500).json({ erro: "Erro ao buscar dados para impressão" })
  }
})

// Substitua rota antiga por esta:
router.get("/detalhes-capa/:chave", async (req, res) => {
  const { chave } = req.params

  try {
    const result = await productPool.query(
      `
      SELECT DISTINCT
        data,
        codloja,
        op,
        prenota,
        np,
        tipo,
        status,
        separacao,
        coddestinario,
        destinario
      FROM vs_wms_fpainel_saida
      WHERE TRIM(chave) = $1
      LIMIT 1
    `,
      [chave],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: "Pré-nota não encontrada" })
    }

    res.json(result.rows[0])
  } catch (err) {
    logger.error("Erro ao buscar detalhes da capa:", err)
    res.status(500).json({ erro: "Erro ao buscar detalhes da capa da pré-nota" })
  }
})

router.get("/detalhes-produtos/:chave", async (req, res) => {
  const { chave } = req.params

  try {
    const produtosResult = await productPool.query(
      `
      SELECT 
        vs.codproduto,
        vs.produto,
        vs.qtde_saida,
        vs.vlr_unitario,
        vs.vlr_total
      FROM vs_wms_fpainel_saida vs
      WHERE vs.chave = $1
      GROUP BY vs.codproduto, vs.produto, vs.qtde_saida, vs.vlr_unitario, vs.vlr_total
    `,
      [chave],
    )

    const produtos = await Promise.all(
      produtosResult.rows.map(async (prod) => {
        const enderecosResult = await productPool.query(
          `
        SELECT 
          el.codendereco,
          e.rua,
          e.predio,
          e.andar,
          e.apto,
          el.quantidade AS qtde
        FROM wms_estoque_local el
        JOIN wms_enderecos e ON e.codendereco = el.codendereco
        WHERE el.codproduto = $1
      `,
          [prod.codproduto],
        )

        // Buscar o endereço marcado
        const marcadoResult = await productPool.query(
          `
        SELECT codendereco 
        FROM wms_endereco_marcado 
        WHERE chave = $1 AND codproduto = $2
        LIMIT 1
      `,
          [chave, prod.codproduto],
        )

        const codEnderecoMarcado = marcadoResult.rows[0]?.codendereco || null

        return {
          codproduto: prod.codproduto,
          produto: prod.produto,
          qtde_saida: prod.qtde_saida,
          vlr_unitario: prod.vlr_unitario,
          vlr_total: prod.vlr_total,
          codendereco_marcado: codEnderecoMarcado,
          enderecos: enderecosResult.rows,
        }
      }),
    )

    res.json(produtos)
  } catch (err) {
    logger.error("Erro ao buscar produtos e endereços:", err)
    res.status(500).json({ erro: "Erro ao buscar produtos e endereços" })
  }
})

// GET - Etiquetas para a pré-nota (endereços marcados ou '-')
router.get("/etiquetas/:chave", async (req, res) => {
  const { chave } = req.params
  logger.debug("Buscando dados para etiquetas", { chave })

  try {
    const query = `
      SELECT 
        vs.codproduto,
        vs.produto,
        vs.qtde_saida,
        vs.vlr_unitario,
        vs.vlr_total,
        vs.unidade,
        vs.codbarra,
        COALESCE(em.codendereco, '-') AS codendereco,
        vs.endereco,
        vs.bairro,
        vs.cidade_uf,
        vs.np,
        TO_CHAR(vs.data, 'DD/MM/YYYY') AS data,
        vs.codloja,
        vs.destinario AS cliente,
        vs.lote
      FROM vs_wms_fpainel_saida vs
      LEFT JOIN (
        SELECT DISTINCT ON (chave, codproduto)
          chave,
          codproduto,
          codendereco
        FROM wms_endereco_marcado
        ORDER BY chave, codproduto, codendereco
      ) em
        ON em.chave = vs.chave
        AND em.codproduto = vs.codproduto
      WHERE TRIM(vs.chave) = $1;
    `

    const result = await productPool.query(query, [chave])

    logger.info("Dados de etiquetas carregados com sucesso", {
      chave,
      quantidade: result.rows.length,
    })

    res.json(result.rows)
  } catch (err) {
    logger.error("Erro ao buscar dados para etiquetas", { chave, error: err })
    res.status(500).json({ erro: "Erro ao buscar dados para etiquetas" })
  }
})

// MARCAR ENDEREÇO
router.post("/marcar-endereco", async (req: RequestComUsuario, res) => {
  const { codproduto, lote, codendereco, qtde, chave } = req.body

  try {
    const existe = await productPool.query(
      `
      SELECT 1 FROM wms_endereco_marcado
      WHERE codproduto = $1 AND lote = $2 AND codendereco = $3 AND chave = $4
    `,
      [codproduto, lote, codendereco, chave],
    )

    if (existe.rows.length > 0) {
      await productPool.query(
        `
        UPDATE wms_endereco_marcado
        SET quantidade = $1
        WHERE codproduto = $2 AND lote = $3 AND codendereco = $4 AND chave = $5
      `,
        [qtde, codproduto, lote, codendereco, chave],
      )
    } else {
      await productPool.query(
        `
        INSERT INTO wms_endereco_marcado (codproduto, lote, codendereco, quantidade, chave)
        VALUES ($1, $2, $3, $4, $5)
      `,
        [codproduto, lote, codendereco, qtde, chave],
      )
    }

    const estoque = await productPool.query(
      `
      SELECT quantidade FROM wms_estoque_local
      WHERE codproduto = $1 AND lote = $2 AND codendereco = $3
    `,
      [codproduto, lote, codendereco],
    )

    if (estoque.rows.length === 0) {
      return res.status(400).json({ erro: "Estoque não encontrado para o endereço" })
    }

    const atual = Number.parseFloat(estoque.rows[0].quantidade)
    const novaQtde = Number.parseFloat((atual - qtde).toFixed(2))

    if (novaQtde <= 0) {
      await productPool.query(
        `
        DELETE FROM wms_estoque_local
        WHERE codproduto = $1 AND lote = $2 AND codendereco = $3
      `,
        [codproduto, lote, codendereco],
      )
    } else {
      await productPool.query(
        `
        UPDATE wms_estoque_local
        SET quantidade = $1
        WHERE codproduto = $2 AND lote = $3 AND codendereco = $4
      `,
        [novaQtde, codproduto, lote, codendereco],
      )
    }

    await auditarEndereco({
      codendereco,
      codproduto,
      lote,
      quantidade: qtde,
      tipo: "saida",
      usuario: req.usuario?.usuario,
    })

    res.sendStatus(200)
  } catch (err) {
    logger.error("Erro ao marcar endereço:", err)
    res.status(500).json({ erro: "Erro ao marcar endereço" })
  }
})

// DESMARCAR ENDEREÇO
router.post("/desmarcar-endereco", async (req: RequestComUsuario, res) => {
  const { codproduto, lote, codendereco, chave } = req.body

  try {
    const result = await productPool.query(
      `SELECT quantidade FROM wms_endereco_marcado WHERE codproduto = $1 AND lote = $2 AND codendereco = $3 AND chave = $4`,
      [codproduto, lote, codendereco, chave],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: "Endereço marcado não encontrado" })
    }

    const quantidadeMarcada = Number.parseFloat(result.rows[0].quantidade)

    const estoqueAtual = await productPool.query(
      `SELECT quantidade FROM wms_estoque_local WHERE codproduto = $1 AND lote = $2 AND codendereco = $3`,
      [codproduto, lote, codendereco],
    )

    if (estoqueAtual.rows.length === 0) {
      await productPool.query(
        `INSERT INTO wms_estoque_local (codproduto, lote, codendereco, quantidade)
         VALUES ($1, $2, $3, $4)`,
        [codproduto, lote, codendereco, quantidadeMarcada],
      )
    } else {
      const atual = Number.parseFloat(estoqueAtual.rows[0].quantidade)
      const novaQtde = Number.parseFloat((atual + quantidadeMarcada).toFixed(2))

      await productPool.query(
        `UPDATE wms_estoque_local SET quantidade = $1 WHERE codproduto = $2 AND lote = $3 AND codendereco = $4`,
        [novaQtde, codproduto, lote, codendereco],
      )
    }

    await productPool.query(
      `DELETE FROM wms_endereco_marcado WHERE codproduto = $1 AND lote = $2 AND codendereco = $3 AND chave = $4`,
      [codproduto, lote, codendereco, chave],
    )

    await auditarEndereco({
      codendereco,
      codproduto,
      lote,
      quantidade: quantidadeMarcada,
      tipo: "entrada",
      usuario: req.usuario?.usuario,
    })

    res.sendStatus(200)
  } catch (err) {
    logger.error("Erro ao desmarcar endereço:", err)
    res.status(500).json({ erro: "Erro ao desmarcar endereço" })
  }
})

// ATUALIZAR QUANTIDADE
router.post("/atualizar-quantidade", async (req, res) => {
  const { codproduto, lote, codendereco, novaQuantidade, chave } = req.body

  try {
    const atual = await productPool.query(
      `SELECT quantidade FROM wms_endereco_marcado WHERE codproduto = $1 AND lote = $2 AND codendereco = $3 AND chave = $4`,
      [codproduto, lote, codendereco, chave],
    )

    if (atual.rows.length === 0) {
      return res.status(404).json({ erro: "Endereço marcado não encontrado" })
    }

    const qtdeAtual = Number.parseFloat(atual.rows[0].quantidade)
    const novaQtdeFloat = Number.parseFloat(novaQuantidade)
    const diferenca = novaQtdeFloat - qtdeAtual

    await productPool.query(
      `UPDATE wms_endereco_marcado SET quantidade = $1 WHERE codproduto = $2 AND lote = $3 AND codendereco = $4 AND chave = $5`,
      [novaQtdeFloat, codproduto, lote, codendereco, chave],
    )

    const estoque = await productPool.query(
      `SELECT quantidade FROM wms_estoque_local WHERE codproduto = $1 AND lote = $2 AND codendereco = $3`,
      [codproduto, lote, codendereco],
    )

    if (estoque.rows.length === 0 && diferenca < 0) {
      return res.status(400).json({ erro: "Estoque insuficiente para aumentar a marcação" })
    }

    if (estoque.rows.length === 0 && diferenca > 0) {
      await productPool.query(
        `INSERT INTO wms_estoque_local (codproduto, lote, codendereco, quantidade) VALUES ($1, $2, $3, $4)`,
        [codproduto, lote, codendereco, diferenca],
      )
    } else {
      const atualEstoque = Number.parseFloat(estoque.rows[0].quantidade)
      const novaQtdeEstoque = atualEstoque - diferenca

      if (novaQtdeEstoque < 0) {
        return res.status(400).json({ erro: "Estoque insuficiente para essa operação" })
      }

      await productPool.query(
        `UPDATE wms_estoque_local SET quantidade = $1 WHERE codproduto = $2 AND lote = $3 AND codendereco = $4`,
        [novaQtdeEstoque, codproduto, lote, codendereco],
      )
    }

    res.sendStatus(200)
  } catch (err) {
    logger.error("Erro ao atualizar quantidade marcada:", err)
    res.status(500).json({ erro: "Erro ao atualizar quantidade" })
  }
})

export default router
