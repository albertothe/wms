"use client"

import { forwardRef, useRef, useEffect } from "react"
import { Box, Typography, Paper } from "@mui/material"
import { generateBarcode, generateQRCode } from "../utils/barcodeGenerator"

// Definição dos tamanhos de etiquetas
export type EtiquetaSize = "pequeno" | "medio" | "grande" | "personalizado"
// Mantendo o tipo EtiquetaLayout para compatibilidade, mesmo que não seja usado internamente
export type EtiquetaLayout = "simples" | "produtos"

// Configurações de tamanho para cada opção
export const etiquetaSizes = {
    pequeno: {
        width: { xs: "50%", sm: "33.33%", md: "25%" },
        height: 120,
        barcodeWidth: 120,
        barcodeHeight: 60,
        qrcodeSize: 80,
        fontSize: {
            title: "0.75rem",
            code: "0.65rem",
        },
        padding: 1.5,
    },
    medio: {
        width: { xs: "100%", sm: "50%", md: "33.33%" },
        height: 180,
        barcodeWidth: 180,
        barcodeHeight: 80,
        qrcodeSize: 100,
        fontSize: {
            title: "0.875rem",
            code: "0.75rem",
        },
        padding: 2,
    },
    grande: {
        width: { xs: "100%", sm: "100%", md: "50%" },
        height: 250,
        barcodeWidth: 220,
        barcodeHeight: 100,
        qrcodeSize: 150,
        fontSize: {
            title: "1rem",
            code: "0.875rem",
        },
        padding: 3,
    },
    personalizado: {
        width: { xs: "100%", sm: "50%", md: "33.33%" },
        height: 180,
        barcodeWidth: 180,
        barcodeHeight: 80,
        qrcodeSize: 100,
        fontSize: {
            title: "0.875rem",
            code: "0.75rem",
        },
        padding: 2,
    },
}

interface EtiquetaProps {
    codendereco: string
    rua: string
    predio: string
    andar?: string
    apto?: string
    tipoEtiqueta: "barcode" | "qrcode" | "ambos"
    tamanho: EtiquetaSize
    layout?: EtiquetaLayout // Mantido como opcional para compatibilidade
    dimensoesPersonalizadas?: {
        width: number
        height: number
        barcodeWidth: number
        barcodeHeight: number
        qrcodeSize: number
    }
}

const Etiqueta = ({
    codendereco,
    rua,
    predio,
    andar,
    apto,
    tipoEtiqueta,
    tamanho,
    dimensoesPersonalizadas,
}: EtiquetaProps) => {
    const barcodeRef = useRef<HTMLCanvasElement>(null)
    const qrcodeRef = useRef<HTMLCanvasElement>(null)

    // Obter as configurações de tamanho
    const sizeConfig = etiquetaSizes[tamanho]

    // Usar dimensões personalizadas se fornecidas e o tamanho for personalizado
    const barcodeWidth =
        tamanho === "personalizado" && dimensoesPersonalizadas
            ? dimensoesPersonalizadas.barcodeWidth
            : sizeConfig.barcodeWidth

    const barcodeHeight =
        tamanho === "personalizado" && dimensoesPersonalizadas
            ? dimensoesPersonalizadas.barcodeHeight
            : sizeConfig.barcodeHeight

    const qrcodeSize =
        tamanho === "personalizado" && dimensoesPersonalizadas ? dimensoesPersonalizadas.qrcodeSize : sizeConfig.qrcodeSize

    // Calcular tamanhos ajustados para quando ambos os códigos são exibidos
    const adjustedBarcodeWidth = tipoEtiqueta === "ambos" ? Math.floor(barcodeWidth * 0.6) : barcodeWidth
    const adjustedBarcodeHeight = tipoEtiqueta === "ambos" ? Math.floor(barcodeHeight * 0.8) : barcodeHeight
    const adjustedQRCodeSize = tipoEtiqueta === "ambos" ? Math.floor(qrcodeSize * 0.6) : qrcodeSize

    useEffect(() => {
        if (barcodeRef.current && (tipoEtiqueta === "barcode" || tipoEtiqueta === "ambos")) {
            generateBarcode(barcodeRef.current, codendereco, adjustedBarcodeWidth, adjustedBarcodeHeight)
        }

        if (qrcodeRef.current && (tipoEtiqueta === "qrcode" || tipoEtiqueta === "ambos")) {
            generateQRCode(qrcodeRef.current, codendereco, adjustedQRCodeSize)
        }
    }, [
        codendereco,
        tipoEtiqueta,
        tamanho,
        dimensoesPersonalizadas,
        adjustedBarcodeWidth,
        adjustedBarcodeHeight,
        adjustedQRCodeSize,
    ])

    const enderecoCompleto = `${rua}-${predio}${andar ? `-${andar}` : ""}${apto ? `-${apto}` : ""}`

    return (
        <Paper
            elevation={0}
            sx={{
                p: sizeConfig.padding,
                border: "1px solid #ddd",
                height:
                    tamanho === "personalizado" && dimensoesPersonalizadas ? dimensoesPersonalizadas.height : sizeConfig.height,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                overflow: "hidden", // Impede que o conteúdo ultrapasse os limites da etiqueta
                breakInside: "avoid", // Impede quebra de página dentro da etiqueta
                pageBreakInside: "avoid", // Para navegadores mais antigos
            }}
            className="etiqueta"
        >
            <Box sx={{ mb: 1 }}>
                <Typography
                    variant="subtitle2"
                    sx={{
                        fontWeight: "bold",
                        fontSize: sizeConfig.fontSize.title,
                    }}
                    className="etiqueta-titulo"
                >
                    {enderecoCompleto}
                </Typography>
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontSize: sizeConfig.fontSize.code }}
                    className="etiqueta-info"
                >
                    Código: {codendereco}
                </Typography>
            </Box>

            <Box
                sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    flexGrow: 1,
                    py: 1,
                    flexDirection: tipoEtiqueta === "ambos" ? "row" : "column",
                    gap: 2,
                }}
                className="qrcode-container"
            >
                {(tipoEtiqueta === "barcode" || tipoEtiqueta === "ambos") && (
                    <canvas
                        ref={barcodeRef}
                        width={adjustedBarcodeWidth}
                        height={adjustedBarcodeHeight}
                        style={{ maxWidth: "100%" }}
                    />
                )}

                {(tipoEtiqueta === "qrcode" || tipoEtiqueta === "ambos") && (
                    <canvas
                        ref={qrcodeRef}
                        width={adjustedQRCodeSize}
                        height={adjustedQRCodeSize}
                        style={{ maxWidth: "100%" }}
                        className="qrcode-image"
                    />
                )}
            </Box>
        </Paper>
    )
}

interface ImpressaoEtiquetasEnderecosProps {
    enderecos: Array<{
        codendereco: string
        rua: string
        predio: string
        andar?: string
        apto?: string
    }>
    tipoEtiqueta: "barcode" | "qrcode" | "ambos"
    tamanho: EtiquetaSize
    layout?: EtiquetaLayout // Mantido como opcional para compatibilidade
    dimensoesPersonalizadas?: {
        width: number
        height: number
        barcodeWidth: number
        barcodeHeight: number
        qrcodeSize: number
    }
}

// Usando forwardRef para manter compatibilidade com o código existente
const ImpressaoEtiquetasEnderecos = forwardRef<HTMLDivElement, ImpressaoEtiquetasEnderecosProps>(
    ({ enderecos, tipoEtiqueta, tamanho, layout = "simples", dimensoesPersonalizadas }, ref) => {
        // Obter as configurações de tamanho
        const sizeConfig = etiquetaSizes[tamanho]

        // Calcular a largura com base no tamanho selecionado ou personalizado
        const boxWidth =
            tamanho === "personalizado" && dimensoesPersonalizadas
                ? { xs: "100%", sm: "50%", md: "33.33%" } // Valor padrão para personalizado
                : sizeConfig.width

        return (
            <Box ref={ref} sx={{ p: 2, backgroundColor: "white" }}>
                <Box
                    sx={{
                        mb: 3,
                        textAlign: "center",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                    className="no-print"
                >
                    <Typography variant="h5" component="h1" gutterBottom>
                        Etiquetas de Endereços
                    </Typography>
                </Box>

                <Box sx={{ mb: 2, textAlign: "center" }} className="no-print">
                    <Typography variant="body2" color="text.secondary">
                        {enderecos.length} etiquetas geradas
                    </Typography>
                </Box>

                {/* Cabeçalho para impressão */}
                <Box sx={{ display: "none", "@media print": { display: "block", mb: 2, textAlign: "center" } }}>
                    <Typography variant="h5" component="h1" gutterBottom>
                        Etiquetas de Endereços
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {enderecos.length} etiquetas geradas
                    </Typography>
                </Box>

                <Box sx={{ display: "flex", flexWrap: "wrap", margin: -1 }} className="etiqueta-container">
                    {enderecos.map((endereco) => (
                        <Box
                            key={endereco.codendereco}
                            sx={{
                                width: boxWidth,
                                padding: 1,
                                boxSizing: "border-box",
                            }}
                            className={`etiqueta-item etiqueta-item-${tamanho}`}
                        >
                            <Etiqueta
                                codendereco={endereco.codendereco}
                                rua={endereco.rua}
                                predio={endereco.predio}
                                andar={endereco.andar}
                                apto={endereco.apto}
                                tipoEtiqueta={tipoEtiqueta}
                                tamanho={tamanho}
                                layout={layout}
                                dimensoesPersonalizadas={dimensoesPersonalizadas}
                            />
                        </Box>
                    ))}
                </Box>
            </Box>
        )
    },
)

ImpressaoEtiquetasEnderecos.displayName = "ImpressaoEtiquetasEnderecos"

export default ImpressaoEtiquetasEnderecos
