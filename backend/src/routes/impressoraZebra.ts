import express from "express"
import { zebraNetworkService } from "../services/zebraNetworkService"
import { logger } from "../utils/logger"

const router = express.Router()

// Rota para listar impressoras Zebra disponíveis
router.get("/impressoras", async (req, res) => {
    try {
        logger.info("Buscando impressoras Zebra em rede...")
        const impressoras = await zebraNetworkService.getPrinters()

        logger.info(`Encontradas ${impressoras.length} impressoras configuradas`)
        res.json(impressoras)
    } catch (error) {
        logger.error("Erro ao buscar impressoras Zebra:", error)
        res.status(500).json({ erro: "Erro ao buscar impressoras Zebra" })
    }
})

// Rota para imprimir ZPL
router.post("/imprimir", async (req, res) => {
    const { printerId, zplCode } = req.body

    if (!printerId || !zplCode) {
        return res.status(400).json({
            erro: "ID da impressora e código ZPL são obrigatórios",
        })
    }

    try {
        logger.info(`Iniciando impressão na impressora ${printerId}`)
        logger.debug(`ZPL recebido (${zplCode.length} caracteres)`)

        const success = await zebraNetworkService.sendZPL(printerId, zplCode)

        if (success) {
            logger.info("Impressão realizada com sucesso")
            res.json({
                mensagem: "Impressão realizada com sucesso",
                printerId,
                tamanhoZpl: zplCode.length,
            })
        } else {
            logger.error("Falha na impressão")
            res.status(500).json({ erro: "Falha na impressão" })
        }
    } catch (error) {
        logger.error("Erro ao imprimir:", error)
        res.status(500).json({
            erro: `Erro ao imprimir: ${(error as Error).message}`,
        })
    }
})

// Rota para testar impressora
router.post("/testar", async (req, res) => {
    const { printerId } = req.body

    if (!printerId) {
        return res.status(400).json({ erro: "ID da impressora é obrigatório" })
    }

    try {
        logger.info(`Testando impressora ${printerId}`)

        const success = await zebraNetworkService.testPrint(printerId)

        if (success) {
            logger.info("Teste de impressão bem-sucedido")
            res.json({
                mensagem: "Teste realizado com sucesso",
                printerId,
            })
        } else {
            logger.error("Teste de impressão falhou")
            res.status(500).json({ erro: "Teste de impressão falhou" })
        }
    } catch (error) {
        logger.error("Erro no teste:", error)
        res.status(500).json({
            erro: `Erro no teste: ${(error as Error).message}`,
        })
    }
})

// Rota para verificar conectividade
router.get("/status/:printerId", async (req, res) => {
    const { printerId } = req.params

    try {
        const impressoras = await zebraNetworkService.getPrinters()
        const impressora = impressoras.find((p) => p.id === printerId)

        if (!impressora) {
            return res.status(404).json({ erro: "Impressora não encontrada" })
        }

        res.json({
            impressora: impressora.name,
            ip: impressora.ip,
            port: impressora.port,
            online: impressora.isOnline || false,
        })
    } catch (error) {
        logger.error("Erro ao verificar status:", error)
        res.status(500).json({ erro: "Erro ao verificar status da impressora" })
    }
})

// Rota para configurações (informativa)
router.get("/config", (req, res) => {
    res.json({
        tipo: "network",
        descricao: "Impressão direta via TCP/IP para impressoras Zebra em rede",
        porta_padrao: 9100,
        timeout: Number.parseInt(process.env.ZEBRA_TIMEOUT || "5000"),
    })
})

export default router
