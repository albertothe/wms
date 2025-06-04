"use client"

import type React from "react"

import { useState, useEffect, useMemo, useContext } from "react"
import {
  TextField,
  Button,
  Box,
  Typography,
  Container,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  TablePagination,
  InputAdornment,
  alpha,
  Stack,
  Chip,
  type SelectChangeEvent,
  Tooltip,
  // Grid, // Remova ou comente esta linha se Grid não for mais usado
  Card,
  CardContent,
  Divider,
  Tabs,
  Tab,
} from "@mui/material"
import {
  FileDownload as ExportIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Inventory as InventoryIcon,
  LocationOn as LocationIcon,
  Layers as LayersIcon,
  BarChart as ChartIcon,
} from "@mui/icons-material"
import api from "../services/api"
import { Layout } from "../components/Layout"
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
import { AuthContext } from "../contexts/AuthContext"

interface RelatorioEndereco {
  codendereco: string
  rua: string
  predio: string
  andar?: string
  apto?: string
  codproduto: string
  produto: string
  lote: string
  quantidade: number
}

interface EstatisticaEndereco {
  codendereco: string
  totalProdutos: number
  quantidadeTotal: number
  mediaQuantidade: number
}

interface EstatisticaRua {
  rua: string
  totalEnderecos: number
  totalProdutos: number
  quantidadeTotal: number
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658", "#8dd1e1"]

const RelatorioEnderecos = () => {
  const [relatorio, setRelatorio] = useState<RelatorioEndereco[]>([])
  const [carregando, setCarregando] = useState(true)
  const [usa4Niveis, setUsa4Niveis] = useState(false)
  const { corTopo, nomeEmpresa } = useContext(AuthContext)

  const [filtroRua, setFiltroRua] = useState("")
  const [filtroPredio, setFiltroPredio] = useState("")
  const [filtroAndar, setFiltroAndar] = useState("")
  const [filtroApto, setFiltroApto] = useState("")
  const [filtroProduto, setFiltroProduto] = useState("")
  const [filtroLote, setFiltroLote] = useState("")
  const [pagina, setPagina] = useState(0)
  const [linhasPorPagina, setLinhasPorPagina] = useState(20)
  const [abaAtiva, setAbaAtiva] = useState(0)

  const buscarConfiguracoes = async () => {
    try {
      const res = await api.get("/configuracoes")
      setUsa4Niveis(res.data.usa_4_niveis)
      // setCorTopo(res.data.cor_topo || "#0a0a6b") // Define a cor dinâmica
    } catch (error) {
      console.error("Erro ao buscar configurações:", error)
    }
  }

  const buscarRelatorio = async () => {
    try {
      const res = await api.get("/enderecos/relatorio")
      setRelatorio(res.data)
    } catch (error) {
      console.error("Erro ao carregar relatório:", error)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    async function carregarTudo() {
      await buscarConfiguracoes()
      await buscarRelatorio()
    }
    carregarTudo()
  }, [])

  const ruasUnicas = Array.from(new Set(relatorio.map((r) => r.rua)))
  const prediosUnicos = Array.from(
    new Set(relatorio.filter((r) => !filtroRua || r.rua === filtroRua).map((r) => r.predio)),
  )
  const andaresUnicos = Array.from(
    new Set(
      relatorio
        .filter((r) => (!filtroRua || r.rua === filtroRua) && (!filtroPredio || r.predio === filtroPredio))
        .map((r) => r.andar || ""),
    ),
  )
  const aptosUnicos = Array.from(
    new Set(
      relatorio
        .filter(
          (r) =>
            (!filtroRua || r.rua === filtroRua) &&
            (!filtroPredio || r.predio === filtroPredio) &&
            (!filtroAndar || r.andar === filtroAndar),
        )
        .map((r) => r.apto || ""),
    ),
  )
  const lotesUnicos = Array.from(new Set(relatorio.map((r) => r.lote)))

  const relatorioFiltrado = relatorio.filter(
    (item) =>
      (!filtroRua || item.rua === filtroRua) &&
      (!filtroPredio || item.predio === filtroPredio) &&
      (!filtroAndar || item.andar === filtroAndar) &&
      (!filtroApto || item.apto === filtroApto) &&
      (!filtroLote || item.lote === filtroLote) &&
      (item.produto.toLowerCase().includes(filtroProduto.toLowerCase()) || item.codproduto.includes(filtroProduto)),
  )

  // Estatísticas calculadas
  const estatisticasEnderecos = useMemo(() => {
    const enderecoMap = new Map<string, EstatisticaEndereco>()

    relatorioFiltrado.forEach((item) => {
      if (!enderecoMap.has(item.codendereco)) {
        enderecoMap.set(item.codendereco, {
          codendereco: item.codendereco,
          totalProdutos: 0,
          quantidadeTotal: 0,
          mediaQuantidade: 0,
        })
      }

      const estatistica = enderecoMap.get(item.codendereco)!
      estatistica.totalProdutos += 1
      estatistica.quantidadeTotal += Number(item.quantidade)
    })

    // Calcular médias
    enderecoMap.forEach((estatistica) => {
      estatistica.mediaQuantidade = estatistica.quantidadeTotal / estatistica.totalProdutos
    })

    return Array.from(enderecoMap.values())
      .sort((a, b) => b.quantidadeTotal - a.quantidadeTotal)
      .slice(0, 10) // Top 10 endereços
  }, [relatorioFiltrado])

  // Estatísticas por rua
  const estatisticasRuas = useMemo(() => {
    const ruaMap = new Map<string, EstatisticaRua>()

    relatorioFiltrado.forEach((item) => {
      if (!ruaMap.has(item.rua)) {
        ruaMap.set(item.rua, {
          rua: item.rua,
          totalEnderecos: 0,
          totalProdutos: 0,
          quantidadeTotal: 0,
        })
      }

      const estatistica = ruaMap.get(item.rua)!
      estatistica.totalProdutos += 1
      estatistica.quantidadeTotal += Number(item.quantidade)
    })

    // Contar endereços únicos por rua
    const enderecosUnicos = new Set<string>()
    relatorioFiltrado.forEach((item) => {
      enderecosUnicos.add(`${item.rua}-${item.codendereco}`)
    })

    enderecosUnicos.forEach((endereco) => {
      const rua = endereco.split("-")[0]
      if (ruaMap.has(rua)) {
        const estatistica = ruaMap.get(rua)!
        estatistica.totalEnderecos += 1
      }
    })

    return Array.from(ruaMap.values()).sort((a, b) => b.quantidadeTotal - a.quantidadeTotal)
  }, [relatorioFiltrado])

  // Dados para o gráfico de distribuição por rua
  const dadosGraficoRuas = useMemo(() => {
    return estatisticasRuas.map((item) => ({
      name: item.rua,
      quantidade: item.quantidadeTotal,
      enderecos: item.totalEnderecos,
      produtos: item.totalProdutos,
    }))
  }, [estatisticasRuas])

  // Dados para o gráfico de pizza de distribuição de produtos
  const dadosGraficoPizza = useMemo(() => {
    const produtosAgrupados = new Map<string, number>()

    relatorioFiltrado.forEach((item) => {
      if (!produtosAgrupados.has(item.codproduto)) {
        produtosAgrupados.set(item.codproduto, 0)
      }
      produtosAgrupados.set(item.codproduto, produtosAgrupados.get(item.codproduto)! + Number(item.quantidade))
    })

    // Pegar os top 5 produtos e agrupar o resto como "Outros"
    const produtosOrdenados = Array.from(produtosAgrupados.entries()).sort((a, b) => b[1] - a[1])

    const top5 = produtosOrdenados.slice(0, 5).map(([codigo, quantidade]) => {
      const produto = relatorioFiltrado.find((item) => item.codproduto === codigo)
      return {
        name: produto ? `${codigo} - ${produto.produto.substring(0, 15)}...` : codigo,
        value: quantidade,
      }
    })

    const outros = produtosOrdenados.slice(5).reduce((acc, [_, quantidade]) => acc + quantidade, 0)

    if (outros > 0) {
      top5.push({ name: "Outros", value: outros })
    }

    return top5
  }, [relatorioFiltrado])

  // Resumo geral
  const resumoGeral = useMemo(() => {
    const totalProdutos = relatorioFiltrado.length
    const totalQuantidade = relatorioFiltrado.reduce((acc, item) => acc + Number(item.quantidade), 0)
    const enderecosUnicos = new Set(relatorioFiltrado.map((item) => item.codendereco)).size
    const produtosUnicos = new Set(relatorioFiltrado.map((item) => item.codproduto)).size
    const lotesUnicos = new Set(relatorioFiltrado.map((item) => item.lote)).size

    return {
      totalProdutos,
      totalQuantidade,
      enderecosUnicos,
      produtosUnicos,
      lotesUnicos,
      mediaQuantidadePorEndereco: enderecosUnicos ? totalQuantidade / enderecosUnicos : 0,
    }
  }, [relatorioFiltrado])

  const exportarParaExcel = () => {
    const dadosConvertidos = relatorioFiltrado.map((item) => ({
      "Código do Endereço": item.codendereco,
      Rua: item.rua,
      Prédio: item.predio,
      ...(usa4Niveis ? { Andar: item.andar ?? "", Apto: item.apto ?? "" } : {}),
      Lote: item.lote,
      "Código do Produto": item.codproduto,
      Produto: item.produto,
      Quantidade: Number(item.quantidade).toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
    }))

    const planilha = XLSX.utils.json_to_sheet(dadosConvertidos)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, planilha, "Relatório")
    XLSX.writeFile(workbook, "relatorio_enderecos.xlsx")
  }

  const limparFiltros = () => {
    setFiltroRua("")
    setFiltroPredio("")
    setFiltroAndar("")
    setFiltroApto("")
    setFiltroProduto("")
    setFiltroLote("")
    setPagina(0)
  }

  const handleFiltroRuaChange = (event: SelectChangeEvent) => {
    setFiltroRua(event.target.value)
    setFiltroPredio("")
    setFiltroAndar("")
    setFiltroApto("")
  }

  const handleFiltroPredioChange = (event: SelectChangeEvent) => {
    setFiltroPredio(event.target.value)
    setFiltroAndar("")
    setFiltroApto("")
  }

  const handleFiltroAndarChange = (event: SelectChangeEvent) => {
    setFiltroAndar(event.target.value)
    setFiltroApto("")
  }

  const handleAbaChange = (_: React.SyntheticEvent, newValue: number) => {
    setAbaAtiva(newValue)
  }

  if (carregando) {
    return (
      <Layout>
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
            Relatório de Endereços
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Visualize, analise e exporte relatórios de produtos por endereço
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

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              <FormControl sx={{ minWidth: 200 }} size="small" variant="outlined">
                <InputLabel id="filtro-rua-label">Rua</InputLabel>
                <Select
                  labelId="filtro-rua-label"
                  value={filtroRua}
                  label="Rua"
                  onChange={handleFiltroRuaChange}
                  sx={{
                    borderRadius: 1,
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: corTopo,
                    },
                  }}
                >
                  <MenuItem value="">Todas</MenuItem>
                  {ruasUnicas.map((rua, i) => (
                    <MenuItem key={i} value={rua}>
                      {rua}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 200 }} size="small" variant="outlined" disabled={!filtroRua}>
                <InputLabel id="filtro-predio-label">Prédio</InputLabel>
                <Select
                  labelId="filtro-predio-label"
                  value={filtroPredio}
                  label="Prédio"
                  onChange={handleFiltroPredioChange}
                  sx={{
                    borderRadius: 1,
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: corTopo,
                    },
                  }}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {prediosUnicos.map((predio, i) => (
                    <MenuItem key={i} value={predio}>
                      {predio}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {usa4Niveis && (
                <FormControl sx={{ minWidth: 120 }} size="small" variant="outlined" disabled={!filtroPredio}>
                  <InputLabel id="filtro-andar-label">Andar</InputLabel>
                  <Select
                    labelId="filtro-andar-label"
                    value={filtroAndar}
                    label="Andar"
                    onChange={handleFiltroAndarChange}
                    sx={{
                      borderRadius: 1,
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: corTopo,
                      },
                    }}
                  >
                    <MenuItem value="">Todos</MenuItem>
                    {andaresUnicos.map((andar, i) => (
                      <MenuItem key={i} value={andar}>
                        {andar}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {usa4Niveis && (
                <FormControl sx={{ minWidth: 120 }} size="small" variant="outlined" disabled={!filtroAndar}>
                  <InputLabel id="filtro-apto-label">Apto</InputLabel>
                  <Select
                    labelId="filtro-apto-label"
                    value={filtroApto}
                    label="Apto"
                    onChange={(e) => setFiltroApto(e.target.value)}
                    sx={{
                      borderRadius: 1,
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: corTopo,
                      },
                    }}
                  >
                    <MenuItem value="">Todos</MenuItem>
                    {aptosUnicos.map((apto, i) => (
                      <MenuItem key={i} value={apto}>
                        {apto}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              <FormControl sx={{ minWidth: 150 }} size="small" variant="outlined">
                <InputLabel id="filtro-lote-label">Lote</InputLabel>
                <Select
                  labelId="filtro-lote-label"
                  value={filtroLote}
                  label="Lote"
                  onChange={(e) => setFiltroLote(e.target.value)}
                  sx={{
                    borderRadius: 1,
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: corTopo,
                    },
                  }}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {lotesUnicos.map((lote, i) => (
                    <MenuItem key={i} value={lote}>
                      {lote}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Produto/Código"
                variant="outlined"
                size="small"
                sx={{ minWidth: 200 }}
                value={filtroProduto}
                onChange={(e) => setFiltroProduto(e.target.value)}
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
              />

              <Box sx={{ display: "flex", gap: 1 }}>
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
                  Limpar
                </Button>

                <Tooltip title="Exportar dados filtrados para Excel">
                  <Button
                    variant="contained"
                    startIcon={<ExportIcon />}
                    onClick={exportarParaExcel}
                    sx={{
                      height: "40px",
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
                </Tooltip>
              </Box>
            </Box>
          </Stack>

          {(filtroRua || filtroPredio || filtroAndar || filtroApto || filtroLote || filtroProduto) && (
            <Box sx={{ mt: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
              {filtroRua && (
                <Chip
                  label={`Rua: ${filtroRua}`}
                  onDelete={() => setFiltroRua("")}
                  size="small"
                  sx={{ bgcolor: alpha(corTopo, 0.1) }}
                />
              )}
              {filtroPredio && (
                <Chip
                  label={`Prédio: ${filtroPredio}`}
                  onDelete={() => setFiltroPredio("")}
                  size="small"
                  sx={{ bgcolor: alpha(corTopo, 0.1) }}
                />
              )}
              {filtroAndar && (
                <Chip
                  label={`Andar: ${filtroAndar}`}
                  onDelete={() => setFiltroAndar("")}
                  size="small"
                  sx={{ bgcolor: alpha(corTopo, 0.1) }}
                />
              )}
              {filtroApto && (
                <Chip
                  label={`Apto: ${filtroApto}`}
                  onDelete={() => setFiltroApto("")}
                  size="small"
                  sx={{ bgcolor: alpha(corTopo, 0.1) }}
                />
              )}
              {filtroLote && (
                <Chip
                  label={`Lote: ${filtroLote}`}
                  onDelete={() => setFiltroLote("")}
                  size="small"
                  sx={{ bgcolor: alpha(corTopo, 0.1) }}
                />
              )}
              {filtroProduto && (
                <Chip
                  label={`Produto: ${filtroProduto}`}
                  onDelete={() => setFiltroProduto("")}
                  size="small"
                  sx={{ bgcolor: alpha(corTopo, 0.1) }}
                />
              )}
            </Box>
          )}
        </Paper>

        {/* Resumo Estatístico */}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, mb: 3 }}>
          <Card
            sx={{
              flex: "1 1 calc(25% - 24px)",
              minWidth: "240px",
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
                  Produtos
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                {resumoGeral.produtosUnicos}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Produtos únicos em {resumoGeral.enderecosUnicos} endereços
              </Typography>
            </CardContent>
          </Card>

          <Card
            sx={{
              flex: "1 1 calc(25% - 24px)",
              minWidth: "240px",
              borderRadius: 2,
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <LocationIcon sx={{ color: corTopo, mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Endereços
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                {resumoGeral.enderecosUnicos}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Endereços com produtos armazenados
              </Typography>
            </CardContent>
          </Card>

          <Card
            sx={{
              flex: "1 1 calc(25% - 24px)",
              minWidth: "240px",
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
                  Quantidade
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                {resumoGeral.totalQuantidade.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Itens em estoque ({resumoGeral.lotesUnicos} lotes)
              </Typography>
            </CardContent>
          </Card>

          <Card
            sx={{
              flex: "1 1 calc(25% - 24px)",
              minWidth: "240px",
              borderRadius: 2,
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <ChartIcon sx={{ color: corTopo, mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Média
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                {resumoGeral.mediaQuantidadePorEndereco.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Quantidade média por endereço
              </Typography>
            </CardContent>
          </Card>
        </Box>

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
            <Tab label="Tabela de Dados" />
            <Tab label="Estatísticas" />
            <Tab label="Gráficos" />
          </Tabs>

          {/* Conteúdo da Aba 1: Tabela de Dados */}
          {abaAtiva === 0 && (
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                  {relatorioFiltrado.length}{" "}
                  {relatorioFiltrado.length === 1 ? "registro encontrado" : "registros encontrados"}
                </Typography>
              </Box>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#f3f4f6" }}>
                      <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Código</TableCell>
                      <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Rua</TableCell>
                      <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Prédio</TableCell>
                      {usa4Niveis && <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Andar</TableCell>}
                      {usa4Niveis && <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Apto</TableCell>}
                      <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Lote</TableCell>
                      <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Cód. Produto</TableCell>
                      <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Produto</TableCell>
                      <TableCell align="right" sx={{ p: 1.5, fontWeight: 600 }}>
                        Quantidade
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {relatorioFiltrado
                      .slice(pagina * linhasPorPagina, pagina * linhasPorPagina + linhasPorPagina)
                      .map((item, idx) => (
                        <TableRow
                          key={idx}
                          hover
                          sx={{
                            "&:nth-of-type(even)": {
                              backgroundColor: alpha("#f3f4f6", 0.3),
                            },
                            transition: "background-color 0.2s",
                          }}
                        >
                          <TableCell sx={{ p: 1.5, fontWeight: 500 }}>{item.codendereco}</TableCell>
                          <TableCell sx={{ p: 1.5 }}>{item.rua}</TableCell>
                          <TableCell sx={{ p: 1.5 }}>{item.predio}</TableCell>
                          {usa4Niveis && <TableCell sx={{ p: 1.5 }}>{item.andar ?? ""}</TableCell>}
                          {usa4Niveis && <TableCell sx={{ p: 1.5 }}>{item.apto ?? ""}</TableCell>}
                          <TableCell sx={{ p: 1.5 }}>{item.lote}</TableCell>
                          <TableCell sx={{ p: 1.5 }}>{item.codproduto}</TableCell>
                          <TableCell sx={{ p: 1.5 }}>{item.produto}</TableCell>
                          <TableCell align="right" sx={{ p: 1.5, fontWeight: 500 }}>
                            {Number(item.quantidade).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
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
                  mt: 2,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <TablePagination
                  component="div"
                  count={relatorioFiltrado.length}
                  page={pagina}
                  onPageChange={(_, novaPagina) => setPagina(novaPagina)}
                  rowsPerPage={linhasPorPagina}
                  onRowsPerPageChange={(e) => {
                    setLinhasPorPagina(Number.parseInt(e.target.value, 10))
                    setPagina(0)
                  }}
                  rowsPerPageOptions={[10, 20, 50, 75]}
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

          {/* Conteúdo da Aba 2: Estatísticas */}
          {abaAtiva === 1 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: corTopo }}>
                Top 10 Endereços
              </Typography>

              <TableContainer sx={{ mb: 4 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#f3f4f6" }}>
                      <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Código do Endereço</TableCell>
                      <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Total de Produtos</TableCell>
                      <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Quantidade Total</TableCell>
                      <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Média por Produto</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {estatisticasEnderecos.map((item, idx) => (
                      <TableRow
                        key={idx}
                        hover
                        sx={{
                          "&:nth-of-type(even)": {
                            backgroundColor: alpha("#f3f4f6", 0.3),
                          },
                        }}
                      >
                        <TableCell sx={{ p: 1.5, fontWeight: 500 }}>{item.codendereco}</TableCell>
                        <TableCell sx={{ p: 1.5 }}>{item.totalProdutos}</TableCell>
                        <TableCell sx={{ p: 1.5 }}>
                          {item.quantidadeTotal.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell sx={{ p: 1.5 }}>
                          {item.mediaQuantidade.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: corTopo }}>
                Estatísticas por Rua
              </Typography>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#f3f4f6" }}>
                      <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Rua</TableCell>
                      <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Total de Endereços</TableCell>
                      <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Total de Produtos</TableCell>
                      <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Quantidade Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {estatisticasRuas.map((item, idx) => (
                      <TableRow
                        key={idx}
                        hover
                        sx={{
                          "&:nth-of-type(even)": {
                            backgroundColor: alpha("#f3f4f6", 0.3),
                          },
                        }}
                      >
                        <TableCell sx={{ p: 1.5, fontWeight: 500 }}>{item.rua}</TableCell>
                        <TableCell sx={{ p: 1.5 }}>{item.totalEnderecos}</TableCell>
                        <TableCell sx={{ p: 1.5 }}>{item.totalProdutos}</TableCell>
                        <TableCell sx={{ p: 1.5 }}>
                          {item.quantidadeTotal.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Conteúdo da Aba 3: Gráficos */}
          {abaAtiva === 2 && (
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                <Box sx={{ flex: "1 1 calc(60% - 12px)", minWidth: "300px" }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: corTopo }}>
                    Distribuição por Rua
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
                        data={dadosGraficoRuas}
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
                        <Bar dataKey="quantidade" name="Quantidade" fill={corTopo} />
                        <Bar dataKey="enderecos" name="Endereços" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Paper>
                </Box>
                <Box sx={{ flex: "1 1 calc(40% - 12px)", minWidth: "300px" }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: corTopo }}>
                    Distribuição por Produto
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
                      <PieChart>
                        <Pie
                          data={dadosGraficoPizza}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {dadosGraficoPizza.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Paper>
                </Box>
              </Box>
            </Box>
          )}
        </Paper>
      </Container>
    </Layout>
  )
}

export default RelatorioEnderecos
