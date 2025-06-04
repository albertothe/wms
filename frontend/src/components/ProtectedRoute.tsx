"use client"

import type { ReactNode } from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { CircularProgress, Box } from "@mui/material"
import { useState, useEffect } from "react"

interface ProtectedRouteProps {
    children: ReactNode
    requiredPermission?: {
        rota: string
        tipo: "visualizar" | "incluir" | "editar" | "excluir"
    }
}

// Definição explícita do tipo Modulo com assinatura de índice
interface Modulo {
    id: number
    nome: string
    rota: string
    visualizar: boolean
    incluir?: boolean // Tornando opcional para compatibilidade
    editar: boolean
    excluir: boolean
    [key: string]: any // Assinatura de índice para permitir acesso dinâmico
}

const ProtectedRoute = ({ children, requiredPermission }: ProtectedRouteProps) => {
    const { isAuthenticated, modulos, loading: authLoading } = useAuth()
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Verificação de autenticação
        const checkAuth = async () => {
            // Pequeno delay para garantir que o contexto de autenticação foi carregado
            await new Promise((resolve) => setTimeout(resolve, 100))
            setLoading(false)
        }

        checkAuth()
    }, [isAuthenticated])

    console.log("ProtectedRoute - isAuthenticated:", isAuthenticated)
    console.log("ProtectedRoute - loading:", loading)
    console.log("ProtectedRoute - authLoading:", authLoading)

    if (requiredPermission) {
        console.log("ProtectedRoute - Verificando permissão para:", requiredPermission.rota)
        console.log(
            "ProtectedRoute - Módulos disponíveis:",
            modulos.map((m) => ({ id: m.id, nome: m.nome, rota: m.rota })),
        )
    }

    if (loading || authLoading) {
        console.log("ProtectedRoute - Carregando...")
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
                <CircularProgress />
            </Box>
        )
    }

    if (!isAuthenticated) {
        console.log("ProtectedRoute - Não autenticado, redirecionando para login")
        return <Navigate to="/" replace />
    }

    // Se não há permissão requerida, apenas renderiza o componente
    if (!requiredPermission) {
        return <>{children}</>
    }

    // Mapeamento de rotas alternativas
    const rotasMapeadas: Record<string, string[]> = {
        relatorios: ["relatorioenderecos", "relatorio", "relatórios", "relatório"],
        controleacesso: ["controle-acesso", "controle", "acesso", "controledeacesso", "controle de acesso"],
    }

    // Função para verificar se o usuário tem permissão para a rota
    const verificarPermissao = (
        rotaRequerida: string,
        tipo: "visualizar" | "incluir" | "editar" | "excluir",
    ): boolean => {
        // Normalizar a rota requerida
        const rotaRequeridaNormalizada = rotaRequerida.toLowerCase().replace(/\s+/g, "")

        // Verificar se a rota tem mapeamentos alternativos
        const rotasAlternativas = rotasMapeadas[rotaRequeridaNormalizada] || []

        // Adicionar a rota original às alternativas
        rotasAlternativas.push(rotaRequeridaNormalizada)

        console.log("ProtectedRoute - Verificando permissão para rotas alternativas:", rotasAlternativas)

        // Verificar cada módulo
        for (const modulo of modulos) {
            const rotaModulo = modulo.rota.toLowerCase().replace(/\s+/g, "").replace(/^\/+/, "")
            const nomeModulo = modulo.nome.toLowerCase().replace(/\s+/g, "")

            console.log(`ProtectedRoute - Comparando módulo: ${modulo.nome} (${rotaModulo}) com rotas alternativas`)

            // Verificar se a rota do módulo ou o nome do módulo corresponde a alguma das alternativas
            if (
                rotasAlternativas.some((r) => rotaModulo.includes(r) || r.includes(rotaModulo)) ||
                rotasAlternativas.some((r) => nomeModulo.includes(r) || r.includes(nomeModulo))
            ) {
                console.log(`ProtectedRoute - Módulo encontrado: ${modulo.nome} (${rotaModulo})`)

                // Acessar a propriedade de forma segura
                let temPermissao = false
                if (tipo === "visualizar") {
                    temPermissao = modulo.visualizar
                } else if (tipo === "incluir") {
                    // Verificar se a propriedade existe antes de usá-la
                    temPermissao = modulo.incluir !== undefined ? modulo.incluir : false
                } else if (tipo === "editar") {
                    temPermissao = modulo.editar
                } else if (tipo === "excluir") {
                    temPermissao = modulo.excluir
                }

                console.log(`ProtectedRoute - Permissão ${tipo}: ${temPermissao}`)
                return temPermissao
            }
        }

        return false
    }

    // Verificar permissão
    const { rota, tipo } = requiredPermission
    const temPermissao = verificarPermissao(rota, tipo)

    if (temPermissao) {
        console.log(`ProtectedRoute - Permissão ${tipo} concedida para ${rota}`)
        return <>{children}</>
    } else {
        console.log(`ProtectedRoute - Sem permissão ${tipo} para ${rota}, redirecionando para dashboard`)
        return <Navigate to="/dashboard" replace />
    }
}

export default ProtectedRoute
