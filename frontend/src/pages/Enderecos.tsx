"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"
import api from "../services/api"
import { Layout } from "../components/Layout"
import { useAuth } from "../contexts/AuthContext"
import {
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Container,
  IconButton,
  Tooltip,
  TablePagination,
  InputAdornment,
  alpha,
  Alert,
  DialogContentText,
  CircularProgress,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Tabs,
  Tab,
} from "@mui/material"
import {
  Add,
  Delete,
  Edit,
  Search as SearchIcon,
  Warning,
  Print as PrintIcon,
  Inventory as InventoryIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material"
import { useNavigate } from "react-router-dom"
import ImpressaoEtiquetaProdutos, { type EtiquetaSize } from "../components/ImpressaoEtiquetaProdutos"
import { printElement } from "../utils/printHelper"
import ModalEtiquetasEnderecos from "../components/ModalEtiquetasEnderecos"
import type { EtiquetaLayout } from "../components/ImpressaoEtiquetasEnderecos"

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  )
}

interface Endereco {
  codendereco: string
  rua: string
  predio: string
  andar?: string
  apto?: string
}

interface Produto {
  codproduto: string
  produto: string
  complemento?: string
  unidade?: string
  codbarra?: string
  lote?: string
  quantidade: number
}

const Enderecos: React.FC = () => {
  const [enderecos, setEnderecos] = useState<Endereco[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ codendereco: "", rua: "", predio: "", andar: "", apto: "" })
  const [filtro, setFiltro] = useState("")
  const [pagina, setPagina] = useState(0)
  const [linhasPorPagina, setLinhasPorPagina] = useState(15)
  const [usa4Niveis, setUsa4Niveis] = useState(false)
  const [alertMessage, setAlertMessage] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null)

  // Estado para o modal de confirmação de exclusão
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [enderecoParaExcluir, setEnderecoParaExcluir] = useState<Endereco | null>(null)

  // Estados para o modal de produtos do endereço
  const [produtosModalOpen, setProdutosModalOpen] = useState(false)
  const [enderecoSelecionado, setEnderecoSelecionado] = useState<Endereco | null>(null)
  const [produtosEndereco, setProdutosEndereco] = useState<Produto[]>([])
  const [carregandoProdutos, setCarregandoProdutos] = useState(false)
  const [tamanhoEtiqueta, setTamanhoEtiqueta] = useState<EtiquetaSize>("medio")
  const [tabValue, setTabValue] = useState(0)
  const [filtroProdutos, setFiltroProdutos] = useState("")

  // Estados para o modal de impressão de etiquetas
  const [etiquetasModalOpen, setEtiquetasModalOpen] = useState(false)
  const [tipoEtiquetaEndereco, setTipoEtiquetaEndereco] = useState<"barcode" | "qrcode" | "ambos">("qrcode")
  const [layoutEtiquetaEndereco, setLayoutEtiquetaEndereco] = useState<EtiquetaLayout>("simples")
  const [tamanhoEtiquetaEndereco, setTamanhoEtiquetaEndereco] = useState<EtiquetaSize>("medio") // Declared variable

  // Ref para impressão
  const impressaoRef = useRef<HTMLDivElement>(null)

  // Obter corTopo, nomeEmpresa e verificarPermissao do contexto
  const { corTopo, nomeEmpresa, verificarPermissao } = useAuth()

  // Verificar permissões
  const podeEditar = verificarPermissao("/enderecos", "editar")
  const podeExcluir = verificarPermissao("/enderecos", "excluir")
  const podeIncluir = verificarPermissao("/enderecos", "incluir")

  const navigate = useNavigate()

  useEffect(() => {
    async function carregarDados() {
      await buscarEnderecos()
      await buscarConfiguracoes()
    }
    carregarDados()
  }, [])

  // Adicionar listener para o evento de impressão concluída
  useEffect(() => {
    // Função para lidar com o evento de impressão concluída
    const handlePrintCompleted = (event: Event) => {
      console.log("Evento de impressão concluída recebido")

      // Forçar fechamento e reabertura do modal
      if (enderecoSelecionado) {
        const endereco = { ...enderecoSelecionado }
        setProdutosModalOpen(false)

        // Usar setTimeout para garantir que o modal seja fechado antes de reabri-lo
        setTimeout(() => {
          abrirModalProdutos(endereco)
        }, 300)
      }
    }

    // Adicionar listener para o evento personalizado
    window.addEventListener("printCompleted", handlePrintCompleted)

    // Remover listener quando o componente for desmontado
    return () => {
      window.removeEventListener("printCompleted", handlePrintCompleted)
    }
  }, [enderecoSelecionado]) // Removi produtosModalOpen da dependência para evitar loops

  const buscarConfiguracoes = async () => {
    try {
      const res = await api.get("/configuracoes")
      setUsa4Niveis(res.data.usa_4_niveis)
    } catch (error) {
      console.error("Erro ao buscar configurações:", error)
      setAlertMessage({
        type: "error",
        message: "Erro ao carregar configurações do sistema.",
      })
    }
  }

  const buscarEnderecos = async () => {
    try {
      const res = await api.get("/enderecos")
      setEnderecos(res.data)
    } catch (err) {
      console.error("Erro ao buscar enderecos:", err)
      setAlertMessage({
        type: "error",
        message: "Erro ao carregar endereços.",
      })
    }
  }

  const salvarEndereco = async () => {
    // Validação básica
    if (!form.rua || !form.predio) {
      setAlertMessage({
        type: "error",
        message: "Rua e Prédio são campos obrigatórios.",
      })
      return
    }

    try {
      const payload = {
        rua: form.rua,
        predio: form.predio,
        ...(usa4Niveis && { andar: form.andar, apto: form.apto }),
      }

      if (form.codendereco === "") {
        // Verificar permissão de inclusão
        if (!podeIncluir) {
          setAlertMessage({
            type: "error",
            message: "Você não tem permissão para adicionar endereços.",
          })
          return
        }

        await api.post("/enderecos", payload)
        setAlertMessage({
          type: "success",
          message: "Endereço criado com sucesso!",
        })
      } else {
        // Verificar permissão de edição
        if (!podeEditar) {
          setAlertMessage({
            type: "error",
            message: "Você não tem permissão para editar endereços.",
          })
          return
        }

        await api.put(`/enderecos/${form.codendereco}`, payload)
        setAlertMessage({
          type: "success",
          message: "Endereço atualizado com sucesso!",
        })
      }

      await buscarEnderecos()
      setOpen(false)
      setForm({ codendereco: "", rua: "", predio: "", andar: "", apto: "" })
    } catch (error) {
      console.error("Erro ao salvar endereço:", error)
      setAlertMessage({
        type: "error",
        message: "Erro ao salvar endereço.",
      })
    }
  }

  const editarEndereco = (endereco: Endereco) => {
    if (!podeEditar) {
      setAlertMessage({
        type: "error",
        message: "Você não tem permissão para editar endereços.",
      })
      return
    }

    setForm({
      codendereco: endereco.codendereco,
      rua: endereco.rua,
      predio: endereco.predio,
      andar: endereco.andar || "",
      apto: endereco.apto || "",
    })
    setOpen(true)
  }

  // Função para abrir o modal de confirmação de exclusão
  const confirmarExclusao = (endereco: Endereco) => {
    if (!podeExcluir) {
      setAlertMessage({
        type: "error",
        message: "Você não tem permissão para excluir endereços.",
      })
      return
    }

    setEnderecoParaExcluir(endereco)
    setConfirmDeleteOpen(true)
  }

  // Função para executar a exclusão após confirmação
  const excluirEndereco = async () => {
    if (!enderecoParaExcluir) return

    try {
      await api.delete(`/enderecos/${encodeURIComponent(enderecoParaExcluir.codendereco)}`)
      setAlertMessage({
        type: "success",
        message: "Endereço excluído com sucesso!",
      })
      await buscarEnderecos()
    } catch (error) {
      console.error("Erro ao excluir endereço:", error)
      setAlertMessage({
        type: "error",
        message: "Erro ao excluir endereço.",
      })
    } finally {
      setConfirmDeleteOpen(false)
      setEnderecoParaExcluir(null)
    }
  }

  const imprimirEtiquetas = () => {
    const enderecosSelecionados = enderecosFiltrados.slice(
      pagina * linhasPorPagina,
      pagina * linhasPorPagina + linhasPorPagina,
    )
    navigate("/imprimir-etiquetas-enderecos", { state: { enderecos: enderecosSelecionados } })
  }

  // Função para abrir o modal de produtos do endereço
  const abrirModalProdutos = async (endereco: Endereco) => {
    setEnderecoSelecionado(endereco)
    setProdutosModalOpen(true)
    setCarregandoProdutos(true)
    setTabValue(0) // Inicia na aba de etiquetas
    setFiltroProdutos("") // Limpar o filtro ao abrir o modal

    try {
      const response = await api.get(`/produtos/por-endereco/${endereco.codendereco}`)
      setProdutosEndereco(response.data)
    } catch (error) {
      console.error(`Erro ao buscar produtos do endereço ${endereco.codendereco}:`, error)
      setAlertMessage({
        type: "error",
        message: "Erro ao buscar produtos do endereço.",
      })
      setProdutosEndereco([])
    } finally {
      setCarregandoProdutos(false)
    }
  }

  // Função para imprimir a etiqueta com produtos
  const imprimirEtiquetaProdutos = () => {
    if (impressaoRef.current) {
      console.log("Iniciando impressão...")
      printElement(impressaoRef.current, true)
    }
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleTamanhoEtiquetaChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTamanhoEtiqueta(event.target.value as EtiquetaSize)
  }

  const produtosFiltrados = produtosEndereco.filter(
    (p) =>
      p.codproduto.toLowerCase().includes(filtroProdutos.toLowerCase()) ||
      p.produto.toLowerCase().includes(filtroProdutos.toLowerCase()) ||
      (p.complemento && p.complemento.toLowerCase().includes(filtroProdutos.toLowerCase())) ||
      (p.lote && p.lote.toLowerCase().includes(filtroProdutos.toLowerCase())),
  )

  const enderecosFiltrados = enderecos.filter(
    (e) =>
      e.codendereco.toLowerCase().includes(filtro.toLowerCase()) ||
      e.rua.toLowerCase().includes(filtro.toLowerCase()) ||
      e.predio.toLowerCase().includes(filtro.toLowerCase()) ||
      (e.andar && e.andar.toLowerCase().includes(filtro.toLowerCase())) ||
      (e.apto && e.apto.toLowerCase().includes(filtro.toLowerCase())),
  )

  const abrirNovoEndereco = () => {
    if (!podeIncluir) {
      setAlertMessage({
        type: "error",
        message: "Você não tem permissão para adicionar endereços.",
      })
      return
    }

    setForm({ codendereco: "", rua: "", predio: "", andar: "", apto: "" })
    setOpen(true)
  }

  const handleImprimirEtiquetas = () => {
    setEtiquetasModalOpen(true)
  }

  return (
    <Layout corTopo={corTopo} nomeEmpresa={nomeEmpresa}>
      <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
        <Box className="mb-6">
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600, color: corTopo, mb: 1 }}>
            Endereços
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Gerencie os endereços do sistema
          </Typography>
        </Box>

        {alertMessage && (
          <Alert severity={alertMessage.type} sx={{ mb: 3 }} onClose={() => setAlertMessage(null)}>
            {alertMessage.message}
          </Alert>
        )}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              flexGrow: 1,
              mr: 2,
            }}
          >
            <TextField
              label="Buscar por código, rua ou prédio"
              variant="outlined"
              fullWidth
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: 1.5,
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(0, 0, 0, 0.12)",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(0, 0, 0, 0.24)",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: corTopo,
                  },
                },
              }}
              sx={{
                "& .MuiInputLabel-root.Mui-focused": {
                  color: corTopo,
                },
              }}
            />
          </Paper>

          <Box sx={{ display: "flex", gap: 2 }}>
            {/* Botão de Impressão de Etiquetas */}
            <Button
              variant="outlined"
              startIcon={<PrintIcon />}
              onClick={handleImprimirEtiquetas}
              sx={{
                textTransform: "none",
                fontWeight: 500,
                borderColor: corTopo,
                color: corTopo,
                boxShadow: "none",
                borderRadius: 2,
                px: 3,
                py: 1.5,
                "&:hover": {
                  borderColor: alpha(corTopo, 0.8),
                  backgroundColor: alpha(corTopo, 0.05),
                },
              }}
            >
              Imprimir Etiquetas
            </Button>

            {podeIncluir && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={abrirNovoEndereco}
                sx={{
                  textTransform: "none",
                  fontWeight: 500,
                  backgroundColor: corTopo,
                  boxShadow: "none",
                  borderRadius: 2,
                  px: 3,
                  py: 1.5,
                  "&:hover": {
                    backgroundColor: alpha(corTopo, 0.8),
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  },
                }}
              >
                Novo Endereço
              </Button>
            )}
          </Box>
        </Box>

        <TableContainer
          component={Paper}
          sx={{
            borderRadius: 2,
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            mb: 3,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f3f4f6" }}>
                <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Código</TableCell>
                <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Rua</TableCell>
                <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Prédio</TableCell>
                {usa4Niveis && <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Andar</TableCell>}
                {usa4Niveis && <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Apto</TableCell>}
                <TableCell align="center" sx={{ p: 1.5, fontWeight: 600, width: 150 }}>
                  Ações
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {enderecosFiltrados
                .slice(pagina * linhasPorPagina, pagina * linhasPorPagina + linhasPorPagina)
                .map((endereco, index) => (
                  <TableRow
                    key={endereco.codendereco}
                    hover
                    sx={{
                      "&:nth-of-type(even)": {
                        backgroundColor: alpha("#f3f4f6", 0.3),
                      },
                      transition: "background-color 0.2s",
                    }}
                  >
                    <TableCell sx={{ p: 1.5, fontWeight: 500 }}>{endereco.codendereco}</TableCell>
                    <TableCell sx={{ p: 1.5 }}>{endereco.rua}</TableCell>
                    <TableCell sx={{ p: 1.5 }}>{endereco.predio}</TableCell>
                    {usa4Niveis && <TableCell sx={{ p: 1.5 }}>{endereco.andar}</TableCell>}
                    {usa4Niveis && <TableCell sx={{ p: 1.5 }}>{endereco.apto}</TableCell>}
                    <TableCell align="center" sx={{ p: 1.5 }}>
                      {/* Botão para ver produtos do endereço */}
                      <Tooltip title="Produtos do Endereço">
                        <IconButton
                          size="small"
                          onClick={() => abrirModalProdutos(endereco)}
                          sx={{
                            mr: 1,
                            color: "#4caf50",
                            "&:hover": {
                              backgroundColor: alpha("#4caf50", 0.1),
                            },
                          }}
                        >
                          <InventoryIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {podeEditar && (
                        <Tooltip title="Editar">
                          <IconButton
                            size="small"
                            onClick={() => editarEndereco(endereco)}
                            sx={{
                              mr: 1,
                              color: corTopo,
                              "&:hover": {
                                backgroundColor: alpha(corTopo, 0.1),
                              },
                            }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {podeExcluir && (
                        <Tooltip title="Excluir">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => confirmarExclusao(endereco)}
                            sx={{
                              "&:hover": {
                                backgroundColor: alpha("#d32f2f", 0.1),
                              },
                            }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Paper
          elevation={0}
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: 1,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <TablePagination
            component="div"
            count={enderecosFiltrados.length}
            page={pagina}
            onPageChange={(_, p) => setPagina(p)}
            rowsPerPage={linhasPorPagina}
            onRowsPerPageChange={(e) => {
              setLinhasPorPagina(Number.parseInt(e.target.value, 10))
              setPagina(0)
            }}
            rowsPerPageOptions={[5, 15, 30, 50]}
            labelRowsPerPage="Linhas por página:"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
            sx={{
              ".MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows": {
                margin: 0,
              },
              ".MuiTablePagination-select": {
                paddingTop: 0,
                paddingBottom: 0,
              },
            }}
          />
        </Paper>

        {/* Modal Novo/Editar Endereço */}
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          PaperProps={{
            sx: {
              borderRadius: 2,
              maxWidth: 500,
            },
          }}
        >
          <DialogTitle sx={{ fontSize: "1.2rem", fontWeight: 500, pb: 1 }}>
            {form.codendereco === "" ? "Novo Endereço" : "Editar Endereço"}
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <TextField
              label="Rua"
              fullWidth
              margin="dense"
              value={form.rua}
              onChange={(e) => setForm({ ...form, rua: e.target.value })}
              variant="outlined"
              required
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 1,
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: corTopo,
                  },
                },
                "& .MuiInputLabel-root.Mui-focused": {
                  color: corTopo,
                },
              }}
            />
            <TextField
              label="Prédio"
              fullWidth
              margin="dense"
              value={form.predio}
              onChange={(e) => setForm({ ...form, predio: e.target.value })}
              variant="outlined"
              required
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 1,
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: corTopo,
                  },
                },
                "& .MuiInputLabel-root.Mui-focused": {
                  color: corTopo,
                },
              }}
            />

            {usa4Niveis && (
              <>
                <TextField
                  label="Andar"
                  fullWidth
                  margin="dense"
                  value={form.andar}
                  onChange={(e) => setForm({ ...form, andar: e.target.value })}
                  variant="outlined"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 1,
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: corTopo,
                      },
                    },
                    "& .MuiInputLabel-root.Mui-focused": {
                      color: corTopo,
                    },
                  }}
                />
                <TextField
                  label="Apto"
                  fullWidth
                  margin="dense"
                  value={form.apto}
                  onChange={(e) => setForm({ ...form, apto: e.target.value })}
                  variant="outlined"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 1,
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: corTopo,
                      },
                    },
                    "& .MuiInputLabel-root.Mui-focused": {
                      color: corTopo,
                    },
                  }}
                />
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setOpen(false)}
              sx={{
                textTransform: "none",
                fontWeight: 500,
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={salvarEndereco}
              variant="contained"
              sx={{
                textTransform: "none",
                fontWeight: 500,
                backgroundColor: corTopo,
                boxShadow: "none",
                "&:hover": {
                  backgroundColor: alpha(corTopo, 0.8),
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                },
              }}
            >
              Salvar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal de Confirmação de Exclusão */}
        <Dialog
          open={confirmDeleteOpen}
          onClose={() => {
            setConfirmDeleteOpen(false)
            setEnderecoParaExcluir(null)
          }}
          PaperProps={{
            sx: {
              borderRadius: 2,
              maxWidth: 500,
            },
          }}
        >
          <DialogTitle sx={{ fontSize: "1.2rem", fontWeight: 500, pb: 1, display: "flex", alignItems: "center" }}>
            <Warning color="error" sx={{ mr: 1 }} /> Confirmar Exclusão
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              Tem certeza que deseja excluir o endereço{" "}
              <strong>
                {enderecoParaExcluir?.rua} - {enderecoParaExcluir?.predio}
                {enderecoParaExcluir?.andar ? ` - Andar ${enderecoParaExcluir.andar}` : ""}
                {enderecoParaExcluir?.apto ? ` - Apto ${enderecoParaExcluir.apto}` : ""}
              </strong>
              ?
            </DialogContentText>
            <DialogContentText sx={{ mt: 2, color: "error.main" }}>
              Esta ação não poderá ser desfeita.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => {
                setConfirmDeleteOpen(false)
                setEnderecoParaExcluir(null)
              }}
              sx={{
                textTransform: "none",
                fontWeight: 500,
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={excluirEndereco}
              variant="contained"
              color="error"
              sx={{
                textTransform: "none",
                fontWeight: 500,
                boxShadow: "none",
                "&:hover": {
                  backgroundColor: "#b71c1c",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                },
              }}
            >
              Excluir
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal de Produtos do Endereço */}
        <Dialog
          open={produtosModalOpen}
          onClose={() => setProdutosModalOpen(false)}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 2,
            },
          }}
        >
          <DialogTitle
            sx={{
              fontSize: "1.2rem",
              fontWeight: 500,
              pb: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <InventoryIcon sx={{ mr: 1, color: "#4caf50" }} />
              Etiquetas do Endereço {enderecoSelecionado?.codendereco}
            </Box>
            {filtroProdutos && (
              <Typography variant="caption" sx={{ ml: 2, color: "text.secondary" }}>
                Filtro: {filtroProdutos}
              </Typography>
            )}
          </DialogTitle>
          <DialogContent>
            {carregandoProdutos ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                <CircularProgress sx={{ color: corTopo }} />
              </Box>
            ) : (
              <>
                <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
                  <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    aria-label="opções de etiqueta"
                    sx={{
                      "& .MuiTabs-indicator": {
                        backgroundColor: corTopo,
                      },
                      "& .Mui-selected": {
                        color: corTopo,
                      },
                    }}
                  >
                    <Tab label="Etiquetas" />
                    <Tab label="Configurações" icon={<SettingsIcon fontSize="small" />} iconPosition="end" />
                  </Tabs>
                </Box>

                <TabPanel value={tabValue} index={0}>
                  {/* Campo de busca para filtrar produtos */}
                  <Box sx={{ mb: 2 }}>
                    <TextField
                      label="Buscar produto por código, nome, complemento ou lote"
                      variant="outlined"
                      fullWidth
                      value={filtroProdutos}
                      onChange={(e) => setFiltroProdutos(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon color="action" />
                          </InputAdornment>
                        ),
                        endAdornment: filtroProdutos ? (
                          <InputAdornment position="end">
                            <IconButton aria-label="limpar busca" onClick={() => setFiltroProdutos("")} edge="end">
                              <Delete fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        ) : null,
                        sx: {
                          borderRadius: 1.5,
                        },
                      }}
                      sx={{
                        "& .MuiInputLabel-root.Mui-focused": {
                          color: corTopo,
                        },
                        "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: corTopo,
                        },
                      }}
                    />
                  </Box>

                  {enderecoSelecionado && (
                    <Box sx={{ maxHeight: "500px", overflow: "auto", border: "1px solid #eee", p: 2 }}>
                      <ImpressaoEtiquetaProdutos
                        endereco={enderecoSelecionado}
                        produtos={filtroProdutos ? produtosFiltrados : produtosEndereco}
                        tamanhoEtiqueta={tamanhoEtiqueta}
                        mostrarListaProdutos={false}
                      />
                    </Box>
                  )}

                  {/* Informação sobre quantidade de produtos */}
                  {filtroProdutos && (
                    <Box sx={{ mt: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="body2" color="text.secondary">
                        Exibindo {produtosFiltrados.length} de {produtosEndereco.length} produtos
                      </Typography>
                      <Button
                        size="small"
                        onClick={() => setFiltroProdutos("")}
                        startIcon={<Delete fontSize="small" />}
                      >
                        Limpar filtro
                      </Button>
                    </Box>
                  )}
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                  <FormControl component="fieldset" sx={{ mb: 2 }}>
                    <FormLabel component="legend">Tamanho da Etiqueta</FormLabel>
                    <RadioGroup row value={tamanhoEtiqueta} onChange={handleTamanhoEtiquetaChange}>
                      <FormControlLabel
                        value="pequeno"
                        control={<Radio sx={{ "&.Mui-checked": { color: corTopo } }} />}
                        label="Pequeno (4 por linha)"
                      />
                      <FormControlLabel
                        value="medio"
                        control={<Radio sx={{ "&.Mui-checked": { color: corTopo } }} />}
                        label="Médio (2 por linha)"
                      />
                      <FormControlLabel
                        value="grande"
                        control={<Radio sx={{ "&.Mui-checked": { color: corTopo } }} />}
                        label="Grande (1 por linha)"
                      />
                    </RadioGroup>
                  </FormControl>
                </TabPanel>

                {/* Componente de impressão (oculto) */}
                <Box sx={{ display: "none" }}>
                  {enderecoSelecionado && (
                    <ImpressaoEtiquetaProdutos
                      ref={impressaoRef}
                      endereco={enderecoSelecionado}
                      produtos={filtroProdutos ? produtosFiltrados : produtosEndereco}
                      tamanhoEtiqueta={tamanhoEtiqueta}
                    />
                  )}
                </Box>
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setProdutosModalOpen(false)}
              sx={{
                textTransform: "none",
                fontWeight: 500,
              }}
            >
              Fechar
            </Button>
            <Button
              onClick={imprimirEtiquetaProdutos}
              variant="contained"
              startIcon={<PrintIcon />}
              disabled={carregandoProdutos}
              sx={{
                textTransform: "none",
                fontWeight: 500,
                backgroundColor: corTopo,
                boxShadow: "none",
                "&:hover": {
                  backgroundColor: alpha(corTopo, 0.8),
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                },
              }}
            >
              Imprimir Etiquetas {filtroProdutos ? `(${produtosFiltrados.length})` : `(${produtosEndereco.length})`}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal para impressão de etiquetas de endereços */}
        <ModalEtiquetasEnderecos
          open={etiquetasModalOpen}
          onClose={() => setEtiquetasModalOpen(false)}
          enderecos={enderecosFiltrados}
          tipoEtiqueta={tipoEtiquetaEndereco}
          tamanho={tamanhoEtiquetaEndereco}
          layout={layoutEtiquetaEndereco}
        />
      </Container>
    </Layout>
  )
}

export default Enderecos
