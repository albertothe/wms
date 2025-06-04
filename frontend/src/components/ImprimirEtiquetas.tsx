"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import api from "../services/api"
import {
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
    Box,
    Snackbar,
    Alert,
    Divider,
    IconButton,
    Menu,
    Paper,
    alpha,
    Tooltip,
    TextField,
    CircularProgress,
    Tabs,
    Tab,
    Chip,
} from "@mui/material"
import {
    LocalOffer as TagIcon,
    Settings,
    MoreVert,
    Visibility,
    Print as PrintIcon,
    Save as SaveIcon,
    Refresh as RefreshIcon,
    NetworkCheck as NetworkIcon,
    Router as RouterIcon,
} from "@mui/icons-material"
import jsPDF from "jspdf"

interface ProdutoEtiqueta {
    codproduto: string
    produto: string
    qtde_saida: number
    unidade: string
    codbarra: string
    endereco: string
    bairro: string
    cidade_uf: string
    np: string
    data: string
    codloja: string
    cliente: string
    codendereco?: string
    lote?: string
}

interface ConfiguracaoEtiqueta {
    tamanho: "pequena" | "media" | "grande"
    mostrarCodigoBarras: boolean
    mostrarEndereco: boolean
    mostrarLote: boolean
    mostrarCliente: boolean
    mostrarProduto: boolean
    mostrarQuantidade: boolean
    mostrarNP: boolean
    mostrarData: boolean
    mostrarLoja: boolean
    tipoImpressao: "pdf" | "termica"
    termicaConfig: {
        printerId: string
        dpi: "203" | "300" | "600"
        width: number
        height: number
        fonteSizeGrande: number
        fonteSizeMedia: number
        fonteSizePequena: number
    }
}

interface TabPanelProps {
    children?: React.ReactNode
    index: number
    value: number
}

const configPadrao: ConfiguracaoEtiqueta = {
    tamanho: "media",
    mostrarCodigoBarras: true,
    mostrarEndereco: true,
    mostrarLote: true,
    mostrarCliente: true,
    mostrarProduto: true,
    mostrarQuantidade: true,
    mostrarNP: true,
    mostrarData: true,
    mostrarLoja: true,
    tipoImpressao: "pdf",
    termicaConfig: {
        printerId: "zebra_1",
        dpi: "203",
        width: 4,
        height: 2,
        fonteSizeGrande: 32,
        fonteSizeMedia: 24,
        fonteSizePequena: 18,
    },
}

interface ImpressoraZebra {
    id: string
    name: string
    ip: string
    port: number
    isOnline?: boolean
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`config-tabpanel-${index}`}
            aria-labelledby={`config-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    )
}

const ImprimirEtiquetas: React.FC<{ chave: string }> = ({ chave }) => {
    const [carregando, setCarregando] = useState(false)
    const [configAberta, setConfigAberta] = useState(false)
    const [snackbar, setSnackbar] = useState({
        aberta: false,
        mensagem: "",
        tipo: "info" as "error" | "info" | "success" | "warning",
    })
    const [corTopo, setCorTopo] = useState("#0a0a6b")
    const [etiquetas, setEtiquetas] = useState<ProdutoEtiqueta[]>([])
    const [config, setConfig] = useState<ConfiguracaoEtiqueta>(configPadrao)
    const [tabValue, setTabValue] = useState(0)
    const [impressoraStatus, setImpressoraStatus] = useState<"idle" | "checking" | "connected" | "error">("idle")
    const [testandoImpressora, setTestandoImpressora] = useState(false)
    const [impressorasDisponiveis, setImpressorasDisponiveis] = useState<ImpressoraZebra[]>([])
    const [carregandoImpressoras, setCarregandoImpressoras] = useState(false)
    const [tipoImpressaoBackend, setTipoImpressaoBackend] = useState<number>(1)

    // Estado para o menu de opções
    const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null)
    const menuAberto = Boolean(menuAnchorEl)
    const [imprimirDialogAberto, setImprimirDialogAberto] = useState(false)

    const carregarDadosEtiquetas = useCallback(async () => {
        try {
            const res = await api.get(`/painel-saida/etiquetas/${chave}`)
            setEtiquetas(res.data)
        } catch (error) {
            console.error("Erro ao carregar dados das etiquetas:", error)
            setSnackbar({
                aberta: true,
                mensagem: "Erro ao carregar dados das etiquetas",
                tipo: "error",
            })
        }
    }, [chave])

    const carregarImpressorasZebra = async () => {
        try {
            setCarregandoImpressoras(true)
            console.log("🔄 Verificando impressoras Zebra em rede...")

            const response = await api.get("/impressora/zebra/impressoras")
            const impressoras = response.data

            console.log("📋 Impressoras Zebra encontradas:", impressoras)

            setImpressorasDisponiveis(impressoras)

            if (impressoras.length > 0) {
                // Atualizar configuração com a primeira impressora encontrada
                setConfig((prev) => ({
                    ...prev,
                    termicaConfig: {
                        ...prev.termicaConfig,
                        printerId: impressoras[0].id,
                    },
                }))

                const onlineCount = impressoras.filter((imp: ImpressoraZebra) => imp.isOnline).length
                setSnackbar({
                    aberta: true,
                    mensagem: `${impressoras.length} impressora(s) configurada(s), ${onlineCount} online`,
                    tipo: onlineCount > 0 ? "success" : "warning",
                })
            } else {
                setSnackbar({
                    aberta: true,
                    mensagem: "Nenhuma impressora Zebra configurada no servidor",
                    tipo: "warning",
                })
            }
        } catch (error) {
            console.error("Erro ao carregar impressoras Zebra:", error)
            setSnackbar({
                aberta: true,
                mensagem: "Erro ao verificar impressoras Zebra",
                tipo: "error",
            })
        } finally {
            setCarregandoImpressoras(false)
        }
    }

    useEffect(() => {
        console.log("Carregando configurações e dados")
        buscarConfiguracoes()
        carregarDadosEtiquetas()
    }, [chave, carregarDadosEtiquetas])

    useEffect(() => {
        // Carregar impressoras após carregar configurações
        const timer = setTimeout(() => {
            carregarImpressorasZebra()
        }, 1000)

        return () => clearTimeout(timer)
    }, [])

    const buscarConfiguracoes = async () => {
        try {
            const res = await api.get("/configuracoes")
            if (res.data && res.data.cor_topo) {
                setCorTopo(res.data.cor_topo)
            }

            if (res.data && res.data.tipo_impressao_etiqueta) {
                setTipoImpressaoBackend(res.data.tipo_impressao_etiqueta)
                setConfig((prev) => ({
                    ...prev,
                    tipoImpressao: res.data.tipo_impressao_etiqueta === 1 ? "pdf" : "termica",
                }))
            }

            const configSalva = localStorage.getItem("configEtiquetas")
            if (configSalva) {
                try {
                    const configCarregada = JSON.parse(configSalva)

                    if (!configCarregada.termicaConfig) {
                        configCarregada.termicaConfig = configPadrao.termicaConfig
                    }

                    configCarregada.termicaConfig = {
                        ...configPadrao.termicaConfig,
                        ...configCarregada.termicaConfig,
                    }

                    configCarregada.tipoImpressao = res.data && res.data.tipo_impressao_etiqueta === 1 ? "pdf" : "termica"

                    setConfig(configCarregada)
                } catch (e) {
                    console.error("Erro ao carregar configurações salvas:", e)
                    setConfig({
                        ...configPadrao,
                        tipoImpressao: res.data && res.data.tipo_impressao_etiqueta === 1 ? "pdf" : "termica",
                    })
                }
            }
        } catch (error) {
            console.error("Erro ao buscar configurações:", error)
        }
    }

    const gerarBarcodeBase64 = async (texto: string): Promise<string> => {
        const url = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(texto)}&scale=2&height=10&includetext=false`

        try {
            const res = await fetch(url)
            if (!res.ok) throw new Error(`Erro ao gerar código de barras: ${res.status}`)

            const blob = await res.blob()
            return await new Promise<string>((resolve, reject) => {
                const reader = new FileReader()
                reader.onloadend = () => resolve(reader.result as string)
                reader.onerror = reject
                reader.readAsDataURL(blob)
            })
        } catch (error) {
            console.error("Erro ao gerar código de barras:", error)
            throw error
        }
    }

    const abrirMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
        setMenuAnchorEl(event.currentTarget)
    }

    const fecharMenu = () => {
        setMenuAnchorEl(null)
    }

    const abrirConfiguracoes = () => {
        fecharMenu()
        carregarImpressorasZebra()
        setConfigAberta(true)
    }

    const fecharConfiguracoes = () => {
        setConfigAberta(false)
    }

    const salvarConfiguracoes = () => {
        const configParaSalvar = {
            ...config,
            termicaConfig: config.termicaConfig || configPadrao.termicaConfig,
        }

        localStorage.setItem("configEtiquetas", JSON.stringify(configParaSalvar))

        setConfigAberta(false)
        setSnackbar({
            aberta: true,
            mensagem: "Configurações salvas com sucesso",
            tipo: "success",
        })
    }

    const handleConfigChange = (campo: keyof ConfiguracaoEtiqueta, valor: any) => {
        setConfig((prev) => ({
            ...prev,
            [campo]: valor,
        }))
    }

    const handleTermicaConfigChange = (campo: keyof ConfiguracaoEtiqueta["termicaConfig"], valor: any) => {
        setConfig((prev) => {
            const termicaConfig = prev.termicaConfig || { ...configPadrao.termicaConfig }

            return {
                ...prev,
                termicaConfig: {
                    ...termicaConfig,
                    [campo]: valor,
                },
            }
        })
    }

    const fecharSnackbar = () => {
        setSnackbar((prev) => ({ ...prev, aberta: false }))
    }

    const preVisualizar = async () => {
        fecharMenu()
        try {
            if (etiquetas.length === 0) {
                await carregarDadosEtiquetas()
            }

            if (etiquetas.length === 0) {
                setSnackbar({
                    aberta: true,
                    mensagem: "Nenhuma etiqueta para pré-visualizar",
                    tipo: "warning",
                })
                return
            }

            const pdfBlob = await gerarPDFBlob()
            const pdfUrl = URL.createObjectURL(pdfBlob)
            window.open(pdfUrl, "_blank")
        } catch (err) {
            console.error("Erro ao pré-visualizar etiquetas:", err)
            setSnackbar({
                aberta: true,
                mensagem: "Erro ao gerar pré-visualização",
                tipo: "error",
            })
        }
    }

    const gerarPDFBlob = async (): Promise<Blob> => {
        const doc = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: [210, 297],
        })

        let etiquetaLargura, etiquetaAltura
        switch (config.tamanho) {
            case "pequena":
                etiquetaLargura = 80
                etiquetaAltura = 35
                break
            case "grande":
                etiquetaLargura = 120
                etiquetaAltura = 55
                break
            case "media":
            default:
                etiquetaLargura = 100
                etiquetaAltura = 45
        }

        let x = 5
        let y = 10
        let col = 0
        const maxCols = config.tamanho === "grande" ? 1 : 2

        doc.setFillColor(0, 0, 0)
        doc.rect(0, 0, 210, 8, "F")
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(12)
        doc.setFont("helvetica", "bold")
        doc.text(`ETIQUETAS - CHAVE: ${chave}`, 105, 5, { align: "center" })
        doc.setTextColor(0, 0, 0)

        for (let i = 0; i < etiquetas.length; i++) {
            const produto = etiquetas[i]

            doc.setDrawColor(0, 0, 0)
            doc.rect(x, y, etiquetaLargura, etiquetaAltura, "S")

            doc.setFillColor(0, 0, 0)
            doc.rect(x, y, etiquetaLargura, 5, "F")
            doc.setTextColor(255, 255, 255)
            doc.setFontSize(8)
            doc.setFont("helvetica", "bold")

            let cabecalho = ""
            if (config.mostrarNP) cabecalho += `NP: ${produto.np.trim()}`
            if (config.mostrarData) cabecalho += cabecalho ? ` | ${produto.data}` : produto.data
            if (config.mostrarLoja) cabecalho += cabecalho ? ` | Loja: ${produto.codloja}` : `Loja: ${produto.codloja}`

            doc.text(cabecalho, x + etiquetaLargura / 2, y + 3.5, { align: "center" })
            doc.setTextColor(0, 0, 0)

            let posY = y + 10

            if (config.mostrarCliente) {
                doc.setFontSize(9)
                doc.setFont("helvetica", "normal")
                doc.text(`Cliente: ${produto.cliente}`, x + 2, posY)
                posY += 4
            }

            if (config.mostrarEndereco) {
                doc.setFontSize(8)
                doc.text(`Endereço: ${produto.endereco}`, x + 2, posY)
                posY += 4
                doc.text(`Bairro: ${produto.bairro} - Cidade/UF: ${produto.cidade_uf}`, x + 2, posY)
                posY += 4
            }

            if (config.mostrarProduto) {
                doc.setFontSize(8.5)
                doc.text(`Produto: ${produto.produto} (${produto.codproduto})`, x + 2, posY)
                posY += 4
            }

            if (config.mostrarQuantidade || config.mostrarLote) {
                doc.setFontSize(10)
                doc.setFont("helvetica", "bold")
                let infoText = ""

                if (config.mostrarQuantidade) {
                    infoText += `Qtde: ${Number(produto.qtde_saida).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ${produto.unidade}`
                }

                if (config.mostrarLote) {
                    if (config.mostrarQuantidade) infoText += " | "
                    infoText += `Lote: ${produto.lote || "-"}`
                }

                if (config.mostrarEndereco) {
                    infoText += ` | CodEnd.: ${produto.codendereco || "-"}`
                }

                doc.text(infoText, x + 2, posY)
                posY += 6
            }

            if (config.mostrarCodigoBarras) {
                try {
                    const barcodeImg = await gerarBarcodeBase64((produto.codbarra || "000000").trim())
                    const barcodeWidth = etiquetaLargura * 0.7
                    const barcodeHeight = 10
                    doc.addImage(barcodeImg, "PNG", x + (etiquetaLargura - barcodeWidth) / 2, posY, barcodeWidth, barcodeHeight)
                } catch (barcodeError) {
                    console.warn("Erro ao gerar barcode para:", produto.codbarra, barcodeError)
                }
            }

            col++
            if (col === maxCols) {
                col = 0
                x = 5
                y += etiquetaAltura + 5
            } else {
                x += etiquetaLargura + 5
            }

            if (y + etiquetaAltura > 287) {
                doc.addPage()
                doc.setFillColor(0, 0, 0)
                doc.rect(0, 0, 210, 8, "F")
                doc.setTextColor(255, 255, 255)
                doc.setFontSize(12)
                doc.setFont("helvetica", "bold")
                doc.text(`ETIQUETAS - CHAVE: ${chave} (CONTINUAÇÃO)`, 105, 5, { align: "center" })
                doc.setTextColor(0, 0, 0)
                x = 5
                y = 10
                col = 0
            }
        }

        return doc.output("blob")
    }

    const gerarZPL = (): string => {
        let zplCode = ""
        const termicaConfig = config.termicaConfig || configPadrao.termicaConfig

        const dpi = Number.parseInt(termicaConfig.dpi)
        const widthDots = Math.round(termicaConfig.width * dpi)
        const heightDots = Math.round(termicaConfig.height * dpi)

        etiquetas.forEach((produto, index) => {
            if (index > 0) {
                zplCode += "\n"
            }

            // Início da etiqueta com configurações básicas
            zplCode += "^XA\n"
            zplCode += `^PW${widthDots}\n`
            zplCode += `^LL${heightDots}\n`
            zplCode += "^LS0\n"

            // Configurar fonte padrão maior
            zplCode += "^CF0,30\n" // Fonte padrão tamanho 30

            let posY = 40

            // Cabeçalho com fonte maior
            let cabecalho = ""
            if (config.mostrarNP) cabecalho += `NP: ${produto.np.trim()}`
            if (config.mostrarData) cabecalho += cabecalho ? ` | ${produto.data}` : produto.data
            if (config.mostrarLoja) cabecalho += cabecalho ? ` | Loja: ${produto.codloja}` : `Loja: ${produto.codloja}`

            if (cabecalho) {
                zplCode += `^FT30,${posY}^A0N,${termicaConfig.fonteSizeGrande},${termicaConfig.fonteSizeGrande}^FH^FD${cabecalho}^FS\n`
                posY += 45
            }

            // Cliente
            if (config.mostrarCliente) {
                const clienteTexto = produto.cliente.length > 30 ? produto.cliente.substring(0, 30) + "..." : produto.cliente
                zplCode += `^FT30,${posY}^A0N,${termicaConfig.fonteSizeMedia},${termicaConfig.fonteSizeMedia}^FH^FDCliente: ${clienteTexto}^FS\n`
                posY += 35
            }

            // Endereço
            if (config.mostrarEndereco) {
                const enderecoTexto =
                    produto.endereco.length > 35 ? produto.endereco.substring(0, 35) + "..." : produto.endereco
                zplCode += `^FT30,${posY}^A0N,${termicaConfig.fonteSizePequena},${termicaConfig.fonteSizePequena}^FH^FDEndereco: ${enderecoTexto}^FS\n`
                posY += 30

                const bairroTexto = `${produto.bairro} - ${produto.cidade_uf}`
                const bairroLimitado = bairroTexto.length > 35 ? bairroTexto.substring(0, 35) + "..." : bairroTexto
                zplCode += `^FT30,${posY}^A0N,${termicaConfig.fonteSizePequena},${termicaConfig.fonteSizePequena}^FH^FDBairro: ${bairroLimitado}^FS\n`
                posY += 30
            }

            // Produto
            if (config.mostrarProduto) {
                const produtoTexto = produto.produto.length > 30 ? produto.produto.substring(0, 30) + "..." : produto.produto
                zplCode += `^FT30,${posY}^A0N,${termicaConfig.fonteSizeMedia},${termicaConfig.fonteSizeMedia}^FH^FDProduto: ${produtoTexto}^FS\n`
                posY += 30
                zplCode += `^FT30,${posY}^A0N,${termicaConfig.fonteSizePequena},${termicaConfig.fonteSizePequena}^FH^FDCodigo: ${produto.codproduto}^FS\n`
                posY += 35
            }

            // Quantidade e Lote com fonte maior
            if (config.mostrarQuantidade || config.mostrarLote) {
                let infoText = ""

                if (config.mostrarQuantidade) {
                    infoText += `Qtde: ${Number(produto.qtde_saida).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ${produto.unidade}`
                }

                if (config.mostrarLote) {
                    if (config.mostrarQuantidade) infoText += " | "
                    infoText += `Lote: ${produto.lote || "-"}`
                }

                if (config.mostrarEndereco && produto.codendereco) {
                    infoText += ` | CodEnd.: ${produto.codendereco}`
                }

                // Limitar o tamanho da linha
                if (infoText.length > 40) {
                    infoText = infoText.substring(0, 40) + "..."
                }

                zplCode += `^FT30,${posY}^A0N,${termicaConfig.fonteSizeMedia},${termicaConfig.fonteSizeMedia}^FH^FD${infoText}^FS\n`
                posY += 40
            }

            // Código de barras com tamanho maior
            if (config.mostrarCodigoBarras && produto.codbarra) {
                const barcode = produto.codbarra.trim()
                if (barcode && barcode !== "000000") {
                    // Código de barras maior e mais centralizado
                    zplCode += `^FT100,${posY}^BY3^BCN,80,Y,N,N^FH^FD${barcode}^FS\n`
                    posY += 100
                }
            }

            // Finalizar etiqueta
            zplCode += "^PQ1,0,1,Y\n"
            zplCode += "^XZ"
        })

        return zplCode
    }

    const enviarParaImpressoraZebra = async (zplCode: string): Promise<boolean> => {
        try {
            setCarregando(true)

            const printerId = (config.termicaConfig || configPadrao.termicaConfig).printerId
            console.log(`🖨️ Enviando ZPL para impressora: ${printerId}`)
            console.log(`📄 ZPL Code (${zplCode.length} chars):`)
            console.log("=".repeat(50))
            console.log(zplCode)
            console.log("=".repeat(50))

            // Enviar ZPL para o backend
            const response = await api.post("/impressora/zebra/imprimir", {
                printerId: printerId,
                zplCode: zplCode,
            })

            console.log("✅ Resposta do servidor:", response.data)

            setSnackbar({
                aberta: true,
                mensagem: `Etiquetas enviadas para impressora ${printerId} com sucesso!`,
                tipo: "success",
            })

            return true
        } catch (error: any) {
            console.error("❌ Erro ao imprimir via rede:", error)

            let mensagemErro = "Erro ao imprimir"
            if (error.response?.data?.erro) {
                mensagemErro = error.response.data.erro
            } else if (error.message) {
                mensagemErro = error.message
            }

            setSnackbar({
                aberta: true,
                mensagem: mensagemErro,
                tipo: "error",
            })
            return false
        } finally {
            setCarregando(false)
        }
    }

    const testarImpressoraZebra = async () => {
        setTestandoImpressora(true)
        setImpressoraStatus("checking")

        try {
            console.log("🧪 Testando impressora Zebra...")

            const printerId = (config.termicaConfig || configPadrao.termicaConfig).printerId

            const response = await api.post("/impressora/zebra/testar", {
                printerId: printerId,
            })

            setImpressoraStatus("connected")
            setSnackbar({
                aberta: true,
                mensagem: `Teste realizado com sucesso na impressora ${printerId}!`,
                tipo: "success",
            })
            console.log("✅ Teste bem-sucedido:", response.data)
        } catch (error: any) {
            console.error("Erro ao testar impressora:", error)
            setImpressoraStatus("error")

            let mensagemErro = "Erro ao testar impressora"
            if (error.response?.data?.erro) {
                mensagemErro = error.response.data.erro
            } else if (error.message) {
                mensagemErro = error.message
            }

            setSnackbar({
                aberta: true,
                mensagem: mensagemErro,
                tipo: "error",
            })
        } finally {
            setTestandoImpressora(false)
        }
    }

    const gerarPDF = async () => {
        setCarregando(true)
        try {
            if (etiquetas.length === 0) {
                await carregarDadosEtiquetas()
            }

            if (!Array.isArray(etiquetas) || etiquetas.length === 0) {
                setSnackbar({
                    aberta: true,
                    mensagem: "Nenhuma etiqueta para imprimir",
                    tipo: "warning",
                })
                return
            }

            const pdfBlob = await gerarPDFBlob()
            const pdfUrl = URL.createObjectURL(pdfBlob)

            const link = document.createElement("a")
            link.href = pdfUrl
            link.download = `etiquetas_chave_${chave}.pdf`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            setSnackbar({
                aberta: true,
                mensagem: "PDF de etiquetas gerado com sucesso",
                tipo: "success",
            })
        } catch (err) {
            console.error("Erro ao gerar etiquetas:", err)
            setSnackbar({
                aberta: true,
                mensagem: "Erro ao gerar o PDF de etiquetas",
                tipo: "error",
            })
        } finally {
            setCarregando(false)
        }
    }

    const handleImprimirClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault()
        event.stopPropagation()
        setImprimirDialogAberto(true)
    }

    const handleImprimirConfirm = async () => {
        try {
            const tipoImpressao = tipoImpressaoBackend === 1 ? "pdf" : "termica"

            if (tipoImpressao === "pdf") {
                await gerarPDF()
            } else {
                if (etiquetas.length === 0) {
                    await carregarDadosEtiquetas()
                }

                if (!Array.isArray(etiquetas) || etiquetas.length === 0) {
                    setSnackbar({
                        aberta: true,
                        mensagem: "Nenhuma etiqueta para imprimir",
                        tipo: "warning",
                    })
                    return
                }

                const zplCode = gerarZPL()
                console.log("🏷️ ZPL gerado para impressão:")
                console.log(zplCode)

                await enviarParaImpressoraZebra(zplCode)
            }
        } catch (error) {
            console.error("Erro ao processar impressão:", error)
            setSnackbar({
                aberta: true,
                mensagem: "Erro ao processar impressão",
                tipo: "error",
            })
        } finally {
            setImprimirDialogAberto(false)
        }
    }

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue)
    }

    return (
        <>
            <Box sx={{ display: "flex", alignItems: "center" }}>
                <Tooltip title="Imprimir Etiquetas" arrow>
                    <IconButton
                        size="small"
                        onClick={handleImprimirClick}
                        sx={{
                            color: corTopo,
                            border: "1px solid",
                            borderColor: "divider",
                            "&:hover": {
                                backgroundColor: alpha(corTopo, 0.1),
                            },
                        }}
                    >
                        <TagIcon fontSize="small" />
                    </IconButton>
                </Tooltip>

                <IconButton
                    size="small"
                    aria-label="Mais opções"
                    aria-controls={menuAberto ? "opcoes-etiquetas" : undefined}
                    aria-haspopup="true"
                    aria-expanded={menuAberto ? "true" : undefined}
                    onClick={abrirMenu}
                >
                    <MoreVert />
                </IconButton>

                <Menu
                    id="opcoes-etiquetas"
                    anchorEl={menuAnchorEl}
                    open={menuAberto}
                    onClose={fecharMenu}
                    MenuListProps={{
                        "aria-labelledby": "botao-opcoes",
                    }}
                >
                    <MenuItem onClick={preVisualizar}>
                        <Visibility fontSize="small" sx={{ mr: 1 }} />
                        Visualizar PDF
                    </MenuItem>
                    <MenuItem onClick={abrirConfiguracoes}>
                        <Settings fontSize="small" sx={{ mr: 1 }} />
                        Configurações
                    </MenuItem>
                </Menu>
            </Box>

            {/* Dialog de Impressão */}
            <Dialog open={imprimirDialogAberto} onClose={() => setImprimirDialogAberto(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Imprimir Etiquetas</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="subtitle1" gutterBottom>
                        Tipo de impressão configurado:
                    </Typography>

                    <Alert severity="info" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                            <strong>{tipoImpressaoBackend === 1 ? "Gerar PDF" : "Impressão direta na Zebra"}</strong>
                            <br />
                            Esta configuração é definida no arquivo .env do servidor.
                        </Typography>
                    </Alert>

                    {tipoImpressaoBackend === 2 && (
                        <Box
                            sx={{
                                mt: 2,
                                p: 2,
                                bgcolor: "background.paper",
                                borderRadius: 1,
                                border: "1px solid",
                                borderColor: "divider",
                            }}
                        >
                            <Typography variant="subtitle2" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <RouterIcon fontSize="small" />
                                Impressoras Zebra em Rede
                            </Typography>

                            <Box sx={{ mb: 2 }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}>
                                    <FormControl fullWidth>
                                        <InputLabel>Impressora</InputLabel>
                                        <Select
                                            value={(config.termicaConfig || configPadrao.termicaConfig).printerId}
                                            label="Impressora"
                                            onChange={(e) => handleTermicaConfigChange("printerId", e.target.value)}
                                        >
                                            {carregandoImpressoras ? (
                                                <MenuItem disabled>Verificando impressoras...</MenuItem>
                                            ) : impressorasDisponiveis.length > 0 ? (
                                                impressorasDisponiveis.map((imp) => (
                                                    <MenuItem key={imp.id} value={imp.id}>
                                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                                                            <Box sx={{ flexGrow: 1 }}>
                                                                <Typography variant="body2">{imp.name}</Typography>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {imp.ip}:{imp.port}
                                                                </Typography>
                                                            </Box>
                                                            <Chip
                                                                size="small"
                                                                label={imp.isOnline ? "Online" : "Offline"}
                                                                color={imp.isOnline ? "success" : "error"}
                                                                variant="outlined"
                                                            />
                                                        </Box>
                                                    </MenuItem>
                                                ))
                                            ) : (
                                                <MenuItem disabled>Nenhuma impressora configurada</MenuItem>
                                            )}
                                        </Select>
                                    </FormControl>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={carregarImpressorasZebra}
                                        disabled={carregandoImpressoras}
                                        startIcon={carregandoImpressoras ? <CircularProgress size={16} /> : <RefreshIcon />}
                                    >
                                        Verificar
                                    </Button>
                                </Box>
                            </Box>

                            {impressorasDisponiveis.length > 0 && (
                                <Alert severity="info" sx={{ mt: 2 }}>
                                    <Typography variant="body2">
                                        <strong>Configuração atual:</strong>
                                        <br />
                                        {impressorasDisponiveis.length} impressora(s) configurada(s) no servidor
                                        <br />
                                        Para adicionar mais impressoras, edite o arquivo .env do backend
                                    </Typography>
                                </Alert>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setImprimirDialogAberto(false)}>Cancelar</Button>
                    <Button
                        onClick={handleImprimirConfirm}
                        variant="contained"
                        color="primary"
                        disabled={carregando || (tipoImpressaoBackend === 2 && impressorasDisponiveis.length === 0)}
                        startIcon={carregando ? <CircularProgress size={16} color="inherit" /> : <PrintIcon />}
                    >
                        {carregando ? "Processando..." : tipoImpressaoBackend === 1 ? "Gerar PDF" : "Imprimir"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog de Configurações */}
            <Dialog open={configAberta} onClose={fecharConfiguracoes} maxWidth="md" fullWidth>
                <DialogTitle>Configurações Globais de Etiquetas</DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                        <Tabs value={tabValue} onChange={handleTabChange} aria-label="configurações de etiquetas">
                            <Tab label="Layout" id="config-tab-0" aria-controls="config-tabpanel-0" />
                            <Tab label="Conteúdo" id="config-tab-1" aria-controls="config-tabpanel-1" />
                            <Tab label="Impressoras Zebra" id="config-tab-2" aria-controls="config-tabpanel-2" />
                        </Tabs>
                    </Box>

                    <TabPanel value={tabValue} index={0}>
                        <Paper elevation={0} sx={{ p: 2, mb: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                Configurações de Layout
                            </Typography>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                <FormControl fullWidth variant="outlined">
                                    <InputLabel>Tamanho da Etiqueta</InputLabel>
                                    <Select
                                        value={config.tamanho}
                                        onChange={(e) => handleConfigChange("tamanho", e.target.value)}
                                        label="Tamanho da Etiqueta"
                                    >
                                        <MenuItem value="pequena">Pequena (80mm x 35mm)</MenuItem>
                                        <MenuItem value="media">Média (100mm x 45mm)</MenuItem>
                                        <MenuItem value="grande">Grande (120mm x 55mm)</MenuItem>
                                    </Select>
                                </FormControl>

                                <Typography variant="subtitle2" sx={{ mt: 1 }}>
                                    Estas configurações serão aplicadas a todas as etiquetas geradas pelo sistema.
                                </Typography>
                            </Box>
                        </Paper>
                    </TabPanel>

                    <TabPanel value={tabValue} index={1}>
                        <Paper elevation={0} sx={{ p: 2 }}>
                            <Typography variant="h6" gutterBottom>
                                Informações Exibidas
                            </Typography>

                            <Box sx={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 3 }}>
                                <Box sx={{ minWidth: 200 }}>
                                    <Typography variant="subtitle1" gutterBottom>
                                        Cabeçalho
                                    </Typography>
                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={config.mostrarNP}
                                                onChange={(e) => handleConfigChange("mostrarNP", e.target.checked)}
                                            />
                                            Número do Pedido (NP)
                                        </label>
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={config.mostrarData}
                                                onChange={(e) => handleConfigChange("mostrarData", e.target.checked)}
                                            />
                                            Data
                                        </label>
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={config.mostrarLoja}
                                                onChange={(e) => handleConfigChange("mostrarLoja", e.target.checked)}
                                            />
                                            Código da Loja
                                        </label>
                                    </Box>
                                </Box>

                                <Box sx={{ minWidth: 200 }}>
                                    <Typography variant="subtitle1" gutterBottom>
                                        Informações do Cliente
                                    </Typography>
                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={config.mostrarCliente}
                                                onChange={(e) => handleConfigChange("mostrarCliente", e.target.checked)}
                                            />
                                            Nome do Cliente
                                        </label>
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={config.mostrarEndereco}
                                                onChange={(e) => handleConfigChange("mostrarEndereco", e.target.checked)}
                                            />
                                            Endereço Completo
                                        </label>
                                    </Box>
                                </Box>

                                <Box sx={{ minWidth: 200 }}>
                                    <Typography variant="subtitle1" gutterBottom>
                                        Informações do Produto
                                    </Typography>
                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={config.mostrarProduto}
                                                onChange={(e) => handleConfigChange("mostrarProduto", e.target.checked)}
                                            />
                                            Descrição do Produto
                                        </label>
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={config.mostrarQuantidade}
                                                onChange={(e) => handleConfigChange("mostrarQuantidade", e.target.checked)}
                                            />
                                            Quantidade
                                        </label>
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={config.mostrarLote}
                                                onChange={(e) => handleConfigChange("mostrarLote", e.target.checked)}
                                            />
                                            Lote
                                        </label>
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={config.mostrarCodigoBarras}
                                                onChange={(e) => handleConfigChange("mostrarCodigoBarras", e.target.checked)}
                                            />
                                            Código de Barras
                                        </label>
                                    </Box>
                                </Box>
                            </Box>
                        </Paper>
                    </TabPanel>

                    <TabPanel value={tabValue} index={2}>
                        <Paper elevation={0} sx={{ p: 2 }}>
                            <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <RouterIcon />
                                Impressoras Zebra em Rede
                            </Typography>

                            <Alert severity="info" sx={{ mb: 3 }}>
                                <Typography variant="body2">
                                    <strong>Impressão via TCP/IP:</strong> Comunicação direta com impressoras Zebra em rede
                                    <br />
                                    <strong>Porta padrão:</strong> 9100 (ZPL)
                                    <br />
                                    <strong>Configuração:</strong> Definida no arquivo .env do servidor
                                </Typography>
                            </Alert>

                            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                <Box>
                                    <Typography variant="subtitle1" gutterBottom>
                                        Impressoras Disponíveis
                                    </Typography>

                                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}>
                                        <FormControl fullWidth>
                                            <InputLabel>Impressora</InputLabel>
                                            <Select
                                                value={(config.termicaConfig || configPadrao.termicaConfig).printerId}
                                                label="Impressora"
                                                onChange={(e) => handleTermicaConfigChange("printerId", e.target.value)}
                                            >
                                                {carregandoImpressoras ? (
                                                    <MenuItem disabled>Verificando impressoras...</MenuItem>
                                                ) : impressorasDisponiveis.length > 0 ? (
                                                    impressorasDisponiveis.map((imp) => (
                                                        <MenuItem key={imp.id} value={imp.id}>
                                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                                                                <Box sx={{ flexGrow: 1 }}>
                                                                    <Typography variant="body2">{imp.name}</Typography>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        {imp.ip}:{imp.port}
                                                                    </Typography>
                                                                </Box>
                                                                <Chip
                                                                    size="small"
                                                                    label={imp.isOnline ? "Online" : "Offline"}
                                                                    color={imp.isOnline ? "success" : "error"}
                                                                    variant="outlined"
                                                                />
                                                            </Box>
                                                        </MenuItem>
                                                    ))
                                                ) : (
                                                    <MenuItem disabled>Nenhuma impressora configurada</MenuItem>
                                                )}
                                            </Select>
                                        </FormControl>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={carregarImpressorasZebra}
                                            disabled={carregandoImpressoras}
                                            startIcon={carregandoImpressoras ? <CircularProgress size={16} /> : <RefreshIcon />}
                                        >
                                            Verificar
                                        </Button>
                                    </Box>
                                </Box>

                                <Box>
                                    <Typography variant="subtitle1" gutterBottom>
                                        Configurações de Impressão
                                    </Typography>
                                    <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                                        <FormControl sx={{ minWidth: 120 }}>
                                            <InputLabel>Resolução (DPI)</InputLabel>
                                            <Select
                                                value={(config.termicaConfig || configPadrao.termicaConfig).dpi}
                                                label="Resolução (DPI)"
                                                onChange={(e) => handleTermicaConfigChange("dpi", e.target.value)}
                                            >
                                                <MenuItem value="203">203 DPI</MenuItem>
                                                <MenuItem value="300">300 DPI</MenuItem>
                                                <MenuItem value="600">600 DPI</MenuItem>
                                            </Select>
                                        </FormControl>

                                        <TextField
                                            label="Largura da Etiqueta (pol)"
                                            type="number"
                                            value={(config.termicaConfig || configPadrao.termicaConfig).width}
                                            onChange={(e) => handleTermicaConfigChange("width", Number(e.target.value))}
                                            inputProps={{ min: 1, max: 8, step: 0.1 }}
                                            sx={{ width: 150 }}
                                        />

                                        <TextField
                                            label="Altura da Etiqueta (pol)"
                                            type="number"
                                            value={(config.termicaConfig || configPadrao.termicaConfig).height}
                                            onChange={(e) => handleTermicaConfigChange("height", Number(e.target.value))}
                                            inputProps={{ min: 0.5, max: 6, step: 0.1 }}
                                            sx={{ width: 150 }}
                                        />
                                    </Box>
                                </Box>

                                <Box>
                                    <Typography variant="subtitle1" gutterBottom>
                                        Tamanhos de Fonte (ZPL)
                                    </Typography>
                                    <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                                        <TextField
                                            label="Fonte Grande"
                                            type="number"
                                            value={(config.termicaConfig || configPadrao.termicaConfig).fonteSizeGrande}
                                            onChange={(e) => handleTermicaConfigChange("fonteSizeGrande", Number(e.target.value))}
                                            inputProps={{ min: 20, max: 60, step: 2 }}
                                            sx={{ width: 120 }}
                                        />

                                        <TextField
                                            label="Fonte Média"
                                            type="number"
                                            value={(config.termicaConfig || configPadrao.termicaConfig).fonteSizeMedia}
                                            onChange={(e) => handleTermicaConfigChange("fonteSizeMedia", Number(e.target.value))}
                                            inputProps={{ min: 16, max: 40, step: 2 }}
                                            sx={{ width: 120 }}
                                        />

                                        <TextField
                                            label="Fonte Pequena"
                                            type="number"
                                            value={(config.termicaConfig || configPadrao.termicaConfig).fonteSizePequena}
                                            onChange={(e) => handleTermicaConfigChange("fonteSizePequena", Number(e.target.value))}
                                            inputProps={{ min: 12, max: 30, step: 2 }}
                                            sx={{ width: 120 }}
                                        />
                                    </Box>
                                </Box>

                                <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                                    <Button
                                        variant="outlined"
                                        onClick={testarImpressoraZebra}
                                        disabled={testandoImpressora || impressorasDisponiveis.length === 0}
                                        startIcon={testandoImpressora ? <CircularProgress size={16} /> : <NetworkIcon />}
                                    >
                                        Testar Impressora
                                    </Button>
                                </Box>

                                {impressoraStatus === "connected" && (
                                    <Alert severity="success">Teste de impressão realizado com sucesso!</Alert>
                                )}

                                {impressoraStatus === "error" && (
                                    <Alert severity="error">Falha no teste de impressão. Verifique a conexão da impressora.</Alert>
                                )}

                                <Divider sx={{ my: 2 }} />

                                <Typography variant="body2" color="text.secondary">
                                    <strong>Instruções:</strong>
                                    <br />
                                    1. Configure os IPs das impressoras no arquivo .env do servidor
                                    <br />
                                    2. As impressoras devem estar acessíveis na rede na porta 9100
                                    <br />
                                    3. Certifique-se de que as impressoras estão configuradas para aceitar ZPL
                                    <br />
                                    4. Para adicionar mais impressoras, edite as variáveis ZEBRA_PRINTER_X_IP no .env
                                </Typography>
                            </Box>
                        </Paper>
                    </TabPanel>
                </DialogContent>
                <DialogActions>
                    <Button onClick={fecharConfiguracoes} color="inherit">
                        Cancelar
                    </Button>
                    <Button onClick={salvarConfiguracoes} variant="contained" color="primary" startIcon={<SaveIcon />}>
                        Salvar Configurações
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.aberta}
                autoHideDuration={6000}
                onClose={fecharSnackbar}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert onClose={fecharSnackbar} severity={snackbar.tipo} sx={{ width: "100%" }}>
                    {snackbar.mensagem}
                </Alert>
            </Snackbar>
        </>
    )
}

export default ImprimirEtiquetas
