import type React from "react"
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from "@mui/material"

interface Produto {
    codigo: string
    descricao: string
    unidade: string
    quantidade: number
    valorUnitario: number
    valorTotal?: number
    lote?: string
}

interface Endereco {
    codigo: string
    rua: string
    predio: string
    andar?: string
    apto?: string
    quantidade: number
    codproduto: string
    descricaoProduto?: string
    lote?: string
    marcado?: boolean
}

interface NotaData {
    capa: {
        numero: string
        emitente: string
        dataEmissao: string
        dataEntrada?: string
        observacoes?: string
        loja?: string
        op?: string
        separacao?: string
        np?: string
    }
    produtos: Produto[]
    enderecos: Endereco[]
    enderecosEstoque?: Endereco[]
    totais?: {
        quantidade: number
        valor: number
    }
}

interface ConfigData {
    usaQuatroNiveis: boolean
    corPrimaria: string
    empresa: {
        nome: string
        endereco?: string
        telefone?: string
        cnpj?: string
    }
    modeloImpressao?: number // 1 = completo, 2 = simplificado
}

interface ImpressaoPreNotaProps {
    notaData: NotaData
    config: ConfigData
    chave?: string
}

const formatarData = (dataString: string): string => {
    if (!dataString) return "-"

    try {
        const data = new Date(dataString)
        return data.toLocaleDateString("pt-BR")
    } catch (e) {
        // Se a data já estiver formatada ou for inválida, retorna como está
        return dataString
    }
}

const formatarValor = (valor: number): string => {
    return valor
        .toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
        })
        .replace("R$", "")
        .trim()
}

const ImpressaoPreNota: React.FC<ImpressaoPreNotaProps> = ({ notaData, config, chave }) => {
    // Determinar o modelo de impressão (padrão é 1 se não especificado)
    const modeloImpressao = config.modeloImpressao || 1

    // Calcular totais se não forem fornecidos
    const totais = notaData.totais || {
        quantidade: notaData.produtos.reduce((acc, produto) => acc + produto.quantidade, 0),
        valor: notaData.produtos.reduce(
            (acc, produto) => acc + (produto.valorTotal || produto.quantidade * produto.valorUnitario),
            0,
        ),
    }

    // Combinar endereços marcados e endereços do estoque (apenas para modelo 1)
    const todosEnderecos = [...(notaData.enderecos || []), ...(notaData.enderecosEstoque || [])]

    // Agrupar endereços por produto para exibição (apenas para modelo 1)
    const enderecosPorProduto: { [key: string]: Endereco[] } = {}

    if (modeloImpressao === 1) {
        // Primeiro, adicionar endereços do estoque
        if (notaData.enderecosEstoque && notaData.enderecosEstoque.length > 0) {
            notaData.enderecosEstoque.forEach((endereco) => {
                const key = endereco.codproduto
                if (!enderecosPorProduto[key]) {
                    enderecosPorProduto[key] = []
                }
                // Encontrar a descrição do produto
                const produto = notaData.produtos.find((p) => p.codigo === endereco.codproduto)
                if (produto) {
                    endereco.descricaoProduto = produto.descricao
                }
                enderecosPorProduto[key].push(endereco)
            })
        } else {
            // Se não tiver enderecosEstoque, usar os endereços marcados
            todosEnderecos.forEach((endereco) => {
                const key = endereco.codproduto
                if (!enderecosPorProduto[key]) {
                    enderecosPorProduto[key] = []
                }
                // Encontrar a descrição do produto
                const produto = notaData.produtos.find((p) => p.codigo === endereco.codproduto)
                if (produto) {
                    endereco.descricaoProduto = produto.descricao
                }
                enderecosPorProduto[key].push(endereco)
            })
        }
    }

    // Data atual formatada
    const dataAtual = new Date().toLocaleString("pt-BR")

    return (
        <Box sx={{ p: 4, maxWidth: "210mm", margin: "0 auto", bgcolor: "white" }} className="impressao-prenota">
            {/* Cabeçalho */}
            <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="h6" component="h1" sx={{ fontWeight: "bold" }}>
                    RELATÓRIO DE PRÉ-NOTA {modeloImpressao === 2 ? "(SIMPLIFICADO)" : ""}
                </Typography>
                <Typography variant="body2">Gerado em: {dataAtual}</Typography>
            </Box>

            {/* Informações da Nota */}
            <Box sx={{ mb: 2, borderBottom: "1px solid #ccc", pb: 1 }}>
                <Typography variant="body2">
                    Loja: {notaData.capa.loja || "00"} | Pré-Nota: {notaData.capa.numero} | NP: {notaData.capa.np || chave || "-"}{" "}
                    | Data: {formatarData(notaData.capa.dataEmissao)}
                </Typography>
            </Box>

            {/* Destinatário */}
            <Box sx={{ mb: 2, borderBottom: "1px solid #ccc", pb: 1 }}>
                <Typography variant="body2" sx={{ display: "flex" }}>
                    <Box component="span" sx={{ minWidth: "100px", fontWeight: "bold" }}>
                        Destinatário:
                    </Box>
                    <Box component="span">{notaData.capa.emitente}</Box>
                </Typography>
            </Box>

            {/* Tabela de Produtos */}
            <Typography variant="body1" sx={{ mb: 1, fontWeight: "bold", textAlign: "center" }}>
                Produtos
            </Typography>
            <TableContainer component={Paper} sx={{ mb: 3, boxShadow: "none", border: "1px solid #ddd" }}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                            <TableCell sx={{ fontWeight: "bold" }}>Cód.</TableCell>
                            <TableCell sx={{ fontWeight: "bold" }}>Descrição</TableCell>
                            {modeloImpressao === 1 && <TableCell sx={{ fontWeight: "bold" }}>CodEndereço</TableCell>}
                            <TableCell sx={{ fontWeight: "bold" }} align="right">
                                Qtde
                            </TableCell>
                            <TableCell sx={{ fontWeight: "bold" }} align="right">
                                Prç unit.
                            </TableCell>
                            <TableCell sx={{ fontWeight: "bold" }} align="right">
                                Prç Total
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {notaData.produtos.map((produto, index) => {
                            // Encontrar endereços marcados para este produto (apenas para modelo 1)
                            const enderecosMarcados =
                                modeloImpressao === 1
                                    ? notaData.enderecos
                                        .filter((e) => e.codproduto === produto.codigo)
                                        .map((e) => e.codigo)
                                        .join(", ")
                                    : ""

                            return (
                                <TableRow key={index}>
                                    <TableCell>{produto.codigo}</TableCell>
                                    <TableCell>{produto.descricao}</TableCell>
                                    {modeloImpressao === 1 && <TableCell>{enderecosMarcados || "-"}</TableCell>}
                                    <TableCell align="right">{produto.quantidade.toFixed(2)}</TableCell>
                                    <TableCell align="right">{formatarValor(produto.valorUnitario)}</TableCell>
                                    <TableCell align="right">
                                        {formatarValor(produto.valorTotal || produto.quantidade * produto.valorUnitario)}
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                        <TableRow>
                            <TableCell colSpan={modeloImpressao === 1 ? 3 : 2} sx={{ fontWeight: "bold" }}>
                                TOTAL
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: "bold" }}>
                                {totais.quantidade.toFixed(2)}
                            </TableCell>
                            <TableCell></TableCell>
                            <TableCell align="right" sx={{ fontWeight: "bold" }}>
                                {formatarValor(totais.valor)}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Endereços por Produto - APENAS PARA MODELO 1 */}
            {modeloImpressao === 1 && (
                <>
                    <Typography variant="body1" sx={{ mb: 1, fontWeight: "bold", textAlign: "center" }}>
                        Endereços por Produto
                    </Typography>

                    {Object.keys(enderecosPorProduto).length > 0 ? (
                        Object.keys(enderecosPorProduto).map((codProduto) => {
                            const enderecos = enderecosPorProduto[codProduto]
                            const produto = notaData.produtos.find((p) => p.codigo === codProduto)

                            if (!produto || enderecos.length === 0) return null

                            return (
                                <Box key={codProduto} sx={{ mb: 3 }}>
                                    <Typography variant="body2" sx={{ fontWeight: "bold", mb: 1 }}>
                                        {codProduto} - {produto.descricao}
                                    </Typography>

                                    <TableContainer component={Paper} sx={{ boxShadow: "none", border: "1px solid #ddd" }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                                                    <TableCell sx={{ fontWeight: "bold" }}>Produto</TableCell>
                                                    <TableCell sx={{ fontWeight: "bold" }}>CodEndereço</TableCell>
                                                    <TableCell sx={{ fontWeight: "bold" }}>Rua</TableCell>
                                                    <TableCell sx={{ fontWeight: "bold" }}>Prédio</TableCell>
                                                    <TableCell sx={{ fontWeight: "bold" }} align="right">
                                                        Qtde
                                                    </TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {enderecos.map((endereco, idx) => (
                                                    <TableRow key={idx} sx={endereco.marcado ? { backgroundColor: "#e3f2fd" } : {}}>
                                                        <TableCell>{endereco.codproduto}</TableCell>
                                                        <TableCell>{endereco.codigo}</TableCell>
                                                        <TableCell>{endereco.rua}</TableCell>
                                                        <TableCell>{endereco.predio}</TableCell>
                                                        <TableCell align="right">{endereco.quantidade.toFixed(2)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>
                            )
                        })
                    ) : (
                        <Box sx={{ textAlign: "center", py: 2, border: "1px solid #ddd", mb: 3 }}>
                            <Typography variant="body2">Nenhum endereço encontrado para os produtos.</Typography>
                        </Box>
                    )}
                </>
            )}

            {/* Observações adicionais para modelo 2 */}
            {modeloImpressao === 2 && notaData.capa.observacoes && (
                <Box sx={{ mb: 3, p: 2, border: "1px solid #ddd", borderRadius: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: "bold", mb: 1 }}>
                        Observações:
                    </Typography>
                    <Typography variant="body2">{notaData.capa.observacoes}</Typography>
                </Box>
            )}

            {/* Assinaturas */}
            <Box sx={{ mt: 6, display: "flex", justifyContent: "space-around" }}>
                <Box sx={{ textAlign: "center" }}>
                    <Box sx={{ borderTop: "1px solid #000", width: "200px", mb: 1 }}></Box>
                    <Typography variant="body2">Separador</Typography>
                </Box>
                <Box sx={{ textAlign: "center" }}>
                    <Box sx={{ borderTop: "1px solid #000", width: "200px", mb: 1 }}></Box>
                    <Typography variant="body2">Conferente</Typography>
                </Box>
                <Box sx={{ textAlign: "center" }}>
                    <Box sx={{ borderTop: "1px solid #000", width: "200px", mb: 1 }}></Box>
                    <Typography variant="body2">Cliente</Typography>
                </Box>
            </Box>

            {/* Rodapé com informações do modelo */}
            <Box sx={{ mt: 4, pt: 2, borderTop: "1px solid #ccc", textAlign: "center" }}>
                <Typography variant="caption" color="text.secondary">
                    Modelo de Impressão: {modeloImpressao === 1 ? "Completo" : "Simplificado"} | Sistema WMS -{" "}
                    {config.empresa?.nome || "Empresa"}
                </Typography>
            </Box>
        </Box>
    )
}

export default ImpressaoPreNota
