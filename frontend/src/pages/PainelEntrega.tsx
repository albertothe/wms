"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  alpha,
} from "@mui/material"
import { CheckCircle, Cancel } from "@mui/icons-material"
import { Layout } from "../components/Layout"
import { useAuth } from "../contexts/AuthContext"
import api from "../services/api"

interface Entrega {
  id: number
  chave: string
  codloja: number
  np: string
  destinario: string
  endereco: string | null
  cidade_uf: string | null
  status: "AguardandoNF" | "NFEmitida" | "SaiuEntrega" | "Entregue"
  data_criacao: string
  data_nf: string | null
  data_saiu: string | null
  data_entregue: string | null
  msg_saiu_enviada: boolean
  msg_entregue_enviada: boolean
}

const STATUS_CONFIG: Record<Entrega["status"], { label: string; color: "warning" | "info" | "secondary" | "success" }> = {
  AguardandoNF: { label: "Aguardando NF", color: "warning" },
  NFEmitida: { label: "NF Emitida", color: "info" },
  SaiuEntrega: { label: "Saiu para Entrega", color: "secondary" },
  Entregue: { label: "Entregue", color: "success" },
}

const formatarData = (data: string | null): string => {
  if (!data) return "-"
  return new Date(data).toLocaleString("pt-BR")
}

const IconeMensagem = ({ enviada, tooltip }: { enviada: boolean; tooltip: string }) => (
  <Tooltip title={tooltip} arrow>
    {enviada ? (
      <CheckCircle sx={{ fontSize: 18, color: "success.main" }} />
    ) : (
      <Cancel sx={{ fontSize: 18, color: "action.disabled" }} />
    )}
  </Tooltip>
)

const PainelEntrega: React.FC = () => {
  const { empresa, corTopo } = useAuth()
  const nomeEmpresa = empresa?.nome || "Sistema WMS"
  const [carregando, setCarregando] = useState(true)
  const [entregas, setEntregas] = useState<Entrega[]>([])
  const [filtro, setFiltro] = useState("")
  const [filtroStatus, setFiltroStatus] = useState("")
  const [atualizando, setAtualizando] = useState<Record<string, boolean>>({})

  const buscarEntregas = useCallback(async () => {
    try {
      const response = await api.get("/painel-entrega")
      setEntregas(response.data)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    buscarEntregas()
    const interval = setInterval(buscarEntregas, 30000)
    return () => clearInterval(interval)
  }, [buscarEntregas])

  const entregasFiltradas = useMemo(() => {
    return entregas.filter((item) => {
      const busca = filtro.toLowerCase()
      const atendeBusca =
        item.np?.toLowerCase().includes(busca) ||
        String(item.codloja).includes(busca) ||
        item.destinario?.toLowerCase().includes(busca) ||
        (item.endereco ?? "").toLowerCase().includes(busca)

      const atendeStatus = !filtroStatus || item.status === filtroStatus
      return atendeBusca && atendeStatus
    })
  }, [entregas, filtro, filtroStatus])

  const atualizarStatus = async (chave: string, novoStatus: "SaiuEntrega" | "Entregue") => {
    setAtualizando((prev) => ({ ...prev, [chave]: true }))
    try {
      await api.post("/painel-entrega/status", { chave, status: novoStatus })
      await buscarEntregas()
    } catch (error) {
      console.error("Erro ao atualizar status da entrega:", error)
    } finally {
      setAtualizando((prev) => ({ ...prev, [chave]: false }))
    }
  }

  const acaoDisponivel = (item: Entrega) => {
    if (atualizando[item.chave]) {
      return <CircularProgress size={20} />
    }

    if (item.status === "NFEmitida") {
      return (
        <Button
          size="small"
          variant="contained"
          color="warning"
          onClick={() => {
            void atualizarStatus(item.chave, "SaiuEntrega")
          }}
        >
          Saiu para Entrega
        </Button>
      )
    }

    if (item.status === "SaiuEntrega") {
      return (
        <Button
          size="small"
          variant="contained"
          color="success"
          onClick={() => {
            void atualizarStatus(item.chave, "Entregue")
          }}
        >
          Marcar Entregue
        </Button>
      )
    }

    return null
  }

  const colSpanTotal = 12

  return (
    <Layout corTopo={corTopo} nomeEmpresa={nomeEmpresa}>
      <Container maxWidth={false} sx={{ py: 3 }}>
        <Paper sx={{ p: 3, mb: 2, borderRadius: 2, boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)" }}>
          <Typography variant="h5" sx={{ mb: 2, color: corTopo, fontWeight: 700 }}>
            Painel de Entregas
          </Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <TextField
              size="small"
              label="Buscar por loja, nota ou destinatário"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              sx={{ flex: 1, minWidth: 250 }}
            />
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="filtro-status-entrega-label">Filtrar por status</InputLabel>
              <Select
                labelId="filtro-status-entrega-label"
                label="Filtrar por status"
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <MenuItem key={key} value={key}>
                    {cfg.label}
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
                <TableCell sx={{ fontWeight: 600 }}>Loja</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Nota</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Destinatário</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Endereço</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Cidade/UF</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>NF Emitida</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Saiu p/ Entrega</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 36, px: 0.5 }} align="center">
                  <Tooltip title="Msg Saiu Enviada" arrow>
                    <span>Msg</span>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Entregue</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 36, px: 0.5 }} align="center">
                  <Tooltip title="Msg Entregue Enviada" arrow>
                    <span>Msg</span>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">
                  Ação
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {carregando ? (
                <TableRow>
                  <TableCell colSpan={colSpanTotal} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : entregasFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colSpanTotal} align="center">
                    <Alert severity="info">Nenhuma entrega encontrada.</Alert>
                  </TableCell>
                </TableRow>
              ) : (
                entregasFiltradas.map((item) => (
                  <TableRow
                    key={item.chave}
                    sx={{ "&:nth-of-type(even)": { backgroundColor: alpha("#f3f4f6", 0.3) } }}
                  >
                    <TableCell>{item.codloja}</TableCell>
                    <TableCell>{item.np}</TableCell>
                    <TableCell>{item.destinario}</TableCell>
                    <TableCell>{item.endereco || "-"}</TableCell>
                    <TableCell>{item.cidade_uf || "-"}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={STATUS_CONFIG[item.status]?.color ?? "default"}
                        label={STATUS_CONFIG[item.status]?.label ?? item.status}
                      />
                    </TableCell>
                    <TableCell>{formatarData(item.data_nf)}</TableCell>
                    <TableCell>{formatarData(item.data_saiu)}</TableCell>
                    <TableCell align="center" sx={{ px: 0.5 }}>
                      <IconeMensagem
                        enviada={item.msg_saiu_enviada}
                        tooltip={item.msg_saiu_enviada ? "Mensagem de saída enviada" : "Mensagem de saída não enviada"}
                      />
                    </TableCell>
                    <TableCell>{formatarData(item.data_entregue)}</TableCell>
                    <TableCell align="center" sx={{ px: 0.5 }}>
                      <IconeMensagem
                        enviada={item.msg_entregue_enviada}
                        tooltip={item.msg_entregue_enviada ? "Mensagem de entrega enviada" : "Mensagem de entrega não enviada"}
                      />
                    </TableCell>
                    <TableCell align="center">{acaoDisponivel(item)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>
    </Layout>
  )
}

export default PainelEntrega
