"use client"

import { useState, useEffect, type FormEvent } from "react"
import { TextField, Button, Box, Typography, Container, CircularProgress, Alert, Paper } from "@mui/material"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import api from "../services/api"

interface ConfiguracaoEmpresa {
  nome_empresa: string
  cor_topo: string
  logo_url?: string
}

const Login = () => {
  const [login, setLogin] = useState("")
  const [senha, setSenha] = useState("")
  const [erro, setErro] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [configuracoes, setConfiguracoes] = useState<ConfiguracaoEmpresa>({
    nome_empresa: "Empresa",
    cor_topo: "#0a0a6b",
  })
  const [carregandoConfiguracoes, setCarregandoConfiguracoes] = useState(true)
  const navigate = useNavigate()
  const { login: authLogin, isAuthenticated } = useAuth()

  const buscarConfiguracoes = async () => {
    try {
      console.log("Buscando configurações públicas da empresa...")
      // Usar a rota pública que não requer autenticação
      const res = await api.get("/configuracoes/public")
      console.log("Configurações públicas recebidas:", res.data)

      if (res.data && res.data.nome_empresa) {
        setConfiguracoes({
          nome_empresa: res.data.nome_empresa,
          cor_topo: res.data.cor_topo || "#0a0a6b",
          logo_url: res.data.logo_url,
        })
        console.log("Nome da empresa definido:", res.data.nome_empresa)
      } else {
        console.warn("Nome da empresa não encontrado na resposta:", res.data)
        setConfiguracoes({
          nome_empresa: "Empresa",
          cor_topo: "#0a0a6b",
        })
      }
    } catch (error) {
      console.error("Erro ao buscar configurações públicas:", error)
      // Definir valores padrão em caso de erro
      setConfiguracoes({
        nome_empresa: "Empresa",
        cor_topo: "#0a0a6b",
      })
    } finally {
      setCarregandoConfiguracoes(false)
    }
  }

  useEffect(() => {
    console.log("Login component mounted, isAuthenticated:", isAuthenticated)

    // Buscar configurações imediatamente
    buscarConfiguracoes()

    // Limpar qualquer redirecionamento pendente
    const redirectTimeout = setTimeout(() => {
      // Se já estiver autenticado, redirecionar para o painel
      if (isAuthenticated) {
        console.log("Usuário já autenticado, redirecionando para /dashboard")
        navigate("/dashboard")
        return
      }
    }, 500) // Pequeno delay para garantir que o estado de autenticação foi carregado

    return () => {
      clearTimeout(redirectTimeout)
    }
  }, [navigate, isAuthenticated])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErro("")

    // Validação básica
    if (!login.trim() || !senha.trim()) {
      setErro("Por favor, preencha todos os campos.")
      return
    }

    setIsLoading(true)

    try {
      console.log("Tentando login com:", login)
      await authLogin(login, senha)
      console.log("Login bem-sucedido, redirecionando para /dashboard")
      navigate("/dashboard")
    } catch (err: any) {
      console.error("Erro no login:", err)
      setErro(err.response?.data?.error || "Erro ao conectar com o servidor.")
    } finally {
      setIsLoading(false)
    }
  }

  if (carregandoConfiguracoes) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          mt: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: "100%",
            borderRadius: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {configuracoes.logo_url && (
            <Box mb={2}>
              <img
                src={configuracoes.logo_url || "/placeholder.svg"}
                alt={`Logo ${configuracoes.nome_empresa}`}
                style={{ maxHeight: "80px", maxWidth: "100%" }}
              />
            </Box>
          )}

          <Typography variant="h5" component="h1" gutterBottom>
            {configuracoes.nome_empresa || "Sistema WMS"}
          </Typography>

          <Typography variant="subtitle1" gutterBottom>
            Sistema de Endereçamento
          </Typography>

          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: "100%" }}>
            {erro && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {erro}
              </Alert>
            )}

            <TextField
              margin="normal"
              required
              fullWidth
              id="login"
              label="Usuário"
              name="login"
              autoComplete="username"
              autoFocus
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              disabled={isLoading}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              name="senha"
              label="Senha"
              type="password"
              id="senha"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              disabled={isLoading}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{
                mt: 3,
                mb: 2,
                py: 1.5,
                backgroundColor: configuracoes.cor_topo,
                "&:hover": {
                  backgroundColor: configuracoes.cor_topo,
                  opacity: 0.9,
                },
              }}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} color="inherit" /> : "Entrar"}
            </Button>
          </Box>
        </Paper>

        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
          © {new Date().getFullYear()} {configuracoes.nome_empresa || "Sistema WMS"}
        </Typography>
      </Box>
    </Container>
  )
}

export default Login
