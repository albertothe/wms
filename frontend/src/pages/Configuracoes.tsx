"use client"

import type React from "react"
import { useState, useEffect, useContext } from "react"
import {
    Box,
    Typography,
    TextField,
    Button,
    Paper,
    FormControlLabel,
    Switch,
    CircularProgress,
    Snackbar,
    Alert,
    Container,
    Stack,
    alpha,
} from "@mui/material"
import { ChromePicker } from "react-color"
import { Save as SaveIcon } from "@mui/icons-material"
import { useNavigate } from "react-router-dom"
import api from "../services/api"
import { AuthContext } from "../contexts/AuthContext"
import Layout from "../components/Layout"

interface ConfiguracaoEmpresa {
    id_empresa: number
    nome_empresa: string
    cor_topo: string
    usa_4_niveis: boolean
    cod_cd: string
    categoria_inicial: string
    categoria_final: string
}

const Configuracoes: React.FC = () => {
    const [configuracao, setConfiguracao] = useState<ConfiguracaoEmpresa>({
        id_empresa: 1,
        nome_empresa: "",
        cor_topo: "#0a0a6b",
        usa_4_niveis: false,
        cod_cd: "00",
        categoria_inicial: "01001",
        categoria_final: "99999",
    })

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [showColorPicker, setShowColorPicker] = useState(false)
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: "",
        severity: "success" as "success" | "error",
    })

    const navigate = useNavigate()

    // Adicionar o uso do AuthContext
    const { corTopo, nomeEmpresa } = useContext(AuthContext)

    useEffect(() => {
        const carregarConfiguracoes = async () => {
            try {
                setLoading(true)
                const response = await api.get("/configuracoes")
                setConfiguracao(response.data)
            } catch (error) {
                console.error("Erro ao carregar configurações:", error)
                setSnackbar({
                    open: true,
                    message: "Erro ao carregar configurações",
                    severity: "error",
                })
            } finally {
                setLoading(false)
            }
        }

        carregarConfiguracoes()
    }, [])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target
        setConfiguracao({
            ...configuracao,
            [name]: type === "checkbox" ? checked : value,
        })
    }

    const handleColorChange = (color: any) => {
        setConfiguracao({
            ...configuracao,
            cor_topo: color.hex,
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            setSaving(true)
            await api.put(`/configuracoes`, configuracao)
            setSnackbar({
                open: true,
                message: "Configurações salvas com sucesso!",
                severity: "success",
            })
        } catch (error) {
            console.error("Erro ao salvar configurações:", error)
            setSnackbar({
                open: true,
                message: "Erro ao salvar configurações",
                severity: "error",
            })
        } finally {
            setSaving(false)
        }
    }

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false })
    }

    if (loading) {
        return (
            <Layout corTopo={corTopo} nomeEmpresa={nomeEmpresa}>
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
                    <CircularProgress />
                </Box>
            </Layout>
        )
    }

    return (
        <Layout corTopo={corTopo} nomeEmpresa={nomeEmpresa}>
            <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
                <Box className="mb-6">
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 600, color: corTopo, mb: 1 }}>
                        Configurações do Sistema
                    </Typography>
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                        Gerencie as configurações gerais do sistema WMS
                    </Typography>
                </Box>

                <Paper elevation={3} sx={{ p: 3, bgcolor: "background.paper", mb: 4 }}>
                    <form onSubmit={handleSubmit}>
                        <Stack spacing={3}>
                            <TextField
                                fullWidth
                                label="Nome da Empresa"
                                name="nome_empresa"
                                value={configuracao.nome_empresa}
                                onChange={handleChange}
                                required
                            />

                            <Box>
                                <Typography variant="subtitle1" gutterBottom>
                                    Cor do Topo
                                </Typography>
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 2,
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 1,
                                            bgcolor: configuracao.cor_topo,
                                            border: "1px solid #ccc",
                                            cursor: "pointer",
                                        }}
                                        onClick={() => setShowColorPicker(!showColorPicker)}
                                    />
                                    <TextField
                                        size="small"
                                        value={configuracao.cor_topo}
                                        name="cor_topo"
                                        onChange={handleChange}
                                        sx={{ width: 120 }}
                                    />
                                </Box>
                                {showColorPicker && (
                                    <Box sx={{ mt: 2, position: "relative", zIndex: 1000 }}>
                                        <Box
                                            sx={{
                                                position: "fixed",
                                                top: 0,
                                                right: 0,
                                                bottom: 0,
                                                left: 0,
                                            }}
                                            onClick={() => setShowColorPicker(false)}
                                        />
                                        <ChromePicker color={configuracao.cor_topo} onChange={handleColorChange} disableAlpha />
                                    </Box>
                                )}
                            </Box>

                            <FormControlLabel
                                control={<Switch checked={configuracao.usa_4_niveis} onChange={handleChange} name="usa_4_niveis" />}
                                label="Usar 4 níveis de endereçamento"
                            />

                            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                                <TextField
                                    label="Código do CD"
                                    name="cod_cd"
                                    value={configuracao.cod_cd}
                                    onChange={handleChange}
                                    inputProps={{ maxLength: 2 }}
                                    required
                                    sx={{ minWidth: "200px", flex: 1 }}
                                />

                                <TextField
                                    label="Categoria Inicial"
                                    name="categoria_inicial"
                                    value={configuracao.categoria_inicial}
                                    onChange={handleChange}
                                    inputProps={{ maxLength: 5 }}
                                    required
                                    sx={{ minWidth: "200px", flex: 1 }}
                                />

                                <TextField
                                    label="Categoria Final"
                                    name="categoria_final"
                                    value={configuracao.categoria_final}
                                    onChange={handleChange}
                                    inputProps={{ maxLength: 5 }}
                                    required
                                    sx={{ minWidth: "200px", flex: 1 }}
                                />
                            </Box>

                            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    size="small"
                                    startIcon={<SaveIcon fontSize="small" />}
                                    disabled={saving}
                                    sx={{
                                        backgroundColor: corTopo,
                                        "&:hover": {
                                            backgroundColor: alpha(corTopo, 0.8),
                                        },
                                        textTransform: "none",
                                        boxShadow: "none",
                                        fontSize: "0.875rem",
                                        px: 2,
                                    }}
                                >
                                    {saving ? <CircularProgress size={20} color="inherit" /> : "Salvar alterações"}
                                </Button>
                            </Box>
                        </Stack>
                    </form>
                </Paper>

                <Box sx={{ mt: 4 }}>
                    <Typography variant="h5" gutterBottom sx={{ color: corTopo, fontWeight: 600 }}>
                        Pré-visualização
                    </Typography>
                    <Paper
                        elevation={3}
                        sx={{
                            p: 3,
                            bgcolor: "background.paper",
                            border: "1px solid #ddd",
                            borderRadius: 1,
                        }}
                    >
                        <Box
                            sx={{
                                bgcolor: configuracao.cor_topo,
                                color: "white",
                                p: 2,
                                borderRadius: 1,
                                mb: 2,
                            }}
                        >
                            <Typography variant="h6">{configuracao.nome_empresa}</Typography>
                        </Box>
                        <Typography variant="body1">
                            Configuração de endereçamento: {configuracao.usa_4_niveis ? "4 níveis" : "2 níveis"}
                        </Typography>
                        <Typography variant="body1">Código do CD: {configuracao.cod_cd}</Typography>
                        <Typography variant="body1">
                            Faixa de categorias: {configuracao.categoria_inicial} - {configuracao.categoria_final}
                        </Typography>
                    </Paper>
                </Box>

                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={6000}
                    onClose={handleCloseSnackbar}
                    anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                >
                    <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </Container>
        </Layout>
    )
}

export default Configuracoes
