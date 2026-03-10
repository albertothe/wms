"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Box, Chip, LinearProgress, Paper, Typography, alpha } from "@mui/material"
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded"
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded"
import api from "../services/api"

interface SeparacaoTV {
  chave: string
  np: string
  cliente: string
  data_inicio: string | null
  data_fim: string | null
  status: "P" | "S" | "F"
  progresso: number
  no_painel_saida?: boolean
}

const formatarTempo = (dataInicio: string | null, dataFim: string | null): string => {
  if (!dataInicio) return "Aguardando"

  const inicio = new Date(dataInicio).getTime()
  const fim = dataFim ? new Date(dataFim).getTime() : Date.now()
  const diff = Math.max(0, fim - inicio)

  const minutos = Math.floor(diff / 60000)
  const horas = Math.floor(minutos / 60)
  const minutosRestantes = minutos % 60
  const segundos = Math.floor((diff % 60000) / 1000)

  if (horas > 0) {
    return `${String(horas).padStart(2, "0")}h ${String(minutosRestantes).padStart(2, "0")}m ${String(segundos).padStart(2, "0")}s`
  }

  return `${String(minutos).padStart(2, "0")}m ${String(segundos).padStart(2, "0")}s`
}

const corTempo = (dataInicio: string | null, dataFim: string | null, status: SeparacaoTV["status"]) => {
  if (status === "F") return "success"
  if (!dataInicio) return "default"

  const fim = dataFim ? new Date(dataFim).getTime() : Date.now()
  const diffMin = (fim - new Date(dataInicio).getTime()) / 60000

  if (diffMin <= 5) return "success"
  if (diffMin <= 10) return "warning"
  return "error"
}

const PainelSeparacaoTV: React.FC = () => {
  const [dados, setDados] = useState<SeparacaoTV[]>([])
  const [agora, setAgora] = useState(() => new Date())

  const carregarDados = useCallback(async () => {
    const response = await api.get("/painel-separacao/public")
    setDados(response.data)
  }, [])

  useEffect(() => {
    void carregarDados()

    const intervaloDados = setInterval(() => {
      void carregarDados()
    }, 30000)

    const intervaloRelogio = setInterval(() => {
      setAgora(new Date())
    }, 1000)

    return () => {
      clearInterval(intervaloDados)
      clearInterval(intervaloRelogio)
    }
  }, [carregarDados])

  const horaAtual = useMemo(() => {
    return agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  }, [agora])

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top, #3b2b7d 0%, #1e184f 55%, #110f34 100%)",
        color: "#f7f7ff",
        p: { xs: 2, md: 5 },
        display: "flex",
      }}
    >
      <Paper
        elevation={10}
        sx={{
          width: "100%",
          background: "linear-gradient(160deg, rgba(42, 32, 98, 0.96), rgba(19, 16, 57, 0.95))",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 3,
          p: { xs: 2, md: 4 },
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Box>
            <Typography sx={{ fontSize: { xs: 28, md: 54 }, fontWeight: 800, lineHeight: 1.1 }}>Painel de Separação</Typography>
            <Typography sx={{ opacity: 0.85, mt: 1, fontSize: { xs: 16, md: 32 } }}>
              Acompanhe a separação dos pedidos em tempo real.
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <AccessTimeRoundedIcon sx={{ fontSize: { xs: 24, md: 48 } }} />
            <Typography sx={{ fontSize: { xs: 26, md: 56 }, fontWeight: 700 }}>{horaAtual}</Typography>
          </Box>
        </Box>

        <Box sx={{ borderRadius: 2, overflow: "hidden", border: "1px solid rgba(255,255,255,0.09)" }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 2.6fr 1.2fr 2fr 0.8fr",
              gap: 2,
              px: 3,
              py: 2,
              backgroundColor: "rgba(255,255,255,0.04)",
              fontSize: { xs: 16, md: 28 },
              fontWeight: 700,
            }}
          >
            <Box>Nota</Box>
            <Box>Cliente</Box>
            <Box>Tempo</Box>
            <Box>Progresso</Box>
            <Box sx={{ textAlign: "right" }}>%</Box>
          </Box>

          {dados.map((item, index) => {
            const progresso = Math.max(0, Math.min(100, Number(item.progresso ?? 0)))
            const concluido = item.status === "F" || progresso >= 100

            return (
              <Box
                key={`${item.chave}-${item.np}-${index}`}
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr 2.6fr 1.2fr 2fr 0.8fr",
                  gap: 2,
                  px: 3,
                  py: 1.6,
                  alignItems: "center",
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                  backgroundColor: concluido ? alpha("#4caf50", 0.14) : "transparent",
                  fontSize: { xs: 16, md: 30 },
                }}
              >
                <Typography sx={{ fontWeight: 700 }}>{item.np || item.chave}</Typography>
                <Typography sx={{ textTransform: "uppercase", color: "#fff" }}>{item.cliente || "Cliente não informado"}</Typography>
                <Chip
                  icon={concluido ? <CheckCircleRoundedIcon /> : undefined}
                  color={corTempo(item.data_inicio, item.data_fim, item.status)}
                  label={
                    concluido ? (item.no_painel_saida ? "Aguardando NF" : "NF emitida") : formatarTempo(item.data_inicio, item.data_fim)
                  }
                  sx={{
                    fontSize: { xs: 13, md: 24 },
                    height: { xs: 28, md: 44 },
                    width: "fit-content",
                    color: "#fff",
                    ".MuiChip-label": { color: "#fff" },
                    ".MuiChip-icon": { fontSize: { xs: 16, md: 24 } },
                  }}
                />
                <LinearProgress
                  variant="determinate"
                  value={progresso}
                  sx={{
                    height: { xs: 8, md: 16 },
                    borderRadius: 999,
                    backgroundColor: "rgba(255,255,255,0.25)",
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 999,
                      backgroundColor: concluido ? "#56d364" : progresso >= 70 ? "#ef5350" : progresso >= 40 ? "#ffd54f" : "#66bb6a",
                    },
                  }}
                />
                <Typography sx={{ textAlign: "right", fontWeight: 800 }}>{Math.round(progresso)}%</Typography>
              </Box>
            )
          })}
        </Box>

        <Typography
          sx={{
            mt: 3,
            textAlign: "center",
            borderTop: "1px solid rgba(255,255,255,0.12)",
            pt: 2,
            fontSize: { xs: 18, md: 30 },
            opacity: 0.95,
          }}
        >
          Por favor, aguarde enquanto seu pedido está sendo separado.
        </Typography>
      </Paper>
    </Box>
  )
}

export default PainelSeparacaoTV
