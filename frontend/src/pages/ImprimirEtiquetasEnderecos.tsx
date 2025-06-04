"use client"

import type React from "react"
import { useRef, useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
    Box,
    Container,
    Typography,
    Button,
    FormControl,
    FormLabel,
    RadioGroup,
    FormControlLabel,
    Radio,
    Paper,
    Divider,
    Tabs,
    Tab,
    TextField,
    Slider,
    InputAdornment,
} from "@mui/material"
import { Print as PrintIcon, ArrowBack as ArrowBackIcon, Settings as SettingsIcon } from "@mui/icons-material"
import ImpressaoEtiquetasEnderecos, {
    type EtiquetaSize,
    type EtiquetaLayout,
} from "../components/ImpressaoEtiquetasEnderecos"
import { printElement } from "../utils/printHelper"
import { useAuth } from "../contexts/AuthContext"

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

const ImprimirEtiquetasEnderecos = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const { corTopo } = useAuth()
    const [enderecos, setEnderecos] = useState<any[]>([])
    const [tipoEtiqueta, setTipoEtiqueta] = useState<"barcode" | "qrcode" | "ambos">("qrcode")
    const [tamanhoEtiqueta, setTamanhoEtiqueta] = useState<EtiquetaSize>("medio")
    const [layoutEtiqueta, setLayoutEtiqueta] = useState<EtiquetaLayout>("simples")
    const [tabValue, setTabValue] = useState(0)
    const [dimensoesPersonalizadas, setDimensoesPersonalizadas] = useState({
        width: 180,
        height: 180,
        barcodeWidth: 180,
        barcodeHeight: 80,
        qrcodeSize: 100,
    })
    const impressaoRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (location.state?.enderecos) {
            setEnderecos(location.state.enderecos)
        } else {
            navigate("/enderecos")
        }
    }, [location.state, navigate])

    const handlePrint = () => {
        if (impressaoRef.current) {
            printElement(impressaoRef.current)
        }
    }

    const handleTipoEtiquetaChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setTipoEtiqueta(event.target.value as "barcode" | "qrcode" | "ambos")
    }

    const handleTamanhoEtiquetaChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setTamanhoEtiqueta(event.target.value as EtiquetaSize)
    }

    const handleLayoutEtiquetaChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setLayoutEtiqueta(event.target.value as EtiquetaLayout)

        // Se escolher layout de produtos, forçar QR code
        if (event.target.value === "produtos") {
            setTipoEtiqueta("qrcode")
        }
    }

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue)
    }

    const handleDimensaoChange =
        (dimensao: keyof typeof dimensoesPersonalizadas) => (event: React.ChangeEvent<HTMLInputElement>) => {
            const value = Number.parseInt(event.target.value, 10) || 0
            setDimensoesPersonalizadas((prev) => ({
                ...prev,
                [dimensao]: value,
            }))
        }

    const handleSliderChange =
        (dimensao: keyof typeof dimensoesPersonalizadas) => (event: Event, newValue: number | number[]) => {
            setDimensoesPersonalizadas((prev) => ({
                ...prev,
                [dimensao]: newValue as number,
            }))
        }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Paper sx={{ p: 3 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                    <Typography variant="h5" component="h1" sx={{ color: corTopo }}>
                        Impressão de Etiquetas de Endereços
                    </Typography>
                    <Button
                        startIcon={<ArrowBackIcon />}
                        onClick={() => navigate("/enderecos")}
                        sx={{ color: corTopo, borderColor: corTopo }}
                        variant="outlined"
                    >
                        Voltar
                    </Button>
                </Box>

                <Divider sx={{ mb: 3 }} />

                <Box sx={{ mb: 3 }}>
                    <Tabs
                        value={tabValue}
                        onChange={handleTabChange}
                        aria-label="opções de impressão"
                        sx={{
                            "& .MuiTabs-indicator": {
                                backgroundColor: corTopo,
                            },
                            "& .Mui-selected": {
                                color: corTopo,
                            },
                        }}
                    >
                        <Tab label="Tipo de Etiqueta" />
                        <Tab label="Layout" />
                        <Tab label="Tamanho" />
                        <Tab label="Personalizado" icon={<SettingsIcon fontSize="small" />} iconPosition="end" />
                    </Tabs>

                    <TabPanel value={tabValue} index={0}>
                        <FormControl component="fieldset">
                            <FormLabel component="legend">Tipo de Etiqueta</FormLabel>
                            <RadioGroup row value={tipoEtiqueta} onChange={handleTipoEtiquetaChange}>
                                <FormControlLabel
                                    value="barcode"
                                    control={<Radio sx={{ "&.Mui-checked": { color: corTopo } }} />}
                                    label="Código de Barras"
                                    disabled={layoutEtiqueta === "produtos"}
                                />
                                <FormControlLabel
                                    value="qrcode"
                                    control={<Radio sx={{ "&.Mui-checked": { color: corTopo } }} />}
                                    label="QR Code"
                                />
                                <FormControlLabel
                                    value="ambos"
                                    control={<Radio sx={{ "&.Mui-checked": { color: corTopo } }} />}
                                    label="Ambos"
                                    disabled={layoutEtiqueta === "produtos"}
                                />
                            </RadioGroup>
                        </FormControl>
                    </TabPanel>

                    <TabPanel value={tabValue} index={1}>
                        <FormControl component="fieldset">
                            <FormLabel component="legend">Layout da Etiqueta</FormLabel>
                            <RadioGroup row value={layoutEtiqueta} onChange={handleLayoutEtiquetaChange}>
                                <FormControlLabel
                                    value="simples"
                                    control={<Radio sx={{ "&.Mui-checked": { color: corTopo } }} />}
                                    label="Simples"
                                />
                                <FormControlLabel
                                    value="produtos"
                                    control={<Radio sx={{ "&.Mui-checked": { color: corTopo } }} />}
                                    label="Com Produtos"
                                />
                            </RadioGroup>

                            {layoutEtiqueta === "produtos" && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                                    O layout com produtos utiliza apenas QR Code e busca automaticamente os produtos de cada endereço.
                                </Typography>
                            )}
                        </FormControl>
                    </TabPanel>

                    <TabPanel value={tabValue} index={2}>
                        <FormControl component="fieldset">
                            <FormLabel component="legend">Tamanho da Etiqueta</FormLabel>
                            <RadioGroup row value={tamanhoEtiqueta} onChange={handleTamanhoEtiquetaChange}>
                                <FormControlLabel
                                    value="pequeno"
                                    control={<Radio sx={{ "&.Mui-checked": { color: corTopo } }} />}
                                    label="Pequeno"
                                />
                                <FormControlLabel
                                    value="medio"
                                    control={<Radio sx={{ "&.Mui-checked": { color: corTopo } }} />}
                                    label="Médio"
                                />
                                <FormControlLabel
                                    value="grande"
                                    control={<Radio sx={{ "&.Mui-checked": { color: corTopo } }} />}
                                    label="Grande"
                                />
                                <FormControlLabel
                                    value="personalizado"
                                    control={<Radio sx={{ "&.Mui-checked": { color: corTopo } }} />}
                                    label="Personalizado"
                                />
                            </RadioGroup>
                        </FormControl>
                    </TabPanel>

                    <TabPanel value={tabValue} index={3}>
                        <Typography variant="subtitle2" gutterBottom>
                            Dimensões Personalizadas
                        </Typography>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                            <Box sx={{ flex: "1 1 45%", minWidth: "250px" }}>
                                <Typography gutterBottom>Altura da Etiqueta</Typography>
                                <Box sx={{ display: "flex", alignItems: "center" }}>
                                    <Slider
                                        value={dimensoesPersonalizadas.height}
                                        onChange={handleSliderChange("height")}
                                        min={100}
                                        max={300}
                                        sx={{
                                            mr: 2,
                                            "& .MuiSlider-thumb": {
                                                color: corTopo,
                                            },
                                            "& .MuiSlider-track": {
                                                color: corTopo,
                                            },
                                        }}
                                    />
                                    <TextField
                                        value={dimensoesPersonalizadas.height}
                                        onChange={handleDimensaoChange("height")}
                                        type="number"
                                        InputProps={{
                                            endAdornment: <InputAdornment position="end">px</InputAdornment>,
                                        }}
                                        inputProps={{
                                            min: 100,
                                            max: 300,
                                            step: 10,
                                        }}
                                        sx={{ width: 100 }}
                                    />
                                </Box>
                            </Box>

                            <Box sx={{ flex: "1 1 45%", minWidth: "250px" }}>
                                <Typography gutterBottom>Largura do Código de Barras</Typography>
                                <Box sx={{ display: "flex", alignItems: "center" }}>
                                    <Slider
                                        value={dimensoesPersonalizadas.barcodeWidth}
                                        onChange={handleSliderChange("barcodeWidth")}
                                        min={100}
                                        max={300}
                                        sx={{
                                            mr: 2,
                                            "& .MuiSlider-thumb": {
                                                color: corTopo,
                                            },
                                            "& .MuiSlider-track": {
                                                color: corTopo,
                                            },
                                        }}
                                    />
                                    <TextField
                                        value={dimensoesPersonalizadas.barcodeWidth}
                                        onChange={handleDimensaoChange("barcodeWidth")}
                                        type="number"
                                        InputProps={{
                                            endAdornment: <InputAdornment position="end">px</InputAdornment>,
                                        }}
                                        inputProps={{
                                            min: 100,
                                            max: 300,
                                            step: 10,
                                        }}
                                        sx={{ width: 100 }}
                                    />
                                </Box>
                            </Box>

                            <Box sx={{ flex: "1 1 45%", minWidth: "250px" }}>
                                <Typography gutterBottom>Altura do Código de Barras</Typography>
                                <Box sx={{ display: "flex", alignItems: "center" }}>
                                    <Slider
                                        value={dimensoesPersonalizadas.barcodeHeight}
                                        onChange={handleSliderChange("barcodeHeight")}
                                        min={40}
                                        max={150}
                                        sx={{
                                            mr: 2,
                                            "& .MuiSlider-thumb": {
                                                color: corTopo,
                                            },
                                            "& .MuiSlider-track": {
                                                color: corTopo,
                                            },
                                        }}
                                    />
                                    <TextField
                                        value={dimensoesPersonalizadas.barcodeHeight}
                                        onChange={handleDimensaoChange("barcodeHeight")}
                                        type="number"
                                        InputProps={{
                                            endAdornment: <InputAdornment position="end">px</InputAdornment>,
                                        }}
                                        inputProps={{
                                            min: 40,
                                            max: 150,
                                            step: 10,
                                        }}
                                        sx={{ width: 100 }}
                                    />
                                </Box>
                            </Box>

                            <Box sx={{ flex: "1 1 45%", minWidth: "250px" }}>
                                <Typography gutterBottom>Tamanho do QR Code</Typography>
                                <Box sx={{ display: "flex", alignItems: "center" }}>
                                    <Slider
                                        value={dimensoesPersonalizadas.qrcodeSize}
                                        onChange={handleSliderChange("qrcodeSize")}
                                        min={80}
                                        max={200}
                                        sx={{
                                            mr: 2,
                                            "& .MuiSlider-thumb": {
                                                color: corTopo,
                                            },
                                            "& .MuiSlider-track": {
                                                color: corTopo,
                                            },
                                        }}
                                    />
                                    <TextField
                                        value={dimensoesPersonalizadas.qrcodeSize}
                                        onChange={handleDimensaoChange("qrcodeSize")}
                                        type="number"
                                        InputProps={{
                                            endAdornment: <InputAdornment position="end">px</InputAdornment>,
                                        }}
                                        inputProps={{
                                            min: 80,
                                            max: 200,
                                            step: 10,
                                        }}
                                        sx={{ width: 100 }}
                                    />
                                </Box>
                            </Box>
                        </Box>
                    </TabPanel>
                </Box>

                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                        Pré-visualização ({enderecos.length} etiquetas)
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, maxHeight: "500px", overflow: "auto" }}>
                        <ImpressaoEtiquetasEnderecos
                            ref={impressaoRef}
                            enderecos={enderecos}
                            tipoEtiqueta={tipoEtiqueta}
                            tamanho={tamanhoEtiqueta}
                            layout={layoutEtiqueta}
                            dimensoesPersonalizadas={tamanhoEtiqueta === "personalizado" ? dimensoesPersonalizadas : undefined}
                        />
                    </Paper>
                </Box>

                <Box sx={{ display: "flex", justifyContent: "center" }}>
                    <Button
                        variant="contained"
                        startIcon={<PrintIcon />}
                        onClick={handlePrint}
                        disabled={enderecos.length === 0}
                        sx={{ backgroundColor: corTopo }}
                    >
                        Imprimir Etiquetas
                    </Button>
                </Box>
            </Paper>
        </Container>
    )
}

export default ImprimirEtiquetasEnderecos
