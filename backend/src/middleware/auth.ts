import type { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { productPool } from "../database"

// Usar o mesmo valor padrão que está em routes/auth.ts
const JWT_SECRET = process.env.JWT_SECRET || "wms-secret-key"

// Interface para o payload do token JWT
interface TokenPayload {
    userId: number
    usuario: string
    nivel_acesso: string
    iat: number
    exp: number
}

// Interface personalizada para estender o Request
interface RequestWithUsuario extends Request {
    usuario?: {
        usuario: string
        nivel_acesso: string
        [key: string]: any
    }
}

// Middleware para verificar se o usuário está autenticado
export const verificarAutenticacao = (req: RequestWithUsuario, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization

    if (!authHeader) {
        return res.status(401).json({ erro: "Token não fornecido" })
    }

    const parts = authHeader.split(" ")

    if (parts.length !== 2) {
        return res.status(401).json({ erro: "Erro no token" })
    }

    const [scheme, token] = parts

    if (!/^Bearer$/i.test(scheme)) {
        return res.status(401).json({ erro: "Token mal formatado" })
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload
        req.usuario = {
            usuario: decoded.usuario,
            nivel_acesso: decoded.nivel_acesso,
        }
        return next()
    } catch (err) {
        return res.status(401).json({ erro: "Token inválido" })
    }
}

// Middleware para verificar permissões específicas
export const verificarPermissao = (tipoPermissao: "visualizar" | "incluir" | "editar" | "excluir") => {
    return async (req: RequestWithUsuario, res: Response, next: NextFunction) => {
        try {
            // Verificar se o usuário está autenticado
            const authHeader = req.headers.authorization

            if (!authHeader) {
                return res.status(401).json({ erro: "Token não fornecido" })
            }

            const parts = authHeader.split(" ")

            if (parts.length !== 2) {
                return res.status(401).json({ erro: "Erro no token" })
            }

            const [scheme, token] = parts

            if (!/^Bearer$/i.test(scheme)) {
                return res.status(401).json({ erro: "Token mal formatado" })
            }

            // Decodificar o token
            const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload

            if (!decoded.nivel_acesso) {
                return res.status(403).json({ erro: "Acesso negado" })
            }

            // Obter o caminho da rota atual
            const path = req.baseUrl || req.path

            // Buscar o ID do módulo pela rota
            const moduloResult = await productPool.query("SELECT id FROM wms_modulos WHERE rota = $1", [path])

            if (moduloResult.rows.length === 0) {
                return res.status(404).json({ erro: "Módulo não encontrado" })
            }

            const idModulo = moduloResult.rows[0].id

            // Verificar permissão
            const permissaoResult = await productPool.query(
                `SELECT ${tipoPermissao} FROM wms_permissoes_nivel 
         WHERE codigo_nivel = $1 AND id_modulo = $2`,
                [decoded.nivel_acesso, idModulo],
            )

            if (permissaoResult.rows.length === 0 || !permissaoResult.rows[0][tipoPermissao]) {
                return res.status(403).json({
                    erro: "Acesso negado",
                    detalhe: `Você não tem permissão para ${tipoPermissao} neste módulo`,
                })
            }

            next()
        } catch (err) {
            console.error("Erro ao verificar permissão:", err)
            return res.status(500).json({ erro: "Erro ao verificar permissão" })
        }
    }
}
