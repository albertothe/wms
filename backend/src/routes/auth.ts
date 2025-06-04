// backend/src/routes/auth.ts
import express, { type Request, type Response, type NextFunction } from "express"
import { productPool } from "../database"
import crypto from "crypto"
import * as jwt from "jsonwebtoken"

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || "wms-secret-key"

// Interface personalizada para estender o Request
interface RequestWithUsuario extends Request {
  usuario?: {
    usuario: string
    nivel_acesso: string
    [key: string]: any
  }
}

// Middleware para verificar token
export const verificarToken = (req: RequestWithUsuario, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1]

  if (!token) {
    return res.status(401).json({ error: "Token não fornecido" })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.usuario = decoded as jwt.JwtPayload & { usuario: string; nivel_acesso: string }
    next()
  } catch (error) {
    return res.status(401).json({ error: "Token inválido" })
  }
}

// Middleware para verificar permissões
export const verificarPermissao = (modulo: string, tipo: "visualizar" | "incluir" | "editar" | "excluir") => {
  return async (req: RequestWithUsuario, res: Response, next: NextFunction) => {
    try {
      if (!req.usuario || !req.usuario.nivel_acesso) {
        return res.status(403).json({ error: "Acesso negado" })
      }

      const { nivel_acesso } = req.usuario

      // Buscar o ID do módulo pela rota
      const moduloResult = await productPool.query("SELECT id FROM wms_modulos WHERE rota = $1", [modulo])

      if (moduloResult.rows.length === 0) {
        return res.status(404).json({ error: "Módulo não encontrado" })
      }

      const idModulo = moduloResult.rows[0].id

      // Verificar permissão
      const permissaoResult = await productPool.query(
        `SELECT ${tipo} FROM wms_permissoes_nivel 
         WHERE codigo_nivel = $1 AND id_modulo = $2`,
        [nivel_acesso, idModulo],
      )

      if (permissaoResult.rows.length === 0 || !permissaoResult.rows[0][tipo]) {
        return res.status(403).json({ error: "Permissão negada" })
      }

      next()
    } catch (error) {
      console.error("Erro ao verificar permissão:", error)
      return res.status(500).json({ error: "Erro interno do servidor" })
    }
  }
}

router.post("/", async (req: Request, res: Response) => {
  const { login, senha } = req.body

  if (!login || !senha) {
    return res.status(400).json({ error: "Login e senha são obrigatórios." })
  }

  const loginUpper = login.toUpperCase()
  const hash = crypto
    .createHash("md5")
    .update(loginUpper + senha)
    .digest("hex")

  try {
    // Buscar usuário e seu nível de acesso
    const result = await productPool.query(
      `SELECT u.c_usuario, u.c_nivel as nivel_acesso, n.descricao as nivel_descricao
       FROM a_usuari u
       LEFT JOIN wms_niveis_acesso n ON u.c_nivel = n.codigo
       WHERE u.c_usuario = $1 AND u.c_senha = $2`,
      [loginUpper, hash],
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Usuário ou senha inválidos." })
    }

    const usuario = result.rows[0]

    // Buscar módulos que o usuário tem permissão para visualizar
    const modulosResult = await productPool.query(
      `SELECT m.id, m.nome, m.rota, m.icone, p.visualizar, p.incluir, p.editar, p.excluir
       FROM wms_modulos m
       INNER JOIN wms_permissoes_nivel p ON m.id = p.id_modulo
       WHERE p.codigo_nivel = $1 AND m.ativo = true AND p.visualizar = true
       ORDER BY m.ordem`,
      [usuario.nivel_acesso],
    )

    // Log para depuração
    console.log("Módulos encontrados para o usuário:", modulosResult.rows)

    // Gerar token JWT
    const token = jwt.sign(
      {
        usuario: usuario.c_usuario,
        nivel_acesso: usuario.nivel_acesso,
      },
      JWT_SECRET,
      { expiresIn: "8h" },
    )

    return res.json({
      sucesso: true,
      token,
      usuario: {
        login: usuario.c_usuario,
        nivel_acesso: usuario.nivel_acesso,
        nivel_descricao: usuario.nivel_descricao,
      },
      modulos: modulosResult.rows,
    })
  } catch (error) {
    console.error("Erro na autenticação:", error)
    return res.status(500).json({ error: "Erro interno do servidor." })
  }
})

// Rota para verificar se o token é válido
router.get("/verificar-token", verificarToken, (req: RequestWithUsuario, res: Response) => {
  res.json({ valido: true, usuario: req.usuario })
})

// Rota para buscar módulos do usuário
router.get("/modulos", verificarToken, async (req: RequestWithUsuario, res: Response) => {
  try {
    if (!req.usuario) {
      return res.status(403).json({ error: "Acesso negado" })
    }

    const { nivel_acesso } = req.usuario

    const modulosResult = await productPool.query(
      `SELECT m.id, m.nome, m.rota, m.icone, p.visualizar, p.incluir, p.editar, p.excluir
       FROM wms_modulos m
       INNER JOIN wms_permissoes_nivel p ON m.id = p.id_modulo
       WHERE p.codigo_nivel = $1 AND m.ativo = true AND p.visualizar = true
       ORDER BY m.ordem`,
      [nivel_acesso],
    )

    res.json(modulosResult.rows)
  } catch (error) {
    console.error("Erro ao buscar módulos:", error)
    return res.status(500).json({ error: "Erro interno do servidor" })
  }
})

export default router
