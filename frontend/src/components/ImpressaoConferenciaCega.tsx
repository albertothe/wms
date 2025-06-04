import React from "react"
import { Typography, Box, Table, TableBody, TableCell, TableHead, TableRow, Paper } from "@mui/material"

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

interface Lote {
    lote: string
    qtde_total: number
}

interface ImpressaoConferenciaCegaProps {
    nota: string
    data: string
    emitente: string
    produtos: ProdutoEntrada[]
    lotesPorProduto: Record<string, Lote[]>
}

const formatarData = (data: string): string => {
    const partes = data.split("T")[0].split("-")
    if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`
    }
    return data
}

const ImpressaoConferenciaCega: React.FC<ImpressaoConferenciaCegaProps> = ({
    nota,
    data,
    emitente,
    produtos,
    lotesPorProduto,
}) => {
    return (
        <Box sx={{ p: 4, maxWidth: "210mm", margin: "0 auto", backgroundColor: "white" }} id="impressao-conferencia">
            <Box sx={{ mb: 4, textAlign: "center" }}>
                <Typography variant="h5" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
                    CONFERÊNCIA CEGA - NOTA DE ENTRADA
                </Typography>
                <Typography variant="body1" sx={{ mb: 0.5 }}>
                    Nota: <strong>{nota}</strong> | Data: <strong>{formatarData(data)}</strong>
                </Typography>
                <Typography variant="body1">
                    Emitente: <strong>{emitente}</strong>
                </Typography>
            </Box>

            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Produtos para Conferência
            </Typography>

            <Paper sx={{ mb: 4, overflow: "hidden" }}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ backgroundColor: "#f3f4f6" }}>
                            <TableCell sx={{ fontWeight: 600 }}>Código</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Produto</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Unidade</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Controla Lote</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Qtde Conferida</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {produtos.map((produto) => (
                            <React.Fragment key={produto.codproduto}>
                                <TableRow>
                                    <TableCell>{produto.codproduto}</TableCell>
                                    <TableCell>{produto.produto}</TableCell>
                                    <TableCell>{produto.unidade}</TableCell>
                                    <TableCell>{produto.controla_lote}</TableCell>
                                    <TableCell>_________________</TableCell>
                                </TableRow>
                                {produto.controla_lote.toLowerCase() === "sim" &&
                                    lotesPorProduto[produto.codproduto] &&
                                    lotesPorProduto[produto.codproduto].length > 0 && (
                                        <>
                                            <TableRow>
                                                <TableCell colSpan={5} sx={{ p: 0, border: 0 }}>
                                                    <Box sx={{ pl: 4, pr: 2, py: 1, backgroundColor: "#f9fafb" }}>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                                                            Lotes do Produto
                                                        </Typography>
                                                        <Table size="small">
                                                            <TableHead>
                                                                <TableRow sx={{ backgroundColor: "#f3f4f6" }}>
                                                                    <TableCell sx={{ fontWeight: 600 }}>Lote</TableCell>
                                                                    <TableCell sx={{ fontWeight: 600 }}>Qtde Conferida</TableCell>
                                                                </TableRow>
                                                            </TableHead>
                                                            <TableBody>
                                                                {lotesPorProduto[produto.codproduto].map((lote) => (
                                                                    <TableRow key={lote.lote}>
                                                                        <TableCell>{lote.lote}</TableCell>
                                                                        <TableCell>_________________</TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        </>
                                    )}
                            </React.Fragment>
                        ))}
                    </TableBody>
                </Table>
            </Paper>

            <Box sx={{ mt: 6, display: "flex", justifyContent: "space-between" }}>
                <Box sx={{ width: "45%", borderTop: "1px solid #000", pt: 1, textAlign: "center" }}>
                    <Typography variant="body2">Conferente</Typography>
                </Box>
                <Box sx={{ width: "45%", borderTop: "1px solid #000", pt: 1, textAlign: "center" }}>
                    <Typography variant="body2">Responsável</Typography>
                </Box>
            </Box>

            <Box sx={{ mt: 4, textAlign: "center" }}>
                <Typography variant="body2" sx={{ fontStyle: "italic", color: "text.secondary" }}>
                    Documento gerado em {new Date().toLocaleString()}
                </Typography>
            </Box>
        </Box>
    )
}

export default ImpressaoConferenciaCega
