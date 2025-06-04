"use client"

import type React from "react"

import { useState, useEffect, useContext } from "react"
import { AuthContext } from "../contexts/AuthContext"
import { Layout } from "../components/Layout"
import {
    Box,
    Typography,
    Paper,
    Tabs,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    FormControlLabel,
    Switch,
    IconButton,
    Snackbar,
    Alert,
    CircularProgress,
    Checkbox,
    Divider,
    Container,
} from "@mui/material"
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Save as SaveIcon } from "@mui/icons-material"
import { useNavigate } from "react-router-dom"
import api from "../services/api"

interface TabPanelProps {
    children?: React.ReactNode
    index: number
    value: number
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props

    return (
        <div role="tabpanel" hidden={value !== index} id={`tabpanel-${index}`} aria-labelledby={`tab-${index}`} {...other}>
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    )
}

interface NivelAcesso {
    codigo: string
    descricao: string
    ativo: boolean
}

interface Modulo {
    id: number
    nome: string
    rota: string
    icone: string
    ordem: number
    ativo: boolean
}

interface Permissao {
    codigo_nivel: string
    id_modulo: number
    modulo_nome?: string
    modulo_rota?: string
    visualizar: boolean
    incluir: boolean
    editar: boolean
    excluir: boolean
}

const ControleAcesso = () => {
    const [tabValue, setTabValue] = useState(0)
    const [niveisAcesso, setNiveisAcesso] = useState<NivelAcesso[]>([])
    const [modulos, setModulos] = useState<Modulo[]>([])
    const [permissoes, setPermissoes] = useState<Permissao[]>([])
    const [loading, setLoading] = useState(true)
    const { corTopo, nomeEmpresa } = useContext(AuthContext)

    // Dialogs
    const [nivelDialog, setNivelDialog] = useState(false)
    const [moduloDialog, setModuloDialog] = useState(false)
    const [permissaoDialog, setPermissaoDialog] = useState(false)
    const [confirmDialog, setConfirmDialog] = useState(false)

    // Form states
    const [currentNivel, setCurrentNivel] = useState<NivelAcesso>({
        codigo: "",
        descricao: "",
        ativo: true,
    })
    const [currentModulo, setCurrentModulo] = useState<Modulo>({
        id: 0,
        nome: "",
        rota: "",
        icone: "",
        ordem: 0,
        ativo: true,
    })
    const [currentPermissaoNivel, setCurrentPermissaoNivel] = useState<string>("")
    const [permissoesConfig, setPermissoesConfig] = useState<Permissao[]>([])

    // Delete confirmation
    const [itemToDelete, setItemToDelete] = useState<{ type: string; id: string | number }>({
        type: "",
        id: "",
    })

    // Snackbar
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: "",
        severity: "success" as "success" | "error",
    })

    const navigate = useNavigate()

    useEffect(() => {
        const carregarDados = async () => {
            setLoading(true)
            try {
                // Carregar configurações
                const configRes = await api.get("/configuracoes")

                // Carregar níveis de acesso
                const niveisRes = await api.get("/controle-acesso/niveis")
                setNiveisAcesso(niveisRes.data)

                // Carregar módulos
                const modulosRes = await api.get("/controle-acesso/modulos")
                setModulos(modulosRes.data)

                // Carregar permissões
                const permissoesRes = await api.get("/controle-acesso/permissoes")
                setPermissoes(permissoesRes.data)
            } catch (error) {
                console.error("Erro ao carregar dados:", error)
                setSnackbar({
                    open: true,
                    message: "Erro ao carregar dados",
                    severity: "error",
                })
            } finally {
                setLoading(false)
            }
        }

        carregarDados()
    }, [])

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue)
    }

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false })
    }

    // Níveis de Acesso
    const handleOpenNivelDialog = (nivel?: NivelAcesso) => {
        if (nivel) {
            setCurrentNivel(nivel)
        } else {
            setCurrentNivel({
                codigo: "",
                descricao: "",
                ativo: true,
            })
        }
        setNivelDialog(true)
    }

    const handleCloseNivelDialog = () => {
        setNivelDialog(false)
    }

    const handleNivelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, checked, type } = e.target
        setCurrentNivel({
            ...currentNivel,
            [name]: type === "checkbox" ? checked : value,
        })
    }

    const handleSaveNivel = async () => {
        try {
            if (!currentNivel.codigo || !currentNivel.descricao) {
                setSnackbar({
                    open: true,
                    message: "Preencha todos os campos obrigatórios",
                    severity: "error",
                })
                return
            }

            let response
            if (niveisAcesso.some((n) => n.codigo === currentNivel.codigo)) {
                // Atualizar
                response = await api.put(`/controle-acesso/niveis/${currentNivel.codigo}`, {
                    descricao: currentNivel.descricao,
                    ativo: currentNivel.ativo,
                })
                setSnackbar({
                    open: true,
                    message: "Nível de acesso atualizado com sucesso",
                    severity: "success",
                })
            } else {
                // Criar
                response = await api.post("/controle-acesso/niveis", currentNivel)
                setSnackbar({
                    open: true,
                    message: "Nível de acesso criado com sucesso",
                    severity: "success",
                })
            }

            // Atualizar lista
            const niveisRes = await api.get("/controle-acesso/niveis")
            setNiveisAcesso(niveisRes.data)

            handleCloseNivelDialog()
        } catch (error) {
            console.error("Erro ao salvar nível de acesso:", error)
            setSnackbar({
                open: true,
                message: "Erro ao salvar nível de acesso",
                severity: "error",
            })
        }
    }

    const handleDeleteNivel = async () => {
        try {
            await api.delete(`/controle-acesso/niveis/${itemToDelete.id}`)

            // Atualizar lista
            const niveisRes = await api.get("/controle-acesso/niveis")
            setNiveisAcesso(niveisRes.data)

            setSnackbar({
                open: true,
                message: "Nível de acesso excluído com sucesso",
                severity: "success",
            })
        } catch (error: any) {
            console.error("Erro ao excluir nível de acesso:", error)
            setSnackbar({
                open: true,
                message: error.response?.data?.error || "Erro ao excluir nível de acesso",
                severity: "error",
            })
        } finally {
            setConfirmDialog(false)
        }
    }

    // Módulos
    const handleOpenModuloDialog = (modulo?: Modulo) => {
        if (modulo) {
            setCurrentModulo(modulo)
        } else {
            setCurrentModulo({
                id: 0,
                nome: "",
                rota: "",
                icone: "",
                ordem: modulos.length + 1,
                ativo: true,
            })
        }
        setModuloDialog(true)
    }

    const handleCloseModuloDialog = () => {
        setModuloDialog(false)
    }

    const handleModuloChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, checked, type } = e.target
        setCurrentModulo({
            ...currentModulo,
            [name]: type === "checkbox" ? checked : value,
        })
    }

    const handleSaveModulo = async () => {
        try {
            if (!currentModulo.nome || !currentModulo.rota) {
                setSnackbar({
                    open: true,
                    message: "Preencha todos os campos obrigatórios",
                    severity: "error",
                })
                return
            }

            let response
            if (currentModulo.id) {
                // Atualizar
                response = await api.put(`/controle-acesso/modulos/${currentModulo.id}`, {
                    nome: currentModulo.nome,
                    rota: currentModulo.rota,
                    icone: currentModulo.icone,
                    ordem: currentModulo.ordem,
                    ativo: currentModulo.ativo,
                })
                setSnackbar({
                    open: true,
                    message: "Módulo atualizado com sucesso",
                    severity: "success",
                })
            } else {
                // Criar
                response = await api.post("/controle-acesso/modulos", {
                    nome: currentModulo.nome,
                    rota: currentModulo.rota,
                    icone: currentModulo.icone,
                    ordem: currentModulo.ordem,
                    ativo: currentModulo.ativo,
                })
                setSnackbar({
                    open: true,
                    message: "Módulo criado com sucesso",
                    severity: "success",
                })
            }

            // Atualizar lista
            const modulosRes = await api.get("/controle-acesso/modulos")
            setModulos(modulosRes.data)

            handleCloseModuloDialog()
        } catch (error) {
            console.error("Erro ao salvar módulo:", error)
            setSnackbar({
                open: true,
                message: "Erro ao salvar módulo",
                severity: "error",
            })
        }
    }

    const handleDeleteModulo = async () => {
        try {
            await api.delete(`/controle-acesso/modulos/${itemToDelete.id}`)

            // Atualizar lista
            const modulosRes = await api.get("/controle-acesso/modulos")
            setModulos(modulosRes.data)

            setSnackbar({
                open: true,
                message: "Módulo excluído com sucesso",
                severity: "success",
            })
        } catch (error: any) {
            console.error("Erro ao excluir módulo:", error)
            setSnackbar({
                open: true,
                message: error.response?.data?.error || "Erro ao excluir módulo",
                severity: "error",
            })
        } finally {
            setConfirmDialog(false)
        }
    }

    // Permissões
    const handleOpenPermissaoDialog = (nivel: string) => {
        setCurrentPermissaoNivel(nivel)
        setPermissaoDialog(true)
        carregarPermissoesNivel(nivel)
    }

    const carregarPermissoesNivel = async (nivel: string) => {
        try {
            const response = await api.get(`/controle-acesso/permissoes/${nivel}`)

            // Criar uma lista com todos os módulos, preenchendo as permissões existentes
            const permissoesCompletas = modulos.map((modulo) => {
                const permExistente = response.data.find((p: Permissao) => p.id_modulo === modulo.id)

                if (permExistente) {
                    return {
                        ...permExistente,
                        modulo_nome: modulo.nome,
                    }
                } else {
                    return {
                        codigo_nivel: nivel,
                        id_modulo: modulo.id,
                        modulo_nome: modulo.nome,
                        modulo_rota: modulo.rota,
                        visualizar: false,
                        incluir: false,
                        editar: false,
                        excluir: false,
                    }
                }
            })

            setPermissoesConfig(permissoesCompletas)
        } catch (error) {
            console.error("Erro ao carregar permissões do nível:", error)
            setSnackbar({
                open: true,
                message: "Erro ao carregar permissões",
                severity: "error",
            })
        }
    }

    const handleClosePermissaoDialog = () => {
        setPermissaoDialog(false)
    }

    const handlePermissaoChange = (
        id_modulo: number,
        field: "visualizar" | "incluir" | "editar" | "excluir",
        value: boolean,
    ) => {
        setPermissoesConfig((prev) => prev.map((p) => (p.id_modulo === id_modulo ? { ...p, [field]: value } : p)))
    }

    const handleSavePermissoes = async () => {
        try {
            await api.post("/controle-acesso/permissoes/configurar", {
                codigo_nivel: currentPermissaoNivel,
                permissoes: permissoesConfig,
            })

            // Atualizar lista de permissões
            const permissoesRes = await api.get("/controle-acesso/permissoes")
            setPermissoes(permissoesRes.data)

            setSnackbar({
                open: true,
                message: "Permissões configuradas com sucesso",
                severity: "success",
            })

            handleClosePermissaoDialog()
        } catch (error) {
            console.error("Erro ao salvar permissões:", error)
            setSnackbar({
                open: true,
                message: "Erro ao salvar permissões",
                severity: "error",
            })
        }
    }

    // Confirmação de exclusão
    const handleOpenConfirmDialog = (type: string, id: string | number) => {
        setItemToDelete({ type, id })
        setConfirmDialog(true)
    }

    const handleCloseConfirmDialog = () => {
        setConfirmDialog(false)
    }

    const handleConfirmDelete = () => {
        if (itemToDelete.type === "nivel") {
            handleDeleteNivel()
        } else if (itemToDelete.type === "modulo") {
            handleDeleteModulo()
        }
    }

    if (loading) {
        return (
            <Layout corTopo={corTopo} nomeEmpresa={nomeEmpresa}>
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "70vh" }}>
                    <CircularProgress />
                </Box>
            </Layout>
        )
    }

    return (
        <Layout corTopo={corTopo} nomeEmpresa={nomeEmpresa}>
            <Container maxWidth="xl" sx={{ pt: 4 }}>
                <Box className="mb-6">
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 600, color: corTopo, mb: 1 }}>
                        Controle de Acesso
                    </Typography>
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                        Gerencie os níveis de acesso, módulos e permissões do sistema
                    </Typography>
                </Box>

                <Box sx={{ width: "100%" }}>
                    <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                        <Tabs value={tabValue} onChange={handleTabChange} aria-label="controle de acesso tabs">
                            <Tab label="Níveis de Acesso" />
                            <Tab label="Módulos" />
                            <Tab label="Permissões" />
                        </Tabs>
                    </Box>

                    {/* Níveis de Acesso */}
                    <TabPanel value={tabValue} index={0}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                            <Typography variant="h6">Níveis de Acesso</Typography>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => handleOpenNivelDialog()}
                                sx={{ bgcolor: corTopo }}
                            >
                                Novo Nível
                            </Button>
                        </Box>

                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Código</TableCell>
                                        <TableCell>Descrição</TableCell>
                                        <TableCell>Ativo</TableCell>
                                        <TableCell align="right">Ações</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {niveisAcesso.map((nivel) => (
                                        <TableRow key={nivel.codigo}>
                                            <TableCell>{nivel.codigo}</TableCell>
                                            <TableCell>{nivel.descricao}</TableCell>
                                            <TableCell>{nivel.ativo ? "Sim" : "Não"}</TableCell>
                                            <TableCell align="right">
                                                <IconButton onClick={() => handleOpenNivelDialog(nivel)} size="small">
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton
                                                    onClick={() => handleOpenConfirmDialog("nivel", nivel.codigo)}
                                                    size="small"
                                                    color="error"
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </TabPanel>

                    {/* Módulos */}
                    <TabPanel value={tabValue} index={1}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                            <Typography variant="h6">Módulos do Sistema</Typography>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => handleOpenModuloDialog()}
                                sx={{ bgcolor: corTopo }}
                            >
                                Novo Módulo
                            </Button>
                        </Box>

                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>ID</TableCell>
                                        <TableCell>Nome</TableCell>
                                        <TableCell>Rota</TableCell>
                                        <TableCell>Ícone</TableCell>
                                        <TableCell>Ordem</TableCell>
                                        <TableCell>Ativo</TableCell>
                                        <TableCell align="right">Ações</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {modulos.map((modulo) => (
                                        <TableRow key={modulo.id}>
                                            <TableCell>{modulo.id}</TableCell>
                                            <TableCell>{modulo.nome}</TableCell>
                                            <TableCell>{modulo.rota}</TableCell>
                                            <TableCell>{modulo.icone}</TableCell>
                                            <TableCell>{modulo.ordem}</TableCell>
                                            <TableCell>{modulo.ativo ? "Sim" : "Não"}</TableCell>
                                            <TableCell align="right">
                                                <IconButton onClick={() => handleOpenModuloDialog(modulo)} size="small">
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton
                                                    onClick={() => handleOpenConfirmDialog("modulo", modulo.id)}
                                                    size="small"
                                                    color="error"
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </TabPanel>

                    {/* Permissões */}
                    <TabPanel value={tabValue} index={2}>
                        <Typography variant="h6" gutterBottom>
                            Permissões por Nível de Acesso
                        </Typography>

                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                            {niveisAcesso.map((nivel) => (
                                <Paper key={nivel.codigo} sx={{ p: 2, width: { xs: "100%", md: "45%", lg: "30%" } }}>
                                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                                        <Typography variant="subtitle1" fontWeight="bold">
                                            {nivel.descricao} ({nivel.codigo})
                                        </Typography>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={() => handleOpenPermissaoDialog(nivel.codigo)}
                                            sx={{
                                                borderColor: corTopo,
                                                color: corTopo,
                                                "&:hover": {
                                                    borderColor: corTopo,
                                                    backgroundColor: "rgba(10, 10, 107, 0.04)",
                                                },
                                            }}
                                        >
                                            Configurar
                                        </Button>
                                    </Box>
                                    <Divider sx={{ mb: 2 }} />
                                    <Box sx={{ maxHeight: 200, overflow: "auto" }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Módulo</TableCell>
                                                    <TableCell align="center">Ver</TableCell>
                                                    <TableCell align="center">Incluir</TableCell>
                                                    <TableCell align="center">Editar</TableCell>
                                                    <TableCell align="center">Excluir</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {permissoes
                                                    .filter((p) => p.codigo_nivel === nivel.codigo)
                                                    .map((p) => (
                                                        <TableRow key={`${p.codigo_nivel}-${p.id_modulo}`}>
                                                            <TableCell>{p.modulo_nome}</TableCell>
                                                            <TableCell align="center">{p.visualizar ? "✓" : "✗"}</TableCell>
                                                            <TableCell align="center">{p.incluir ? "✓" : "✗"}</TableCell>
                                                            <TableCell align="center">{p.editar ? "✓" : "✗"}</TableCell>
                                                            <TableCell align="center">{p.excluir ? "✓" : "✗"}</TableCell>
                                                        </TableRow>
                                                    ))}
                                            </TableBody>
                                        </Table>
                                    </Box>
                                </Paper>
                            ))}
                        </Box>
                    </TabPanel>
                </Box>

                {/* Dialogs */}
                {/* Nível de Acesso Dialog */}
                <Dialog open={nivelDialog} onClose={handleCloseNivelDialog}>
                    <DialogTitle>{currentNivel.codigo ? "Editar Nível de Acesso" : "Novo Nível de Acesso"}</DialogTitle>
                    <DialogContent>
                        <TextField
                            margin="dense"
                            name="codigo"
                            label="Código"
                            fullWidth
                            value={currentNivel.codigo}
                            onChange={handleNivelChange}
                            disabled={!!niveisAcesso.find((n) => n.codigo === currentNivel.codigo)}
                            inputProps={{ maxLength: 2 }}
                            helperText="Máximo de 2 caracteres"
                        />
                        <TextField
                            margin="dense"
                            name="descricao"
                            label="Descrição"
                            fullWidth
                            value={currentNivel.descricao}
                            onChange={handleNivelChange}
                        />
                        <FormControlLabel
                            control={
                                <Switch checked={currentNivel.ativo} onChange={handleNivelChange} name="ativo" color="primary" />
                            }
                            label="Ativo"
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseNivelDialog}>Cancelar</Button>
                        <Button onClick={handleSaveNivel} variant="contained" sx={{ bgcolor: corTopo }}>
                            Salvar
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Módulo Dialog */}
                <Dialog open={moduloDialog} onClose={handleCloseModuloDialog}>
                    <DialogTitle>{currentModulo.id ? "Editar Módulo" : "Novo Módulo"}</DialogTitle>
                    <DialogContent>
                        <TextField
                            margin="dense"
                            name="nome"
                            label="Nome"
                            fullWidth
                            value={currentModulo.nome}
                            onChange={handleModuloChange}
                        />
                        <TextField
                            margin="dense"
                            name="rota"
                            label="Rota"
                            fullWidth
                            value={currentModulo.rota}
                            onChange={handleModuloChange}
                            helperText="Ex: painelsaida, produtos, etc."
                        />
                        <TextField
                            margin="dense"
                            name="icone"
                            label="Ícone"
                            fullWidth
                            value={currentModulo.icone}
                            onChange={handleModuloChange}
                            helperText="Ex: dashboard, inventory, place, etc."
                        />
                        <TextField
                            margin="dense"
                            name="ordem"
                            label="Ordem"
                            type="number"
                            fullWidth
                            value={currentModulo.ordem}
                            onChange={handleModuloChange}
                        />
                        <FormControlLabel
                            control={
                                <Switch checked={currentModulo.ativo} onChange={handleModuloChange} name="ativo" color="primary" />
                            }
                            label="Ativo"
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseModuloDialog}>Cancelar</Button>
                        <Button onClick={handleSaveModulo} variant="contained" sx={{ bgcolor: corTopo }}>
                            Salvar
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Permissões Dialog */}
                <Dialog open={permissaoDialog} onClose={handleClosePermissaoDialog} maxWidth="md" fullWidth>
                    <DialogTitle>
                        Configurar Permissões -{" "}
                        {niveisAcesso.find((n) => n.codigo === currentPermissaoNivel)?.descricao || currentPermissaoNivel}
                    </DialogTitle>
                    <DialogContent>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Módulo</TableCell>
                                        <TableCell align="center">Visualizar</TableCell>
                                        <TableCell align="center">Incluir</TableCell>
                                        <TableCell align="center">Editar</TableCell>
                                        <TableCell align="center">Excluir</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {permissoesConfig.map((perm) => (
                                        <TableRow key={perm.id_modulo}>
                                            <TableCell>{perm.modulo_nome}</TableCell>
                                            <TableCell align="center">
                                                <Checkbox
                                                    checked={perm.visualizar}
                                                    onChange={(e) => handlePermissaoChange(perm.id_modulo, "visualizar", e.target.checked)}
                                                />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Checkbox
                                                    checked={perm.incluir}
                                                    onChange={(e) => handlePermissaoChange(perm.id_modulo, "incluir", e.target.checked)}
                                                    disabled={!perm.visualizar}
                                                />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Checkbox
                                                    checked={perm.editar}
                                                    onChange={(e) => handlePermissaoChange(perm.id_modulo, "editar", e.target.checked)}
                                                    disabled={!perm.visualizar}
                                                />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Checkbox
                                                    checked={perm.excluir}
                                                    onChange={(e) => handlePermissaoChange(perm.id_modulo, "excluir", e.target.checked)}
                                                    disabled={!perm.visualizar}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClosePermissaoDialog}>Cancelar</Button>
                        <Button
                            onClick={handleSavePermissoes}
                            variant="contained"
                            startIcon={<SaveIcon />}
                            sx={{ bgcolor: corTopo }}
                        >
                            Salvar Permissões
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Confirm Dialog */}
                <Dialog open={confirmDialog} onClose={handleCloseConfirmDialog}>
                    <DialogTitle>Confirmar Exclusão</DialogTitle>
                    <DialogContent>
                        <Typography>Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.</Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseConfirmDialog}>Cancelar</Button>
                        <Button onClick={handleConfirmDelete} color="error" variant="contained">
                            Excluir
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Snackbar */}
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

export default ControleAcesso
