"use client"

import { forwardRef, useRef, useEffect, useState } from "react"
import { Box, Typography, Paper } from "@mui/material"
import { generateQRCodeAsDataURLSync } from "../utils/barcodeGenerator"

interface Produto {
    codproduto: string
    produto: string
    complemento?: string
    unidade?: string
    codbarra?: string
    lote?: string
    quantidade: number
}

interface Endereco {
    codendereco: string
    rua: string
    predio: string
    andar?: string
    apto?: string
}

// Definição dos tamanhos de etiquetas
export type EtiquetaSize = "pequeno" | "medio" | "grande"

// Configurações de tamanho para cada opção
export const etiquetaSizes = {
    pequeno: {
        width: 180,
        height: 90,
        qrcodeSize: 65,
        fontSize: {
            location: "0.6rem",
            locationCode: "0.9rem",
            sku: "0.6rem",
            skuCode: "1rem",
        },
        itemsPerRow: 4,
    },
    medio: {
        width: 280,
        height: 140,
        qrcodeSize: 90,
        fontSize: {
            location: "0.8rem",
            locationCode: "1.2rem",
            sku: "0.8rem",
            skuCode: "1.5rem",
        },
        itemsPerRow: 2,
    },
    grande: {
        width: 380,
        height: 190,
        qrcodeSize: 120,
        fontSize: {
            location: "1rem",
            locationCode: "1.6rem",
            sku: "1rem",
            skuCode: "1.8rem",
        },
        itemsPerRow: 1,
    },
}

interface EtiquetaEnderecoProps {
    endereco: Endereco
    produto?: Produto
    tamanho: EtiquetaSize
}

// Componente para a etiqueta individual no estilo exato da imagem
const EtiquetaEndereco = ({ endereco, produto, tamanho }: EtiquetaEnderecoProps) => {
    const [qrcodeUrl, setQrcodeUrl] = useState<string>('');
    const sizeConfig = etiquetaSizes[tamanho];

    useEffect(() => {
        // Gerar o código QR como uma imagem data URL usando a versão síncrona
        try {
            // Criar o texto para o QR code (endereço + produto se disponível)
            const qrText = produto
                ? `${endereco.codendereco}|${produto.codproduto}|${produto.lote || ""}`
                : endereco.codendereco;

            // Usar a versão síncrona para garantir que o QR code seja gerado imediatamente
            const dataUrl = generateQRCodeAsDataURLSync(qrText, sizeConfig.qrcodeSize);
            setQrcodeUrl(dataUrl);
        } catch (error) {
            console.error('Erro ao gerar QR code:', error);
        }
    }, [endereco, produto, sizeConfig.qrcodeSize]);

    return (
        <Paper
            elevation={0}
            sx={{
                width: sizeConfig.width,
                height: sizeConfig.height,
                border: "1px solid #000",
                display: "flex",
                overflow: "hidden",
                margin: "0", // Alterado de "0 auto" para "0"
                mb: 0.5, // Reduzido de mb: 2 para mb: 0.5
                pageBreakInside: "avoid", // Evitar quebra de página no meio da etiqueta
            }}
            className="etiqueta"
        >
            {/* Lado esquerdo - QR Code */}
            <Box
                sx={{
                    width: "50%",
                    height: "100%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    borderRight: "1px solid #000",
                    padding: 1,
                }}
                className="qrcode-container"
            >
                {qrcodeUrl ? (
                    <img
                        src={qrcodeUrl || "/placeholder.svg"}
                        alt={`QR Code ${endereco.codendereco}${produto ? '-' + produto.codproduto : ''}`}
                        width={sizeConfig.qrcodeSize}
                        height={sizeConfig.qrcodeSize}
                        className="qrcode-image"
                        style={{
                            maxWidth: "100%",
                            maxHeight: "100%"
                        }}
                    />
                ) : (
                    <Box
                        sx={{
                            width: sizeConfig.qrcodeSize,
                            height: sizeConfig.qrcodeSize,
                            backgroundColor: '#f0f0f0',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}
                    >
                        <Typography variant="caption">Carregando...</Typography>
                    </Box>
                )}
            </Box>

            {/* Lado direito - Informações */}
            <Box sx={{ width: "50%", height: "100%", display: "flex", flexDirection: "column" }}>
                {/* Seção Endereço */}
                <Box
                    sx={{
                        height: "50%",
                        borderBottom: "1px solid #000",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        padding: 1,
                    }}
                    className="etiqueta-endereco"
                >
                    <Typography
                        variant="caption"
                        component="div"
                        sx={{
                            textAlign: "center",
                            fontWeight: "bold",
                            fontSize: sizeConfig.fontSize.location,
                            textTransform: "uppercase",
                        }}
                    >
                        Endereço
                    </Typography>
                    <Typography
                        variant="h6"
                        component="div"
                        sx={{
                            textAlign: "center",
                            fontWeight: "bold",
                            fontSize: sizeConfig.fontSize.locationCode,
                        }}
                    >
                        {endereco.codendereco}
                    </Typography>
                </Box>

                {/* Seção SKU */}
                <Box
                    sx={{
                        height: "50%",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        padding: 1,
                    }}
                    className="etiqueta-info"
                >
                    <Typography
                        variant="caption"
                        component="div"
                        sx={{
                            textAlign: "center",
                            fontWeight: "bold",
                            fontSize: sizeConfig.fontSize.sku,
                            textTransform: "uppercase",
                        }}
                    >
                        SKU
                    </Typography>
                    <Typography
                        variant="h6"
                        component="div"
                        sx={{
                            textAlign: "center",
                            fontWeight: "bold",
                            fontSize: sizeConfig.fontSize.skuCode,
                        }}
                        className="etiqueta-titulo"
                    >
                        {produto ? produto.codproduto : ""}
                    </Typography>
                </Box>
            </Box>
        </Paper>
    )
}

interface ImpressaoEtiquetaProdutosProps {
    endereco: Endereco
    produtos: Produto[]
    tamanhoEtiqueta: EtiquetaSize
    mostrarListaProdutos?: boolean
}

const ImpressaoEtiquetaProdutos = forwardRef<HTMLDivElement, ImpressaoEtiquetaProdutosProps>(
    ({ endereco, produtos, tamanhoEtiqueta, mostrarListaProdutos = true }, ref) => {
        const enderecoCompleto = `${endereco.rua}-${endereco.predio}${endereco.andar ? `-${endereco.andar}` : ""}${endereco.apto ? `-${endereco.apto}` : ""
            }`

        const itemsPerRow = etiquetaSizes[tamanhoEtiqueta].itemsPerRow;

        // Função para dividir os produtos em linhas
        const chunkArray = (array: Produto[], size: number) => {
            const result = [];
            for (let i = 0; i < array.length; i += size) {
                result.push(array.slice(i, i + size));
            }
            return result;
        };

        // Dividir os produtos em linhas com base no número de itens por linha
        const produtosEmLinhas = chunkArray(produtos, itemsPerRow);

        return (
            <Box ref={ref} sx={{ p: 3, backgroundColor: "white", width: "100%" }} className="etiqueta-container">
                {mostrarListaProdutos && (
                    <Box sx={{ mb: 4, display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <Typography variant="h5" component="h1" gutterBottom>
                            Etiquetas de Endereço com Produtos
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Endereço: {enderecoCompleto} | {produtos.length} produtos encontrados
                        </Typography>
                    </Box>
                )}

                {/* Etiqueta do endereço sem produto específico */}
                {mostrarListaProdutos && (
                    <Box sx={{ mb: 4 }}>
                        <Typography variant="h6" gutterBottom sx={{ borderBottom: "1px solid #eee", pb: 1 }}>
                            Etiqueta do Endereço
                        </Typography>
                        <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
                            <EtiquetaEndereco endereco={endereco} tamanho={tamanhoEtiqueta} />
                        </Box>
                    </Box>
                )}

                {/* Etiquetas para cada produto - Usando tabela HTML para garantir consistência na impressão */}
                {produtos.length > 0 && (
                    <Box sx={{ mb: 4 }}>
                        {mostrarListaProdutos && (
                            <Typography variant="h6" gutterBottom sx={{ borderBottom: "1px solid #eee", pb: 1 }}>
                                Etiquetas por Produto
                            </Typography>
                        )}

                        {/* Usando tabela HTML para garantir layout consistente na impressão */}
                        <table style={{
                            width: '100%',
                            borderCollapse: 'separate',
                            borderSpacing: '4px',
                            pageBreakInside: 'auto'
                        }}>
                            <tbody>
                                {produtosEmLinhas.map((linha, rowIndex) => (
                                    <tr key={`row-${rowIndex}`} style={{ pageBreakInside: 'avoid' }}>
                                        {linha.map((produto) => (
                                            <td
                                                key={`${produto.codproduto}-${produto.lote || "sem-lote"}`}
                                                style={{
                                                    padding: '2px',
                                                    verticalAlign: 'top',
                                                    pageBreakInside: 'avoid',
                                                    width: `${100 / itemsPerRow}%`
                                                }}
                                            >
                                                <EtiquetaEndereco endereco={endereco} produto={produto} tamanho={tamanhoEtiqueta} />
                                            </td>
                                        ))}

                                        {/* Adicionar células vazias para completar a linha */}
                                        {linha.length < itemsPerRow && Array.from({ length: itemsPerRow - linha.length }).map((_, index) => (
                                            <td key={`empty-${rowIndex}-${index}`} style={{ width: `${100 / itemsPerRow}%` }}></td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Box>
                )}

                {mostrarListaProdutos && (
                    <Box sx={{ mt: 4, borderTop: "1px dashed #ccc", pt: 2, textAlign: "center" }}>
                        <Typography variant="caption" color="text.secondary">
                            Impresso em {new Date().toLocaleString()}
                        </Typography>
                    </Box>
                )}
            </Box>
        )
    },
)

ImpressaoEtiquetaProdutos.displayName = "ImpressaoEtiquetaProdutos"

export default ImpressaoEtiquetaProdutos