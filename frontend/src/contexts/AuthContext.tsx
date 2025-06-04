"use client"

import type React from "react"
import { createContext, useState, useContext, useEffect, type ReactNode } from "react"
import api from "../services/api"
import { useNavigate } from "react-router-dom"

interface Usuario {
    login: string
    nivel_acesso: string
    nivel_descricao: string
}

interface Modulo {
    id: number
    nome: string
    rota: string
    icone: string
    visualizar: boolean
    incluir: boolean // Adicionando a propriedade incluir
    editar: boolean
    excluir: boolean
}

// Adicionar a interface Empresa
interface Empresa {
    nome: string
    logo?: string
    cor_topo?: string
}

// Atualizar a interface AuthContextType para incluir a propriedade empresa
interface AuthContextType {
    isAuthenticated: boolean
    usuario: Usuario | null
    modulos: Modulo[]
    loading: boolean
    empresa: Empresa | null
    login: (login: string, senha: string) => Promise<void>
    logout: () => void
    verificarPermissao: (rota: string, tipo: "visualizar" | "incluir" | "editar" | "excluir") => boolean // Atualizando para incluir "incluir"
    corTopo: string
    nomeEmpresa: string
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export const useAuth = () => useContext(AuthContext)

interface AuthProviderProps {
    children: ReactNode
}

// No AuthProvider, adicionar o estado para empresa
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [usuario, setUsuario] = useState<Usuario | null>(null)
    const [modulos, setModulos] = useState<Modulo[]>([])
    const [loading, setLoading] = useState(true)
    const [empresa, setEmpresa] = useState<Empresa | null>(null)
    const navigate = useNavigate()
    const [corTopo, setCorTopo] = useState("#0a0a6b")
    const [nomeEmpresa, setNomeEmpresa] = useState("Sistema WMS")

    // No useEffect de verificação de autenticação, adicionar a recuperação da empresa
    useEffect(() => {
        const verificarAutenticacao = async () => {
            console.log("Verificando autenticação...")
            const token = localStorage.getItem("authToken")
            console.log("Token encontrado:", token ? "Sim" : "Não")

            if (token) {
                api.defaults.headers.common["Authorization"] = `Bearer ${token}`

                try {
                    // Verificar se o token é válido
                    console.log("Verificando se o token é válido...")
                    await api.get("/login/verificar-token")
                    console.log("Token válido!")

                    // Recuperar informações do usuário do localStorage
                    const usuarioSalvo = localStorage.getItem("usuario")
                    const modulosSalvos = localStorage.getItem("modulos")
                    const empresaSalva = localStorage.getItem("empresa")

                    if (usuarioSalvo) {
                        console.log("Usuário encontrado no localStorage")
                        setUsuario(JSON.parse(usuarioSalvo))
                        setIsAuthenticated(true)
                    }

                    if (modulosSalvos) {
                        console.log("Módulos encontrados no localStorage")
                        const modulosCarregados = JSON.parse(modulosSalvos)
                        console.log("Módulos carregados:", modulosCarregados)

                        // Garantir que todos os módulos tenham a propriedade 'incluir'
                        const modulosAtualizados = modulosCarregados.map((modulo: any) => ({
                            ...modulo,
                            incluir: modulo.incluir !== undefined ? modulo.incluir : modulo.visualizar, // Valor padrão baseado em visualizar
                        }))

                        setModulos(modulosAtualizados)
                    }

                    if (empresaSalva) {
                        console.log("Empresa encontrada no localStorage")
                        setEmpresa(JSON.parse(empresaSalva))
                        setCorTopo(JSON.parse(empresaSalva).cor_topo || "#0a0a6b")
                        setNomeEmpresa(JSON.parse(empresaSalva).nome || "Sistema WMS")
                    } else {
                        // Carregar informações da empresa
                        try {
                            const res = await api.get("/configuracoes")
                            const empresaInfo = {
                                nome: res.data.nome_empresa || "Sistema WMS",
                                logo: res.data.logo_url,
                                cor_topo: res.data.cor_topo || "#0a0a6b",
                            }
                            setEmpresa(empresaInfo)
                            setCorTopo(res.data.cor_topo || "#0a0a6b")
                            setNomeEmpresa(res.data.nome_empresa || "Sistema WMS")
                            localStorage.setItem("empresa", JSON.stringify(empresaInfo))
                        } catch (err) {
                            console.error("Erro ao carregar configurações da empresa:", err)
                            setEmpresa({ nome: "Sistema WMS", cor_topo: "#0a0a6b" })
                            setCorTopo("#0a0a6b")
                            setNomeEmpresa("Sistema WMS")
                        }
                    }
                } catch (error) {
                    console.error("Erro ao verificar token:", error)
                    // Token inválido, fazer logout
                    localStorage.removeItem("authToken")
                    localStorage.removeItem("usuario")
                    localStorage.removeItem("modulos")
                    localStorage.removeItem("empresa")
                    api.defaults.headers.common["Authorization"] = ""
                    setIsAuthenticated(false)
                    setUsuario(null)
                    setModulos([])
                    setEmpresa(null)
                    setCorTopo("#0a0a6b")
                    setNomeEmpresa("Sistema WMS")
                }
            } else {
                console.log("Nenhum token encontrado, usuário não autenticado")
            }

            setLoading(false)
        }

        verificarAutenticacao()
    }, [])

    // No método login, adicionar a recuperação da empresa
    const login = async (login: string, senha: string) => {
        try {
            console.log("Tentando login com:", login)
            const response = await api.post("/login", { login, senha })
            console.log("Resposta do login:", response.data)

            if (response.data.sucesso) {
                const { token, usuario, modulos: modulosRecebidos } = response.data
                console.log("Login bem-sucedido, token:", token ? "Recebido" : "Não recebido")
                console.log("Usuário:", usuario)
                console.log("Módulos:", modulosRecebidos)

                // Garantir que todos os módulos tenham a propriedade 'incluir'
                const modulosAtualizados = modulosRecebidos.map((modulo: any) => ({
                    ...modulo,
                    incluir: modulo.incluir !== undefined ? modulo.incluir : modulo.visualizar, // Valor padrão baseado em visualizar
                }))

                localStorage.setItem("authToken", token)
                localStorage.setItem("usuario", JSON.stringify(usuario))
                localStorage.setItem("modulos", JSON.stringify(modulosAtualizados))

                api.defaults.headers.common["Authorization"] = `Bearer ${token}`

                setIsAuthenticated(true)
                setUsuario(usuario)
                setModulos(modulosAtualizados)

                // Carregar informações da empresa
                try {
                    const res = await api.get("/configuracoes")
                    const empresaInfo = {
                        nome: res.data.nome_empresa || "Sistema WMS",
                        logo: res.data.logo_url,
                        cor_topo: res.data.cor_topo || "#0a0a6b",
                    }
                    setEmpresa(empresaInfo)
                    setCorTopo(res.data.cor_topo || "#0a0a6b")
                    setNomeEmpresa(res.data.nome_empresa || "Sistema WMS")
                    localStorage.setItem("empresa", JSON.stringify(empresaInfo))
                } catch (err) {
                    console.error("Erro ao carregar configurações da empresa:", err)
                    setEmpresa({ nome: "Sistema WMS", cor_topo: "#0a0a6b" })
                    setCorTopo("#0a0a6b")
                    setNomeEmpresa("Sistema WMS")
                }

                // Não fazemos redirecionamento aqui para evitar conflito com o componente Login
                return Promise.resolve()
            } else {
                console.error("Login falhou:", response.data)
                return Promise.reject(new Error(response.data.error || "Falha na autenticação"))
            }
        } catch (error) {
            console.error("Erro no login:", error)
            return Promise.reject(error)
        }
    }

    // No método logout, limpar a empresa
    const logout = () => {
        console.log("Fazendo logout...")
        localStorage.removeItem("authToken")
        localStorage.removeItem("usuario")
        localStorage.removeItem("modulos")
        localStorage.removeItem("empresa")
        api.defaults.headers.common["Authorization"] = ""
        setIsAuthenticated(false)
        setUsuario(null)
        setModulos([])
        setEmpresa(null)
        setCorTopo("#0a0a6b")
        setNomeEmpresa("Sistema WMS")
        navigate("/")
    }

    // Atualizar o método verificarPermissao para incluir o tipo "incluir"
    const verificarPermissao = (rota: string, tipo: "visualizar" | "incluir" | "editar" | "excluir") => {
        if (!isAuthenticated || !modulos.length) return false

        // Normalizar a rota para comparação (converter para minúsculas e adicionar barra inicial se necessário)
        let rotaNormalizada = rota.toLowerCase()
        if (!rotaNormalizada.startsWith("/")) {
            rotaNormalizada = `/${rotaNormalizada}`
        }

        console.log(`Verificando permissão para rota normalizada: ${rotaNormalizada}`)

        // Encontrar o módulo correspondente à rota
        const modulo = modulos.find((m) => {
            // Normalizar a rota do módulo
            const moduloRota = m.rota.toLowerCase()

            console.log(`Comparando rota: ${moduloRota} com ${rotaNormalizada}`)
            return moduloRota === rotaNormalizada
        })

        if (!modulo) {
            console.log(`Permissão negada: módulo ${rotaNormalizada} não encontrado`)
            return false
        }

        // Verificar se o usuário tem a permissão necessária
        let temPermissao = false

        if (tipo === "visualizar") {
            temPermissao = modulo.visualizar
        } else if (tipo === "incluir") {
            // Usar o valor da propriedade incluir, ou visualizar como fallback
            temPermissao = modulo.incluir !== undefined ? modulo.incluir : modulo.visualizar
        } else if (tipo === "editar") {
            temPermissao = modulo.editar
        } else if (tipo === "excluir") {
            temPermissao = modulo.excluir
        }

        console.log(`Verificando permissão ${tipo} para ${rotaNormalizada}: ${temPermissao}`)

        return temPermissao
    }

    // No retorno do contexto, incluir a empresa
    return (
        <AuthContext.Provider
            value={{
                isAuthenticated,
                usuario,
                modulos,
                loading,
                empresa,
                login,
                logout,
                verificarPermissao,
                corTopo,
                nomeEmpresa,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}
