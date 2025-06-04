"use client"

import type React from "react"
import { useRef, useState } from "react"
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    IconButton,
    Typography,
    Box,
    Tabs,
    Tab,
    FormControl,
    FormLabel,
    RadioGroup,
    FormControlLabel,
    Radio,
} from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"
import PrintIcon from "@mui/icons-material/Print"
import SettingsIcon from "@mui/icons-material/Settings"
import ImpressaoEtiquetasEnderecos, { type EtiquetaSize, type EtiquetaLayout } from "./ImpressaoEtiquetasEnderecos"
import { printElement } from "../utils/printHelper"

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
            id={`etiquetas-tabpanel-${index}`}
            aria-labelledby={`etiquetas-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
        </div>
    )
}

interface ModalEtiquetasEnderecosProps {
    open: boolean
    onClose: () => void
    enderecos: Array<{
        codendereco: string
        rua: string
        predio: string
        andar?: string
        apto?: string
    }>
    tipoEtiqueta: "barcode" | "qrcode" | "ambos"
    tamanho: EtiquetaSize
    layout?: EtiquetaLayout
    dimensoesPersonalizadas?: {
        width: number
        height: number
        barcodeWidth: number
        barcodeHeight: number
        qrcodeSize: number
    }
}

const ModalEtiquetasEnderecos: React.FC<ModalEtiquetasEnderecosProps> = ({
    open,
    onClose,
    enderecos,
    tipoEtiqueta: tipoEtiquetaInicial,
    tamanho: tamanhoInicial,
    layout = "simples",
    dimensoesPersonalizadas,
}) => {
    const impressaoRef = useRef<HTMLDivElement>(null)
    const [tabValue, setTabValue] = useState(0)
    const [tipoEtiqueta, setTipoEtiqueta] = useState<"barcode" | "qrcode" | "ambos">(tipoEtiquetaInicial)
    const [tamanho, setTamanho] = useState<EtiquetaSize>(tamanhoInicial)

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue)
    }

    const handleTipoEtiquetaChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setTipoEtiqueta(event.target.value as "barcode" | "qrcode" | "ambos")
    }

    const handleTamanhoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setTamanho(event.target.value as EtiquetaSize)
    }

    const handlePrint = () => {
        if (impressaoRef.current) {
            printElement(impressaoRef.current)
        }
    }

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: {
                    maxHeight: "90vh",
                    height: "auto",
                },
            }}
        >
            <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
                <Typography variant="h6">Etiquetas de Endereços</Typography>
                <Box>
                    <IconButton color="primary" onClick={handlePrint} sx={{ mr: 1 }}>
                        <PrintIcon />
                    </IconButton>
                    <IconButton onClick={onClose}>
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <Box sx={{ borderBottom: 1, borderColor: "divider", px: 3 }}>
                <Tabs value={tabValue} onChange={handleTabChange} aria-label="opções de etiqueta">
                    <Tab label="Visualização" id="etiquetas-tab-0" aria-controls="etiquetas-tabpanel-0" />
                    <Tab
                        label="Configurações"
                        id="etiquetas-tab-1"
                        aria-controls="etiquetas-tabpanel-1"
                        icon={<SettingsIcon fontSize="small" />}
                        iconPosition="end"
                    />
                </Tabs>
            </Box>

            <DialogContent dividers>
                <TabPanel value={tabValue} index={0}>
                    <ImpressaoEtiquetasEnderecos
                        ref={impressaoRef}
                        enderecos={enderecos}
                        tipoEtiqueta={tipoEtiqueta}
                        tamanho={tamanho}
                        layout={layout}
                        dimensoesPersonalizadas={dimensoesPersonalizadas}
                    />
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                    <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 4 }}>
                        <FormControl component="fieldset" sx={{ mb: 2, minWidth: "200px" }}>
                            <FormLabel component="legend">Tipo de Etiqueta</FormLabel>
                            <RadioGroup value={tipoEtiqueta} onChange={handleTipoEtiquetaChange}>
                                <FormControlLabel value="barcode" control={<Radio />} label="Código de Barras" />
                                <FormControlLabel value="qrcode" control={<Radio />} label="QR Code" />
                                <FormControlLabel value="ambos" control={<Radio />} label="Ambos" />
                            </RadioGroup>
                        </FormControl>

                        <FormControl component="fieldset" sx={{ mb: 2, minWidth: "200px" }}>
                            <FormLabel component="legend">Tamanho da Etiqueta</FormLabel>
                            <RadioGroup value={tamanho} onChange={handleTamanhoChange}>
                                <FormControlLabel value="pequeno" control={<Radio />} label="Pequeno" />
                                <FormControlLabel value="medio" control={<Radio />} label="Médio" />
                                <FormControlLabel value="grande" control={<Radio />} label="Grande" />
                            </RadioGroup>
                        </FormControl>
                    </Box>
                </TabPanel>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} color="inherit">
                    Fechar
                </Button>
                <Button onClick={handlePrint} color="primary" variant="contained" startIcon={<PrintIcon />}>
                    Imprimir
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export default ModalEtiquetasEnderecos

// Re-exportar o tipo EtiquetaLayout para uso em outros componentes
export type { EtiquetaLayout } from "./ImpressaoEtiquetasEnderecos"
