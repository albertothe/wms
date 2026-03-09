"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  const [detalheAberto, setDetalheAberto] = useState<Separacao | null>(null)
  const [itens, setItens] = useState<ItemSeparacao[]>([])

  const buscarSeparacoes = useCallback(async () => {
    try {
      const response = await api.get("/separacao")
      setSeparacoes(response.data)
    } finally {
      setCarregando(false)
    }
  }, [])

  const buscarItens = useCallback(async (chave: string) => {
    const response = await api.get("/separacao/itens", { params: { chave } })
    setItens(response.data)
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

  const atualizarItem = async (codproduto: string, qtde: number) => {
    if (!detalheAberto) return

    try {
      await api.post("/separacao/item", {
        chave: detalheAberto.chave,
        codproduto,
        qtde_separada: qtde,
      })

      await Promise.all([buscarItens(detalheAberto.chave), buscarSeparacoes()])
    } catch (error) {
      console.error("Erro ao atualizar item da separação:", error)
    }
  }

  const iniciarSeparacao = async (item: Separacao) => {
    await api.post("/separacao/iniciar", { chave: item.chave })
    await buscarSeparacoes()
  }

  const finalizarSeparacao = async () => {
    if (!detalheAberto) return
    await api.post("/separacao/finalizar", { chave: detalheAberto.chave })
    await Promise.all([buscarSeparacoes(), buscarItens(detalheAberto.chave)])
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
            label="Buscar por venda, cliente ou separador"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
        </Paper>

        <TableContainer component={Paper} sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f3f4f6" }}>
                <TableCell sx={{ fontWeight: 600 }}>Venda</TableCell>
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
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : separacoesFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Alert severity="info">Nenhuma separação encontrada.</Alert>
                  </TableCell>
                </TableRow>
              ) : (
                separacoesFiltradas.map((item, idx) => (
                  <TableRow key={item.chave} sx={{ "&:nth-of-type(even)": { backgroundColor: alpha("#f3f4f6", 0.3) } }}>
                    <TableCell>{item.codloja} / {item.np}</TableCell>
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
                      <Box display="flex" gap={1} justifyContent="center">
                        {item.status === "P" && (
                          <Button size="small" variant="contained" onClick={() => iniciarSeparacao(item)}>
                            Iniciar
                          </Button>
                        )}
                        <Button
                          size="small"
                          variant={item.status === "F" ? "outlined" : "contained"}
                          color={item.status === "F" ? "success" : "primary"}
                          onClick={async () => {
                            setDetalheAberto(item)
                            await buscarItens(item.chave)
                          }}
                        >
                          Detalhes
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={Boolean(detalheAberto)} onClose={() => setDetalheAberto(null)} maxWidth="md" fullWidth>
          <DialogTitle>Separação da venda {detalheAberto ? `${detalheAberto.codloja}/${detalheAberto.np}` : ""}</DialogTitle>
          <DialogContent>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Produto</TableCell>
                  <TableCell align="right">Quantidade</TableCell>
                  <TableCell align="right">Separado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {itens.map((item) => (
                  <TableRow key={item.codproduto}>
                    <TableCell>{item.produto}</TableCell>
                    <TableCell align="right">{item.qtde_total}</TableCell>
                    <TableCell align="right" sx={{ width: 180 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        defaultValue={item.qtde_separada}
                        inputProps={{ min: 0, max: item.qtde_total, step: "0.01" }}
                        onBlur={(e) => {
                          void atualizarItem(item.codproduto, Number(e.target.value || 0))
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetalheAberto(null)}>Fechar</Button>
            {detalheAberto?.status !== "F" && (
              <Button variant="contained" color="success" onClick={finalizarSeparacao}>
                Finalizar Separação
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  )
}

export default PainelSeparacao
