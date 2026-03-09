"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  CircularProgress,
  Container,
  IconButton,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  alpha,
} from "@mui/material"
import { ExpandMore } from "@mui/icons-material"
import { Layout } from "../components/Layout"
import { useAuth } from "../contexts/AuthContext"
import api from "../services/api"

interface Separacao {
  chave: string
  codloja: number
  np: string
  cliente: string
  separador: string
  data_inicio: string | null
  data_fim: string | null
  status: "P" | "S" | "F"
  progresso: number
}

interface ItemSeparacao {
  codproduto: string
  produto: string
  qtde_total: number
  qtde_separada: number
}

const formatarTempo = (dataInicio: string | null, dataFim: string | null): string => {
  if (!dataInicio) return "-"
  const inicio = new Date(dataInicio).getTime()
  const fim = dataFim ? new Date(dataFim).getTime() : Date.now()
  const diff = Math.max(0, fim - inicio)
  const minutos = Math.floor(diff / 60000)
  const segundos = Math.floor((diff % 60000) / 1000)
  return `${minutos}m ${segundos}s`
}

const obterCorTempo = (dataInicio: string | null, dataFim: string | null): "success" | "warning" | "error" | "default" => {
  if (!dataInicio) return "default"
  const fim = dataFim ? new Date(dataFim).getTime() : Date.now()
  const diffMin = (fim - new Date(dataInicio).getTime()) / 60000
  if (diffMin <= 5) return "success"
  if (diffMin <= 10) return "warning"
  return "error"
}

const PainelSeparacao: React.FC = () => {
  const { empresa, corTopo } = useAuth()
  const nomeEmpresa = empresa?.nome || "Sistema WMS"
  const [carregando, setCarregando] = useState(true)
  const [separacoes, setSeparacoes] = useState<Separacao[]>([])
  const [filtro, setFiltro] = useState("")
  const [detalhesExpandidos, setDetalhesExpandidos] = useState<Record<string, boolean>>({})
  const [itensPorChave, setItensPorChave] = useState<Record<string, ItemSeparacao[]>>({})
  const [carregandoItens, setCarregandoItens] = useState<Record<string, boolean>>({})
  const [produtosExpandidos, setProdutosExpandidos] = useState<Record<string, boolean>>({})
  const [produtosConferidos, setProdutosConferidos] = useState<Record<string, string[]>>({})

  const buscarSeparacoes = useCallback(async () => {
    try {
      const response = await api.get("/separacao")
      setSeparacoes(response.data)
    } finally {
      setCarregando(false)
    }
  }, [])

  const buscarItens = useCallback(async (chave: string) => {
    setCarregandoItens((prev) => ({ ...prev, [chave]: true }))
    try {
      const response = await api.get("/separacao/itens", { params: { chave } })
      setItensPorChave((prev) => ({ ...prev, [chave]: response.data }))
    } finally {
      setCarregandoItens((prev) => ({ ...prev, [chave]: false }))
    }
  }, [])

  useEffect(() => {
    buscarSeparacoes()
    const interval = setInterval(() => {
      buscarSeparacoes()
    }, 30000)
    const relogio = setInterval(() => {
      setSeparacoes((prev) => {
        if (prev.every((item) => item.status === "F")) return prev
        return [...prev]
      })
    }, 1000)

    return () => {
      clearInterval(interval)
      clearInterval(relogio)
    }
  }, [buscarSeparacoes])

  const separacoesFiltradas = useMemo(() => {
    return separacoes.filter((item) => {
      const busca = filtro.toLowerCase()
      return (
        item.np?.toLowerCase().includes(busca) ||
        String(item.codloja).includes(busca) ||
        item.cliente?.toLowerCase().includes(busca) ||
        item.separador?.toLowerCase().includes(busca)
      )
    })
  }, [separacoes, filtro])

  const atualizarItem = async (chave: string, codproduto: string, qtde: number) => {
    try {
      await api.post("/separacao/item", {
        chave,
        codproduto,
        qtde_separada: qtde,
      })

      await Promise.all([buscarItens(chave), buscarSeparacoes()])
    } catch (error) {
      console.error("Erro ao atualizar item da separação:", error)
    }
  }

  const iniciarSeparacao = async (item: Separacao) => {
    await api.post("/separacao/iniciar", { chave: item.chave })
    await buscarSeparacoes()
  }

  const toggleDetalhes = async (chave: string) => {
    const estaAberto = Boolean(detalhesExpandidos[chave])
    setDetalhesExpandidos((prev) => ({ ...prev, [chave]: !estaAberto }))
    if (!estaAberto && !itensPorChave[chave]) {
      await buscarItens(chave)
    }
  }

  const toggleProduto = (chave: string, codproduto: string) => {
    const chaveProduto = `${chave}_${codproduto}`
    setProdutosExpandidos((prev) => ({ ...prev, [chaveProduto]: !prev[chaveProduto] }))
    setProdutosConferidos((prev) => {
      const conferidos = new Set(prev[chave] || [])
      conferidos.add(codproduto)
      return { ...prev, [chave]: Array.from(conferidos) }
    })
  }

  const podeFinalizar = (separacao: Separacao) => {
    const itens = itensPorChave[separacao.chave] || []
    if (itens.length === 0) return false
    const todosSeparados = itens.every((item) => Number(item.qtde_separada) >= Number(item.qtde_total))
    const todosConferidos = itens.every((item) => (produtosConferidos[separacao.chave] || []).includes(item.codproduto))
    return todosSeparados && todosConferidos && Number(separacao.progresso || 0) >= 100
  }

  const finalizarSeparacao = async (separacao: Separacao) => {
    await api.post("/separacao/finalizar", { chave: separacao.chave })
    await Promise.all([buscarSeparacoes(), buscarItens(separacao.chave)])
  }

  return (
    <Layout corTopo={corTopo} nomeEmpresa={nomeEmpresa}>
      <Container maxWidth={false} sx={{ py: 3 }}>
        <Paper sx={{ p: 3, mb: 2, borderRadius: 2, boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)" }}>
          <Typography variant="h5" sx={{ mb: 2, color: corTopo, fontWeight: 700 }}>
            Painel de Separação
          </Typography>
          <TextField
            fullWidth
            size="small"
            label="Buscar por loja, nota, cliente ou separador"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
        </Paper>

        <TableContainer component={Paper} sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f3f4f6" }}>
                <TableCell sx={{ width: 60 }}></TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Loja</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Nota</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Cliente</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Separador</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Início</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Data/Hora Final</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Tempo</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Progresso</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">
                  Ação
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {carregando ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : separacoesFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    <Alert severity="info">Nenhuma separação encontrada.</Alert>
                  </TableCell>
                </TableRow>
              ) : (
                separacoesFiltradas.map((item) => (
                  <React.Fragment key={item.chave}>
                    <TableRow sx={{ "&:nth-of-type(even)": { backgroundColor: alpha("#f3f4f6", 0.3) } }}>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => {
                            void toggleDetalhes(item.chave)
                          }}
                          sx={{ transform: detalhesExpandidos[item.chave] ? "rotate(180deg)" : "rotate(0deg)" }}
                        >
                          <ExpandMore />
                        </IconButton>
                      </TableCell>
                      <TableCell>{item.codloja}</TableCell>
                    <TableCell>{item.np}</TableCell>
                    <TableCell>{item.cliente || "-"}</TableCell>
                    <TableCell>{item.separador || "-"}</TableCell>
                    <TableCell>{item.data_inicio ? new Date(item.data_inicio).toLocaleString("pt-BR") : "-"}</TableCell>
                    <TableCell>{item.data_fim ? new Date(item.data_fim).toLocaleString("pt-BR") : "-"}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={obterCorTempo(item.data_inicio, item.data_fim)}
                        label={formatarTempo(item.data_inicio, item.data_fim)}
                      />
                    </TableCell>
                    <TableCell sx={{ minWidth: 180 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={Number(item.progresso || 0)}
                          sx={{ flex: 1, height: 8, borderRadius: 1 }}
                        />
                        <Typography variant="caption" sx={{ minWidth: 36 }}>
                          {Math.round(Number(item.progresso || 0))}%
                        </Typography>
                      </Box>
                    </TableCell>
                      <TableCell align="center">
                        {item.status === "P" && (
                          <Button size="small" variant="contained" onClick={() => iniciarSeparacao(item)}>
                            Iniciar
                          </Button>
                        )}
                        {item.status === "F" && <Chip size="small" color="success" label="Finalizada" />}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={10} sx={{ p: 0, borderBottom: 0 }}>
                        <Collapse in={Boolean(detalhesExpandidos[item.chave])} timeout="auto" unmountOnExit>
                          <Box sx={{ p: 2, backgroundColor: "#f9fafb" }}>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                              Conferência por produto
                            </Typography>
                            {carregandoItens[item.chave] ? (
                              <Box display="flex" justifyContent="center" py={2}>
                                <CircularProgress size={22} />
                              </Box>
                            ) : (
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell sx={{ width: 50 }}></TableCell>
                                    <TableCell>Produto</TableCell>
                                    <TableCell align="right">Quantidade</TableCell>
                                    <TableCell align="right">Separado</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {(itensPorChave[item.chave] || []).map((itemProduto) => {
                                    const chaveProduto = `${item.chave}_${itemProduto.codproduto}`
                                    const produtoExpandido = Boolean(produtosExpandidos[chaveProduto])
                                    return (
                                      <React.Fragment key={itemProduto.codproduto}>
                                        <TableRow>
                                          <TableCell>
                                            <IconButton
                                              size="small"
                                              onClick={() => toggleProduto(item.chave, itemProduto.codproduto)}
                                              sx={{ transform: produtoExpandido ? "rotate(180deg)" : "rotate(0deg)" }}
                                            >
                                              <ExpandMore />
                                            </IconButton>
                                          </TableCell>
                                          <TableCell>{itemProduto.produto}</TableCell>
                                          <TableCell align="right">{itemProduto.qtde_total}</TableCell>
                                          <TableCell align="right">{itemProduto.qtde_separada}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                          <TableCell colSpan={4} sx={{ p: 0, borderBottom: 0 }}>
                                            <Collapse in={produtoExpandido} timeout="auto" unmountOnExit>
                                              <Box sx={{ p: 2, display: "flex", justifyContent: "flex-end", gap: 1 }}>
                                                <TextField
                                                  size="small"
                                                  type="number"
                                                  defaultValue={itemProduto.qtde_separada}
                                                  inputProps={{ min: 0, max: itemProduto.qtde_total, step: "0.01" }}
                                                  onBlur={(e) => {
                                                    void atualizarItem(
                                                      item.chave,
                                                      itemProduto.codproduto,
                                                      Number(e.target.value || 0),
                                                    )
                                                  }}
                                                />
                                              </Box>
                                            </Collapse>
                                          </TableCell>
                                        </TableRow>
                                      </React.Fragment>
                                    )
                                  })}
                                </TableBody>
                              </Table>
                            )}
                            <Box mt={2} display="flex" justifyContent="flex-end">
                              <Button
                                variant="contained"
                                color="success"
                                disabled={item.status === "F" || !podeFinalizar(item)}
                                onClick={() => {
                                  void finalizarSeparacao(item)
                                }}
                              >
                                Finalizar Separação
                              </Button>
                            </Box>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>
    </Layout>
  )
}

export default PainelSeparacao
