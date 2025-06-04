import net from "net"
import { logger } from "../utils/logger"

export interface ZebraPrinter {
    id: string
    name: string
    ip: string
    port: number
    isOnline?: boolean
}

export class ZebraNetworkService {
    private printers: ZebraPrinter[] = []
    private timeout: number

    constructor() {
        this.timeout = Number.parseInt(process.env.ZEBRA_TIMEOUT || "5000")
        this.loadPrintersFromEnv()
    }

    private loadPrintersFromEnv() {
        this.printers = []

        // Carregar impressoras do .env
        for (let i = 1; i <= 3; i++) {
            const ip = process.env[`ZEBRA_PRINTER_${i}_IP`]
            const port = Number.parseInt(process.env[`ZEBRA_PRINTER_${i}_PORT`] || "9100")
            const name = process.env[`ZEBRA_PRINTER_${i}_NAME`] || `Zebra ${i}`

            if (ip && ip.trim()) {
                this.printers.push({
                    id: `zebra_${i}`,
                    name,
                    ip: ip.trim(),
                    port,
                })
            }
        }

        logger.info(
            `Carregadas ${this.printers.length} impressoras Zebra:`,
            this.printers.map((p) => `${p.name} (${p.ip}:${p.port})`),
        )
    }

    async getPrinters(): Promise<ZebraPrinter[]> {
        // Verificar status de cada impressora
        const printersWithStatus = await Promise.all(
            this.printers.map(async (printer) => {
                const isOnline = await this.testConnection(printer.ip, printer.port)
                return { ...printer, isOnline }
            }),
        )

        return printersWithStatus
    }

    async testConnection(ip: string, port: number): Promise<boolean> {
        return new Promise((resolve) => {
            const socket = new net.Socket()

            const timer = setTimeout(() => {
                socket.destroy()
                resolve(false)
            }, this.timeout)

            socket.connect(port, ip, () => {
                clearTimeout(timer)
                socket.destroy()
                resolve(true)
            })

            socket.on("error", () => {
                clearTimeout(timer)
                resolve(false)
            })
        })
    }

    async sendZPL(printerId: string, zplCode: string): Promise<boolean> {
        const printer = this.printers.find((p) => p.id === printerId)

        if (!printer) {
            throw new Error(`Impressora ${printerId} não encontrada`)
        }

        logger.info(`Enviando ZPL para ${printer.name} (${printer.ip}:${printer.port})`)
        logger.debug("ZPL Code:", zplCode)

        return new Promise((resolve, reject) => {
            const socket = new net.Socket()

            const timer = setTimeout(() => {
                socket.destroy()
                reject(new Error(`Timeout ao conectar com ${printer.name}`))
            }, this.timeout)

            socket.connect(printer.port, printer.ip, () => {
                clearTimeout(timer)
                logger.info(`Conectado com ${printer.name}`)

                // Enviar ZPL
                socket.write(zplCode, "ascii", (error) => {
                    if (error) {
                        logger.error("Erro ao enviar ZPL:", error)
                        socket.destroy()
                        reject(error)
                    } else {
                        logger.info("ZPL enviado com sucesso")

                        // Aguardar um pouco antes de fechar a conexão
                        setTimeout(() => {
                            socket.destroy()
                            resolve(true)
                        }, 1000)
                    }
                })
            })

            socket.on("error", (error) => {
                clearTimeout(timer)
                logger.error(`Erro de conexão com ${printer.name}:`, error)
                reject(error)
            })

            socket.on("close", () => {
                logger.info(`Conexão fechada com ${printer.name}`)
            })
        })
    }

    async testPrint(printerId: string): Promise<boolean> {
        const testZpl = `^XA
^PW812
^LL0203
^LS0
^FT50,80^A0N,28,28^FHTeste WMS Network Service^FS
^FT50,120^A0N,20,20^FH${new Date().toLocaleString("pt-BR")}^FS
^FT50,150^A0N,18,18^FHImpressora ID: ${printerId}^FS
^PQ1,0,1,Y
^XZ`

        try {
            await this.sendZPL(printerId, testZpl)
            return true
        } catch (error) {
            logger.error("Erro no teste de impressão:", error)
            return false
        }
    }
}

// Instância singleton
export const zebraNetworkService = new ZebraNetworkService()
