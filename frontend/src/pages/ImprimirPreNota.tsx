"use client"

// frontend/src/pages/ImprimirPreNota.tsx

import type React from "react"
import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  Button,
  Container,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar,
  Alert,
  Tooltip,
  Box,
  Typography,
} from "@mui/material"
import { Print as PrintIcon, PictureAsPdf as PdfIcon, OpenInNew as OpenIcon } from "@mui/icons-material"
import api from "../services/api"
import ImpressaoPreNota from "../components/ImpressaoPreNota"

interface ImprimirPreNotaProps {
  chave?: string
}

const ImprimirPreNota: React.FC<ImprimirPreNotaProps> = ({ chave }) => {
  const [open, setOpen] = useState(false)
  const [notaData, setNotaData] = useState<any>(null)
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "info" | "warning",
  })

  const handleOpen = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log("Iniciando busca de dados para impressão...")
      console.log("Chave:", chave)

      // Buscar configurações da empresa primeiro
      console.log("Buscando configurações da empresa...")
      const resConfig = await api.get("/configuracoes")
      console.log("Configurações recebidas:", resConfig.data)

      if (!resConfig.data) {
        throw new Error("Não foi possível obter as configurações da empresa")
      }

      // Adaptar para a estrutura do seu banco
      setConfig({
        usaQuatroNiveis: resConfig.data.usa_4_niveis || false,
        corPrimaria: resConfig.data.cor_topo || "#0a0a6b",
        modeloImpressao: resConfig.data.modelo_impressao_prenota || 1,
        empresa: {
          nome: resConfig.data.nome_empresa || "Empresa",
          endereco: resConfig.data.endereco_empresa || "",
          telefone: resConfig.data.telefone_empresa || "",
          cnpj: resConfig.data.cnpj_empresa || "",
        },
      })

      // Buscar dados da pré-nota
      console.log("Buscando dados da pré-nota...")
      const url = `/painel-saida/${chave}/imprimir`
      console.log("URL da requisição:", url)

      const resNota = await api.get(url)
      console.log("Dados da nota recebidos:", resNota.data)

      if (!resNota.data) {
        throw new Error("Não foi possível obter os dados da nota")
      }

      setNotaData(resNota.data)
      setOpen(true)
    } catch (error: any) {
      console.error("Erro ao buscar dados para impressão:", error)

      // Extrair mensagem de erro mais detalhada
      let errorMessage = "Erro ao preparar documento para impressão"

      if (error.response) {
        // Erro de resposta da API
        console.error("Detalhes do erro de resposta:", {
          status: error.response.status,
          data: error.response.data,
        })

        errorMessage = `Erro ${error.response.status}: ${error.response.data?.message || errorMessage}`
      } else if (error.request) {
        // Erro de requisição (sem resposta)
        console.error("Erro de requisição (sem resposta):", error.request)
        errorMessage = "Erro de conexão com o servidor"
      } else {
        // Erro de configuração da requisição
        console.error("Erro de configuração da requisição:", error.message)
        errorMessage = error.message || errorMessage
      }

      setError(errorMessage)
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
  }

  // Função para impressão direta sem biblioteca externa
  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = () => {
    // Implementação para download de PDF
    setSnackbar({
      open: true,
      message: "Funcionalidade de download de PDF será implementada em breve",
      severity: "info",
    })
  }

  const handleOpenPDF = () => {
    // Implementação para abrir PDF em nova janela
    setSnackbar({
      open: true,
      message: "Funcionalidade de abrir PDF será implementada em breve",
      severity: "info",
    })
  }

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false })
  }

  // Se for chamado como componente filho (com chave)
  if (chave) {
    return (
      <>
        <Tooltip title="Imprimir Pré-Nota">
          <IconButton
            size="small"
            onClick={handleOpen}
            disabled={loading}
            sx={{
              color: "#0a0a6b",
              "&:hover": {
                backgroundColor: "rgba(10, 10, 107, 0.08)",
              },
            }}
          >
            <PrintIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Dialog
          open={open}
          onClose={handleClose}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 2,
              maxHeight: "90vh",
            },
          }}
        >
          <DialogTitle sx={{ fontSize: "1.2rem", fontWeight: 500, pb: 1 }}>
            Visualização da Pré-Nota
            {config?.modeloImpressao === 2 && (
              <Typography component="span" variant="caption" sx={{ ml: 1, color: "text.secondary" }}>
                (Modelo Simplificado)
              </Typography>
            )}
            {loading && <CircularProgress size={24} sx={{ ml: 2 }} />}
          </DialogTitle>

          <DialogContent dividers sx={{ p: 0, overflow: "auto" }}>
            {error ? (
              <Box sx={{ p: 3, textAlign: "center" }}>
                <Typography color="error" variant="h6" gutterBottom>
                  Erro ao carregar dados
                </Typography>
                <Typography color="error" variant="body2">
                  {error}
                </Typography>
              </Box>
            ) : notaData && config ? (
              <div className="print-container">
                <ImpressaoPreNota notaData={notaData} config={config} chave={chave} />
              </div>
            ) : (
              <Box sx={{ p: 3, textAlign: "center" }}>
                <CircularProgress />
                <Typography variant="body2" sx={{ mt: 2 }}>
                  Carregando dados...
                </Typography>
              </Box>
            )}
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
            <div>
              <Button
                variant="outlined"
                startIcon={<PdfIcon />}
                onClick={handleDownloadPDF}
                sx={{ mr: 1 }}
                disabled={!notaData || loading || !!error}
              >
                Baixar PDF
              </Button>
              <Button
                variant="outlined"
                startIcon={<OpenIcon />}
                onClick={handleOpenPDF}
                disabled={!notaData || loading || !!error}
              >
                Abrir PDF
              </Button>
            </div>
            <div>
              <Button onClick={handleClose} sx={{ mr: 1 }}>
                Fechar
              </Button>
              <Button
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={handlePrint}
                disabled={!notaData || loading || !!error}
                sx={{
                  backgroundColor: "#0a0a6b",
                  "&:hover": {
                    backgroundColor: "#08085a",
                  },
                }}
              >
                Visualizar e Imprimir
              </Button>
            </div>
          </DialogActions>
        </Dialog>

        {/* Snackbar para mensagens */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </>
    )
  }

  // Se for chamado como página independente (com id)
  return (
    <Container sx={{ mt: 4 }}>
      <Box sx={{ textAlign: "center" }}>
        <Typography variant="h5" gutterBottom>
          Impressão de Pré-Nota
        </Typography>
        <Typography variant="body1" gutterBottom>
          Esta página é destinada à impressão de pré-notas.
        </Typography>
        <Button variant="contained" onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Voltar
        </Button>
      </Box>
    </Container>
  )
}

export default ImprimirPreNota
