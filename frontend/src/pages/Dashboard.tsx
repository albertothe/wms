"use client"

import { useState, useEffect, useContext } from "react"
import {
    Box,
    Typography,
    Paper,
    Container,
    Card,
    CardContent,
    CardHeader,
    Divider,
    CircularProgress,
    Button,
    List,
    ListItem,
    ListItemText,
    Chip,
    Tooltip,
    IconButton,
} from "@mui/material"
import {
    Refresh as RefreshIcon,
    Inventory as InventoryIcon,
    LocalShipping as LocalShippingIcon,
    Place as PlaceIcon,
    Assessment as AssessmentIcon,
    SwapHoriz as SwapHorizIcon,
    ShoppingCart as ShoppingCartIcon,
    Store as StoreIcon,
    Visibility as VisibilityIcon,
} from "@mui/icons-material"
import { useNavigate } from "react-router-dom"
import { Layout } from "../components/Layout"
import api from "../services/api"
import { useAuth, AuthContext } from "../contexts/AuthContext"

interface ConfiguracaoEmpresa {
    id_empresa: number
    nome_empresa: string
    cor_topo: string
    usa_4_niveis: boolean
    cod_cd: string
    categoria_inicial: string
    categoria_final: string
}

interface EstatisticasProdutos {
    total_produtos: number
    produtos_com_estoque: number
}

interface EstatisticasEnderecos {
    total_enderecos: number
    enderecos_ocupados: number
    total_produtos: number
}

interface EstatisticasPainelEntrada {
    total_notas: number
    total_transferencias: number
    total_compras: number
}

interface EstatisticasPainelSaida {
    total_prenotas: number
    total_transferencias: number
    total_vendas: number
}

interface EntradaRecente {
    nota: string
    emitente: string
    tipo: string
    data_emissao: string
    status: string
}

interface SaidaRecente {
    prenota: string
    cliente: string
    tipo: string
    data_emissao: string
    status: string
}

const Dashboard = () => {
    const { corTopo, nomeEmpresa } = useContext(AuthContext)
    const [configuracao, setConfiguracao] = useState<ConfiguracaoEmpresa>({
        id_empresa: 1,
        nome_empresa: "Sistema WMS",
        cor_topo: "#0a0a6b",
        usa_4_niveis: false,
        cod_cd: "00",
        categoria_inicial: "01001",
        categoria_final: "99999",
    })
    const [estatisticasProdutos, setEstatisticasProdutos] = useState<EstatisticasProdutos>({
        total_produtos: 0,
        produtos_com_estoque: 0,
    })
    const [estatisticasEnderecos, setEstatisticasEnderecos] = useState<EstatisticasEnderecos>({
        total_enderecos: 0,
        enderecos_ocupados: 0,
        total_produtos: 0,
    })
    const [estatisticasPainelEntrada, setEstatisticasPainelEntrada] = useState<EstatisticasPainelEntrada>({
        total_notas: 0,
        total_transferencias: 0,
        total_compras: 0,
    })
    const [estatisticasPainelSaida, setEstatisticasPainelSaida] = useState<EstatisticasPainelSaida>({
        total_prenotas: 0,
        total_transferencias: 0,
        total_vendas: 0,
    })
    const [entradasRecentes, setEntradasRecentes] = useState<EntradaRecente[]>([])
    const [saidasRecentes, setSaidasRecentes] = useState<SaidaRecente[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingEntradas, setLoadingEntradas] = useState(false)
    const [loadingSaidas, setLoadingSaidas] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const navigate = useNavigate()
    const { modulos } = useAuth()

    const carregarConfiguracoes = async () => {
        try {
            setError(null)
            console.log("Dashboard - Carregando configurações...")

            // Adicionar um timestamp para evitar cache
            const timestamp = new Date().getTime()
            const response = await api.get(`/configuracoes?_=${timestamp}`)

            console.log("Dashboard - Configurações carregadas:", response.data)

            if (response.data) {
                setConfiguracao(response.data)
            } else {
                console.warn("Dashboard - Configurações inválidas ou incompletas:", response.data)
                setError("Configurações inválidas ou incompletas")
            }
        } catch (error) {
            console.error("Erro ao carregar configurações:", error)
            setError("Erro ao carregar configurações")
        }
    }

    const carregarEstatisticas = async () => {
        try {
            setLoading(true)
            setError(null)
            console.log("Dashboard - Carregando estatísticas...")

            // Usar Promise.all com tratamento individual de erros
            const promises = [
                api.get("/dashboard/estatisticas/produtos").catch((err) => {
                    console.error("Erro ao carregar estatísticas de produtos:", err)
                    return null
                }),
                api.get("/dashboard/estatisticas/enderecos").catch((err) => {
                    console.error("Erro ao carregar estatísticas de endereços:", err)
                    return null
                }),
                api.get("/dashboard/estatisticas/painel-entrada").catch((err) => {
                    console.error("Erro ao carregar estatísticas do painel de entrada:", err)
                    return null
                }),
                api.get("/dashboard/estatisticas/painel-saida").catch((err) => {
                    console.error("Erro ao carregar estatísticas do painel de saída:", err)
                    return null
                }),
            ]

            const [produtosResponse, enderecosResponse, painelEntradaResponse, painelSaidaResponse] =
                await Promise.all(promises)

            // Processar resultados de produtos
            if (produtosResponse && produtosResponse.data) {
                console.log("Estatísticas de produtos:", produtosResponse.data)
                setEstatisticasProdutos(produtosResponse.data)
            }

            // Processar resultados de endereços
            if (enderecosResponse && enderecosResponse.data) {
                console.log("Estatísticas de endereços:", enderecosResponse.data)
                setEstatisticasEnderecos(enderecosResponse.data)
            }

            // Processar resultados do painel de entrada
            if (painelEntradaResponse && painelEntradaResponse.data) {
                console.log("Estatísticas do painel de entrada:", painelEntradaResponse.data)
                setEstatisticasPainelEntrada(painelEntradaResponse.data)
            }

            // Processar resultados do painel de saída
            if (painelSaidaResponse && painelSaidaResponse.data) {
                console.log("Estatísticas do painel de saída:", painelSaidaResponse.data)
                setEstatisticasPainelSaida(painelSaidaResponse.data)
            }

            console.log("Dashboard - Estatísticas carregadas com sucesso")
        } catch (error) {
            console.error("Erro ao carregar estatísticas:", error)
            setError("Erro ao carregar estatísticas")
        } finally {
            // Garantir que o loading seja definido como false, mesmo se houver erros
            setLoading(false)
        }
    }

    // Substituir as funções carregarEntradasRecentes e carregarSaidasRecentes por estas versões com melhor tratamento de datas:

    const carregarEntradasRecentes = async () => {
        try {
            setLoadingEntradas(true)
            console.log("Dashboard - Carregando entradas recentes...")

            const response = await api.get("/dashboard/entradas-recentes")
            console.log("Entradas recentes RAW:", response.data)

            // Remover duplicatas baseado na nota fiscal
            const entradasUnicas = response.data.filter(
                (entrada: EntradaRecente, index: number, self: EntradaRecente[]) =>
                    index === self.findIndex((e) => e.nota === entrada.nota),
            )

            console.log("Entradas únicas:", entradasUnicas)

            // Função para converter data em timestamp para ordenação
            const converterDataParaTimestamp = (dataStr: string): number => {
                // Tentar diferentes formatos de data
                let data: Date

                // Formato DD/MM/YYYY
                if (dataStr.includes("/")) {
                    const partes = dataStr.split("/")
                    if (partes.length === 3) {
                        data = new Date(Number.parseInt(partes[2]), Number.parseInt(partes[1]) - 1, Number.parseInt(partes[0]))
                    } else {
                        data = new Date(dataStr)
                    }
                }
                // Formato YYYY-MM-DD
                else if (dataStr.includes("-")) {
                    data = new Date(dataStr)
                }
                // Outros formatos
                else {
                    data = new Date(dataStr)
                }

                // Se a data é inválida, retornar 0 para colocar no final
                if (isNaN(data.getTime())) {
                    console.warn("Data inválida:", dataStr)
                    return 0
                }

                return data.getTime()
            }

            // Ordenar por data da mais recente para a mais antiga
            const entradasOrdenadas = entradasUnicas.sort((a: EntradaRecente, b: EntradaRecente) => {
                const timestampA = converterDataParaTimestamp(a.data_emissao)
                const timestampB = converterDataParaTimestamp(b.data_emissao)

                console.log(`Comparando: ${a.data_emissao} (${timestampA}) vs ${b.data_emissao} (${timestampB})`)

                return timestampB - timestampA // Ordem decrescente (mais recente primeiro)
            })

            console.log("Entradas ordenadas:", entradasOrdenadas)

            // Limitar a 5 entradas mais recentes
            setEntradasRecentes(entradasOrdenadas.slice(0, 5))
        } catch (error) {
            console.error("Erro ao carregar entradas recentes:", error)
        } finally {
            setLoadingEntradas(false)
        }
    }

    const carregarSaidasRecentes = async () => {
        try {
            setLoadingSaidas(true)
            console.log("Dashboard - Carregando saídas recentes...")

            const response = await api.get("/dashboard/saidas-recentes")
            console.log("Saídas recentes RAW:", response.data)

            // Remover duplicatas baseado na pré-nota
            const saidasUnicas = response.data.filter(
                (saida: SaidaRecente, index: number, self: SaidaRecente[]) =>
                    index === self.findIndex((s) => s.prenota === saida.prenota),
            )

            console.log("Saídas únicas:", saidasUnicas)

            // Função para converter data em timestamp para ordenação
            const converterDataParaTimestamp = (dataStr: string): number => {
                // Tentar diferentes formatos de data
                let data: Date

                // Formato DD/MM/YYYY
                if (dataStr.includes("/")) {
                    const partes = dataStr.split("/")
                    if (partes.length === 3) {
                        data = new Date(Number.parseInt(partes[2]), Number.parseInt(partes[1]) - 1, Number.parseInt(partes[0]))
                    } else {
                        data = new Date(dataStr)
                    }
                }
                // Formato YYYY-MM-DD
                else if (dataStr.includes("-")) {
                    data = new Date(dataStr)
                }
                // Outros formatos
                else {
                    data = new Date(dataStr)
                }

                // Se a data é inválida, retornar 0 para colocar no final
                if (isNaN(data.getTime())) {
                    console.warn("Data inválida:", dataStr)
                    return 0
                }

                return data.getTime()
            }

            // Ordenar por data da mais recente para a mais antiga
            const saidasOrdenadas = saidasUnicas.sort((a: SaidaRecente, b: SaidaRecente) => {
                const timestampA = converterDataParaTimestamp(a.data_emissao)
                const timestampB = converterDataParaTimestamp(b.data_emissao)

                console.log(`Comparando: ${a.data_emissao} (${timestampA}) vs ${b.data_emissao} (${timestampB})`)

                return timestampB - timestampA // Ordem decrescente (mais recente primeiro)
            })

            console.log("Saídas ordenadas:", saidasOrdenadas)

            // Limitar a 5 saídas mais recentes
            setSaidasRecentes(saidasOrdenadas.slice(0, 5))
        } catch (error) {
            console.error("Erro ao carregar saídas recentes:", error)
        } finally {
            setLoadingSaidas(false)
        }
    }

    useEffect(() => {
        const carregarDados = async () => {
            try {
                await carregarConfiguracoes()
                await carregarEstatisticas()
                await Promise.all([carregarEntradasRecentes(), carregarSaidasRecentes()])
            } catch (error) {
                console.error("Erro ao carregar dados:", error)
                setError("Erro ao carregar dados")
            } finally {
                // Garantir que o loading seja definido como false, mesmo se houver erros
                setLoading(false)
            }
        }

        carregarDados()

        // Definir um timeout de segurança para garantir que o loading seja definido como false
        const timeoutId = setTimeout(() => {
            if (loading) {
                console.log("Timeout de segurança acionado para evitar carregamento infinito")
                setLoading(false)
            }
        }, 10000) // 10 segundos

        return () => clearTimeout(timeoutId)
    }, [])

    const toggleSidebar = () => {
        setSidebarCollapsed(!sidebarCollapsed)
    }

    const handleNavigation = (rota: string) => {
        console.log("Dashboard - Navegando para:", rota)
        navigate(`/${rota}`)
    }

    // Função para atualizar os dados
    const atualizarDados = async () => {
        try {
            await Promise.all([carregarEstatisticas(), carregarEntradasRecentes(), carregarSaidasRecentes()])
        } catch (error) {
            console.error("Erro ao atualizar dados:", error)
            setError("Erro ao atualizar dados")
        } finally {
            // Garantir que o loading seja definido como false, mesmo se houver erros
            setLoading(false)
        }
    }

    // Função para obter a cor do chip de status
    const getStatusColor = (status: string) => {
        status = status.toLowerCase()
        if (status.includes("concluído") || status.includes("concluido") || status.includes("finalizado")) {
            return "success"
        } else if (status.includes("pendente") || status.includes("aguardando")) {
            return "warning"
        } else if (status.includes("cancelado") || status.includes("erro")) {
            return "error"
        } else {
            return "default"
        }
    }

    // Função para navegar para a página de detalhes da entrada
    const navegarParaEntrada = (nota: string) => {
        navigate(`/painel-entrada?nota=${nota}`)
    }

    // Função para navegar para a página de detalhes da saída
    const navegarParaSaida = (prenota: string) => {
        navigate(`/painel-saida?prenota=${prenota}`)
    }

    // Renderizar o componente mesmo se houver erro, apenas exibindo uma mensagem de erro
    return (
        <Layout collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} corTopo={corTopo} nomeEmpresa={nomeEmpresa}>
            <Container maxWidth="xl" sx={{ pt: 4 }}>
                <Box className="mb-6">
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 600, color: corTopo, mb: 1 }}>
                        Dashboard
                    </Typography>
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                        Visão geral do sistema e estatísticas
                    </Typography>
                </Box>

                {error && (
                    <Paper sx={{ p: 2, mb: 3, bgcolor: "error.light", color: "error.contrastText" }}>
                        <Typography>{error}</Typography>
                        <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
                            <Button variant="contained" onClick={atualizarDados}>
                                Tentar novamente
                            </Button>
                        </Box>
                    </Paper>
                )}

                {loading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                            <Typography variant="h5">Visão Geral</Typography>
                            <Button
                                variant="outlined"
                                startIcon={<RefreshIcon />}
                                onClick={atualizarDados}
                                sx={{ borderColor: corTopo, color: corTopo }}
                            >
                                Atualizar
                            </Button>
                        </Box>
                        <Divider sx={{ mb: 3 }} />

                        {/* Cards de estatísticas usando Flexbox em vez de Grid */}
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, mb: 3 }}>
                            {/* Card de Produtos */}
                            <Box sx={{ flex: "1 1 calc(25% - 24px)", minWidth: "250px" }}>
                                <Card sx={{ height: "100%" }}>
                                    <CardHeader title="Produtos" avatar={<InventoryIcon sx={{ color: corTopo }} />} sx={{ pb: 0 }} />
                                    <CardContent>
                                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                            <Box>
                                                <Typography variant="h3" align="center" sx={{ mb: 1 }}>
                                                    {estatisticasProdutos.total_produtos || 0}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" align="center">
                                                    Total de produtos cadastrados
                                                </Typography>
                                            </Box>
                                            <Divider />
                                            <Box>
                                                <Typography variant="h5" align="center" sx={{ mb: 1 }}>
                                                    {estatisticasProdutos.produtos_com_estoque || 0}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" align="center">
                                                    Produtos com estoque
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Box>

                            {/* Card de Endereços */}
                            <Box sx={{ flex: "1 1 calc(25% - 24px)", minWidth: "250px" }}>
                                <Card sx={{ height: "100%" }}>
                                    <CardHeader title="Endereços" avatar={<PlaceIcon sx={{ color: corTopo }} />} sx={{ pb: 0 }} />
                                    <CardContent>
                                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                            <Box>
                                                <Typography variant="h3" align="center" sx={{ mb: 1 }}>
                                                    {estatisticasEnderecos.total_enderecos || 0}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" align="center">
                                                    Total de endereços cadastrados
                                                </Typography>
                                            </Box>
                                            <Divider />
                                            <Box>
                                                <Typography variant="h5" align="center" sx={{ mb: 1 }}>
                                                    {estatisticasEnderecos.enderecos_ocupados || 0}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" align="center">
                                                    Endereços ocupados
                                                </Typography>
                                            </Box>
                                            <Divider />
                                            <Box>
                                                <Typography variant="h5" align="center" sx={{ mb: 1 }}>
                                                    {estatisticasEnderecos.total_produtos || 0}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" align="center">
                                                    Produtos distintos nos endereços
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Box>

                            {/* Card de Painel de Entradas */}
                            <Box sx={{ flex: "1 1 calc(25% - 24px)", minWidth: "250px" }}>
                                <Card sx={{ height: "100%" }}>
                                    <CardHeader
                                        title="Painel de Entradas"
                                        avatar={<LocalShippingIcon sx={{ color: corTopo }} />}
                                        sx={{ pb: 0 }}
                                    />
                                    <CardContent>
                                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                            <Box>
                                                <Typography variant="h3" align="center" sx={{ mb: 1 }}>
                                                    {estatisticasPainelEntrada.total_notas || 0}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" align="center">
                                                    Total de notas fiscais
                                                </Typography>
                                            </Box>
                                            <Divider />
                                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                                                <Box sx={{ flex: 1, p: 1 }}>
                                                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mb: 1 }}>
                                                        <SwapHorizIcon sx={{ color: corTopo, mr: 1 }} />
                                                        <Typography variant="h6" align="center">
                                                            {estatisticasPainelEntrada.total_transferencias || 0}
                                                        </Typography>
                                                    </Box>
                                                    <Typography variant="body2" color="text.secondary" align="center">
                                                        Transferências
                                                    </Typography>
                                                </Box>
                                                <Divider orientation="vertical" flexItem />
                                                <Box sx={{ flex: 1, p: 1 }}>
                                                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mb: 1 }}>
                                                        <ShoppingCartIcon sx={{ color: corTopo, mr: 1 }} />
                                                        <Typography variant="h6" align="center">
                                                            {estatisticasPainelEntrada.total_compras || 0}
                                                        </Typography>
                                                    </Box>
                                                    <Typography variant="body2" color="text.secondary" align="center">
                                                        Compras
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Box>

                            {/* Card de Painel de Saída */}
                            <Box sx={{ flex: "1 1 calc(25% - 24px)", minWidth: "250px" }}>
                                <Card sx={{ height: "100%" }}>
                                    <CardHeader
                                        title="Painel de Saída"
                                        avatar={<AssessmentIcon sx={{ color: corTopo }} />}
                                        sx={{ pb: 0 }}
                                    />
                                    <CardContent>
                                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                            <Box>
                                                <Typography variant="h3" align="center" sx={{ mb: 1 }}>
                                                    {estatisticasPainelSaida.total_prenotas || 0}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" align="center">
                                                    Total de pré-notas
                                                </Typography>
                                            </Box>
                                            <Divider />
                                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                                                <Box sx={{ flex: 1, p: 1 }}>
                                                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mb: 1 }}>
                                                        <SwapHorizIcon sx={{ color: corTopo, mr: 1 }} />
                                                        <Typography variant="h6" align="center">
                                                            {estatisticasPainelSaida.total_transferencias || 0}
                                                        </Typography>
                                                    </Box>
                                                    <Typography variant="body2" color="text.secondary" align="center">
                                                        Transferências
                                                    </Typography>
                                                </Box>
                                                <Divider orientation="vertical" flexItem />
                                                <Box sx={{ flex: 1, p: 1 }}>
                                                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mb: 1 }}>
                                                        <StoreIcon sx={{ color: corTopo, mr: 1 }} />
                                                        <Typography variant="h6" align="center">
                                                            {estatisticasPainelSaida.total_vendas || 0}
                                                        </Typography>
                                                    </Box>
                                                    <Typography variant="body2" color="text.secondary" align="center">
                                                        Vendas
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Box>
                        </Box>

                        {/* Cards de entradas e saídas recentes */}
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                            {/* Card de Entradas Recentes */}
                            <Box sx={{ flex: "1 1 45%", minWidth: "300px" }}>
                                <Card>
                                    <CardHeader
                                        title="Entradas Recentes"
                                        action={
                                            <Tooltip title="Atualizar entradas recentes">
                                                <IconButton onClick={carregarEntradasRecentes} disabled={loadingEntradas}>
                                                    {loadingEntradas ? <CircularProgress size={24} /> : <RefreshIcon />}
                                                </IconButton>
                                            </Tooltip>
                                        }
                                    />
                                    <CardContent>
                                        {entradasRecentes.length > 0 ? (
                                            <List>
                                                {entradasRecentes.map((entrada, index) => (
                                                    <ListItem
                                                        key={`entrada-${index}`}
                                                        divider={index < entradasRecentes.length - 1}
                                                        secondaryAction={
                                                            <Tooltip title="Ver detalhes">
                                                                <IconButton edge="end" onClick={() => navegarParaEntrada(entrada.nota)}>
                                                                    <VisibilityIcon />
                                                                </IconButton>
                                                            </Tooltip>
                                                        }
                                                    >
                                                        <ListItemText
                                                            primary={
                                                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                                    <Typography variant="body1" component="span">
                                                                        NF {entrada.nota}
                                                                    </Typography>
                                                                    <Chip
                                                                        label={entrada.status}
                                                                        size="small"
                                                                        color={getStatusColor(entrada.status)}
                                                                        sx={{ ml: 1 }}
                                                                    />
                                                                </Box>
                                                            }
                                                            secondary={
                                                                <Box>
                                                                    <Typography variant="body2" component="span">
                                                                        {entrada.emitente} - {entrada.tipo}
                                                                    </Typography>
                                                                    <Typography variant="body2" component="div" color="text.secondary">
                                                                        Data: {entrada.data_emissao}
                                                                    </Typography>
                                                                </Box>
                                                            }
                                                        />
                                                    </ListItem>
                                                ))}
                                            </List>
                                        ) : (
                                            <Typography variant="body2" color="text.secondary">
                                                {loadingEntradas ? "Carregando entradas recentes..." : "Nenhuma entrada recente encontrada."}
                                            </Typography>
                                        )}
                                    </CardContent>
                                </Card>
                            </Box>

                            {/* Card de Saídas Recentes */}
                            <Box sx={{ flex: "1 1 45%", minWidth: "300px" }}>
                                <Card>
                                    <CardHeader
                                        title="Saídas Recentes"
                                        action={
                                            <Tooltip title="Atualizar saídas recentes">
                                                <IconButton onClick={carregarSaidasRecentes} disabled={loadingSaidas}>
                                                    {loadingSaidas ? <CircularProgress size={24} /> : <RefreshIcon />}
                                                </IconButton>
                                            </Tooltip>
                                        }
                                    />
                                    <CardContent>
                                        {saidasRecentes.length > 0 ? (
                                            <List>
                                                {saidasRecentes.map((saida, index) => (
                                                    <ListItem
                                                        key={`saida-${index}`}
                                                        divider={index < saidasRecentes.length - 1}
                                                        secondaryAction={
                                                            <Tooltip title="Ver detalhes">
                                                                <IconButton edge="end" onClick={() => navegarParaSaida(saida.prenota)}>
                                                                    <VisibilityIcon />
                                                                </IconButton>
                                                            </Tooltip>
                                                        }
                                                    >
                                                        <ListItemText
                                                            primary={
                                                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                                    <Typography variant="body1" component="span">
                                                                        Pré-nota {saida.prenota}
                                                                    </Typography>
                                                                    <Chip
                                                                        label={saida.status}
                                                                        size="small"
                                                                        color={getStatusColor(saida.status)}
                                                                        sx={{ ml: 1 }}
                                                                    />
                                                                </Box>
                                                            }
                                                            secondary={
                                                                <Box>
                                                                    <Typography variant="body2" component="span">
                                                                        {saida.cliente} - {saida.tipo}
                                                                    </Typography>
                                                                    <Typography variant="body2" component="div" color="text.secondary">
                                                                        Data: {saida.data_emissao}
                                                                    </Typography>
                                                                </Box>
                                                            }
                                                        />
                                                    </ListItem>
                                                ))}
                                            </List>
                                        ) : (
                                            <Typography variant="body2" color="text.secondary">
                                                {loadingSaidas ? "Carregando saídas recentes..." : "Nenhuma saída recente encontrada."}
                                            </Typography>
                                        )}
                                    </CardContent>
                                </Card>
                            </Box>
                        </Box>
                    </Paper>
                )}
            </Container>
        </Layout>
    )
}

export default Dashboard
