import { Pool } from "pg"
import dotenv from "dotenv"

dotenv.config()

// Importar o logger apenas quando necessário
let logger: any = null

// Função para obter o logger de forma lazy
const getLogger = () => {
  if (!logger) {
    try {
      // Importação dinâmica para evitar dependência circular
      const loggerModule = require("./utils/logger")
      logger = loggerModule.logger
    } catch (error) {
      // Fallback silencioso se o logger não estiver disponível
      logger = {
        info: () => { },
        error: (msg: string, data?: any) => console.error(msg, data),
        warn: () => { },
        debug: () => { },
      }
    }
  }
  return logger
}

// Configuração da conexão com o banco de dados
const productPool = new Pool({
  user: process.env.DB_USER || "icomp",
  host: process.env.DB_HOST || "172.20.33.5",
  database: process.env.DB_NAME || "jmonte",
  password: process.env.DB_PASS || "icompdbpw",
  port: Number.parseInt(process.env.DB_PORT || "5432"),
})

// Testar a conexão com o banco de dados
productPool.connect((err, client, release) => {
  const log = getLogger()

  if (err) {
    log.error("Erro ao conectar ao banco de dados:", err)
    return
  }

  // Apenas log de sucesso em desenvolvimento ou se explicitamente solicitado
  if (process.env.NODE_ENV !== "production" || process.env.LOG_DB_CONNECTION === "true") {
    log.info("Conexão com o banco de dados estabelecida com sucesso!")
  }

  release()
})

export { productPool }
