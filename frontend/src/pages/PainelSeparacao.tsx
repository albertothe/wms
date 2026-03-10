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
  FormControl,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
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
  tipoentrega: string
  separador: string
  data_inicio: string | null
  data_fim: string | null
  status: "P" | "S" | "F"
  progresso: number
  no_painel_saida: boolean
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
  const horas = Math.floor(diff / 3600000)
  const minutos = Math.floor((diff % 3600000) / 60000)
  const segundos = Math.floor((diff % 60000) / 1000)

  if (horas > 0) {
    return `${horas}h ${String(minutos).padStart(2, "0")}m ${String(segundos).padStart(2, "0")}s`
  }

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
  const [filtroUsuario, setFiltroUsuario] = useState("")
  const [filtroTipoEntrega, setFiltroTipoEntrega] = useState("")
  const [detalhesExpandidos, setDetalhesExpandidos] = useState<Record<string, boolean>>({})
  const [itensPorChave, setItensPorChave] = useState<Record<string, ItemSeparacao[]>>({})
  const [carregandoItens, setCarregandoItens] = useState<Record<string, boolean>>({})

  const normalizarQuantidade = (valor: number, maximo: number) => {
    if (!Number.isFinite(valor)) return 0
    if (valor < 0) return 0
    if (valor > maximo) return maximo
    return Number(valor.toFixed(2))
  }

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

  const usuariosUnicos = useMemo(
    () => Array.from(new Set(separacoes.map((item) => item.separador).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [separacoes],
  )

  const tiposEntregaUnicos = useMemo(
    () => Array.from(new Set(separacoes.map((item) => item.tipoentrega).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [separacoes],
  )

  const separacoesFiltradas = useMemo(() => {
    return separacoes.filter((item) => {
      const busca = filtro.toLowerCase()

      const atendeBuscaGeral =
        item.np?.toLowerCase().includes(busca) ||
        String(item.codloja).includes(busca) ||
        item.cliente?.toLowerCase().includes(busca) ||
        item.separador?.toLowerCase().includes(busca)

      const atendeUsuario = !filtroUsuario || (item.separador || "") === filtroUsuario

      const atendeTipoEntrega = !filtroTipoEntrega || (item.tipoentrega || "") === filtroTipoEntrega

      return atendeBuscaGeral && atendeUsuario && atendeTipoEntrega
    })
  }, [separacoes, filtro, filtroUsuario, filtroTipoEntrega])

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

  const atualizarItemLocal = (chave: string, codproduto: string, qtde: number) => {
    setItensPorChave((prev) => ({
      ...prev,
      [chave]: (prev[chave] || []).map((item) => (item.codproduto === codproduto ? { ...item, qtde_separada: qtde } : item)),
    }))
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

  const podeFinalizar = (separacao: Separacao) => {
    const itens = itensPorChave[separacao.chave] || []
    if (itens.length === 0) return false
    const todosSeparados = itens.every(
      (item) => normalizarQuantidade(Number(item.qtde_separada), Number(item.qtde_total)) === Number(item.qtde_total),
    )
    return todosSeparados && Number(separacao.progresso || 0) >= 100
  }

  const finalizarSeparacao = async (separacao: Separacao) => {
    await api.post("/separacao/finalizar", { chave: separacao.chave })
    await Promise.all([buscarSeparacoes(), buscarItens(separacao.chave)])
  }

  const acaoDisponivel = (item: Separacao) => {
    if (item.status === "F") {
      return <Chip size="small" color="success" label={item.no_painel_saida ? "Aguardando NF" : "NF emitida"} />
    }

    if (item.status === "P") {
      return (
        <Button size="small" variant="contained" onClick={() => iniciarSeparacao(item)}>
          Iniciar
        </Button>
      )
    }

    if (podeFinalizar(item)) {
      return (
        <Button
          size="small"
          variant="contained"
          color="success"
          onClick={() => {
            void finalizarSeparacao(item)
          }}
        >
          Finalizar Separação
        </Button>
      )
    }

    return <Typography variant="caption">Em andamento</Typography>
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
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="filtro-usuario-separacao-label">Filtrar por usuário</InputLabel>
              <Select
                labelId="filtro-usuario-separacao-label"
                label="Filtrar por usuário"
                value={filtroUsuario}
                onChange={(e) => setFiltroUsuario(e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                {usuariosUnicos.map((usuario) => (
                  <MenuItem key={usuario} value={usuario}>
                    {usuario}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="filtro-tipo-entrega-separacao-label">Filtrar por tipo de entrega</InputLabel>
              <Select
                labelId="filtro-tipo-entrega-separacao-label"
                label="Filtrar por tipo de entrega"
                value={filtroTipoEntrega}
                onChange={(e) => setFiltroTipoEntrega(e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                {tiposEntregaUnicos.map((tipoEntrega) => (
                  <MenuItem key={tipoEntrega} value={tipoEntrega}>
                    {tipoEntrega}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Paper>

        <TableContainer component={Paper} sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f3f4f6" }}>
                <TableCell sx={{ width: 60 }}></TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Loja</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Nota</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Cliente</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Tipo Entrega</TableCell>
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
                  <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : separacoesFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center">
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
                    <TableCell>{item.tipoentrega || "-"}</TableCell>
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
                      <TableCell align="center">{acaoDisponivel(item)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={11} sx={{ p: 0, borderBottom: 0 }}>
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
                                    <TableCell>Produto</TableCell>
                                    <TableCell align="right">Quantidade</TableCell>
                                    <TableCell align="right">Separado</TableCell>
                                    <TableCell align="right">Digitar Separação</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {(itensPorChave[item.chave] || []).map((itemProduto) => {
                                    return (
                                      <TableRow key={itemProduto.codproduto}>
                                        <TableCell>{itemProduto.produto}</TableCell>
                                        <TableCell align="right">{itemProduto.qtde_total}</TableCell>
                                        <TableCell align="right">{itemProduto.qtde_separada}</TableCell>
                                        <TableCell align="right">
                                          <TextField
                                            size="small"
                                            type="number"
                                            value={itemProduto.qtde_separada}
                                            disabled={item.status === "F"}
                                            inputProps={{ min: 0, max: itemProduto.qtde_total, step: "0.01" }}
                                            onChange={(e) => {
                                              const novoValor = Number(e.target.value || 0)
                                              atualizarItemLocal(
                                                item.chave,
                                                itemProduto.codproduto,
                                                normalizarQuantidade(novoValor, Number(itemProduto.qtde_total)),
                                              )
                                            }}
                                            onBlur={() => {
                                              if (item.status === "F") return
                                              void atualizarItem(
                                                item.chave,
                                                itemProduto.codproduto,
                                                normalizarQuantidade(Number(itemProduto.qtde_separada), Number(itemProduto.qtde_total)),
                                              )
                                            }}
                                          />
                                        </TableCell>
                                      </TableRow>
                                    )
                                  })}
                                </TableBody>
                              </Table>
                            )}
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
