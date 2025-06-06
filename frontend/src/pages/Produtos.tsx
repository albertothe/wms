"use client"

import React, { useEffect, useState, useMemo, useContext } from "react"
import api from "../services/api"
import { Layout } from "../components/Layout"
import { AuthContext } from "../contexts/AuthContext"
import {
  Box,
  Typography,
  Button,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Collapse,
  TablePagination,
  TextField,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  InputAdornment,
  alpha,
  Snackbar,
  CircularProgress,
  Card,
  CardContent,
  Tabs,
  Tab,
} from "@mui/material"
import {
  KeyboardArrowDown as ExpandMore,
  Add,
  Edit,
  Delete,
  Search as SearchIcon,
  FileDownload as ExportIcon,
  Inventory as InventoryIcon,
  ShoppingCart as ShoppingCartIcon,
  Warning as WarningIcon,
  Layers as LayersIcon,
  LocationOff as LocationOffIcon,
} from "@mui/icons-material"
import * as XLSX from "xlsx"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

interface Produto {
  codproduto: string
  produto: string
  complemento: string
  unidade: string
  codbarra: string
  referencia: string
  controla_lote: "Sim" | "Não"
  qtde_estoque: number
  qtde_reserva: number
  qtde_disponivel: number
  qtde_avaria: number
  facing: number
}

interface ProdutoSemEndereco {
  codproduto: string
  produto: string
  qtde_estoque: number
  controla_lote: "Sim" | "Não"
}

interface Lote {
  lote: string
  qtde_lote: number
  qtde_reserva: number
  qtde_disponivel: number
}

interface Endereco {
  codendereco: string
  rua: string
  predio: string
  andar?: string
  apto?: string
  qtde: number
}

interface EnderecoBase {
  codendereco: string
  rua: string
  predio: string
  andar?: string
  apto?: string
}

const Produtos = () => {
  const { corTopo, nomeEmpresa } = useContext(AuthContext)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [produtosSemEndereco, setProdutosSemEndereco] = useState<ProdutoSemEndereco[]>([])
  const [lotesPorProduto, setLotesPorProduto] = useState<{ [codproduto: string]: Lote[] }>({})
  const [enderecosPorProduto, setEnderecosPorProduto] = useState<{ [key: string]: Endereco[] }>({})
  const [enderecosBase, setEnderecosBase] = useState<EnderecoBase[]>([])
  const [expandidoProduto, setExpandidoProduto] = useState<{ [codproduto: string]: boolean }>({})
  const [expandidoLote, setExpandidoLote] = useState<{ [key: string]: boolean }>({})
  const [usa4Niveis, setUsa4Niveis] = useState(false)
  const [filtro, setFiltro] = useState("")
  const [pagina, setPagina] = useState(0)
  const [linhasPorPagina, setLinhasPorPagina] = useState(10)
  const [carregando, setCarregando] = useState<{ [key: string]: boolean }>({})
  const [carregandoPagina, setCarregandoPagina] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [abaAtiva, setAbaAtiva] = useState(0)
  const [filtroDigitado, setFiltroDigitado] = useState("")
  const [carregandoTabela, setCarregandoTabela] = useState(false)

  const [modalAberto, setModalAberto] = useState(false)
  const [modalEditarAberto, setModalEditarAberto] = useState(false)
  const [produtoSelecionado, setProdutoSelecionado] = useState<{ codproduto: string; lote: string }>({
    codproduto: "",
    lote: "-",
  })
  const [novoEndereco, setNovoEndereco] = useState({ codendereco: "", quantidade: "" })
  const [enderecoParaEditar, setEnderecoParaEditar] = useState<{ codendereco: string; quantidade: string }>({
    codendereco: "",
    quantidade: "",
  })
  const [erroModal, setErroModal] = useState("")

  useEffect(() => {
    async function carregarDados() {
      try {
        setCarregandoPagina(true)

        // Carregar configurações primeiro para ter a cor correta no loader
        const resConfig = await api.get("/configuracoes")
        setUsa4Niveis(resConfig.data.usa_4_niveis)

        // Carregar produtos, endereços e produtos sem endereço em paralelo
        const [resProdutos, resEnderecos, resProdutosSemEndereco] = await Promise.all([
          api.get("/produtos"),
          api.get("/enderecos"),
          api.get("/produtos/sem-endereco"),
        ])

        setProdutos(resProdutos.data)
        setEnderecosBase(resEnderecos.data)
        setProdutosSemEndereco(resProdutosSemEndereco.data)
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
        setErro("Erro ao carregar dados. Por favor, tente novamente.")
      } finally {
        setCarregandoPagina(false)
      }
    }
    carregarDados()
  }, [])

  // Memoize produtos filtrados para melhorar o desempenho
  const produtosFiltrados = React.useMemo(() => {
    return produtos.filter(
      (p) => p.produto.toLowerCase().includes(filtro.toLowerCase()) || p.codproduto.includes(filtro),
    )
  }, [produtos, filtro])

  const formatarNumero = (valor: number | string) => {
    const num = Number(valor)
    return isNaN(num) ? "0.00" : num.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
  }

  const toggleProduto = async (produto: Produto) => {
    setExpandidoProduto((prev) => ({ ...prev, [produto.codproduto]: !prev[produto.codproduto] }))

    if (!expandidoProduto[produto.codproduto]) {
      if (produto.controla_lote === "Sim") {
        try {
          setCarregando((prev) => ({ ...prev, [produto.codproduto]: true }))
          const res = await api.get(`/produtos/${encodeURIComponent(produto.codproduto)}/lotes`)
          setLotesPorProduto((prev) => ({ ...prev, [produto.codproduto]: res.data }))
          setCarregando((prev) => ({ ...prev, [produto.codproduto]: false }))
        } catch (error) {
          console.error(`Erro ao carregar lotes do produto ${produto.codproduto}:`, error)
          setErro(`Erro ao carregar lotes do produto ${produto.codproduto}. Por favor, tente novamente.`)
          setCarregando((prev) => ({ ...prev, [produto.codproduto]: false }))
          setExpandidoProduto((prev) => ({ ...prev, [produto.codproduto]: false }))
        }
      } else {
        try {
          setCarregando((prev) => ({ ...prev, [produto.codproduto]: true }))
          const res = await api.get(`/produtos/${encodeURIComponent(produto.codproduto)}/enderecos-lote/-`)
          setEnderecosPorProduto((prev) => ({ ...prev, [produto.codproduto]: res.data }))
          setCarregando((prev) => ({ ...prev, [produto.codproduto]: false }))
        } catch (error) {
          console.error(`Erro ao carregar endereços do produto ${produto.codproduto}:`, error)
          setErro(`Erro ao carregar endereços do produto ${produto.codproduto}. Por favor, tente novamente.`)
          setCarregando((prev) => ({ ...prev, [produto.codproduto]: false }))
          setExpandidoProduto((prev) => ({ ...prev, [produto.codproduto]: false }))
        }
      }
    }
  }

  const toggleLote = async (codproduto: string, lote: string) => {
    const key = `${codproduto}_${lote}`
    setExpandidoLote((prev) => ({ ...prev, [key]: !prev[key] }))

    if (!expandidoLote[key]) {
      try {
        setCarregando((prev) => ({ ...prev, [key]: true }))
        const res = await api.get(
          `/produtos/${encodeURIComponent(codproduto)}/enderecos-lote/${encodeURIComponent(lote)}`,
        )
        setEnderecosPorProduto((prev) => ({ ...prev, [key]: res.data }))
        setCarregando((prev) => ({ ...prev, [key]: false }))
      } catch (error) {
        console.error(`Erro ao carregar endereços do lote ${lote} do produto ${codproduto}:`, error)
        setErro(`Erro ao carregar endereços do lote ${lote}. Por favor, tente novamente.`)
        setCarregando((prev) => ({ ...prev, [key]: false }))
        setExpandidoLote((prev) => ({ ...prev, [key]: false }))
      }
    }
  }

  const abrirModalAdicionar = (codproduto: string, lote: string) => {
    setProdutoSelecionado({ codproduto, lote })
    setNovoEndereco({ codendereco: "", quantidade: "" })
    setErroModal("")
    setModalAberto(true)
  }

  const abrirModalEditar = (codproduto: string, lote: string, codendereco: string, qtde: number) => {
    setProdutoSelecionado({ codproduto, lote })
    setEnderecoParaEditar({ codendereco, quantidade: qtde.toString() })
    setErroModal("")
    setModalEditarAberto(true)
  }

  const [confirmarExclusao, setConfirmarExclusao] = useState<{
    aberto: boolean
    codproduto: string
    lote: string
    codendereco: string
  } | null>(null)

  const adicionarEndereco = async () => {
    const { codproduto, lote } = produtoSelecionado
    const { codendereco, quantidade } = novoEndereco
    const qtde = Number.parseFloat(quantidade)

    if (!codendereco || !quantidade) {
      setErroModal("Informe o endereço e uma quantidade válida.")
      return
    }

    if (qtde <= 0) {
      setErroModal("A quantidade deve ser maior que zero.")
      return
    }

    const chave = `${codproduto}_${lote}`
    const enderecosExistentes = enderecosPorProduto[chave] || enderecosPorProduto[codproduto] || []

    if (enderecosExistentes.some((e) => e.codendereco === codendereco)) {
      setErroModal("Este endereço já foi lançado para este produto. Edite o endereço existente se quiser alterar.")
      return
    }
    const limite =
      lote === "-"
        ? produtos.find((p) => p.codproduto === codproduto)?.qtde_estoque
        : lotesPorProduto[codproduto]?.find((l) => l.lote === lote)?.qtde_lote

    if (limite !== undefined && qtde > limite) {
      setErroModal(`A quantidade não pode ser maior que ${formatarNumero(limite)}.`)
      return
    }

    try {
      await api.post(`/produtos/${encodeURIComponent(codproduto)}/${encodeURIComponent(lote)}`, {
        codendereco,
        qtde: quantidade,
      })
      const res = await api.get(
        `/produtos/${encodeURIComponent(codproduto)}/enderecos-lote/${encodeURIComponent(lote)}`,
      )
      setEnderecosPorProduto((prev) => ({
        ...prev,
        [`${codproduto}_${lote}`]: res.data,
        ...(lote === "-" && { [codproduto]: res.data }),
      }))

      // Recarregar produtos sem endereço
      const resProdutosSemEndereco = await api.get("/produtos/sem-endereco")
      setProdutosSemEndereco(resProdutosSemEndereco.data)

      setModalAberto(false)
    } catch (error) {
      console.error("Erro ao adicionar endereço:", error)
      setErroModal("Erro ao adicionar endereço. Por favor, tente novamente.")
    }
  }

  const editarEndereco = async () => {
    const { codproduto, lote } = produtoSelecionado
    const { codendereco, quantidade } = enderecoParaEditar
    const qtde = Number.parseFloat(quantidade)

    if (!codendereco || !quantidade) {
      setErroModal("Informe uma quantidade válida.")
      return
    }

    if (qtde <= 0) {
      setErroModal("A quantidade deve ser maior que zero.")
      return
    }

    const limite =
      lote === "-"
        ? produtos.find((p) => p.codproduto === codproduto)?.qtde_estoque
        : lotesPorProduto[codproduto]?.find((l) => l.lote === lote)?.qtde_lote

    if (limite !== undefined && qtde > limite) {
      setErroModal(`A quantidade não pode ser maior que ${formatarNumero(limite)}.`)
      return
    }

    try {
      await api.put(
        `/produtos/${encodeURIComponent(codproduto)}/${encodeURIComponent(lote)}/${encodeURIComponent(codendereco)}`,
        { qtde: quantidade },
      )
      const res = await api.get(
        `/produtos/${encodeURIComponent(codproduto)}/enderecos-lote/${encodeURIComponent(lote)}`,
      )
      setEnderecosPorProduto((prev) => ({
        ...prev,
        [`${codproduto}_${lote}`]: res.data,
        ...(lote === "-" && { [codproduto]: res.data }),
      }))

      // Recarregar produtos sem endereço
      const resProdutosSemEndereco = await api.get("/produtos/sem-endereco")
      setProdutosSemEndereco(resProdutosSemEndereco.data)

      setModalEditarAberto(false)
    } catch (error) {
      console.error("Erro ao editar endereço:", error)
      setErroModal("Erro ao editar endereço. Por favor, tente novamente.")
    }
  }

  const excluirEndereco = async (codproduto: string, lote: string, codendereco: string) => {
    setConfirmarExclusao({ aberto: true, codproduto, lote, codendereco })
  }

  // Função para calcular o nível de serviço
  const calcularNivelServico = () => {
    const produtosComFacing = produtos.filter((p) => p.facing > 0)
    const produtosComFacingEEstoque = produtosComFacing.filter((p) => p.qtde_estoque > 0)

    if (produtosComFacing.length === 0) return 0

    return (produtosComFacingEEstoque.length / produtosComFacing.length) * 100
  }

  // Função para identificar produtos que precisam de compra
  const produtosParaCompra = () => {
    return produtos.filter((p) => p.facing > 0 && p.qtde_estoque <= 0)
  }

  // Função para exportar dados para Excel
  const exportarParaExcel = () => {
    const dadosConvertidos = produtosFiltrados.map((item) => ({
      Código: item.codproduto,
      Produto: item.produto,
      Complemento: item.complemento,
      Unidade: item.unidade,
      "Controla Lote": item.controla_lote,
      "Código de Barras": item.codbarra,
      Referência: item.referencia,
      Facing: item.facing,
      Estoque: Number(item.qtde_estoque).toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
      Reserva: Number(item.qtde_reserva).toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
      Disponível: Number(item.qtde_disponivel).toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
      Avaria: Number(item.qtde_avaria).toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
    }))

    const planilha = XLSX.utils.json_to_sheet(dadosConvertidos)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, planilha, "Produtos")
    XLSX.writeFile(workbook, "relatorio_produtos.xlsx")
  }

  // Função para mudar a aba ativa
  const handleAbaChange = (_: React.SyntheticEvent, newValue: number) => {
    setAbaAtiva(newValue)
  }

  // Preparar dados para o gráfico de produtos por status
  const dadosGraficoProdutos = useMemo(() => {
    const totalProdutos = produtos.length

    const produtosComEstoque = produtos.filter((p) => p.qtde_estoque > 0).length
    const produtosSemEstoque = produtos.filter((p) => p.qtde_estoque <= 0).length

    return [
      {
        name: `Com Estoque (${produtosComEstoque})`,
        value: produtosComEstoque,
        percent: (produtosComEstoque / totalProdutos) * 100,
      },
      {
        name: `Sem Estoque (${produtosSemEstoque})`,
        value: produtosSemEstoque,
        percent: (produtosSemEstoque / totalProdutos) * 100,
      },
    ]
  }, [produtos])

  // Preparar dados para o gráfico de produtos com reserva e avaria
  const dadosGraficoReservaAvaria = useMemo(() => {
    const totalProdutos = produtos.length

    const produtosComReserva = produtos.filter((p) => p.qtde_reserva > 0).length
    const produtosComAvaria = produtos.filter((p) => p.qtde_avaria > 0).length
    const produtosSemReservaOuAvaria = produtos.filter((p) => p.qtde_reserva <= 0 && p.qtde_avaria <= 0).length

    return [
      {
        name: `Com Reserva (${produtosComReserva})`,
        value: produtosComReserva,
        percent: (produtosComReserva / totalProdutos) * 100,
      },
      {
        name: `Com Avaria (${produtosComAvaria})`,
        value: produtosComAvaria,
        percent: (produtosComAvaria / totalProdutos) * 100,
      },
      {
        name: `Sem Reserva/Avaria (${produtosSemReservaOuAvaria})`,
        value: produtosSemReservaOuAvaria,
        percent: (produtosSemReservaOuAvaria / totalProdutos) * 100,
      },
    ]
  }, [produtos])

  // Preparar dados para o gráfico de produtos com facing
  const dadosGraficoFacing = useMemo(() => {
    const produtosComFacing = produtos.filter((p) => p.facing > 0)
    const totalProdutosComFacing = produtosComFacing.length

    if (totalProdutosComFacing === 0) {
      return [{ name: "Sem dados", value: 1, percent: 100 }]
    }

    const produtosComFacingEEstoque = produtosComFacing.filter((p) => p.qtde_estoque > 0).length
    const produtosComFacingSemEstoque = produtosComFacing.filter((p) => p.qtde_estoque <= 0).length

    return [
      {
        name: `Com Estoque (${produtosComFacingEEstoque})`,
        value: produtosComFacingEEstoque,
        percent: (produtosComFacingEEstoque / totalProdutosComFacing) * 100,
      },
      {
        name: `Sem Estoque (${produtosComFacingSemEstoque})`,
        value: produtosComFacingSemEstoque,
        percent: (produtosComFacingSemEstoque / totalProdutosComFacing) * 100,
      },
    ]
  }, [produtos])

  // Preparar dados para o gráfico de distribuição de estoque
  const dadosGraficoEstoque = useMemo(() => {
    const faixas = [
      { name: "Sem estoque", min: 0, max: 0 },
      { name: "1-10", min: 1, max: 10 },
      { name: "11-50", min: 11, max: 50 },
      { name: "51-100", min: 51, max: 100 },
      { name: "101-500", min: 101, max: 500 },
      { name: "> 500", min: 501, max: Number.POSITIVE_INFINITY },
    ]

    return faixas.map((faixa) => {
      const count = produtos.filter((p) => p.qtde_estoque >= faixa.min && p.qtde_estoque <= faixa.max).length

      return {
        name: faixa.name,
        quantidade: count,
      }
    })
  }, [produtos])

  // Cores para os gráficos
  const COLORS = ["#0088FE", "#FF8042", "#00C49F", "#FFBB28", "#8884d8", "#82ca9d"]
  const COLORS_FACING = ["#00C49F", "#FF8042"]

  if (carregandoPagina) {
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
      <Snackbar
        open={!!erro}
        autoHideDuration={6000}
        onClose={() => setErro(null)}
        message={erro}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      />

      <Dialog open={!!confirmarExclusao} onClose={() => setConfirmarExclusao(null)}>
        <DialogTitle sx={{ fontSize: "1.2rem", fontWeight: 500 }}>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography variant="body1">Tem certeza que deseja excluir este endereço?</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmarExclusao(null)}
            sx={{
              textTransform: "none",
              fontWeight: 500,
            }}
          >
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={async () => {
              if (confirmarExclusao) {
                const { codproduto, lote, codendereco } = confirmarExclusao
                try {
                  await api.delete(
                    `/produtos/${encodeURIComponent(codproduto)}/${encodeURIComponent(lote)}/${encodeURIComponent(codendereco)}`,
                  )
                  const res = await api.get(
                    `/produtos/${encodeURIComponent(codproduto)}/enderecos-lote/${encodeURIComponent(lote)}`,
                  )
                  setEnderecosPorProduto((prev) => ({
                    ...prev,
                    [`${codproduto}_${lote}`]: res.data,
                    ...(lote === "-" && { [codproduto]: res.data }),
                  }))

                  // Recarregar produtos sem endereço
                  const resProdutosSemEndereco = await api.get("/produtos/sem-endereco")
                  setProdutosSemEndereco(resProdutosSemEndereco.data)

                  setConfirmarExclusao(null)
                } catch (error) {
                  console.error("Erro ao excluir endereço:", error)
                  setErro("Erro ao excluir endereço. Por favor, tente novamente.")
                  setConfirmarExclusao(null)
                }
              }
            }}
            sx={{
              textTransform: "none",
              fontWeight: 500,
              boxShadow: "none",
              "&:hover": {
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              },
            }}
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
        <Box className="mb-6">
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600, color: corTopo, mb: 1 }}>
            Produtos
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Gerencie seus produtos e localizações
          </Typography>
        </Box>

        {/* Cards de Indicadores */}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, mb: 3 }}>
          <Card
            sx={{
              flex: "1 1 calc(20% - 24px)",
              minWidth: "200px",
              borderRadius: 2,
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <InventoryIcon sx={{ color: corTopo, mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Total de Produtos
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                {produtos.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {produtos.filter((p) => p.qtde_estoque > 0).length} com estoque disponível
              </Typography>
            </CardContent>
          </Card>

          <Card
            sx={{
              flex: "1 1 calc(20% - 24px)",
              minWidth: "200px",
              borderRadius: 2,
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
              border: "1px solid",
              borderColor: "divider",
              bgcolor: produtosSemEndereco.length > 0 ? alpha("#ff9800", 0.1) : undefined,
            }}
          >
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <LocationOffIcon sx={{ color: produtosSemEndereco.length > 0 ? "#ff9800" : corTopo, mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Sem Endereço
                </Typography>
              </Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  mb: 1,
                  color: produtosSemEndereco.length > 0 ? "#ff9800" : undefined,
                }}
              >
                {produtosSemEndereco.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Produtos com estoque sem localização
              </Typography>
            </CardContent>
          </Card>

          <Card
            sx={{
              flex: "1 1 calc(20% - 24px)",
              minWidth: "200px",
              borderRadius: 2,
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <LayersIcon sx={{ color: corTopo, mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Estoque Total
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                {produtos
                  .reduce((acc, p) => acc + (Number(p.qtde_estoque) || 0), 0)
                  .toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {produtos
                  .reduce((acc, p) => acc + (Number(p.qtde_disponivel) || 0), 0)
                  .toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                disponíveis
              </Typography>
            </CardContent>
          </Card>

          <Card
            sx={{
              flex: "1 1 calc(20% - 24px)",
              minWidth: "200px",
              borderRadius: 2,
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <ShoppingCartIcon sx={{ color: corTopo, mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Nível de Serviço
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                {calcularNivelServico().toFixed(2)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Produtos com facing e estoque
              </Typography>
            </CardContent>
          </Card>

          <Card
            sx={{
              flex: "1 1 calc(20% - 24px)",
              minWidth: "200px",
              borderRadius: 2,
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
              border: "1px solid",
              borderColor: "divider",
              bgcolor: produtosParaCompra().length > 0 ? alpha("#ff9800", 0.1) : undefined,
            }}
          >
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <WarningIcon sx={{ color: produtosParaCompra().length > 0 ? "#ff9800" : corTopo, mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Necessidade de Compra
                </Typography>
              </Box>
              <Typography
                variant="h4"
                sx={{ fontWeight: 700, mb: 1, color: produtosParaCompra().length > 0 ? "#ff9800" : undefined }}
              >
                {produtosParaCompra().length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Produtos com facing sem estoque
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* Barra de pesquisa */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Buscar por nome ou código"
              variant="outlined"
              fullWidth
              value={filtroDigitado}
              onChange={(e) => {
                setFiltroDigitado(e.target.value)
                setFiltro(e.target.value)
                setPagina(0)
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: carregandoTabela && (
                  <InputAdornment position="end">
                    <CircularProgress size={20} sx={{ color: corTopo }} />
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
            <Button
              variant="contained"
              startIcon={<ExportIcon />}
              onClick={exportarParaExcel}
              sx={{
                height: "56px",
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
              Exportar
            </Button>
          </Box>
        </Paper>

        {/* Abas para alternar entre tabela e gráficos */}
        <Paper
          sx={{
            mb: 3,
            borderRadius: 2,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Tabs
            value={abaAtiva}
            onChange={handleAbaChange}
            sx={{
              borderBottom: 1,
              borderColor: "divider",
              "& .MuiTab-root": { textTransform: "none" },
              "& .Mui-selected": { color: corTopo },
              "& .MuiTabs-indicator": { backgroundColor: corTopo },
            }}
          >
            <Tab label="Tabela de Produtos" />
            <Tab label="Gráficos e Análises" />
            <Tab label="Necessidade de Compra" />
            <Tab label="Produtos Sem Endereço" />
          </Tabs>

          {/* Conteúdo da Aba 1: Tabela de Produtos */}
          {abaAtiva === 0 && (
            <Box sx={{ p: 0 }}>
              <TableContainer
                component={Paper}
                sx={{
                  borderRadius: 0,
                  overflow: "hidden",
                  boxShadow: "none",
                  position: "relative",
                  minHeight: "300px",
                }}
              >
                {carregandoTabela && (
                  <Box
                    position="absolute"
                    top="0"
                    left="0"
                    width="100%"
                    height="100%"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    bgcolor="rgba(255, 255, 255, 0.7)"
                    zIndex={10}
                  >
                    <CircularProgress size={40} sx={{ color: corTopo }} />
                  </Box>
                )}
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#f3f4f6" }}>
                      <TableCell sx={{ width: 50, p: 1.5 }}></TableCell>
                      <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Código</TableCell>
                      <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Produto</TableCell>
                      <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Complemento</TableCell>
                      <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Unidade</TableCell>
                      <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Controla Lote</TableCell>
                      <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Cód. Barras</TableCell>
                      <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Referência</TableCell>
                      <TableCell align="right" sx={{ p: 1.5, fontWeight: 600 }}>
                        Facing
                      </TableCell>
                      <TableCell align="right" sx={{ p: 1.5, fontWeight: 600 }}>
                        Estoque
                      </TableCell>
                      <TableCell align="right" sx={{ p: 1.5, fontWeight: 600 }}>
                        Reserva
                      </TableCell>
                      <TableCell align="right" sx={{ p: 1.5, fontWeight: 600 }}>
                        Disponível
                      </TableCell>
                      <TableCell align="right" sx={{ p: 1.5, fontWeight: 600 }}>
                        Avaria
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {produtosFiltrados
                      .slice(pagina * linhasPorPagina, pagina * linhasPorPagina + linhasPorPagina)
                      .map((prod, index) => (
                        <React.Fragment key={prod.codproduto}>
                          <TableRow
                            hover
                            sx={{
                              "&:nth-of-type(even)": {
                                backgroundColor: alpha("#f3f4f6", 0.3),
                              },
                              transition: "background-color 0.2s",
                              backgroundColor:
                                prod.facing > 0 && prod.qtde_estoque <= 0 ? alpha("#ff9800", 0.1) : undefined,
                            }}
                          >
                            <TableCell sx={{ p: 1.5 }}>
                              <IconButton
                                size="small"
                                onClick={() => toggleProduto(prod)}
                                disabled={carregando[prod.codproduto]}
                                sx={{
                                  color: corTopo,
                                  transition: "transform 0.2s",
                                  transform: expandidoProduto[prod.codproduto] ? "rotate(180deg)" : "rotate(0deg)",
                                }}
                              >
                                {carregando[prod.codproduto] ? (
                                  <CircularProgress size={20} sx={{ color: corTopo }} />
                                ) : (
                                  <ExpandMore />
                                )}
                              </IconButton>
                            </TableCell>
                            <TableCell sx={{ p: 1.5 }}>{prod.codproduto}</TableCell>
                            <TableCell sx={{ p: 1.5, fontWeight: 500 }}>{prod.produto}</TableCell>
                            <TableCell sx={{ p: 1.5 }}>{prod.complemento}</TableCell>
                            <TableCell sx={{ p: 1.5 }}>{prod.unidade}</TableCell>
                            <TableCell sx={{ p: 1.5 }}>{prod.controla_lote}</TableCell>
                            <TableCell sx={{ p: 1.5 }}>{prod.codbarra}</TableCell>
                            <TableCell sx={{ p: 1.5 }}>{prod.referencia}</TableCell>
                            <TableCell align="right" sx={{ p: 1.5 }}>
                              {formatarNumero(prod.facing)}
                            </TableCell>
                            <TableCell align="right" sx={{ p: 1.5 }}>
                              {formatarNumero(prod.qtde_estoque)}
                            </TableCell>
                            <TableCell align="right" sx={{ p: 1.5 }}>
                              {formatarNumero(prod.qtde_reserva)}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                p: 1.5,
                                fontWeight: 600,
                                color: prod.qtde_disponivel > 0 ? "success.main" : "inherit",
                              }}
                            >
                              {formatarNumero(prod.qtde_disponivel)}
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                p: 1.5,
                                color: prod.qtde_avaria > 0 ? "error.main" : "inherit",
                              }}
                            >
                              {formatarNumero(prod.qtde_avaria)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell colSpan={12} sx={{ p: 0, borderBottom: 0 }}>
                              <Collapse in={expandidoProduto[prod.codproduto]} timeout="auto" unmountOnExit>
                                <Box sx={{ p: 3, backgroundColor: "#f9fafb" }}>
                                  {carregando[prod.codproduto] ? (
                                    <Box display="flex" justifyContent="center" alignItems="center" py={3}>
                                      <CircularProgress size={30} sx={{ color: corTopo }} />
                                    </Box>
                                  ) : prod.controla_lote === "Sim" ? (
                                    <>
                                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: corTopo }}>
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
                                        }}
                                      >
                                        <Table size="small">
                                          <TableHead>
                                            <TableRow sx={{ backgroundColor: "#f3f4f6" }}>
                                              <TableCell sx={{ width: 50, p: 1.5 }}></TableCell>
                                              <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Lote</TableCell>
                                              <TableCell align="right" sx={{ p: 1.5, fontWeight: 600 }}>
                                                Qtde Lote
                                              </TableCell>
                                              <TableCell align="right" sx={{ p: 1.5, fontWeight: 600 }}>
                                                Qtde Reserva
                                              </TableCell>
                                              <TableCell align="right" sx={{ p: 1.5, fontWeight: 600 }}>
                                                Qtde Disponível
                                              </TableCell>
                                            </TableRow>
                                          </TableHead>
                                          <TableBody>
                                            {lotesPorProduto[prod.codproduto]?.map((lote, loteIndex) => (
                                              <React.Fragment key={lote.lote}>
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
                                                      onClick={() => toggleLote(prod.codproduto, lote.lote)}
                                                      disabled={carregando[`${prod.codproduto}_${lote.lote}`]}
                                                      sx={{
                                                        color: corTopo,
                                                        transition: "transform 0.2s",
                                                        transform: expandidoLote[`${prod.codproduto}_${lote.lote}`]
                                                          ? "rotate(180deg)"
                                                          : "rotate(0deg)",
                                                      }}
                                                    >
                                                      {carregando[`${prod.codproduto}_${lote.lote}`] ? (
                                                        <CircularProgress size={20} sx={{ color: corTopo }} />
                                                      ) : (
                                                        <ExpandMore />
                                                      )}
                                                    </IconButton>
                                                  </TableCell>
                                                  <TableCell sx={{ p: 1.5, fontWeight: 500 }}>{lote.lote}</TableCell>
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
                                                      color: lote.qtde_disponivel > 0 ? "success.main" : "inherit",
                                                    }}
                                                  >
                                                    {formatarNumero(lote.qtde_disponivel)}
                                                  </TableCell>
                                                </TableRow>
                                                <TableRow>
                                                  <TableCell colSpan={6} sx={{ p: 0, borderBottom: 0 }}>
                                                    <Collapse
                                                      in={expandidoLote[`${prod.codproduto}_${lote.lote}`]}
                                                      timeout="auto"
                                                      unmountOnExit
                                                    >
                                                      <Box sx={{ p: 3, backgroundColor: "#f9fafb" }}>
                                                        <Typography
                                                          variant="subtitle2"
                                                          sx={{ fontWeight: 600, mb: 2, color: corTopo }}
                                                        >
                                                          Endereços do Lote
                                                        </Typography>
                                                        {carregando[`${prod.codproduto}_${lote.lote}`] ? (
                                                          <Box
                                                            display="flex"
                                                            justifyContent="center"
                                                            alignItems="center"
                                                            py={2}
                                                          >
                                                            <CircularProgress size={24} sx={{ color: corTopo }} />
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
                                                                {enderecosPorProduto[
                                                                  `${prod.codproduto}_${lote.lote}`
                                                                ]?.map((end, idx) => (
                                                                  <TableRow
                                                                    key={idx}
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
                                                                      <TableCell sx={{ p: 1.5 }}>{end.andar}</TableCell>
                                                                    )}
                                                                    {usa4Niveis && (
                                                                      <TableCell sx={{ p: 1.5 }}>{end.apto}</TableCell>
                                                                    )}
                                                                    <TableCell
                                                                      align="center"
                                                                      sx={{ p: 1.5, fontWeight: 500 }}
                                                                    >
                                                                      {formatarNumero(end.qtde)}
                                                                    </TableCell>
                                                                    <TableCell align="center" sx={{ p: 1.5 }}>
                                                                      <Tooltip title="Editar Quantidade">
                                                                        <IconButton
                                                                          size="small"
                                                                          color="primary"
                                                                          onClick={() =>
                                                                            abrirModalEditar(
                                                                              prod.codproduto,
                                                                              lote.lote,
                                                                              end.codendereco,
                                                                              end.qtde,
                                                                            )
                                                                          }
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
                                                                      <Tooltip title="Excluir Endereço">
                                                                        <IconButton
                                                                          size="small"
                                                                          color="error"
                                                                          onClick={() =>
                                                                            excluirEndereco(
                                                                              prod.codproduto,
                                                                              lote.lote,
                                                                              end.codendereco,
                                                                            )
                                                                          }
                                                                          sx={{
                                                                            "&:hover": {
                                                                              backgroundColor: alpha("#d32f2f", 0.1),
                                                                            },
                                                                          }}
                                                                        >
                                                                          <Delete fontSize="small" />
                                                                        </IconButton>
                                                                      </Tooltip>
                                                                    </TableCell>
                                                                  </TableRow>
                                                                ))}
                                                              </TableBody>
                                                            </Table>
                                                          </TableContainer>
                                                        )}
                                                        <Button
                                                          variant="contained"
                                                          size="small"
                                                          startIcon={<Add />}
                                                          onClick={() =>
                                                            abrirModalAdicionar(prod.codproduto, lote.lote)
                                                          }
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
                                                          Adicionar Endereço
                                                        </Button>
                                                      </Box>
                                                    </Collapse>
                                                  </TableCell>
                                                </TableRow>
                                              </React.Fragment>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </TableContainer>
                                    </>
                                  ) : (
                                    <>
                                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: corTopo }}>
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
                                              <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Endereço</TableCell>
                                              <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Rua</TableCell>
                                              <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Prédio</TableCell>
                                              {usa4Niveis && (
                                                <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Andar</TableCell>
                                              )}
                                              {usa4Niveis && (
                                                <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Apto</TableCell>
                                              )}
                                              <TableCell align="center" sx={{ p: 1.5, fontWeight: 600 }}>
                                                Qtde
                                              </TableCell>
                                              <TableCell align="center" sx={{ p: 1.5, fontWeight: 600 }}>
                                                Ações
                                              </TableCell>
                                            </TableRow>
                                          </TableHead>
                                          <TableBody>
                                            {enderecosPorProduto[prod.codproduto]?.map((end, idx) => (
                                              <TableRow
                                                key={idx}
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
                                                {usa4Niveis && <TableCell sx={{ p: 1.5 }}>{end.andar}</TableCell>}
                                                {usa4Niveis && <TableCell sx={{ p: 1.5 }}>{end.apto}</TableCell>}
                                                <TableCell align="center" sx={{ p: 1.5, fontWeight: 500 }}>
                                                  {formatarNumero(end.qtde)}
                                                </TableCell>
                                                <TableCell align="center" sx={{ p: 1.5 }}>
                                                  <Tooltip title="Editar Quantidade">
                                                    <IconButton
                                                      size="small"
                                                      color="primary"
                                                      onClick={() =>
                                                        abrirModalEditar(
                                                          prod.codproduto,
                                                          "-",
                                                          end.codendereco,
                                                          end.qtde,
                                                        )
                                                      }
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
                                                  <Tooltip title="Excluir Endereço">
                                                    <IconButton
                                                      size="small"
                                                      color="error"
                                                      onClick={() =>
                                                        excluirEndereco(prod.codproduto, "-", end.codendereco)
                                                      }
                                                      sx={{
                                                        "&:hover": {
                                                          backgroundColor: alpha("#d32f2f", 0.1),
                                                        },
                                                      }}
                                                    >
                                                      <Delete fontSize="small" />
                                                    </IconButton>
                                                  </Tooltip>
                                                </TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </TableContainer>
                                      <Button
                                        variant="contained"
                                        size="small"
                                        startIcon={<Add />}
                                        onClick={() => abrirModalAdicionar(prod.codproduto, "-")}
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
                                        Adicionar Endereço
                                      </Button>
                                    </>
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

              <Paper
                elevation={0}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  p: 1,
                  borderRadius: 0,
                  borderTop: "1px solid",
                  borderColor: "divider",
                }}
              >
                <TablePagination
                  component="div"
                  count={produtosFiltrados.length}
                  page={pagina}
                  onPageChange={(_, p) => setPagina(p)}
                  rowsPerPage={linhasPorPagina}
                  onRowsPerPageChange={(e) => {
                    setLinhasPorPagina(Number.parseInt(e.target.value, 10))
                    setPagina(0)
                  }}
                  rowsPerPageOptions={[5, 10, 25, 50]}
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
            </Box>
          )}

          {/* Conteúdo da Aba 2: Gráficos e Análises */}
          {abaAtiva === 1 && (
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                  {/* Gráfico 1: Distribuição de Produtos por Status (Estoque) */}
                  <Box sx={{ flex: "1 1 calc(33.333% - 16px)", minWidth: "300px" }}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: corTopo }}>
                      Distribuição por Estoque
                    </Typography>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        height: 300,
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={dadosGraficoProdutos}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            label={({ name, percent }) => `${name} (${percent.toFixed(1)}%)`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {dadosGraficoProdutos.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(value, name) => [`${value} produtos`, name]} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Paper>
                  </Box>

                  {/* Gráfico 2: Distribuição de Produtos por Reserva/Avaria */}
                  <Box sx={{ flex: "1 1 calc(33.333% - 16px)", minWidth: "300px" }}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: corTopo }}>
                      Distribuição por Reserva/Avaria
                    </Typography>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        height: 300,
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={dadosGraficoReservaAvaria}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            label={({ name, percent }) => `${name} (${percent.toFixed(1)}%)`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {dadosGraficoReservaAvaria.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(value, name) => [`${value} produtos`, name]} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Paper>
                  </Box>

                  {/* Gráfico 3: Produtos com Facing */}
                  <Box sx={{ flex: "1 1 calc(33.333% - 16px)", minWidth: "300px" }}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: corTopo }}>
                      Produtos com Facing
                    </Typography>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        height: 300,
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={dadosGraficoFacing}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            label={({ name, percent }) => `${name} (${percent.toFixed(1)}%)`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {dadosGraficoFacing.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS_FACING[index % COLORS_FACING.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(value, name) => [`${value} produtos`, name]} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Paper>
                  </Box>
                </Box>

                {/* Gráfico 4: Distribuição de Produtos por Faixa de Estoque */}
                <Box sx={{ width: "100%" }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: corTopo }}>
                    Distribuição de Produtos por Faixa de Estoque
                  </Typography>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      height: 400,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dadosGraficoEstoque}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Bar dataKey="quantidade" name="Quantidade de Produtos" fill={corTopo} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Paper>
                </Box>
              </Box>
            </Box>
          )}

          {/* Conteúdo da Aba 3: Necessidade de Compra */}
          {abaAtiva === 2 && (
            <Box sx={{ p: 3 }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: corTopo }}>
                  Produtos com Necessidade de Compra
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Lista de produtos com facing maior que zero, mas sem estoque disponível. Estes produtos afetam o nível
                  de serviço.
                </Typography>
              </Box>

              <TableContainer component={Paper} sx={{ boxShadow: "none", border: "1px solid", borderColor: "divider" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#f3f4f6" }}>
                      <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Código</TableCell>
                      <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Produto</TableCell>
                      <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Complemento</TableCell>
                      <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Unidade</TableCell>
                      <TableCell align="right" sx={{ p: 1.5, fontWeight: 600 }}>
                        Facing
                      </TableCell>
                      <TableCell align="right" sx={{ p: 1.5, fontWeight: 600 }}>
                        Estoque
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {produtosParaCompra().map((prod, index) => (
                      <TableRow
                        key={prod.codproduto}
                        hover
                        sx={{
                          "&:nth-of-type(even)": {
                            backgroundColor: alpha("#f3f4f6", 0.3),
                          },
                          backgroundColor: alpha("#ff9800", 0.1),
                        }}
                      >
                        <TableCell sx={{ p: 1.5 }}>{prod.codproduto}</TableCell>
                        <TableCell sx={{ p: 1.5, fontWeight: 500 }}>{prod.produto}</TableCell>
                        <TableCell sx={{ p: 1.5 }}>{prod.complemento}</TableCell>
                        <TableCell sx={{ p: 1.5 }}>{prod.unidade}</TableCell>
                        <TableCell align="right" sx={{ p: 1.5 }}>
                          {formatarNumero(prod.facing)}
                        </TableCell>
                        <TableCell align="right" sx={{ p: 1.5, color: "error.main" }}>
                          {formatarNumero(prod.qtde_estoque)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {produtosParaCompra().length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                          <Typography variant="body1" color="text.secondary">
                            Não há produtos com necessidade de compra no momento.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Conteúdo da Aba 4: Produtos Sem Endereço */}
          {abaAtiva === 3 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: corTopo }}>
                Produtos com Estoque Sem Localização
              </Typography>
              <TableContainer component={Paper} sx={{ boxShadow: "none", border: "1px solid", borderColor: "divider" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#f3f4f6" }}>
                      <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Código</TableCell>
                      <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Produto</TableCell>
                      <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Estoque</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {produtosSemEndereco.map((prod) => (
                      <TableRow
                        key={prod.codproduto}
                        hover
                        sx={{
                          "&:nth-of-type(even)": { backgroundColor: alpha("#f3f4f6", 0.3) },
                          backgroundColor: alpha("#ff9800", 0.1),
                        }}
                      >
                        <TableCell sx={{ p: 1.5 }}>{prod.codproduto}</TableCell>
                        <TableCell sx={{ p: 1.5, fontWeight: 500 }}>{prod.produto}</TableCell>
                        <TableCell align="right" sx={{ p: 1.5 }}>
                          {formatarNumero(prod.qtde_estoque)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {produtosSemEndereco.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                          <Typography variant="body1" color="text.secondary">
                            Nenhum produto com estoque sem localização.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Paper>

        {/* Modal Adicionar Endereço */}
        <Dialog
          open={modalAberto}
          onClose={() => setModalAberto(false)}
          PaperProps={{
            sx: {
              borderRadius: 2,
              maxWidth: 500,
            },
          }}
        >
          <DialogTitle sx={{ fontSize: "1.2rem", fontWeight: 500, pb: 1 }}>Adicionar Endereço</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            {erroModal && (
              <Alert
                severity="error"
                sx={{
                  mb: 2,
                  borderRadius: 1,
                }}
              >
                {erroModal}
              </Alert>
            )}
            <FormControl fullWidth margin="dense" variant="outlined">
              <InputLabel id="select-endereco-label">Endereço</InputLabel>
              <Select
                labelId="select-endereco-label"
                value={novoEndereco.codendereco}
                onChange={(e) => setNovoEndereco({ ...novoEndereco, codendereco: e.target.value })}
                label="Endereço"
                sx={{
                  borderRadius: 1,
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: corTopo,
                  },
                }}
              >
                {enderecosBase.map((end) => (
                  <MenuItem key={end.codendereco} value={end.codendereco}>
                    {usa4Niveis
                      ? `${end.codendereco} - Rua ${end.rua}, Prédio ${end.predio}, Andar ${end.andar || "-"}, Apto ${end.apto || "-"}`
                      : `${end.codendereco} - Rua ${end.rua}, Prédio ${end.predio}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              margin="dense"
              label="Quantidade"
              fullWidth
              type="number"
              value={novoEndereco.quantidade}
              onChange={(e) => setNovoEndereco({ ...novoEndereco, quantidade: e.target.value })}
              variant="outlined"
              sx={{
                mt: 2,
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
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setModalAberto(false)}
              sx={{
                textTransform: "none",
                fontWeight: 500,
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={adicionarEndereco}
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
              Adicionar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal Editar Quantidade */}
        <Dialog
          open={modalEditarAberto}
          onClose={() => setModalEditarAberto(false)}
          PaperProps={{
            sx: {
              borderRadius: 2,
              maxWidth: 500,
            },
          }}
        >
          <DialogTitle sx={{ fontSize: "1.2rem", fontWeight: 500, pb: 1 }}>Editar Quantidade</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            {erroModal && (
              <Alert
                severity="error"
                sx={{
                  mb: 2,
                  borderRadius: 1,
                }}
              >
                {erroModal}
              </Alert>
            )}
            <TextField
              margin="dense"
              label="Quantidade"
              fullWidth
              type="number"
              value={enderecoParaEditar.quantidade}
              onChange={(e) => setEnderecoParaEditar({ ...enderecoParaEditar, quantidade: e.target.value })}
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
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setModalEditarAberto(false)}
              sx={{
                textTransform: "none",
                fontWeight: 500,
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={editarEndereco}
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
      </Container>
    </Layout>
  )
}

export default Produtos
