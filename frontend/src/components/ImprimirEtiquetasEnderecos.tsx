"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
    Box,
    Button,
    Container,
    Typography,
    Paper,
    Tabs,
    Tab,
    Radio,
    RadioGroup,
    FormControlLabel,
    FormControl,
    FormLabel,
} from "@mui/material"
import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import PrintIcon from "@mui/icons-material/Print"
import ModalEtiquetasEnderecos from "../components/ModalEtiquetasEnderecos"
// Remova a importação do router que está causando o erro
import api from "../services/api"

// Tipos importados do componente de impressão
import type { EtiquetaSize, EtiquetaLayout } from "../components/ImpressaoEtiquetasEnderecos"

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
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    )
}

function a11yProps(index: number) {
    return {
        id: `simple-tab-${index}`,
        "aria-controls": `simple-tabpanel-${index}`,
    }
}

export default function ImprimirEtiquetasEnderecos() {
    // Remova a referência ao router
    const [tabValue, setTabValue] = useState(0)
    const [tipoEtiqueta, setTipoEtiqueta] = useState<"barcode" | "qrcode" | "ambos">("qrcode")
    const [tamanhoEtiqueta, setTamanhoEtiqueta] = useState<EtiquetaSize>("medio")
    const [layoutEtiqueta, setLayoutEtiqueta] = useState<EtiquetaLayout>("simples")
    const [enderecos, setEnderecos] = useState<any[]>([])
    const [modalAberto, setModalAberto] = useState(false)
    const [carregando, setCarregando] = useState(true)

    // Buscar endereços da API
    useEffect(() => {
        const buscarEnderecos = async () => {
            setCarregando(true)
            try {
                const response = await api.get("/enderecos")
                setEnderecos(response.data || [])
            } catch (error) {
                console.error("Erro ao buscar endereços:", error)
                setEnderecos([])
            } finally {
                setCarregando(false)
            }
        }

        buscarEnderecos()
    }, [])

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue)
    }

    const handleTipoEtiquetaChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setTipoEtiqueta(event.target.value as "barcode" | "qrcode" | "ambos")
    }

    const handleTamanhoEtiquetaChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setTamanhoEtiqueta(event.target.value as EtiquetaSize)
    }

    const handleLayoutEtiquetaChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setLayoutEtiqueta(event.target.value as EtiquetaLayout)
    }

    const handleVoltar = () => {
        // Use window.history em vez do router
        window.history.back()
    }

    const handleImprimirEtiquetas = () => {
        // Em vez de navegar para outra página, abrir o modal
        setModalAberto(true)
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
                <Typography variant="h4" component="h1">
                    Impressão de Etiquetas de Endereços
                </Typography>
                <Button variant="outlined" color="primary" startIcon={<ArrowBackIcon />} onClick={handleVoltar}>
                    VOLTAR
                </Button>
            </Box>

            <Paper sx={{ width: "100%" }}>
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    aria-label="configurações de etiqueta"
                    sx={{ borderBottom: 1, borderColor: "divider" }}
                >
                    <Tab label="TIPO DE ETIQUETA" {...a11yProps(0)} />
                    <Tab label="LAYOUT" {...a11yProps(1)} />
                    <Tab label="TAMANHO" {...a11yProps(2)} />
                    <Tab label="PERSONALIZADO" {...a11yProps(3)} disabled />
                </Tabs>

                <TabPanel value={tabValue} index={0}>
                    <FormControl component="fieldset">
                        <FormLabel component="legend">Tipo de Etiqueta</FormLabel>
                        <RadioGroup
                            aria-label="tipo-etiqueta"
                            name="tipo-etiqueta"
                            value={tipoEtiqueta}
                            onChange={handleTipoEtiquetaChange}
                        >
                            <FormControlLabel value="barcode" control={<Radio />} label="Código de Barras" />
                            <FormControlLabel value="qrcode" control={<Radio />} label="QR Code" />
                            <FormControlLabel value="ambos" control={<Radio />} label="Ambos" />
                        </RadioGroup>
                    </FormControl>
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                    <FormControl component="fieldset">
                        <FormLabel component="legend">Layout</FormLabel>
                        <RadioGroup
                            aria-label="layout-etiqueta"
                            name="layout-etiqueta"
                            value={layoutEtiqueta}
                            onChange={handleLayoutEtiquetaChange}
                        >
                            <FormControlLabel value="simples" control={<Radio />} label="Simples" />
                            <FormControlLabel value="produtos" control={<Radio />} label="Com Produtos" />
                        </RadioGroup>
                    </FormControl>
                </TabPanel>

                <TabPanel value={tabValue} index={2}>
                    <FormControl component="fieldset">
                        <FormLabel component="legend">Tamanho</FormLabel>
                        <RadioGroup
                            aria-label="tamanho-etiqueta"
                            name="tamanho-etiqueta"
                            value={tamanhoEtiqueta}
                            onChange={handleTamanhoEtiquetaChange}
                        >
                            <FormControlLabel value="pequeno" control={<Radio />} label="Pequeno" />
                            <FormControlLabel value="medio" control={<Radio />} label="Médio" />
                            <FormControlLabel value="grande" control={<Radio />} label="Grande" />
                        </RadioGroup>
                    </FormControl>
                </TabPanel>

                <Box sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                        Pré-visualização ({enderecos.length} etiquetas)
                    </Typography>

                    <Paper variant="outlined" sx={{ p: 2, maxHeight: "500px", overflow: "auto" }}>
                        {carregando ? (
                            <Typography>Carregando etiquetas...</Typography>
                        ) : enderecos.length === 0 ? (
                            <Typography>Nenhum endereço encontrado.</Typography>
                        ) : (
                            <Box sx={{ p: 2 }}>
                                {/* Aqui você pode adicionar uma pré-visualização simplificada */}
                                <Typography variant="h6">Etiquetas de Endereços</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {enderecos.length} etiquetas geradas
                                </Typography>
                                {/* Mostrar alguns exemplos de etiquetas */}
                            </Box>
                        )}
                    </Paper>
                </Box>

                <Box sx={{ p: 2, display: "flex", justifyContent: "center" }}>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<PrintIcon />}
                        onClick={handleImprimirEtiquetas}
                        disabled={enderecos.length === 0 || carregando}
                    >
                        IMPRIMIR ETIQUETAS
                    </Button>
                </Box>
            </Paper>

            {/* Modal para impressão de etiquetas */}
            <ModalEtiquetasEnderecos
                open={modalAberto}
                onClose={() => setModalAberto(false)}
                enderecos={enderecos}
                tipoEtiqueta={tipoEtiqueta}
                tamanho={tamanhoEtiqueta}
                layout={layoutEtiqueta}
            />
        </Container>
    )
}
