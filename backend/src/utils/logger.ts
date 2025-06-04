import fs from "fs"
import path from "path"

// Níveis de log
export enum LogLevel {
    ERROR = 0,
    WARN = 1,
    INFO = 2,
    DEBUG = 3,
}

class Logger {
    private logLevel: LogLevel
    private logToFile: boolean
    private logDir: string
    private silentMode: boolean

    constructor() {
        // Configurar nível baseado no ambiente - MAIS RESTRITIVO
        const envLogLevel = process.env.LOG_LEVEL?.toUpperCase()

        switch (envLogLevel) {
            case "ERROR":
                this.logLevel = LogLevel.ERROR
                break
            case "WARN":
                this.logLevel = LogLevel.WARN
                break
            case "INFO":
                this.logLevel = LogLevel.INFO
                break
            case "DEBUG":
                this.logLevel = LogLevel.DEBUG
                break
            default:
                // Padrão mais silencioso: apenas WARN e ERROR
                this.logLevel = process.env.NODE_ENV === "production" ? LogLevel.ERROR : LogLevel.WARN
        }

        this.logToFile = process.env.LOG_TO_FILE === "true" || process.env.NODE_ENV === "production"
        this.silentMode = process.env.SILENT_MODE === "true"
        this.logDir = path.join(process.cwd(), "logs")

        // Criar diretório de logs se necessário
        if (this.logToFile && !fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true })
        }
    }

    private formatMessage(level: string, message: string, data?: any): string {
        const timestamp = new Date().toISOString()
        const dataStr = data ? ` | Data: ${JSON.stringify(data)}` : ""
        return `[${timestamp}] [${level}] ${message}${dataStr}\n`
    }

    private writeLog(level: string, message: string, data?: any) {
        // Se estiver em modo silencioso, não fazer nada
        if (this.silentMode) return

        const formattedMessage = this.formatMessage(level, message, data)

        if (this.logToFile) {
            // Escrever no arquivo de forma assíncrona
            const logFile = path.join(this.logDir, `app-${new Date().toISOString().split("T")[0]}.log`)
            fs.appendFile(logFile, formattedMessage, (err) => {
                if (err && !this.silentMode) {
                    console.error("Erro ao escrever log:", err)
                }
            })
        } else {
            // Em desenvolvimento, mostrar no console apenas se não estiver silencioso
            if (!this.silentMode) {
                process.stdout.write(formattedMessage)
            }
        }
    }

    error(message: string, data?: any) {
        if (this.logLevel >= LogLevel.ERROR) {
            this.writeLog("ERROR", message, data)
        }
    }

    warn(message: string, data?: any) {
        if (this.logLevel >= LogLevel.WARN) {
            this.writeLog("WARN", message, data)
        }
    }

    info(message: string, data?: any) {
        if (this.logLevel >= LogLevel.INFO) {
            this.writeLog("INFO", message, data)
        }
    }

    debug(message: string, data?: any) {
        if (this.logLevel >= LogLevel.DEBUG) {
            this.writeLog("DEBUG", message, data)
        }
    }

    // Método especial para requisições HTTP - mais silencioso
    request(method: string, url: string, duration?: number) {
        // Apenas logar requisições se explicitamente solicitado
        if (process.env.LOG_REQUESTS === "true" && this.logLevel >= LogLevel.INFO) {
            const message = duration ? `${method} ${url} - ${duration}ms` : `${method} ${url}`
            this.writeLog("REQUEST", message)
        }
    }
}

// Instância singleton
export const logger = new Logger()
