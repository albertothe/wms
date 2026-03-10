"use client"

// frontend/src/pages/ImprimirPreNota.tsx

import type React from "react"
import { useRef, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import html2canvas from "html2canvas"
import { jsPDF } from "jspdf"
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

  const configCacheRef = useRef<any>(null)

  const handleOpen = async () => {
    setOpen(true)
    setLoading(true)
    setError(null)

    try {
      const configPromise =
        configCacheRef.current != null ? Promise.resolve(configCacheRef.current) : api.get("/configuracoes")
      const notaPromise = api.get(`/painel-saida/${chave}/imprimir`)

      const [configResponse, resNota] = await Promise.all([configPromise, notaPromise])

      const configData = "data" in configResponse ? configResponse.data : configResponse
      if (!configData) {
        throw new Error("Não foi possível obter as configurações da empresa")
      }

      configCacheRef.current = configData
      setConfig({
        usaQuatroNiveis: configData.usa_4_niveis || false,
        corPrimaria: configData.cor_topo || "#0a0a6b",
        modeloImpressao: configData.modelo_impressao_prenota || 1,
        empresa: {
          nome: configData.nome_empresa || "Empresa",
          endereco: configData.endereco_empresa || "",
          telefone: configData.telefone_empresa || "",
          cnpj: configData.cnpj_empresa || "",
        },
      })

      if (!resNota.data) {
        throw new Error("Não foi possível obter os dados da nota")
      }

      setNotaData(resNota.data)
    } catch (error: any) {
      console.error("Erro ao buscar dados para impressão:", error)

      let errorMessage = "Erro ao preparar documento para impressão"

      if (error.response) {
        errorMessage = `Erro ${error.response.status}: ${error.response.data?.message || errorMessage}`
      } else if (error.request) {
        errorMessage = "Erro de conexão com o servidor"
      } else {
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

  // Funcao para impressao em nova janela - mostra apenas a pre-nota
  const handlePrint = () => {
    const conteudo = document.querySelector(".impressao-prenota")
    if (!conteudo) return

    const janelaImpressao = window.open("", "_blank", "width=800,height=600")
    if (!janelaImpressao) {
      setSnackbar({
        open: true,
        message: "Navegador bloqueou a janela de impressao. Permita pop-ups.",
        severity: "error",
      })
      return
    }

    const estilosAtuais = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => node.outerHTML)
      .join("\n")

    janelaImpressao.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Pre-Nota ${notaData?.capa?.numero || ""}</title>
        ${estilosAtuais}
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 8px; background: white; color: #000; line-height: 1.2; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
          th, td { border: 1px solid #ccc; padding: 2px 4px; font-size: 10px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
          .header h1 { font-size: 14px; font-weight: bold; }
          .header span { font-size: 10px; }
          .info-line { font-size: 10px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 6px; }
          .section-title { font-size: 12px; font-weight: bold; text-align: center; margin-bottom: 4px; }
          .total-row td { font-weight: bold; }
          .text-right { text-align: right; }
          .assinaturas { display: flex; justify-content: space-around; margin-top: 28px; }
          .assinatura { text-align: center; }
          .assinatura-linha { border-top: 1px solid #000; width: 180px; margin-bottom: 3px; }
          .assinatura-label { font-size: 10px; }
          .rodape { margin-top: 14px; padding-top: 6px; border-top: 1px solid #ccc; text-align: center; font-size: 8px; color: #666; }
          .marcado { background-color: #e3f2fd; }
          .obs-box { margin-bottom: 8px; padding: 6px; border: 1px solid #ddd; border-radius: 4px; }
          .obs-title { font-weight: bold; font-size: 10px; margin-bottom: 3px; }
          .obs-text { font-size: 10px; }
          .impressao-prenota { transform: scale(0.96); transform-origin: top center; width: 104%; margin-left: -2%; }
          .impressao-prenota .MuiTableCell-root { padding-top: 2px !important; padding-bottom: 2px !important; line-height: 1.15; }
          .impressao-prenota .MuiTypography-root { margin-bottom: 0; }
          @media print {
            body { padding: 0; }
            @page { margin: 6mm; }
            .impressao-prenota { transform: none; width: 100%; margin-left: 0; }
          }
        </style>
      </head>
      <body>
        ${conteudo.outerHTML}
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); };
          };
        </script>
      </body>
      </html>
    `)
    janelaImpressao.document.close()
  }

  const handleDownloadPDF = () => {
    void generateAndHandlePDF("download")
  }

  const handleOpenPDF = () => {
    void generateAndHandlePDF("open")
  }

  const generateAndHandlePDF = async (mode: "download" | "open") => {
    const conteudo = document.querySelector(".impressao-prenota") as HTMLElement | null

    if (!conteudo || !notaData) {
      setSnackbar({
        open: true,
        message: "Conteúdo da pré-nota não encontrado para gerar PDF",
        severity: "error",
      })
      return
    }

    setLoading(true)

    try {
      const canvas = await html2canvas(conteudo, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      })

      const imageData = canvas.toDataURL("image/png")
      const pdf = new jsPDF("p", "mm", "a4")
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 6
      const usableWidth = pageWidth - margin * 2
      const imgHeight = (canvas.height * usableWidth) / canvas.width

      pdf.addImage(imageData, "PNG", margin, margin, usableWidth, imgHeight)

      let remainingHeight = imgHeight - (pageHeight - margin * 2)
      while (remainingHeight > 0) {
        pdf.addPage()
        const position = margin - (imgHeight - remainingHeight)
        pdf.addImage(imageData, "PNG", margin, position, usableWidth, imgHeight)
        remainingHeight -= pageHeight - margin * 2
      }

      const nomeArquivo = `prenota-${notaData?.capa?.numero || "documento"}.pdf`

      if (mode === "download") {
        pdf.save(nomeArquivo)
      } else {
        const blobUrl = URL.createObjectURL(pdf.output("blob"))
        const novaJanela = window.open(blobUrl, "_blank")

        if (!novaJanela) {
          URL.revokeObjectURL(blobUrl)
          setSnackbar({
            open: true,
            message: "Navegador bloqueou a abertura do PDF. Permita pop-ups.",
            severity: "error",
          })
          return
        }

        setTimeout(() => URL.revokeObjectURL(blobUrl), 15000)
      }

      setSnackbar({
        open: true,
        message: mode === "download" ? "PDF baixado com sucesso" : "PDF aberto em nova guia",
        severity: "success",
      })
    } catch (pdfError) {
      console.error("Erro ao gerar PDF da pré-nota:", pdfError)
      setSnackbar({
        open: true,
        message: "Não foi possível gerar o PDF da pré-nota",
        severity: "error",
      })
    } finally {
      setLoading(false)
    }
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
