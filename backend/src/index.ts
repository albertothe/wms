import express from "express"
import cors from "cors"
import bodyParser from "body-parser"
import enderecosRoutes from "./routes/enderecos"
import enderecosMarcadosRoutes from "./routes/enderecosMarcados"
import painelEntradaRoutes from "./routes/painelEntrada"
import painelSaidaRoutes from "./routes/painelSaida"
import produtosRoutes from "./routes/produtos"
import configuracoesRoutes from "./routes/configuracoes"
import authRoutes, { verificarToken } from "./routes/auth"
import controleAcessoRoutes from "./routes/controleAcesso"
import dashboardRoutes from "./routes/dashboard"
import impressoraZebraRoutes from "./routes/impressoraZebra"
import { logger } from "./utils/logger"

const app = express()
const PORT = process.env.PORT || 9001

// Middleware
app.use(cors())
app.use(bodyParser.json())

// Middleware para logging de requisições - APENAS SE SOLICITADO
if (process.env.LOG_REQUESTS === "true") {
  app.use((req, res, next) => {
    const start = Date.now()

    res.on("finish", () => {
      const duration = Date.now() - start
      logger.request(req.method, req.url, duration)
    })

    next()
  })
}

// Rota de teste
app.get("/teste", (req, res) => {
  res.json({ message: "API funcionando!" })
})

// Rotas públicas
app.use("/login", authRoutes)
app.use("/configuracoes/public", configuracoesRoutes)

// Middleware de autenticação para rotas protegidas
app.use(verificarToken)

// Rotas protegidas
app.use("/enderecos", enderecosRoutes)
app.use("/enderecos-marcados", enderecosMarcadosRoutes)
app.use("/painel-entrada", painelEntradaRoutes)
app.use("/painel-saida", painelSaidaRoutes)
app.use("/produtos", produtosRoutes)
app.use("/configuracoes", configuracoesRoutes)
app.use("/controle-acesso", controleAcessoRoutes)
app.use("/dashboard", dashboardRoutes)
app.use("/impressora/zebra", impressoraZebraRoutes)

// Iniciar o servidor
app.listen(PORT, () => {
  // Apenas mostrar mensagem de inicialização se não estiver em modo silencioso
  if (process.env.SILENT_MODE !== "true") {
    logger.info(`Servidor rodando na porta ${PORT}`)
  }
})
