// backend/src/routes/painelSaida.ts
import express, { type Request } from "express"
import { productPool } from "../database"
import { logger } from "../utils/logger"
import { auditarEndereco } from "../services/auditoriaEnderecoService"

interface RequestComUsuario extends Request {
  usuario?: { usuario: string }
}

const router = express.Router()

type LinhaCapa = {
  data: string
  codloja: string
  op: string
  prenota: string
  np: string
  separacao: string
  destinario: string
  chave: string
  observacao: string
}

type LinhaProduto = {
  chave: string
  codproduto: string
  produto: string
  qtde_saida: string | number
  vlr_unitario: string | number
  vlr_total: string | number
  controla_lote: string
  lote: string
  unidade: string
}

type LinhaEnderecoMarcado = {
  chave: string
  codproduto: string
  lote: string
  codendereco: string
  quantidade: string | number
  rua: string
  predio: string
  andar: string
  apto: string
}

type LinhaEnderecoEstoque = {
  chave: string
  codproduto: string
  lote: string
  codendereco: string
  quantidade: string | number
  rua: string
  predio: string
  andar: string
  apto: string
}

const montarDadosImpressaoPorChave = async (chaves: string[]) => {
  const chavesLimpas = [...new Set(chaves.map((chave) => chave.trim()).filter(Boolean))]
  if (chavesLimpas.length === 0) return {}

  const capasResult = await productPool.query<LinhaCapa>(
    `
      SELECT DISTINCT ON (TRIM(chave))
        data,
        codloja,
        op,
        prenota,
        np,
        separacao,
        destinario,
        chave,
        observacao
      FROM vs_wms_fpainel_saida
      WHERE TRIM(chave) = ANY($1)
      ORDER BY TRIM(chave), data DESC
    `,
    [chavesLimpas],
  )

  const produtosResult = await productPool.query<LinhaProduto>(
    `
      SELECT
        TRIM(p.chave) AS chave,
        p.codproduto,
        p.produto,
        p.qtde_saida,
        p.vlr_unitario,
        p.vlr_total,
        p.controla_lote,
        p.lote,
        p.unidade
      FROM vs_wms_fpainel_saida p
      WHERE TRIM(p.chave) = ANY($1)
      GROUP BY
        TRIM(p.chave), p.codproduto, p.produto, p.qtde_saida,
        p.vlr_unitario, p.vlr_total, p.controla_lote, p.lote, p.unidade
    `,
    [chavesLimpas],
  )

  const enderecosMarcadosResult = await productPool.query<LinhaEnderecoMarcado>(
    `
      SELECT
        TRIM(em.chave) AS chave,
        em.codproduto,
        em.lote,
        em.codendereco,
        em.quantidade,
        e.rua,
        e.predio,
        e.andar,
        e.apto
      FROM wms_endereco_marcado em
      JOIN wms_enderecos e ON em.codendereco = e.codendereco
      WHERE TRIM(em.chave) = ANY($1)
    `,
    [chavesLimpas],
  )

  const enderecosEstoqueResult = await productPool.query<LinhaEnderecoEstoque>(
    `
      SELECT
        TRIM(p.chave) AS chave,
        el.codproduto,
        el.lote,
        el.codendereco,
        el.quantidade,
        e.rua,
        e.predio,
        e.andar,
        e.apto
      FROM (
        SELECT DISTINCT TRIM(chave) AS chave, codproduto
        FROM vs_wms_fpainel_saida
        WHERE TRIM(chave) = ANY($1)
      ) p
      JOIN wms_estoque_local el ON el.codproduto = p.codproduto
      JOIN wms_enderecos e ON el.codendereco = e.codendereco
      ORDER BY p.chave, el.codproduto, e.rua, e.predio, e.andar, e.apto
    `,
    [chavesLimpas],
  )

  const produtosPorChave = new Map<string, LinhaProduto[]>()
  produtosResult.rows.forEach((produto) => {
    const lista = produtosPorChave.get(produto.chave) || []
    lista.push(produto)
    produtosPorChave.set(produto.chave, lista)
  })

  const enderecosMarcadosPorChave = new Map<string, LinhaEnderecoMarcado[]>()
  enderecosMarcadosResult.rows.forEach((endereco) => {
    const lista = enderecosMarcadosPorChave.get(endereco.chave) || []
    lista.push(endereco)
    enderecosMarcadosPorChave.set(endereco.chave, lista)
  })

  const enderecosEstoquePorChave = new Map<string, LinhaEnderecoEstoque[]>()
  enderecosEstoqueResult.rows.forEach((endereco) => {
    const lista = enderecosEstoquePorChave.get(endereco.chave) || []
    lista.push(endereco)
    enderecosEstoquePorChave.set(endereco.chave, lista)
  })

  const dadosPorChave = Object.fromEntries(
    capasResult.rows.map((capa) => {
      const chave = capa.chave.trim()
      const produtos = produtosPorChave.get(chave) || []
      const enderecosMarcados = enderecosMarcadosPorChave.get(chave) || []
      const enderecosEstoque = enderecosEstoquePorChave.get(chave) || []

      const totalQuantidade = produtos.reduce((acc, prod) => acc + Number(prod.qtde_saida), 0)
      const totalValor = produtos.reduce((acc, prod) => acc + Number(prod.vlr_total), 0)

      return [
        chave,
        {
          capa: {
            numero: capa.prenota,
            emitente: capa.destinario,
            dataEmissao: capa.data,
            dataEntrada: capa.data,
            observacoes: capa.observacao,
            loja: capa.codloja,
            op: capa.op,
            separacao: capa.separacao,
            np: capa.np,
          },
          produtos: produtos.map((prod) => ({
            codigo: prod.codproduto,
            descricao: prod.produto,
            unidade: prod.unidade || "UN",
            quantidade: Number(prod.qtde_saida),
            valorUnitario: Number(prod.vlr_unitario),
            valorTotal: Number(prod.vlr_total),
            lote: prod.lote || "-",
            controla_lote: prod.controla_lote,
          })),
          enderecos: enderecosMarcados.map((end) => ({
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
        },
      ]
    }),
  )

  return dadosPorChave
}

// Rota para listar capas (sem os produtos)
router.get("/", async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT
        p.data,
        p.codloja,
        p.op,
        p.prenota,
        p.np,
        p.tipo,
        p.tipoentrega,
        p.status,
        p.separacao,
        p.coddestinario,
        p.destinario,
        p.chave,
        s.status AS separacao_status,
        s.usuario_atribuido AS separador
      FROM vs_wms_fpainel_saida p
      LEFT JOIN wms_separacoes s
        ON s.chave::text = p.chave::text
      ORDER BY p.data DESC
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
    const dadosPorChave = await montarDadosImpressaoPorChave([chave])
    const dadosImpressao = dadosPorChave[chave.trim()]

    if (!dadosImpressao) {
      return res.status(404).json({ erro: "Pré-nota não encontrada" })
    }

    logger.info("Dados para impressão preparados com sucesso")
    res.json(dadosImpressao)
  } catch (error) {
    logger.error("Erro ao buscar dados para impressão:", error)
    res.status(500).json({ erro: "Erro ao buscar dados para impressão" })
  }
})

router.post("/imprimir-lote", async (req, res) => {
  try {
    const chaves = Array.isArray(req.body?.chaves) ? req.body.chaves : []
    const dadosPorChave = await montarDadosImpressaoPorChave(chaves)
    res.json({ dadosPorChave })
  } catch (error) {
    logger.error("Erro ao buscar dados para impressão em lote:", error)
    res.status(500).json({ erro: "Erro ao buscar dados para impressão em lote" })
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
