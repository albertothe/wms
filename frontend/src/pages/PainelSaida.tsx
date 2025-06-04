//frontend/src/pages/PainelSaida.tsx
"use client"

import React, { useEffect, useState, useCallback } from "react"
import api from "../services/api"
import ImprimirPreNota from "./ImprimirPreNota"
import ImprimirEtiquetas from "../components/ImprimirEtiquetas"
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
  CircularProgress,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Container,
  Collapse,
  IconButton,
  TablePagination,
  Stack,
  InputAdornment,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Tooltip,
  Snackbar,
  Alert,
} from "@mui/material"
import {
  ExpandMore,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material"

interface PreNotaCapa {
  data: string
  codloja: string
  op: string
  prenota: string
  np: string
  tipo: string
  status: string
  separacao: string
  coddestinario: string
  destinario: string
  chave: string
  lote?: string // Campo para o lote escolhido na venda
}

interface PreNotaProduto {
  codproduto: string
  produto: string
  qtde_saida: number
  vlr_unitario: number
  vlr_total: number
  controla_lote: "Sim" | "Não"
  chave: string
  lote?: string | null // Lote escolhido para este produto
}

interface Lote {
  lote: string
  qtde_lote: number
  qtde_reserva: number
  qtde_disponivel: number
}

interface EstoqueLocal {
  codendereco: string
  rua: string
  predio: string
  andar?: string
  apto?: string
  qtde: number
  marcado: boolean
  qtde_marcada?: number
}

interface EnderecoMarcado {
  codproduto: string
  lote: string
  codendereco: string
  quantidade: number
  chave: string
}

const formatarNumero = (valor: number): string =>
  Number(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatarData = (data: string): string => {
  const partes = data.split("T")[0].split("-")
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`
  }
  return data
}

const obterCorStatus = (status: string) => {
  switch (status) {
    case "CFC":
      return { bgcolor: alpha("#4caf50", 0.1), color: "#2e7d32" } // Verde para Conferência Concluída
    case "ACF":
      return { bgcolor: alpha("#ff9800", 0.1), color: "#e65100" } // Laranja para Aguardando Conferência
    case "CFA":
      return { bgcolor: alpha("#2196f3", 0.1), color: "#0d47a1" } // Azul para Conferência em Andamento
    case "CFD":
      return { bgcolor: alpha("#f44336", 0.1), color: "#d32f2f" } // Vermelho para Conferência Divergente
    case "NRP":
      return { bgcolor: alpha("#9c27b0", 0.1), color: "#6a1b9a" } // Roxo para NF de Reposição Pendente
    case "NRR":
      return { bgcolor: alpha("#795548", 0.1), color: "#4e342e" } // Marrom para NF de Reposição Rejeitada
    default:
      return { bgcolor: alpha("#607d8b", 0.1), color: "#455a64" } // Cinza para status não especificados
  }
}

const obterDescricaoStatus = (status: string): string => {
  switch (status) {
    case "ACF":
      return "Aguardando Conferência"
    case "CFA":
      return "Conferência em Andamento"
    case "CFC":
      return "Conferência Concluída"
    case "CFD":
      return "Conferência Divergente"
    case "NRP":
      return "NF de Reposição Pendente"
    case "NRR":
      return "NF de Reposição Rejeitada"
    default:
      return status
  }
}

const PainelSaida: React.FC = () => {
  const [preNotas, setPreNotas] = useState<PreNotaCapa[]>([])
  const [detalhes, setDetalhes] = useState<{ [prenota: string]: PreNotaProduto[] }>({})
  const [expandido, setExpandido] = useState<{ [prenota: string]: boolean }>({})
  const [lotesPorProduto, setLotesPorProduto] = useState<{ [key: string]: Lote[] }>({})
  const [enderecosPorProduto, setEnderecosPorProduto] = useState<{ [key: string]: EstoqueLocal[] }>({})
  const [produtoExpandido, setProdutoExpandido] = useState<{ [key: string]: boolean }>({})
  const [loteExpandido, setLoteExpandido] = useState<{ [key: string]: boolean }>({})
  const [marcados, setMarcados] = useState<EnderecoMarcado[]>([])
  const [filtro, setFiltro] = useState("")
  const [statusFiltro, setStatusFiltro] = useState("")
  const [tipoFiltro, setTipoFiltro] = useState("")
  const [lojaFiltro, setLojaFiltro] = useState("")
  const [pagina, setPagina] = useState(0)
  const [linhasPorPagina, setLinhasPorPagina] = useState(10)
  const [carregando, setCarregando] = useState(true)
  const [usa4Niveis, setUsa4Niveis] = useState(false)
  const [carregandoProduto, setCarregandoProduto] = useState<{ [key: string]: boolean }>({})
  const [modal, setModal] = useState<{
    aberto: boolean
    codproduto: string
    lote: string
    codendereco: string
    qtdeDisponivel: number
    chave: string
  } | null>(null)
  const [corTopo, setCorTopo] = useState("#0a0a6b")

  // Estados para controle de atualização
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null)
  const [proximaAtualizacao, setProximaAtualizacao] = useState<Date | null>(null)
  const [tempoRestante, setTempoRestante] = useState<string>("")
  const [atualizandoManual, setAtualizandoManual] = useState(false)
  const [snackbar, setSnackbar] = useState({
    aberta: false,
    mensagem: "",
    tipo: "info" as "error" | "info" | "success" | "warning",
  })

  const { empresa } = useAuth()
  const nomeEmpresa = empresa?.nome || "Sistema WMS"

  // Intervalo de auto-refresh: 5 minutos (300000ms)
  const INTERVALO_REFRESH = 5 * 60 * 1000 // 5 minutos

  const buscarEnderecosMarcados = async (chave: string) => {
    try {
      const res = await api.get(`/enderecos-marcados/${chave}`)
      return res.data
    } catch (err) {
      console.error("Erro ao buscar endereços marcados:", err)
      return []
    }
  }

  const desmarcarEndereco = async (chave: string, codproduto: string, lote: string, codendereco: string) => {
    try {
      // Encontrar a quantidade marcada antes de desmarcar
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const enderecoMarcado = marcados.find(
        (m) => m.codproduto === codproduto && m.lote === lote && m.codendereco === codendereco,
      )

      // Atualizar o estado dos endereços imediatamente
      const key = lote === "-" ? codproduto : `${codproduto}_${lote}`
      setEnderecosPorProduto((prev) => {
        // Se não existir, não tenta atualizar
        if (!prev[key]) return prev

        return {
          ...prev,
          [key]: prev[key].map((end) =>
            end.codendereco === codendereco ? { ...end, marcado: false, qtde_marcada: undefined } : end,
          ),
        }
      })

      // Atualizar também o array de marcados
      setMarcados((prev) =>
        prev.filter((m) => !(m.codproduto === codproduto && m.lote === lote && m.codendereco === codendereco)),
      )

      // Fazer a chamada à API depois de atualizar o estado
      await api.post("/painel-saida/desmarcar-endereco", {
        codproduto,
        lote,
        codendereco,
        chave,
      })

      console.log(`✅ Endereço ${codendereco} desmarcado com sucesso!`)
    } catch (err) {
      console.error("Erro ao desmarcar endereço:", err)
      // Em caso de erro, reverter a mudança no estado
      const key = lote === "-" ? codproduto : `${codproduto}_${lote}`

      // Encontrar a quantidade que estava marcada antes
      const enderecoMarcado = marcados.find(
        (m) => m.codproduto === codproduto && m.lote === lote && m.codendereco === codendereco,
      )

      if (enderecoMarcado) {
        // Restaurar o estado anterior
        setEnderecosPorProduto((prev) => {
          if (!prev[key]) return prev
          return {
            ...prev,
            [key]: prev[key].map((end) =>
              end.codendereco === codendereco
                ? { ...end, marcado: true, qtde_marcada: enderecoMarcado.quantidade }
                : end,
            ),
          }
        })

        // Adicionar novamente ao array de marcados
        setMarcados((prev) => [...prev, enderecoMarcado])
      }
    }
  }

  const marcarEndereco = async (chave: string, codproduto: string, lote: string, codendereco: string, qtde: number) => {
    try {
      // Criar o objeto de endereço marcado
      const novoMarcado: EnderecoMarcado = {
        codproduto,
        lote,
        codendereco,
        quantidade: qtde,
        chave,
      }

      // Atualizar o estado dos endereços imediatamente
      const key = lote === "-" ? codproduto : `${codproduto}_${lote}`
      setEnderecosPorProduto((prev) => {
        // Se não existir, no tenta atualizar
        if (!prev[key]) return prev

        return {
          ...prev,
          [key]: prev[key].map((end) =>
            end.codendereco === codendereco ? { ...end, marcado: true, qtde_marcada: qtde } : end,
          ),
        }
      })

      // Adicionar ao array de marcados
      setMarcados((prev) => [...prev, novoMarcado])

      // Fazer a chamada à API depois de atualizar o estado
      await api.post("/painel-saida/marcar-endereco", {
        codproduto,
        lote,
        codendereco,
        qtde,
        chave,
      })

      console.log(`✅ Endereço ${codendereco} marcado com sucesso! Quantidade: ${qtde}`)
    } catch (err) {
      console.error("Erro ao marcar endereço:", err)
      // Em caso de erro, reverter a mudança no estado
      const key = lote === "-" ? codproduto : `${codproduto}_${lote}`
      setEnderecosPorProduto((prev) => {
        if (!prev[key]) return prev
        return {
          ...prev,
          [key]: prev[key].map((end) =>
            end.codendereco === codendereco ? { ...end, marcado: false, qtde_marcada: undefined } : end,
          ),
        }
      })

      // Remover do array de marcados
      setMarcados((prev) =>
        prev.filter((m) => !(m.codproduto === codproduto && m.lote === lote && m.codendereco === codendereco)),
      )
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const atualizarEnderecosDoLote = async (codproduto: string, lote: string) => {
    const chave = `${codproduto}_${lote}`
    try {
      const res = await api.get(`/produtos/${codproduto}/enderecos-lote/${lote}`)

      // Preservar o estado de marcado dos endereços e suas quantidades
      const enderecosAtualizados = res.data.map((end: EstoqueLocal) => {
        const enderecoMarcado = marcados.find(
          (m) => m.codproduto === codproduto && m.lote === lote && m.codendereco === end.codendereco,
        )

        return {
          ...end,
          marcado: !!enderecoMarcado,
          qtde_marcada: enderecoMarcado ? enderecoMarcado.quantidade : undefined,
        }
      })

      setEnderecosPorProduto((prev) => ({
        ...prev,
        [chave]: enderecosAtualizados,
      }))
    } catch (err) {
      console.error("Erro ao atualizar endereços após ação:", err)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const atualizarQuantidade = async (
    chave: string,
    codproduto: string,
    codendereco: string,
    novaQuantidade: number,
  ) => {
    try {
      await api.put(`/enderecos-marcados/${chave}/${codproduto}/${codendereco}`, { quantidade: novaQuantidade })
      const novosMarcados = await buscarEnderecosMarcados(chave)
      setMarcados(novosMarcados)
    } catch (err) {
      console.error("Erro ao atualizar quantidade marcada:", err)
    }
  }

  const toggleExpandirPreNota = async (chave: string) => {
    const jaExpandido = expandido[chave]
    setExpandido((prev) => ({ ...prev, [chave]: !jaExpandido }))

    if (!jaExpandido && !detalhes[chave]) {
      setCarregandoProduto((prev) => ({ ...prev, [chave]: true }))

      try {
        const res = await api.get(`/painel-saida/${chave}`)

        const produtosComLotes: PreNotaProduto[] = res.data.produtos.map((prod: any) => ({
          codproduto: prod.codproduto,
          produto: prod.produto,
          qtde_saida: Number.parseFloat(prod.qtde_saida),
          vlr_unitario: Number.parseFloat(prod.vlr_unitario),
          vlr_total: Number.parseFloat(prod.vlr_total),
          controla_lote: prod.controla_lote === "Sim" ? "Sim" : "Não",
          chave: chave,
          lote: prod.lote || null, // Armazenar o lote escolhido para cada produto
        }))

        setDetalhes((prev) => ({ ...prev, [chave]: produtosComLotes }))

        // ✅ Atualiza os marcados
        setMarcados(res.data.enderecosMarcados || [])
      } catch (err) {
        console.error(`Erro ao buscar produtos da pré-nota ${chave}:`, err)
      } finally {
        setCarregandoProduto((prev) => ({ ...prev, [chave]: false }))
      }
    }
  }

  const toggleLote = async (codproduto: string, lote: string) => {
    const key = `${codproduto}_${lote}`
    setLoteExpandido((prev) => ({ ...prev, [key]: !prev[key] }))

    if (!loteExpandido[key]) {
      try {
        console.log(`Buscando endereços para produto ${codproduto} e lote ${lote}`)
        const res = await api.get(`/produtos/${codproduto}/enderecos-lote/${lote}`)
        const enderecos = res.data

        // Verificar se temos dados
        console.log(`Endereços recebidos:`, enderecos)

        const atualizados = enderecos.map((end: EstoqueLocal) => {
          // Verificar se o endereço está marcado
          const enderecoMarcado = marcados.find(
            (m) => m.codproduto === codproduto && m.lote === lote && m.codendereco === end.codendereco,
          )

          return {
            ...end,
            marcado: !!enderecoMarcado,
            // Se estiver marcado, usar a quantidade do marcado
            qtde_marcada: enderecoMarcado ? enderecoMarcado.quantidade : undefined,
          }
        })

        setEnderecosPorProduto((prev) => ({
          ...prev,
          [key]: atualizados,
        }))
      } catch (err) {
        console.error(`Erro ao buscar endereços para produto ${codproduto} e lote ${lote}:`, err)
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const marcarOuDesmarcar = async (
    marcado: boolean,
    codproduto: string,
    lote: string,
    codendereco: string,
    qtde: number,
    prenota: string,
    codloja: string,
  ) => {
    const rota = marcado ? "desmarcar-endereco" : "marcar-endereco"
    const payload = marcado
      ? { codproduto, lote, codendereco, prenota, codloja }
      : { codproduto, lote, codendereco, qtde, prenota, codloja }

    try {
      await api.post(`/painel-saida/${rota}`, payload)
      const chave = lote === "-" ? codproduto : `${codproduto}_${lote}`
      setEnderecosPorProduto((prev) => ({
        ...prev,
        [chave]: prev[chave].map((end) => (end.codendereco === codendereco ? { ...end, marcado: !marcado } : end)),
      }))
    } catch (err) {
      console.error(`Erro ao ${marcado ? "desconfirmar" : "confirmar"} endereço:`, err)
    }
  }

  // Função para carregar pré-notas
  const carregarPreNotas = useCallback(
    async (mostrarLoading = true) => {
      try {
        if (mostrarLoading) {
          setCarregando(true)
        }

        const res = await api.get("/painel-saida")
        setPreNotas(res.data)

        const agora = new Date()
        setUltimaAtualizacao(agora)
        setProximaAtualizacao(new Date(agora.getTime() + INTERVALO_REFRESH))

        if (mostrarLoading) {
          setSnackbar({
            aberta: true,
            mensagem: "Dados atualizados com sucesso",
            tipo: "success",
          })
        }
      } catch (err) {
        console.error("Erro ao buscar pré-notas:", err)
        setSnackbar({
          aberta: true,
          mensagem: "Erro ao carregar dados do painel",
          tipo: "error",
        })
      } finally {
        if (mostrarLoading) {
          setCarregando(false)
        }
      }
    },
    [INTERVALO_REFRESH],
  )

  // Função para atualização manual
  const atualizarManual = async () => {
    setAtualizandoManual(true)
    try {
      await carregarPreNotas(false)
      setSnackbar({
        aberta: true,
        mensagem: "Dados atualizados manualmente com sucesso",
        tipo: "success",
      })
    } catch (error) {
      setSnackbar({
        aberta: true,
        mensagem: "Erro ao atualizar dados",
        tipo: "error",
      })
    } finally {
      setAtualizandoManual(false)
    }
  }

  // Calcular tempo restante para próxima atualização
  const calcularTempoRestante = useCallback(() => {
    if (!proximaAtualizacao) return ""

    const agora = new Date()
    const diferenca = proximaAtualizacao.getTime() - agora.getTime()

    if (diferenca <= 0) return "Atualizando..."

    const minutos = Math.floor(diferenca / 60000)
    const segundos = Math.floor((diferenca % 60000) / 1000)

    return `${minutos}:${segundos.toString().padStart(2, "0")}`
  }, [proximaAtualizacao])

  const fecharSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, aberta: false }))
  }

  useEffect(() => {
    const carregarConfiguracoes = async () => {
      try {
        const res = await api.get("/configuracoes")
        setUsa4Niveis(res.data.usa_4_niveis || false)
        setCorTopo(res.data.cor_topo || "#0a0a6b")
      } catch (err) {
        console.error("Erro ao carregar configurações da empresa:", err)
      }
    }

    carregarConfiguracoes()
  }, [])

  // Effect para carregar dados iniciais
  useEffect(() => {
    carregarPreNotas(true)
  }, [carregarPreNotas])

  // Effect para auto-refresh a cada 5 minutos
  useEffect(() => {
    const interval = setInterval(() => {
      console.log("⏳ Atualizando dados automaticamente...")
      carregarPreNotas(false) // Auto-refresh silencioso
    }, INTERVALO_REFRESH)

    return () => clearInterval(interval)
  }, [carregarPreNotas, INTERVALO_REFRESH])

  // Effect para atualizar contador de tempo restante
  useEffect(() => {
    const interval = setInterval(() => {
      setTempoRestante(calcularTempoRestante())
    }, 1000)

    return () => clearInterval(interval)
  }, [calcularTempoRestante])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleExpandirProduto = (prenota: string, prod: PreNotaProduto) => {
    const key = `${prenota}_${prod.codproduto}`
    const expanded = produtoExpandido[key] || false

    setProdutoExpandido((prev) => {
      const novo = { ...prev, [key]: !expanded }

      if (!expanded) {
        if (prod.controla_lote === "Sim") {
          console.log("🔍 Buscando lotes do produto:", prod.codproduto)
          api.get(`/produtos/${prod.codproduto}/lotes`).then((res) => {
            console.log("✅ Lotes recebidos:", res.data)
            setLotesPorProduto((prev) => ({ ...prev, [prod.codproduto]: res.data }))
          })
        } else {
          console.log("ℹ️ Produto sem controle de lote:", prod.codproduto)
          api.get(`/produtos/${prod.codproduto}/enderecos-lote/-`).then((res) => {
            // Marcar os endereços que já estão marcados
            const enderecos = res.data.map((end: EstoqueLocal) => {
              const enderecoMarcado = marcados.find(
                (m) => m.codproduto === prod.codproduto && m.lote === "-" && m.codendereco === end.codendereco,
              )
              return {
                ...end,
                marcado: !!enderecoMarcado,
                qtde_marcada: enderecoMarcado ? enderecoMarcado.quantidade : undefined,
              }
            })

            setEnderecosPorProduto((prev) => ({ ...prev, [prod.codproduto]: enderecos }))
          })
        }
      }

      return novo
    })
  }

  const preNotasFiltradas = preNotas.filter((pn) => {
    const buscaTexto =
      pn.prenota.includes(filtro) ||
      pn.np.includes(filtro) ||
      pn.destinario.toLowerCase().includes(filtro.toLowerCase())
    const filtroStatus = statusFiltro ? pn.status === statusFiltro : true
    const filtroTipo = tipoFiltro ? pn.tipo === tipoFiltro : true
    const filtroLoja = lojaFiltro ? pn.codloja === lojaFiltro : true
    return buscaTexto && filtroStatus && filtroTipo && filtroLoja
  })

  const handleChangePagina = (_: unknown, novaPagina: number) => setPagina(novaPagina)
  const handleChangeLinhasPorPagina = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLinhasPorPagina(Number.parseInt(e.target.value, 10))
    setPagina(0)
  }

  const statusUnicos = Array.from(new Set(preNotas.map((p) => p.status)))
  const tiposUnicos = Array.from(new Set(preNotas.map((p) => p.tipo)))
  const lojasUnicas = Array.from(new Set(preNotas.map((p) => p.codloja)))

  const limparFiltros = () => {
    setFiltro("")
    setStatusFiltro("")
    setTipoFiltro("")
    setLojaFiltro("")
    setPagina(0)
  }

  if (carregando) {
    return (
      <Layout corTopo={corTopo} nomeEmpresa={nomeEmpresa}>
        <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
          <CircularProgress size={60} sx={{ color: corTopo }} />
        </Box>
      </Layout>
    )
  }

  return (
    <Layout corTopo={corTopo} nomeEmpresa={nomeEmpresa}>
      <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
        <Box className="mb-6">
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600, color: corTopo, mb: 1 }}>
            Painel de Saída - Pré-Notas
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Gerencie e acompanhe as pré-notas do sistema
          </Typography>
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Stack spacing={2}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, display: "flex", alignItems: "center", mb: 2 }}>
                <FilterIcon sx={{ mr: 1 }} /> Filtros
              </Typography>
            </Box>

            <TextField
              label="Buscar por Pré-Nota, Nota ou Destinatário"
              variant="outlined"
              size="small"
              fullWidth
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" fontSize="small" />
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: 1,
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: corTopo,
                  },
                },
              }}
              sx={{
                mb: 2,
                "& .MuiInputLabel-root.Mui-focused": {
                  color: corTopo,
                },
              }}
            />

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              <FormControl sx={{ minWidth: 200 }} size="small">
                <InputLabel id="status-label">Status</InputLabel>
                <Select
                  labelId="status-label"
                  value={statusFiltro}
                  label="Status"
                  onChange={(e) => setStatusFiltro(e.target.value)}
                  sx={{
                    borderRadius: 1,
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: corTopo,
                    },
                  }}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {statusUnicos.map((s, i) => (
                    <MenuItem key={i} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 200 }} size="small">
                <InputLabel id="tipo-label">Tipo</InputLabel>
                <Select
                  labelId="tipo-label"
                  value={tipoFiltro}
                  label="Tipo"
                  onChange={(e) => setTipoFiltro(e.target.value)}
                  sx={{
                    borderRadius: 1,
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: corTopo,
                    },
                  }}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {tiposUnicos.map((t, i) => (
                    <MenuItem key={i} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 200 }} size="small">
                <InputLabel id="loja-label">Loja</InputLabel>
                <Select
                  labelId="loja-label"
                  value={lojaFiltro}
                  label="Loja"
                  onChange={(e) => setLojaFiltro(e.target.value)}
                  sx={{
                    borderRadius: 1,
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: corTopo,
                    },
                  }}
                >
                  <MenuItem value="">Todas</MenuItem>
                  {lojasUnicas.map((l, i) => (
                    <MenuItem key={i} value={l}>
                      {l}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={limparFiltros}
                sx={{
                  height: "40px",
                  textTransform: "none",
                  borderColor: "rgba(0, 0, 0, 0.23)",
                  color: "text.primary",
                  "&:hover": {
                    backgroundColor: "rgba(0, 0, 0, 0.04)",
                    borderColor: "rgba(0, 0, 0, 0.23)",
                  },
                }}
              >
                Limpar Filtros
              </Button>
            </Box>

            {(statusFiltro || tipoFiltro || lojaFiltro || filtro) && (
              <Box sx={{ mt: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
                {statusFiltro && (
                  <Chip
                    label={`Status: ${statusFiltro}`}
                    onDelete={() => setStatusFiltro("")}
                    size="small"
                    sx={{ bgcolor: alpha(corTopo, 0.1) }}
                  />
                )}
                {tipoFiltro && (
                  <Chip
                    label={`Tipo: ${tipoFiltro}`}
                    onDelete={() => setTipoFiltro("")}
                    size="small"
                    sx={{ bgcolor: alpha(corTopo, 0.1) }}
                  />
                )}
                {lojaFiltro && (
                  <Chip
                    label={`Loja: ${lojaFiltro}`}
                    onDelete={() => setLojaFiltro("")}
                    size="small"
                    sx={{ bgcolor: alpha(corTopo, 0.1) }}
                  />
                )}
                {filtro && (
                  <Chip
                    label={`Busca: ${filtro}`}
                    onDelete={() => setFiltro("")}
                    size="small"
                    sx={{ bgcolor: alpha(corTopo, 0.1) }}
                  />
                )}
              </Box>
            )}
          </Stack>
        </Paper>

        {/* Paper de Status de Atualização */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: alpha(corTopo, 0.02),
            opacity: carregando || atualizandoManual ? 0.7 : 1,
            transition: "opacity 0.3s ease",
          }}
        >
          <Box
            sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Chip
                label={`${preNotasFiltradas.length} ${preNotasFiltradas.length === 1 ? "pré-nota" : "pré-notas"}`}
                sx={{
                  bgcolor: alpha(corTopo, 0.1),
                  color: corTopo,
                  fontWeight: 600,
                }}
              />
              {ultimaAtualizacao && (
                <Typography variant="body2" color="text.secondary">
                  Última atualização: {ultimaAtualizacao.toLocaleTimeString("pt-BR")}
                </Typography>
              )}
              {tempoRestante && (
                <Typography variant="body2" color="text.secondary">
                  Próxima em: {tempoRestante}
                </Typography>
              )}
            </Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={atualizandoManual ? <CircularProgress size={16} /> : <RefreshIcon />}
              onClick={atualizarManual}
              disabled={atualizandoManual}
              sx={{
                textTransform: "none",
                fontWeight: 500,
                borderColor: corTopo,
                color: corTopo,
                "&:hover": {
                  backgroundColor: alpha(corTopo, 0.1),
                  borderColor: corTopo,
                },
                "&:disabled": {
                  borderColor: "rgba(0, 0, 0, 0.12)",
                  color: "rgba(0, 0, 0, 0.26)",
                },
              }}
            >
              {atualizandoManual ? "Atualizando..." : "Atualizar"}
            </Button>
          </Box>
        </Paper>

        <TableContainer
          component={Paper}
          sx={{
            borderRadius: 2,
            overflow: "auto",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            mb: 3,
            border: "1px solid",
            borderColor: "divider",
            maxHeight: "calc(100vh - 250px)", // Aumentar o espaço disponível
          }}
        >
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f3f4f6" }}>
                <TableCell sx={{ width: 50, p: 1.5 }}></TableCell>
                <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Data</TableCell>
                <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Loja</TableCell>
                <TableCell sx={{ p: 1.5, fontWeight: 600 }}>OP</TableCell>
                <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Pré-Nota</TableCell>
                <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Nota</TableCell>
                <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Tipo</TableCell>
                <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ p: 1.5, fontWeight: 600 }}>LS</TableCell>
                <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Destinatário</TableCell>
                <TableCell align="center" sx={{ p: 1.5, fontWeight: 600 }}>
                  Ações
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {preNotasFiltradas
                .slice(pagina * linhasPorPagina, pagina * linhasPorPagina + linhasPorPagina)
                .map((pn, i) => (
                  <React.Fragment key={pn.prenota}>
                    <TableRow
                      hover
                      sx={{
                        "&:nth-of-type(even)": {
                          backgroundColor: alpha("#f3f4f6", 0.3),
                        },
                        transition: "background-color 0.2s",
                        opacity: atualizandoManual ? 0.7 : 1,
                      }}
                    >
                      <TableCell sx={{ p: 1.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => toggleExpandirPreNota(pn.chave)}
                          sx={{
                            color: corTopo,
                            transition: "transform 0.2s",
                            transform: expandido[pn.chave] ? "rotate(180deg)" : "rotate(0deg)",
                          }}
                        >
                          <ExpandMore />
                        </IconButton>
                      </TableCell>
                      <TableCell sx={{ p: 1.5 }}>{formatarData(pn.data)}</TableCell>
                      <TableCell sx={{ p: 1.5 }}>{pn.codloja}</TableCell>
                      <TableCell sx={{ p: 1.5 }}>{pn.op}</TableCell>
                      <TableCell sx={{ p: 1.5, fontWeight: 500 }}>{pn.prenota}</TableCell>
                      <TableCell sx={{ p: 1.5 }}>{pn.np}</TableCell>
                      <TableCell sx={{ p: 1.5 }}>{pn.tipo}</TableCell>
                      <TableCell sx={{ p: 1.5 }}>
                        <Tooltip title={obterDescricaoStatus(pn.status)} arrow>
                          <Chip
                            label={pn.status}
                            size="small"
                            sx={{
                              ...obterCorStatus(pn.status),
                              fontWeight: 500,
                              cursor: "help",
                            }}
                          />
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ p: 1.5 }}>{pn.separacao}</TableCell>
                      <TableCell sx={{ p: 1.5 }}>{pn.destinario}</TableCell>
                      <TableCell align="center" sx={{ p: 1.5 }}>
                        <Box display="flex" gap={1} justifyContent="center">
                          <ImprimirPreNota chave={pn.chave} />
                          <ImprimirEtiquetas chave={pn.chave} />
                        </Box>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={11} sx={{ p: 0, borderBottom: 0 }}>
                        <Collapse in={expandido[pn.chave]} timeout="auto" unmountOnExit>
                          <Box sx={{ p: 3, backgroundColor: "#f9fafb" }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: corTopo }}>
                              Produtos da Pré-Nota
                            </Typography>

                            {carregandoProduto[pn.chave] ? (
                              <Box display="flex" justifyContent="center" alignItems="center" height={100}>
                                <CircularProgress size={30} sx={{ color: corTopo }} />
                              </Box>
                            ) : (
                              <TableContainer
                                component={Paper}
                                sx={{
                                  mb: 2,
                                  borderRadius: 1,
                                  boxShadow: "none",
                                  border: "1px solid",
                                  borderColor: "divider",
                                }}
                              >
                                <Table size="small">
                                  <TableHead>
                                    <TableRow sx={{ backgroundColor: "#f3f4f6" }}>
                                      <TableCell sx={{ width: 50, p: 1.5 }}></TableCell>
                                      <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Código</TableCell>
                                      <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Produto</TableCell>
                                      <TableCell align="right" sx={{ p: 1.5, fontWeight: 600 }}>
                                        Qtde
                                      </TableCell>
                                      <TableCell align="right" sx={{ p: 1.5, fontWeight: 600 }}>
                                        Vlr Unit
                                      </TableCell>
                                      <TableCell align="right" sx={{ p: 1.5, fontWeight: 600 }}>
                                        Vlr Total
                                      </TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {(detalhes[pn.chave] || []).map((prod, idx) => {
                                      const key = `${pn.chave}_${prod.codproduto}`
                                      const expanded = produtoExpandido[key] || false

                                      const handleExpandirProduto = () => {
                                        setProdutoExpandido((prev) => {
                                          const novo = { ...prev, [key]: !prev[key] }

                                          if (!prev[key]) {
                                            if (prod.controla_lote === "Sim" && !lotesPorProduto[prod.codproduto]) {
                                              api.get(`/produtos/${prod.codproduto}/lotes`).then((res) => {
                                                setLotesPorProduto((prevLotes) => ({
                                                  ...prevLotes,
                                                  [prod.codproduto]: res.data,
                                                }))
                                              })
                                            }

                                            if (prod.controla_lote === "Não" && !enderecosPorProduto[prod.codproduto]) {
                                              api.get(`/produtos/${prod.codproduto}/enderecos-lote/-`).then((res) => {
                                                setEnderecosPorProduto((prevEnds) => ({
                                                  ...prevEnds,
                                                  [prod.codproduto]: res.data,
                                                }))
                                              })
                                            }
                                          }

                                          return novo
                                        })
                                      }

                                      return (
                                        <React.Fragment key={idx}>
                                          <TableRow
                                            hover
                                            sx={{
                                              "&:nth-of-type(even)": {
                                                backgroundColor: alpha("#f3f4f6", 0.3),
                                              },
                                            }}
                                          >
                                            <TableCell sx={{ p: 1.5 }}>
                                              <IconButton
                                                size="small"
                                                onClick={handleExpandirProduto}
                                                sx={{
                                                  color: corTopo,
                                                  transition: "transform 0.2s",
                                                  transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                                                }}
                                              >
                                                <ExpandMore />
                                              </IconButton>
                                            </TableCell>
                                            <TableCell sx={{ p: 1.5 }}>{prod.codproduto}</TableCell>
                                            <TableCell sx={{ p: 1.5, fontWeight: 500 }}>{prod.produto}</TableCell>
                                            <TableCell align="right" sx={{ p: 1.5 }}>
                                              {formatarNumero(prod.qtde_saida)}
                                            </TableCell>
                                            <TableCell align="right" sx={{ p: 1.5 }}>
                                              {formatarNumero(prod.vlr_unitario)}
                                            </TableCell>
                                            <TableCell align="right" sx={{ p: 1.5, fontWeight: 500 }}>
                                              {formatarNumero(prod.vlr_total)}
                                            </TableCell>
                                          </TableRow>

                                          <TableRow>
                                            <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
                                              <Collapse in={expanded} timeout="auto" unmountOnExit>
                                                <Box sx={{ p: 2, backgroundColor: "#f0f2f5" }}>
                                                  {prod.controla_lote?.toString().toLowerCase() === "sim" ? (
                                                    <>
                                                      <Typography
                                                        variant="subtitle2"
                                                        sx={{ fontWeight: 600, mb: 2, color: corTopo }}
                                                      >
                                                        Lotes do Produto
                                                      </Typography>
                                                      <TableContainer
                                                        component={Paper}
                                                        sx={{
                                                          mb: 2,
                                                          borderRadius: 1,
                                                          boxShadow: "none",
                                                          border: "1px solid",
                                                          borderColor: "divider",
                                                          maxHeight: "300px",
                                                          overflow: "auto",
                                                        }}
                                                      >
                                                        <Table size="small">
                                                          <TableHead>
                                                            <TableRow sx={{ backgroundColor: "#f3f4f6" }}>
                                                              <TableCell sx={{ width: 50, p: 1.5 }}></TableCell>
                                                              <TableCell sx={{ p: 1.5, fontWeight: 600 }}>
                                                                Lote
                                                              </TableCell>
                                                              <TableCell align="right" sx={{ p: 1.5, fontWeight: 600 }}>
                                                                Qtde Lote
                                                              </TableCell>
                                                              <TableCell align="right" sx={{ p: 1.5, fontWeight: 600 }}>
                                                                Reserva
                                                              </TableCell>
                                                              <TableCell align="right" sx={{ p: 1.5, fontWeight: 600 }}>
                                                                Disponível
                                                              </TableCell>
                                                            </TableRow>
                                                          </TableHead>
                                                          <TableBody>
                                                            {lotesPorProduto[prod.codproduto]?.map((lote, j) => {
                                                              const loteKey = `${prod.codproduto}_${lote.lote}`
                                                              const loteExp = loteExpandido[loteKey] || false
                                                              // Verificar se este lote é o escolhido para este produto
                                                              const isLoteEscolhido = prod.lote === lote.lote

                                                              return (
                                                                <React.Fragment key={j}>
                                                                  <TableRow
                                                                    hover
                                                                    sx={{
                                                                      "&:nth-of-type(even)": {
                                                                        backgroundColor: alpha("#f3f4f6", 0.3),
                                                                      },
                                                                      ...(isLoteEscolhido && {
                                                                        backgroundColor: alpha("#4caf50", 0.15),
                                                                        "&:hover": {
                                                                          backgroundColor: alpha("#4caf50", 0.25),
                                                                        },
                                                                      }),
                                                                    }}
                                                                  >
                                                                    <TableCell sx={{ p: 1.5 }}>
                                                                      <IconButton
                                                                        size="small"
                                                                        onClick={() =>
                                                                          toggleLote(prod.codproduto, lote.lote)
                                                                        }
                                                                        sx={{
                                                                          color: corTopo,
                                                                          transition: "transform 0.2s",
                                                                          transform: loteExp
                                                                            ? "rotate(180deg)"
                                                                            : "rotate(0deg)",
                                                                        }}
                                                                      >
                                                                        <ExpandMore />
                                                                      </IconButton>
                                                                    </TableCell>
                                                                    <TableCell sx={{ p: 1.5, fontWeight: 500 }}>
                                                                      {lote.lote}
                                                                      {isLoteEscolhido && (
                                                                        <Chip
                                                                          size="small"
                                                                          label="Escolhido na venda"
                                                                          color="success"
                                                                          variant="outlined"
                                                                          sx={{ ml: 1, height: 20, fontSize: "0.7rem" }}
                                                                        />
                                                                      )}
                                                                    </TableCell>
                                                                    <TableCell align="right" sx={{ p: 1.5 }}>
                                                                      {formatarNumero(lote.qtde_lote)}
                                                                    </TableCell>
                                                                    <TableCell align="right" sx={{ p: 1.5 }}>
                                                                      {formatarNumero(lote.qtde_reserva)}
                                                                    </TableCell>
                                                                    <TableCell
                                                                      align="right"
                                                                      sx={{
                                                                        p: 1.5,
                                                                        fontWeight: 600,
                                                                        color:
                                                                          lote.qtde_disponivel > 0
                                                                            ? "success.main"
                                                                            : "inherit",
                                                                      }}
                                                                    >
                                                                      {formatarNumero(
                                                                        lote.qtde_lote - lote.qtde_reserva,
                                                                      )}
                                                                    </TableCell>
                                                                  </TableRow>

                                                                  <TableRow>
                                                                    <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
                                                                      <Collapse
                                                                        in={loteExp}
                                                                        timeout="auto"
                                                                        unmountOnExit
                                                                      >
                                                                        <Box sx={{ p: 2, backgroundColor: "#f9fafb" }}>
                                                                          <Typography
                                                                            variant="subtitle2"
                                                                            sx={{
                                                                              fontWeight: 600,
                                                                              mb: 2,
                                                                              color: corTopo,
                                                                            }}
                                                                          >
                                                                            Endereços do Lote
                                                                          </Typography>
                                                                          {(enderecosPorProduto[loteKey]?.length || 0) >
                                                                            0 ? (
                                                                            <TableContainer
                                                                              component={Paper}
                                                                              sx={{
                                                                                mb: 2,
                                                                                borderRadius: 1,
                                                                                boxShadow: "none",
                                                                                border: "1px solid",
                                                                                borderColor: "divider",
                                                                                maxHeight: "300px",
                                                                                overflow: "auto",
                                                                              }}
                                                                            >
                                                                              <Table size="small">
                                                                                <TableHead>
                                                                                  <TableRow
                                                                                    sx={{ backgroundColor: "#f3f4f6" }}
                                                                                  >
                                                                                    <TableCell
                                                                                      sx={{ p: 1.5, fontWeight: 600 }}
                                                                                    >
                                                                                      Endereço
                                                                                    </TableCell>
                                                                                    <TableCell
                                                                                      sx={{ p: 1.5, fontWeight: 600 }}
                                                                                    >
                                                                                      Rua
                                                                                    </TableCell>
                                                                                    <TableCell
                                                                                      sx={{ p: 1.5, fontWeight: 600 }}
                                                                                    >
                                                                                      Prédio
                                                                                    </TableCell>
                                                                                    {usa4Niveis && (
                                                                                      <TableCell
                                                                                        sx={{ p: 1.5, fontWeight: 600 }}
                                                                                      >
                                                                                        Andar
                                                                                      </TableCell>
                                                                                    )}
                                                                                    {usa4Niveis && (
                                                                                      <TableCell
                                                                                        sx={{ p: 1.5, fontWeight: 600 }}
                                                                                      >
                                                                                        Apto
                                                                                      </TableCell>
                                                                                    )}
                                                                                    <TableCell
                                                                                      align="center"
                                                                                      sx={{ p: 1.5, fontWeight: 600 }}
                                                                                    >
                                                                                      Qtde
                                                                                    </TableCell>
                                                                                    <TableCell
                                                                                      align="center"
                                                                                      sx={{ p: 1.5, fontWeight: 600 }}
                                                                                    >
                                                                                      Ações
                                                                                    </TableCell>
                                                                                  </TableRow>
                                                                                </TableHead>
                                                                                <TableBody>
                                                                                  {(
                                                                                    enderecosPorProduto[loteKey] || []
                                                                                  ).map((end, k) => (
                                                                                    <TableRow
                                                                                      key={k}
                                                                                      hover
                                                                                      sx={{
                                                                                        "&:nth-of-type(even)": {
                                                                                          backgroundColor: alpha(
                                                                                            "#f3f4f6",
                                                                                            0.3,
                                                                                          ),
                                                                                        },
                                                                                      }}
                                                                                    >
                                                                                      <TableCell
                                                                                        sx={{ p: 1.5, fontWeight: 500 }}
                                                                                      >
                                                                                        {end.codendereco}
                                                                                      </TableCell>
                                                                                      <TableCell sx={{ p: 1.5 }}>
                                                                                        {end.rua}
                                                                                      </TableCell>
                                                                                      <TableCell sx={{ p: 1.5 }}>
                                                                                        {end.predio}
                                                                                      </TableCell>
                                                                                      {usa4Niveis && (
                                                                                        <TableCell sx={{ p: 1.5 }}>
                                                                                          {end.andar || "-"}
                                                                                        </TableCell>
                                                                                      )}
                                                                                      {usa4Niveis && (
                                                                                        <TableCell sx={{ p: 1.5 }}>
                                                                                          {end.apto || "-"}
                                                                                        </TableCell>
                                                                                      )}
                                                                                      <TableCell
                                                                                        align="center"
                                                                                        sx={{ p: 1.5, fontWeight: 500 }}
                                                                                      >
                                                                                        {end.marcado && end.qtde_marcada
                                                                                          ? `${formatarNumero(end.qtde_marcada)} / ${formatarNumero(end.qtde)}`
                                                                                          : formatarNumero(end.qtde)}
                                                                                      </TableCell>
                                                                                      <TableCell
                                                                                        align="center"
                                                                                        sx={{ p: 1.5 }}
                                                                                      >
                                                                                        {end.marcado ? (
                                                                                          <Button
                                                                                            size="small"
                                                                                            variant="outlined"
                                                                                            color="error"
                                                                                            sx={{
                                                                                              textTransform: "none",
                                                                                              fontWeight: 500,
                                                                                              boxShadow: "none",
                                                                                            }}
                                                                                            onClick={async () => {
                                                                                              await desmarcarEndereco(
                                                                                                pn.chave,
                                                                                                prod.codproduto,
                                                                                                lote.lote,
                                                                                                end.codendereco,
                                                                                              )
                                                                                            }}
                                                                                          >
                                                                                            Desconfirmar
                                                                                          </Button>
                                                                                        ) : (
                                                                                          <Button
                                                                                            size="small"
                                                                                            variant="outlined"
                                                                                            color="primary"
                                                                                            sx={{
                                                                                              textTransform: "none",
                                                                                              fontWeight: 500,
                                                                                              boxShadow: "none",
                                                                                            }}
                                                                                            onClick={() =>
                                                                                              setModal({
                                                                                                aberto: true,
                                                                                                codproduto:
                                                                                                  prod.codproduto,
                                                                                                lote: lote.lote,
                                                                                                codendereco:
                                                                                                  end.codendereco,
                                                                                                qtdeDisponivel:
                                                                                                  end.qtde,
                                                                                                chave: pn.chave,
                                                                                              })
                                                                                            }
                                                                                          >
                                                                                            Confirmar
                                                                                          </Button>
                                                                                        )}
                                                                                      </TableCell>
                                                                                    </TableRow>
                                                                                  ))}
                                                                                </TableBody>
                                                                              </Table>
                                                                            </TableContainer>
                                                                          ) : (
                                                                            <Typography
                                                                              variant="body2"
                                                                              color="text.secondary"
                                                                            >
                                                                              Nenhum endereço encontrado para este lote.
                                                                            </Typography>
                                                                          )}
                                                                        </Box>
                                                                      </Collapse>
                                                                    </TableCell>
                                                                  </TableRow>
                                                                </React.Fragment>
                                                              )
                                                            })}
                                                          </TableBody>
                                                        </Table>
                                                      </TableContainer>
                                                    </>
                                                  ) : (
                                                    <>
                                                      <Typography
                                                        variant="subtitle2"
                                                        sx={{ fontWeight: 600, mb: 2, color: corTopo }}
                                                      >
                                                        Endereços do Produto
                                                      </Typography>
                                                      <TableContainer
                                                        component={Paper}
                                                        sx={{
                                                          mb: 2,
                                                          borderRadius: 1,
                                                          boxShadow: "none",
                                                          border: "1px solid",
                                                          borderColor: "divider",
                                                        }}
                                                      >
                                                        <Table size="small">
                                                          <TableHead>
                                                            <TableRow sx={{ backgroundColor: "#f3f4f6" }}>
                                                              <TableCell sx={{ p: 1.5, fontWeight: 600 }}>
                                                                Endereço
                                                              </TableCell>
                                                              <TableCell sx={{ p: 1.5, fontWeight: 600 }}>
                                                                Rua
                                                              </TableCell>
                                                              <TableCell sx={{ p: 1.5, fontWeight: 600 }}>
                                                                Prédio
                                                              </TableCell>
                                                              {usa4Niveis && (
                                                                <TableCell sx={{ p: 1.5, fontWeight: 600 }}>
                                                                  Andar
                                                                </TableCell>
                                                              )}
                                                              {usa4Niveis && (
                                                                <TableCell sx={{ p: 1.5, fontWeight: 600 }}>
                                                                  Apto
                                                                </TableCell>
                                                              )}
                                                              <TableCell
                                                                align="center"
                                                                sx={{ p: 1.5, fontWeight: 600 }}
                                                              >
                                                                Qtde
                                                              </TableCell>
                                                              <TableCell
                                                                align="center"
                                                                sx={{ p: 1.5, fontWeight: 600 }}
                                                              >
                                                                Ações
                                                              </TableCell>
                                                            </TableRow>
                                                          </TableHead>
                                                          <TableBody>
                                                            {(enderecosPorProduto[prod.codproduto] || []).map(
                                                              (end, j) => (
                                                                <TableRow
                                                                  key={j}
                                                                  hover
                                                                  sx={{
                                                                    "&:nth-of-type(even)": {
                                                                      backgroundColor: alpha("#f3f4f6", 0.3),
                                                                    },
                                                                  }}
                                                                >
                                                                  <TableCell sx={{ p: 1.5, fontWeight: 500 }}>
                                                                    {end.codendereco}
                                                                  </TableCell>
                                                                  <TableCell sx={{ p: 1.5 }}>{end.rua}</TableCell>
                                                                  <TableCell sx={{ p: 1.5 }}>{end.predio}</TableCell>
                                                                  {usa4Niveis && (
                                                                    <TableCell sx={{ p: 1.5 }}>
                                                                      {end.andar || "-"}
                                                                    </TableCell>
                                                                  )}
                                                                  {usa4Niveis && (
                                                                    <TableCell sx={{ p: 1.5 }}>
                                                                      {end.apto || "-"}
                                                                    </TableCell>
                                                                  )}
                                                                  <TableCell
                                                                    align="center"
                                                                    sx={{ p: 1.5, fontWeight: 500 }}
                                                                  >
                                                                    {end.marcado && end.qtde_marcada
                                                                      ? `${formatarNumero(end.qtde_marcada)} / ${formatarNumero(end.qtde)}`
                                                                      : formatarNumero(end.qtde)}
                                                                  </TableCell>
                                                                  <TableCell align="center" sx={{ p: 1.5 }}>
                                                                    {end.marcado ? (
                                                                      <Button
                                                                        size="small"
                                                                        variant="outlined"
                                                                        color="error"
                                                                        sx={{
                                                                          textTransform: "none",
                                                                          fontWeight: 500,
                                                                          boxShadow: "none",
                                                                        }}
                                                                        onClick={async () => {
                                                                          await desmarcarEndereco(
                                                                            pn.chave,
                                                                            prod.codproduto,
                                                                            "-",
                                                                            end.codendereco,
                                                                          )
                                                                        }}
                                                                      >
                                                                        Desconfirmar
                                                                      </Button>
                                                                    ) : (
                                                                      <Button
                                                                        size="small"
                                                                        variant="outlined"
                                                                        color="primary"
                                                                        sx={{
                                                                          textTransform: "none",
                                                                          fontWeight: 500,
                                                                          boxShadow: "none",
                                                                        }}
                                                                        onClick={() =>
                                                                          setModal({
                                                                            aberto: true,
                                                                            codproduto: prod.codproduto,
                                                                            lote: "-", // produto sem controle de lote
                                                                            codendereco: end.codendereco,
                                                                            qtdeDisponivel: end.qtde,
                                                                            chave: pn.chave,
                                                                          })
                                                                        }
                                                                      >
                                                                        Confirm
                                                                      </Button>
                                                                    )}
                                                                  </TableCell>
                                                                </TableRow>
                                                              ),
                                                            )}
                                                          </TableBody>
                                                        </Table>
                                                      </TableContainer>
                                                    </>
                                                  )}
                                                </Box>
                                              </Collapse>
                                            </TableCell>
                                          </TableRow>
                                        </React.Fragment>
                                      )
                                    })}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={preNotasFiltradas.length}
          rowsPerPage={linhasPorPagina}
          page={pagina}
          onPageChange={handleChangePagina}
          onRowsPerPageChange={handleChangeLinhasPorPagina}
          labelRowsPerPage="Linhas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
          sx={{
            px: 2,
            border: "none",
            "& .MuiTablePagination-selectLabel": { fontWeight: 500 },
            "& .MuiTablePagination-displayedRows": { fontWeight: 500 },
          }}
        />

        <Dialog open={!!modal} onClose={() => setModal(null)}>
          <DialogTitle>Confirmar Endereço</DialogTitle>
          <DialogContent>
            {modal && (
              <Typography>
                Tem certeza que deseja marcar o endereço <b>{modal.codendereco}</b> para o produto{" "}
                <b>{modal.codproduto}</b> (Lote: {modal.lote})?
                <br />
                Quantidade disponível: <b>{formatarNumero(modal.qtdeDisponivel)}</b>
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setModal(null)} color="primary">
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (modal) {
                  await marcarEndereco(
                    modal.chave,
                    modal.codproduto,
                    modal.lote,
                    modal.codendereco,
                    modal.qtdeDisponivel,
                  )
                  setModal(null)
                }
              }}
              color="primary"
            >
              Confirmar
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.aberta}
          autoHideDuration={4000}
          onClose={fecharSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert onClose={fecharSnackbar} severity={snackbar.tipo} sx={{ width: "100%" }}>
            {snackbar.mensagem}
          </Alert>
        </Snackbar>
      </Container>
    </Layout>
  )
}

export default PainelSaida
