//frontend/src/pages/
"use client"

import React, { useEffect, useState, useRef, useCallback } from "react"
import api from "../services/api"
import { Layout } from "../components/Layout"
import ImpressaoConferenciaCega from "../components/ImpressaoConferenciaCega"
import {
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Box,
    Container,
    IconButton,
    Tooltip,
    Collapse,
    TextField,
    Select,
    MenuItem,
    InputLabel,
    FormControl,
    CircularProgress,
    alpha,
    TablePagination,
    Stack,
    InputAdornment,
    Button,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    useMediaQuery,
    useTheme,
    Snackbar,
} from "@mui/material"
import {
    ExpandMore,
    Search as SearchIcon,
    FilterList as FilterIcon,
    Clear as ClearIcon,
    Print as PrintIcon,
    FileDownload as FileDownloadIcon,
    Add as AddIcon,
    Edit,
    Delete,
    Close as CloseIcon,
    Refresh as RefreshIcon,
} from "@mui/icons-material"
import * as XLSX from "xlsx"
import { useAuth } from "../contexts/AuthContext"

interface Lote {
    lote: string
    qtde_total: number
    vlr_unitario_medio?: number
    vlr_total?: number
}

interface ProdutoEntrada {
    codproduto: string
    produto: string
    qtde_entrada: number
    vlr_unitario: number
    vlr_total: number
    unidade: string
    controla_lote: string
    nota: string
    codloja: string
    emitente: string
    tipo: string
    status: string
    data: string
    op: string
    chave: string
}

interface EstoqueLocal {
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

const formatarNumero = (valor: number): string =>
    Number(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatarData = (data: string): string => {
    const partes = data.split("T")[0].split("-")
    if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`
    }
    return data
}

const formatarTempo = (segundos: number): string => {
    const minutos = Math.floor(segundos / 60)
    const segs = segundos % 60
    return `${minutos}:${segs.toString().padStart(2, "0")}`
}

const obterCorStatus = (status: string) => {
    switch (status) {
        case "CFC": // Conferência Concluída
            return {
                bgcolor: alpha("#4caf50", 0.1),
                color: "#2e7d32",
            }
        case "ACF": // Aguardando Conferência
            return {
                bgcolor: alpha("#ff9800", 0.1),
                color: "#e65100",
            }
        case "CFA": // Conferência em Andamento
            return {
                bgcolor: alpha("#2196f3", 0.1),
                color: "#1565c0",
            }
        case "CFD": // Conferência Divergente
            return {
                bgcolor: alpha("#f44336", 0.1),
                color: "#d32f2f",
            }
        default:
            return {
                bgcolor: alpha("#9e9e9e", 0.1),
                color: "#424242",
            }
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
        default:
            return status
    }
}

const PainelEntrada: React.FC = () => {
    const theme = useTheme()
    const { empresa } = useAuth()
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"))
    const impressaoRef = useRef<HTMLDivElement>(null)

    const [notas, setNotas] = useState<Record<string, ProdutoEntrada[]>>({})
    const [notasFiltradas, setNotasFiltradas] = useState<Record<string, ProdutoEntrada[]>>({})
    const [statusFiltro, setStatusFiltro] = useState("")
    const [tipoFiltro, setTipoFiltro] = useState("")
    const [emitenteFiltro, setEmitenteFiltro] = useState("")
    const [buscaNota, setBuscaNota] = useState("")
    const [pagina, setPagina] = useState(0)
    const [linhasPorPagina, setLinhasPorPagina] = useState(10)
    const [carregando, setCarregando] = useState(true)
    const [expandidoNota, setExpandidoNota] = useState<Record<string, boolean>>({})
    const [expandidoProduto, setExpandidoProduto] = useState<Record<string, boolean>>({})
    const [expandidoLote, setExpandidoLote] = useState<Record<string, boolean>>({})
    const [enderecosPorLote, setEnderecosPorLote] = useState<Record<string, EstoqueLocal[]>>({})
    const [lotesPorProduto, setLotesPorProduto] = useState<Record<string, Lote[]>>({})
    const [enderecosPorProduto, setEnderecosPorProduto] = useState<Record<string, EstoqueLocal[]>>({})
    const [enderecosBase, setEnderecosBase] = useState<EnderecoBase[]>([])
    const [corTopo, setCorTopo] = useState(empresa?.cor_topo || "#0a0a6b")
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [erro, setErro] = useState<string | null>(null)
    const [usa4Niveis, setUsa4Niveis] = useState(false)

    // Estados para auto-atualização
    const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null)
    const [proximaAtualizacao, setProximaAtualizacao] = useState<Date | null>(null)
    const [tempoRestante, setTempoRestante] = useState<number>(0)
    const [atualizandoManual, setAtualizandoManual] = useState(false)
    const [snackbarAberto, setSnackbarAberto] = useState(false)
    const [mensagemSnackbar, setMensagemSnackbar] = useState("")
    const [tipoSnackbar, setTipoSnackbar] = useState<"success" | "error">("success")

    // Estados para o modal de adicionar endereço
    const [modalAberto, setModalAberto] = useState(false)
    const [produtoSelecionado, setProdutoSelecionado] = useState<{ codproduto: string; lote: string }>({
        codproduto: "",
        lote: "",
    })
    const [novoEndereco, setNovoEndereco] = useState({ codendereco: "", quantidade: "" })
    const [erroModal, setErroModal] = useState("")

    // Estados para o modal de editar endereço
    const [modalEditarAberto, setModalEditarAberto] = useState(false)
    const [enderecoParaEditar, setEnderecoParaEditar] = useState<{ codendereco: string; quantidade: string }>({
        codendereco: "",
        quantidade: "",
    })

    // Estado para o modal de impressão
    const [modalImpressaoAberto, setModalImpressaoAberto] = useState(false)
    const [notaSelecionada, setNotaSelecionada] = useState<{
        nota: string
        data: string
        emitente: string
        produtos: ProdutoEntrada[]
    } | null>(null)

    const carregarNotas = useCallback(async (manual = false) => {
        if (manual) {
            setAtualizandoManual(true)
        } else {
            setCarregando(true)
        }

        try {
            const res = await api.get("/painel-entrada")
            const agrupado: Record<string, ProdutoEntrada[]> = {}
            res.data.forEach((item: ProdutoEntrada) => {
                const chave = `${item.data} | ${item.codloja} | ${item.op} | ${item.nota}`
                if (!agrupado[chave]) agrupado[chave] = []
                agrupado[chave].push(item)
            })
            setNotas(agrupado)

            const enderecosRes = await api.get("/enderecos")
            setEnderecosBase(enderecosRes.data)

            const agora = new Date()
            setUltimaAtualizacao(agora)
            const proxima = new Date(agora.getTime() + 5 * 60 * 1000) // 5 minutos
            setProximaAtualizacao(proxima)

            if (manual) {
                setMensagemSnackbar("Dados atualizados com sucesso!")
                setTipoSnackbar("success")
                setSnackbarAberto(true)
            }
        } catch (error) {
            console.error("Erro ao carregar notas:", error)
            if (manual) {
                setMensagemSnackbar("Erro ao atualizar dados. Tente novamente.")
                setTipoSnackbar("error")
                setSnackbarAberto(true)
            }
        } finally {
            setCarregando(false)
            setAtualizandoManual(false)
        }
    }, [])

    useEffect(() => {
        carregarNotas()
        const interval = setInterval(
            () => {
                console.log("🔄 Atualizando Painel de Entrada...")
                carregarNotas()
            },
            5 * 60 * 1000,
        ) // 5 minutos
        return () => clearInterval(interval)
    }, [carregarNotas])

    // Contador de tempo restante
    useEffect(() => {
        const interval = setInterval(() => {
            if (proximaAtualizacao) {
                const agora = new Date()
                const diferenca = proximaAtualizacao.getTime() - agora.getTime()
                setTempoRestante(Math.max(0, Math.floor(diferenca / 1000)))
            }
        }, 1000)

        return () => clearInterval(interval)
    }, [proximaAtualizacao])

    useEffect(() => {
        const filtrado: Record<string, ProdutoEntrada[]> = {}
        Object.entries(notas).forEach(([key, produtos]) => {
            const cabeca = produtos[0]
            const passaFiltro =
                (!statusFiltro || cabeca.status === statusFiltro) &&
                (!tipoFiltro || cabeca.tipo === tipoFiltro) &&
                (!emitenteFiltro || cabeca.emitente.toLowerCase().includes(emitenteFiltro.toLowerCase())) &&
                (!buscaNota || cabeca.nota.includes(buscaNota))
            if (passaFiltro) filtrado[key] = produtos
        })
        setNotasFiltradas(filtrado)
    }, [notas, statusFiltro, tipoFiltro, emitenteFiltro, buscaNota])

    const toggleNota = (key: string) => {
        setExpandidoNota((prev) => ({ ...prev, [key]: !prev[key] }))
    }

    const toggleProduto = async (codproduto: string, controlaLote: string, nota: string) => {
        const jaExpandido = expandidoProduto[codproduto]
        setExpandidoProduto((prev) => ({ ...prev, [codproduto]: !jaExpandido }))

        if (!jaExpandido) {
            if (controlaLote.toLowerCase() === "sim") {
                // Se controla lote, busca os lotes APENAS da view vs_wms_fpainel_entrada
                try {
                    // Usar a rota específica do painel de entrada para buscar lotes
                    const res = await api.get(`/painel-entrada/nota/${nota}/produto/${codproduto}/lotes`)
                    setLotesPorProduto((prev) => ({ ...prev, [codproduto]: res.data }))
                } catch (error) {
                    console.error(`Erro ao buscar lotes do produto ${codproduto}:`, error)
                }
            } else {
                // Se não controla lote, busca diretamente os endereços
                try {
                    const res = await api.get(`/enderecos/enderecos-por-produto/${codproduto}`)
                    setEnderecosPorProduto((prev) => ({ ...prev, [codproduto]: res.data }))
                } catch (error) {
                    console.error(`Erro ao buscar endereços do produto ${codproduto}:`, error)
                }
            }
        }
    }

    const toggleLote = async (codproduto: string, lote: string) => {
        const key = `${codproduto}_${lote}`
        const jaExpandido = expandidoLote[key]
        setExpandidoLote((prev) => ({ ...prev, [key]: !jaExpandido }))
        if (!jaExpandido && !enderecosPorLote[key]) {
            const res = await api.get(`/produtos/${codproduto}/enderecos-lote/${lote}`)
            setEnderecosPorLote((prev) => ({ ...prev, [key]: res.data }))
        }
    }

    // Função para abrir o modal de adicionar endereço
    const abrirModalAdicionar = (codproduto: string, lote: string) => {
        setProdutoSelecionado({ codproduto, lote })
        setNovoEndereco({ codendereco: "", quantidade: "" })
        setErroModal("")
        setModalAberto(true)
    }

    // Função para abrir o modal de editar endereço
    const abrirModalEditar = (codproduto: string, lote: string, codendereco: string, qtde: number) => {
        setProdutoSelecionado({ codproduto, lote })
        setEnderecoParaEditar({ codendereco, quantidade: qtde.toString() })
        setErroModal("")
        setModalEditarAberto(true)
    }

    // Função para adicionar endereço
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
        const enderecosExistentes = enderecosPorLote[chave] || enderecosPorProduto[codproduto] || []

        if (enderecosExistentes.some((e) => e.codendereco === codendereco)) {
            setErroModal("Este endereço já foi lançado para este produto. Edite o endereço existente se quiser alterar.")
            return
        }

        try {
            // Para produtos que não controlam lote, usamos um valor padrão para o lote
            const loteFinal = lote || "PADRAO"

            await api.post(`/produtos/${encodeURIComponent(codproduto)}/${encodeURIComponent(loteFinal)}`, {
                codendereco,
                qtde: quantidade,
            })

            // Atualizar a lista de endereços
            if (lote) {
                const res = await api.get(
                    `/produtos/${encodeURIComponent(codproduto)}/enderecos-lote/${encodeURIComponent(lote)}`,
                )
                setEnderecosPorLote((prev) => ({
                    ...prev,
                    [`${codproduto}_${lote}`]: res.data,
                }))
            } else {
                const res = await api.get(`/enderecos/enderecos-por-produto/${encodeURIComponent(codproduto)}`)
                setEnderecosPorProduto((prev) => ({
                    ...prev,
                    [codproduto]: res.data,
                }))
            }

            setModalAberto(false)
        } catch (error) {
            console.error("Erro ao adicionar endereço:", error)
            setErroModal("Erro ao adicionar endereço. Por favor, tente novamente.")
        }
    }

    // Função para editar endereço
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

        try {
            // Para produtos que não controlam lote, usamos um valor padrão para o lote
            const loteFinal = lote || "PADRAO"

            await api.put(
                `/produtos/${encodeURIComponent(codproduto)}/${encodeURIComponent(loteFinal)}/${encodeURIComponent(codendereco)}`,
                { qtde: quantidade },
            )

            // Atualizar a lista de endereços
            if (lote) {
                const res = await api.get(
                    `/produtos/${encodeURIComponent(codproduto)}/enderecos-lote/${encodeURIComponent(lote)}`,
                )
                setEnderecosPorLote((prev) => ({
                    ...prev,
                    [`${codproduto}_${lote}`]: res.data,
                }))
            } else {
                const res = await api.get(`/enderecos/enderecos-por-produto/${encodeURIComponent(codproduto)}`)
                setEnderecosPorProduto((prev) => ({
                    ...prev,
                    [codproduto]: res.data,
                }))
            }

            setModalEditarAberto(false)
        } catch (error) {
            console.error("Erro ao editar endereço:", error)
            setErroModal("Erro ao editar endereço. Por favor, tente novamente.")
        }
    }

    // Estado para confirmação de exclusão
    const [confirmarExclusao, setConfirmarExclusao] = useState<{
        aberto: boolean
        codproduto: string
        lote: string
        codendereco: string
    } | null>(null)

    // Função para excluir endereço
    const excluirEndereco = async (codproduto: string, lote: string, codendereco: string) => {
        setConfirmarExclusao({ aberto: true, codproduto, lote, codendereco })
    }

    // Função para abrir o modal de impressão
    const abrirModalImpressao = async (chave: string) => {
        const produtos = notasFiltradas[chave]
        if (produtos && produtos.length > 0) {
            const nota = produtos[0].nota
            const data = produtos[0].data
            const emitente = produtos[0].emitente

            // Carregar lotes para produtos que controlam lote
            for (const produto of produtos) {
                if (produto.controla_lote.toLowerCase() === "sim" && !lotesPorProduto[produto.codproduto]) {
                    try {
                        const res = await api.get(`/painel-entrada/nota/${nota}/produto/${produto.codproduto}/lotes`)
                        setLotesPorProduto((prev) => ({ ...prev, [produto.codproduto]: res.data }))
                    } catch (error) {
                        console.error(`Erro ao buscar lotes do produto ${produto.codproduto}:`, error)
                    }
                }
            }

            setNotaSelecionada({ nota, data, emitente, produtos })
            setModalImpressaoAberto(true)
        }
    }

    // Função para imprimir a conferência cega
    const imprimirConferenciaCega = () => {
        if (impressaoRef.current) {
            const conteudo = impressaoRef.current
            const janelaImpressao = window.open("", "_blank", "height=600,width=800")

            if (janelaImpressao) {
                janelaImpressao.document.write("<html><head><title>Conferência Cega</title>")
                janelaImpressao.document.write("<style>")
                janelaImpressao.document.write(`
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f3f4f6; font-weight: bold; }
          h1, h2, h3 { margin-top: 0; }
          .header { text-align: center; margin-bottom: 20px; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; }
          .signature { width: 45%; border-top: 1px solid #000; padding-top: 10px; text-align: center; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        `)
                janelaImpressao.document.write("</style></head><body>")
                janelaImpressao.document.write(conteudo.innerHTML)
                janelaImpressao.document.write("<script>window.onload = function() { window.print(); }</script>")
                janelaImpressao.document.write("</body></html>")
                janelaImpressao.document.close()
            }
        }

        setModalImpressaoAberto(false)
    }

    // Função para exportar para Excel usando XLSX
    const exportarParaExcel = async (chave: string) => {
        try {
            const produtos = notasFiltradas[chave]
            if (!produtos || produtos.length === 0) return

            const nota = produtos[0].nota
            const data = produtos[0].data
            const emitente = produtos[0].emitente
            const tipo = produtos[0].tipo
            const status = produtos[0].status
            const codloja = produtos[0].codloja
            const op = produtos[0].op

            // Criar workbook
            const wb = XLSX.utils.book_new()

            // Informações da nota
            const infoData = [
                ["INFORMAÇÕES DA NOTA DE ENTRADA"],
                ["Nota:", nota],
                ["Data:", formatarData(data)],
                ["Emitente:", emitente],
                ["Tipo:", tipo],
                ["Status:", status],
                ["Loja:", codloja],
                ["OP:", op],
            ]
            const wsInfo = XLSX.utils.aoa_to_sheet(infoData)
            XLSX.utils.book_append_sheet(wb, wsInfo, "Informações da Nota")

            // Produtos
            const produtosHeaders = [
                "Código",
                "Produto",
                "Unidade",
                "Controla Lote",
                "Qtde Entrada",
                "Vlr Unitário",
                "Vlr Total",
            ]
            const produtosData = produtos.map((produto) => [
                produto.codproduto,
                produto.produto,
                produto.unidade,
                produto.controla_lote,
                produto.qtde_entrada,
                produto.vlr_unitario,
                produto.vlr_total,
            ])
            const wsProdutos = XLSX.utils.aoa_to_sheet([produtosHeaders, ...produtosData])
            XLSX.utils.book_append_sheet(wb, wsProdutos, "Produtos")

            // Lotes (se houver produtos que controlam lote)
            const produtosComLote = produtos.filter((p) => p.controla_lote.toLowerCase() === "sim")
            if (produtosComLote.length > 0) {
                const lotesHeaders = ["Código Produto", "Produto", "Lote", "Qtde Total", "Vlr Unitário Médio", "Vlr Total"]
                const lotesData = []

                // Carregar lotes para cada produto
                for (const produto of produtosComLote) {
                    // Carregar lotes se ainda não estiverem carregados
                    if (!lotesPorProduto[produto.codproduto]) {
                        try {
                            const res = await api.get(`/painel-entrada/nota/${nota}/produto/${produto.codproduto}/lotes`)
                            lotesPorProduto[produto.codproduto] = res.data
                        } catch (error) {
                            console.error(`Erro ao buscar lotes do produto ${produto.codproduto}:`, error)
                            continue
                        }
                    }

                    const lotes = lotesPorProduto[produto.codproduto] || []
                    for (const lote of lotes) {
                        lotesData.push([
                            produto.codproduto,
                            produto.produto,
                            lote.lote,
                            lote.qtde_total,
                            lote.vlr_unitario_medio || 0,
                            lote.vlr_total || 0,
                        ])
                    }
                }

                if (lotesData.length > 0) {
                    const wsLotes = XLSX.utils.aoa_to_sheet([lotesHeaders, ...lotesData])
                    XLSX.utils.book_append_sheet(wb, wsLotes, "Lotes")
                }
            }

            // Endereços (se houver endereços carregados)
            const enderecosData = []
            const enderecosHeaders = usa4Niveis
                ? ["Código Produto", "Produto", "Lote", "Endereço", "Rua", "Prédio", "Andar", "Apto", "Quantidade"]
                : ["Código Produto", "Produto", "Lote", "Endereço", "Rua", "Prédio", "Quantidade"]

            // Adicionar endereços de produtos com lote
            for (const produto of produtosComLote) {
                const lotes = lotesPorProduto[produto.codproduto] || []
                for (const lote of lotes) {
                    const key = `${produto.codproduto}_${lote.lote}`
                    const enderecos = enderecosPorLote[key] || []
                    for (const endereco of enderecos) {
                        if (usa4Niveis) {
                            enderecosData.push([
                                produto.codproduto,
                                produto.produto,
                                lote.lote,
                                endereco.codendereco,
                                endereco.rua,
                                endereco.predio,
                                endereco.andar || "-",
                                endereco.apto || "-",
                                endereco.qtde,
                            ])
                        } else {
                            enderecosData.push([
                                produto.codproduto,
                                produto.produto,
                                lote.lote,
                                endereco.codendereco,
                                endereco.rua,
                                endereco.predio,
                                endereco.qtde,
                            ])
                        }
                    }
                }
            }

            // Adicionar endereços de produtos sem lote
            const produtosSemLote = produtos.filter((p) => p.controla_lote.toLowerCase() !== "sim")
            for (const produto of produtosSemLote) {
                const enderecos = enderecosPorProduto[produto.codproduto] || []
                for (const endereco of enderecos) {
                    if (usa4Niveis) {
                        enderecosData.push([
                            produto.codproduto,
                            produto.produto,
                            "PADRAO",
                            endereco.codendereco,
                            endereco.rua,
                            endereco.predio,
                            endereco.andar || "-",
                            endereco.apto || "-",
                            endereco.qtde,
                        ])
                    } else {
                        enderecosData.push([
                            produto.codproduto,
                            produto.produto,
                            "PADRAO",
                            endereco.codendereco,
                            endereco.rua,
                            endereco.predio,
                            endereco.qtde,
                        ])
                    }
                }
            }

            if (enderecosData.length > 0) {
                const wsEnderecos = XLSX.utils.aoa_to_sheet([enderecosHeaders, ...enderecosData])
                XLSX.utils.book_append_sheet(wb, wsEnderecos, "Endereços")
            }

            // Gerar o arquivo e fazer o download
            XLSX.writeFile(wb, `Nota_${nota}_${formatarData(data).replace(/\//g, "-")}.xlsx`)
        } catch (error) {
            console.error("Erro ao exportar para Excel:", error)
            alert("Erro ao exportar para Excel. Por favor, tente novamente.")
        }
    }

    const statusUnicos = Array.from(
        new Set(
            Object.values(notas)
                .flat()
                .map((n) => n.status),
        ),
    )
    const tiposUnicos = Array.from(
        new Set(
            Object.values(notas)
                .flat()
                .map((n) => n.tipo),
        ),
    )
    const emitentesUnicos = Array.from(
        new Set(
            Object.values(notas)
                .flat()
                .map((n) => n.emitente),
        ),
    )

    const handleChangePagina = (_: unknown, novaPagina: number) => setPagina(novaPagina)
    const handleChangeLinhasPorPagina = (event: React.ChangeEvent<HTMLInputElement>) => {
        setLinhasPorPagina(Number.parseInt(event.target.value, 10))
        setPagina(0)
    }

    const limparFiltros = () => {
        setStatusFiltro("")
        setTipoFiltro("")
        setEmitenteFiltro("")
        setBuscaNota("")
        setPagina(0)
    }

    if (carregando) {
        return (
            <Layout corTopo={corTopo} nomeEmpresa={empresa?.nome || "Sistema WMS"}>
                <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
                    <CircularProgress size={60} sx={{ color: corTopo }} />
                </Box>
            </Layout>
        )
    }

    return (
        <Layout corTopo={corTopo} nomeEmpresa={empresa?.nome || "Sistema WMS"}>
            <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
                <Box className="mb-6">
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 600, color: corTopo, mb: 1 }}>
                        Painel de Entrada - Notas Recebidas
                    </Typography>
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                        Gerencie as notas de entrada do sistema
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
                            label="Buscar por Nota"
                            variant="outlined"
                            size="small"
                            fullWidth
                            value={buscaNota}
                            onChange={(e) => setBuscaNota(e.target.value)}
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
                                <InputLabel id="emitente-label">Emitente</InputLabel>
                                <Select
                                    labelId="emitente-label"
                                    value={emitenteFiltro}
                                    label="Emitente"
                                    onChange={(e) => setEmitenteFiltro(e.target.value)}
                                    sx={{
                                        borderRadius: 1,
                                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                                            borderColor: corTopo,
                                        },
                                    }}
                                >
                                    <MenuItem value="">Todos</MenuItem>
                                    {emitentesUnicos.map((e, i) => (
                                        <MenuItem key={i} value={e}>
                                            {e}
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

                        {(statusFiltro || tipoFiltro || emitenteFiltro || buscaNota) && (
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
                                {emitenteFiltro && (
                                    <Chip
                                        label={`Emitente: ${emitenteFiltro}`}
                                        onDelete={() => setEmitenteFiltro("")}
                                        size="small"
                                        sx={{ bgcolor: alpha(corTopo, 0.1) }}
                                    />
                                )}
                                {buscaNota && (
                                    <Chip
                                        label={`Busca: ${buscaNota}`}
                                        onDelete={() => setBuscaNota("")}
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
                                label={`${Object.keys(notasFiltradas).length} ${Object.keys(notasFiltradas).length === 1 ? "nota" : "notas"}`}
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
                            {tempoRestante > 0 && (
                                <Typography variant="body2" color="text.secondary">
                                    Próxima em: {formatarTempo(tempoRestante)}
                                </Typography>
                            )}
                        </Box>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={atualizandoManual ? <CircularProgress size={16} /> : <RefreshIcon />}
                            onClick={() => carregarNotas(true)}
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
                        maxHeight: "calc(100vh - 250px)",
                    }}
                >
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow sx={{ backgroundColor: "#f3f4f6" }}>
                                <TableCell sx={{ width: 50, p: 1.5 }}></TableCell>
                                <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Nota</TableCell>
                                <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Data</TableCell>
                                <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Loja</TableCell>
                                <TableCell sx={{ p: 1.5, fontWeight: 600 }}>OP</TableCell>
                                <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Tipo</TableCell>
                                <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Status</TableCell>
                                <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Emitente</TableCell>
                                <TableCell align="center" sx={{ p: 1.5, fontWeight: 600 }}>
                                    Ações
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {Object.entries(notasFiltradas)
                                .slice(pagina * linhasPorPagina, pagina * linhasPorPagina + linhasPorPagina)
                                .map(([chave, produtos], idx) => (
                                    <React.Fragment key={chave}>
                                        <TableRow
                                            hover
                                            sx={{
                                                "&:nth-of-type(even)": {
                                                    backgroundColor: alpha("#f3f4f6", 0.3),
                                                },
                                                transition: "background-color 0.2s",
                                            }}
                                        >
                                            <TableCell sx={{ p: 1.5 }}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => toggleNota(chave)}
                                                    sx={{
                                                        color: corTopo,
                                                        transition: "transform 0.2s",
                                                        transform: expandidoNota[chave] ? "rotate(180deg)" : "rotate(0deg)",
                                                    }}
                                                >
                                                    <ExpandMore />
                                                </IconButton>
                                            </TableCell>
                                            <TableCell sx={{ p: 1.5, fontWeight: 500 }}>{produtos[0].nota}</TableCell>
                                            <TableCell sx={{ p: 1.5 }}>{formatarData(produtos[0].data)}</TableCell>
                                            <TableCell sx={{ p: 1.5 }}>{produtos[0].codloja}</TableCell>
                                            <TableCell sx={{ p: 1.5 }}>{produtos[0].op}</TableCell>
                                            <TableCell sx={{ p: 1.5 }}>{produtos[0].tipo}</TableCell>
                                            <TableCell sx={{ p: 1.5 }}>
                                                <Tooltip title={obterDescricaoStatus(produtos[0].status)} arrow>
                                                    <Chip
                                                        label={produtos[0].status}
                                                        size="small"
                                                        sx={{
                                                            ...obterCorStatus(produtos[0].status),
                                                            fontWeight: 500,
                                                            cursor: "help",
                                                        }}
                                                    />
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell sx={{ p: 1.5 }}>{produtos[0].emitente}</TableCell>
                                            <TableCell align="center" sx={{ p: 1.5 }}>
                                                <Box display="flex" gap={1} justifyContent="center">
                                                    <Tooltip title="Imprimir Conferência Cega">
                                                        <IconButton
                                                            size="small"
                                                            color="primary"
                                                            onClick={() => abrirModalImpressao(chave)}
                                                            sx={{
                                                                color: corTopo,
                                                                "&:hover": {
                                                                    backgroundColor: alpha(corTopo, 0.1),
                                                                },
                                                            }}
                                                        >
                                                            <PrintIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Exportar para Excel">
                                                        <IconButton
                                                            size="small"
                                                            color="primary"
                                                            onClick={() => exportarParaExcel(chave)}
                                                            sx={{
                                                                color: corTopo,
                                                                "&:hover": {
                                                                    backgroundColor: alpha(corTopo, 0.1),
                                                                },
                                                            }}
                                                        >
                                                            <FileDownloadIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell colSpan={9} sx={{ p: 0, borderBottom: 0 }}>
                                                <Collapse in={expandidoNota[chave]} timeout="auto" unmountOnExit>
                                                    <Box sx={{ p: 3, backgroundColor: "#f9fafb" }}>
                                                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: corTopo }}>
                                                            Produtos da Nota
                                                        </Typography>
                                                        <Table size="small">
                                                            <TableHead>
                                                                <TableRow sx={{ backgroundColor: "#f3f4f6" }}>
                                                                    <TableCell sx={{ width: 50, p: 1.5 }}></TableCell>
                                                                    <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Cód. Produto</TableCell>
                                                                    <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Produto</TableCell>
                                                                    <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Unidade</TableCell>
                                                                    <TableCell align="right" sx={{ p: 1.5, fontWeight: 600 }}>
                                                                        Qtde Entrada
                                                                    </TableCell>
                                                                    <TableCell align="right" sx={{ p: 1.5, fontWeight: 600 }}>
                                                                        Vlr Unitário
                                                                    </TableCell>
                                                                    <TableCell align="right" sx={{ p: 1.5, fontWeight: 600 }}>
                                                                        Vlr Total
                                                                    </TableCell>
                                                                </TableRow>
                                                            </TableHead>
                                                            <TableBody>
                                                                {produtos.map((prod, i) => (
                                                                    <React.Fragment key={prod.codproduto + prod.nota}>
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
                                                                                    onClick={() => toggleProduto(prod.codproduto, prod.controla_lote, prod.nota)}
                                                                                    sx={{
                                                                                        color: corTopo,
                                                                                        transition: "transform 0.2s",
                                                                                        transform: expandidoProduto[prod.codproduto]
                                                                                            ? "rotate(180deg)"
                                                                                            : "rotate(0deg)",
                                                                                    }}
                                                                                >
                                                                                    <ExpandMore />
                                                                                </IconButton>
                                                                            </TableCell>
                                                                            <TableCell sx={{ p: 1.5 }}>{prod.codproduto}</TableCell>
                                                                            <TableCell sx={{ p: 1.5, fontWeight: 500 }}>{prod.produto}</TableCell>
                                                                            <TableCell sx={{ p: 1.5 }}>{prod.unidade}</TableCell>
                                                                            <TableCell align="right" sx={{ p: 1.5 }}>
                                                                                {formatarNumero(prod.qtde_entrada)}
                                                                            </TableCell>
                                                                            <TableCell align="right" sx={{ p: 1.5 }}>
                                                                                {formatarNumero(prod.vlr_unitario)}
                                                                            </TableCell>
                                                                            <TableCell align="right" sx={{ p: 1.5 }}>
                                                                                {formatarNumero(prod.vlr_total)}
                                                                            </TableCell>
                                                                        </TableRow>
                                                                        <TableRow>
                                                                            <TableCell colSpan={8} sx={{ p: 0, border: 0 }}>
                                                                                <Collapse in={expandidoProduto[prod.codproduto]} timeout="auto" unmountOnExit>
                                                                                    <Box sx={{ p: 2, backgroundColor: "#f0f2f5" }}>
                                                                                        {prod.controla_lote.toLowerCase() === "sim" ? (
                                                                                            // Se controla lote, mostra os lotes
                                                                                            <>
                                                                                                <Typography
                                                                                                    variant="subtitle2"
                                                                                                    sx={{ fontWeight: 600, mb: 2, color: corTopo }}
                                                                                                >
                                                                                                    Lotes do Produto
                                                                                                </Typography>
                                                                                                <Table size="small">
                                                                                                    <TableHead>
                                                                                                        <TableRow sx={{ backgroundColor: "#f3f4f6" }}>
                                                                                                            <TableCell sx={{ width: 50, p: 1.5 }}></TableCell>
                                                                                                            <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Lote</TableCell>
                                                                                                            <TableCell align="right" sx={{ p: 1.5, fontWeight: 600 }}>
                                                                                                                Qtde Lote
                                                                                                            </TableCell>
                                                                                                        </TableRow>
                                                                                                    </TableHead>
                                                                                                    <TableBody>
                                                                                                        {lotesPorProduto[prod.codproduto]?.map((lote, idx) => (
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
                                                                                                                            sx={{
                                                                                                                                color: corTopo,
                                                                                                                                transition: "transform 0.2s",
                                                                                                                                transform: expandidoLote[
                                                                                                                                    `${prod.codproduto}_${lote.lote}`
                                                                                                                                ]
                                                                                                                                    ? "rotate(180deg)"
                                                                                                                                    : "rotate(0deg)",
                                                                                                                            }}
                                                                                                                        >
                                                                                                                            <ExpandMore />
                                                                                                                        </IconButton>
                                                                                                                    </TableCell>
                                                                                                                    <TableCell sx={{ p: 1.5, fontWeight: 500 }}>
                                                                                                                        {lote.lote}
                                                                                                                    </TableCell>
                                                                                                                    <TableCell align="right" sx={{ p: 1.5 }}>
                                                                                                                        {formatarNumero(lote.qtde_total)}
                                                                                                                    </TableCell>
                                                                                                                </TableRow>
                                                                                                                <TableRow>
                                                                                                                    <TableCell colSpan={3} sx={{ p: 0, border: 0 }}>
                                                                                                                        <Collapse
                                                                                                                            in={expandidoLote[`${prod.codproduto}_${lote.lote}`]}
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
                                                                                                                                {(enderecosPorLote[`${prod.codproduto}_${lote.lote}`]
                                                                                                                                    ?.length || 0) > 0 ? (
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
                                                                                                                                                    <TableCell sx={{ p: 1.5, fontWeight: 600 }}>
                                                                                                                                                        Endereço
                                                                                                                                                    </TableCell>
                                                                                                                                                    <TableCell sx={{ p: 1.5, fontWeight: 600 }}>
                                                                                                                                                        Rua
                                                                                                                                                    </TableCell>
                                                                                                                                                    <TableCell sx={{ p: 1.5, fontWeight: 600 }}>
                                                                                                                                                        Prédio
                                                                                                                                                    </TableCell>
                                                                                                                                                    <TableCell
                                                                                                                                                        align="right"
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
                                                                                                                                                    enderecosPorLote[
                                                                                                                                                    `${prod.codproduto}_${lote.lote}`
                                                                                                                                                    ] || []
                                                                                                                                                ).map((end, k) => (
                                                                                                                                                    <TableRow
                                                                                                                                                        key={k}
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
                                                                                                                                                        <TableCell sx={{ p: 1.5 }}>
                                                                                                                                                            {end.rua}
                                                                                                                                                        </TableCell>
                                                                                                                                                        <TableCell sx={{ p: 1.5 }}>
                                                                                                                                                            {end.predio}
                                                                                                                                                        </TableCell>
                                                                                                                                                        <TableCell
                                                                                                                                                            align="right"
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
                                                                                                                                                                            backgroundColor: alpha(
                                                                                                                                                                                corTopo,
                                                                                                                                                                                0.1,
                                                                                                                                                                            ),
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
                                                                                                                                                                            backgroundColor: alpha(
                                                                                                                                                                                "#d32f2f",
                                                                                                                                                                                0.1,
                                                                                                                                                                            ),
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
                                                                                                                                ) : (
                                                                                                                                    <Typography variant="body2" color="text.secondary">
                                                                                                                                        Nenhum endereço encontrado para este lote.
                                                                                                                                    </Typography>
                                                                                                                                )}
                                                                                                                                <Box
                                                                                                                                    sx={{
                                                                                                                                        display: "flex",
                                                                                                                                        justifyContent: "flex-start",
                                                                                                                                        mt: 2,
                                                                                                                                    }}
                                                                                                                                >
                                                                                                                                    <Button
                                                                                                                                        variant="contained"
                                                                                                                                        size="small"
                                                                                                                                        startIcon={<AddIcon />}
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
                                                                                                                            </Box>
                                                                                                                        </Collapse>
                                                                                                                    </TableCell>
                                                                                                                </TableRow>
                                                                                                            </React.Fragment>
                                                                                                        ))}
                                                                                                        {(!lotesPorProduto[prod.codproduto] ||
                                                                                                            lotesPorProduto[prod.codproduto].length === 0) && (
                                                                                                                <TableRow>
                                                                                                                    <TableCell colSpan={3} sx={{ textAlign: "center", p: 2 }}>
                                                                                                                        <Typography variant="body2" color="text.secondary">
                                                                                                                            Nenhum lote encontrado para este produto.
                                                                                                                        </Typography>
                                                                                                                    </TableCell>
                                                                                                                </TableRow>
                                                                                                            )}
                                                                                                    </TableBody>
                                                                                                </Table>
                                                                                            </>
                                                                                        ) : (
                                                                                            // Se não controla lote, mostra diretamente os endereços
                                                                                            <>
                                                                                                <Typography
                                                                                                    variant="subtitle2"
                                                                                                    sx={{ fontWeight: 600, mb: 2, color: corTopo }}
                                                                                                >
                                                                                                    Endereços do Produto
                                                                                                </Typography>
                                                                                                {(enderecosPorProduto[prod.codproduto]?.length || 0) > 0 ? (
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
                                                                                                                    <TableCell sx={{ p: 1.5, fontWeight: 600 }}>
                                                                                                                        Endereço
                                                                                                                    </TableCell>
                                                                                                                    <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Rua</TableCell>
                                                                                                                    <TableCell sx={{ p: 1.5, fontWeight: 600 }}>Prédio</TableCell>
                                                                                                                    <TableCell align="right" sx={{ p: 1.5, fontWeight: 600 }}>
                                                                                                                        Qtde
                                                                                                                    </TableCell>
                                                                                                                    <TableCell align="center" sx={{ p: 1.5, fontWeight: 600 }}>
                                                                                                                        Ações
                                                                                                                    </TableCell>
                                                                                                                </TableRow>
                                                                                                            </TableHead>
                                                                                                            <TableBody>
                                                                                                                {(enderecosPorProduto[prod.codproduto] || []).map((end, k) => (
                                                                                                                    <TableRow
                                                                                                                        key={k}
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
                                                                                                                        <TableCell align="right" sx={{ p: 1.5, fontWeight: 500 }}>
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
                                                                                                                                            "",
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
                                                                                                                                            "",
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
                                                                                                ) : (
                                                                                                    <Typography variant="body2" color="text.secondary">
                                                                                                        Nenhum endereço encontrado para este produto.
                                                                                                    </Typography>
                                                                                                )}
                                                                                                <Box sx={{ display: "flex", justifyContent: "flex-start", mt: 2 }}>
                                                                                                    <Button
                                                                                                        variant="contained"
                                                                                                        size="small"
                                                                                                        startIcon={<AddIcon />}
                                                                                                        onClick={() => abrirModalAdicionar(prod.codproduto, "")}
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
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: "divider",
                    }}
                >
                    <TablePagination
                        component="div"
                        count={Object.keys(notasFiltradas).length}
                        page={pagina}
                        onPageChange={handleChangePagina}
                        rowsPerPage={linhasPorPagina}
                        onRowsPerPageChange={handleChangeLinhasPorPagina}
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
                                        {`${end.codendereco} - Rua ${end.rua}, Prédio ${end.predio}`}
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

                {/* Dialog de Confirmação de Exclusão */}
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
                                        // Para produtos que não controlam lote, usamos um valor padrão para o lote
                                        const loteFinal = lote || "PADRAO"

                                        await api.delete(
                                            `/produtos/${encodeURIComponent(codproduto)}/${encodeURIComponent(loteFinal)}/${encodeURIComponent(codendereco)}`,
                                        )

                                        // Atualizar a lista de endereços
                                        if (lote) {
                                            const res = await api.get(
                                                `/produtos/${encodeURIComponent(codproduto)}/enderecos-lote/${encodeURIComponent(lote)}`,
                                            )
                                            setEnderecosPorLote((prev) => ({
                                                ...prev,
                                                [`${codproduto}_${lote}`]: res.data,
                                            }))
                                        } else {
                                            const res = await api.get(`/enderecos/enderecos-por-produto/${encodeURIComponent(codproduto)}`)
                                            setEnderecosPorProduto((prev) => ({
                                                ...prev,
                                                [codproduto]: res.data,
                                            }))
                                        }

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

                {/* Modal de Impressão */}
                <Dialog
                    open={modalImpressaoAberto}
                    onClose={() => setModalImpressaoAberto(false)}
                    fullScreen={isMobile}
                    maxWidth="md"
                    fullWidth
                    PaperProps={{
                        sx: {
                            borderRadius: isMobile ? 0 : 2,
                            maxHeight: "90vh",
                        },
                    }}
                >
                    <DialogTitle
                        sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            borderBottom: "1px solid",
                            borderColor: "divider",
                            p: 2,
                        }}
                    >
                        <Typography variant="h6">Conferência Cega - Impressão</Typography>
                        <IconButton onClick={() => setModalImpressaoAberto(false)} size="small">
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent sx={{ p: 0 }}>
                        <Box sx={{ p: 2, overflow: "auto" }}>
                            <div ref={impressaoRef}>
                                {notaSelecionada && (
                                    <ImpressaoConferenciaCega
                                        nota={notaSelecionada.nota}
                                        data={notaSelecionada.data}
                                        emitente={notaSelecionada.emitente}
                                        produtos={notaSelecionada.produtos}
                                        lotesPorProduto={lotesPorProduto}
                                    />
                                )}
                            </div>
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ p: 2, borderTop: "1px solid", borderColor: "divider" }}>
                        <Button
                            onClick={() => setModalImpressaoAberto(false)}
                            sx={{
                                textTransform: "none",
                                fontWeight: 500,
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={imprimirConferenciaCega}
                            variant="contained"
                            startIcon={<PrintIcon />}
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
                            Imprimir
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Snackbar para notificações */}
                <Snackbar
                    open={snackbarAberto}
                    autoHideDuration={4000}
                    onClose={() => setSnackbarAberto(false)}
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                >
                    <Alert
                        onClose={() => setSnackbarAberto(false)}
                        severity={tipoSnackbar}
                        sx={{
                            width: "100%",
                            borderRadius: 2,
                            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                        }}
                    >
                        {mensagemSnackbar}
                    </Alert>
                </Snackbar>
            </Container>
        </Layout>
    )
}

export default PainelEntrada
