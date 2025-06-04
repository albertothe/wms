"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import {
    Box,
    Drawer,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    IconButton,
    Divider,
    Typography,
    Tooltip,
} from "@mui/material"
import {
    Menu as MenuIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    Dashboard as DashboardIcon,
    Inventory as InventoryIcon,
    Place as PlaceIcon,
    Assessment as AssessmentIcon,
    Logout as LogoutIcon,
    Settings as SettingsIcon,
    Security as SecurityIcon,
    ShoppingCart as ShoppingCartIcon,
    LocalShipping as LocalShippingIcon,
    BarChart as BarChartIcon,
    Storage as StorageIcon,
    Print as PrintIcon,
    Label as LabelIcon,
    ViewList as ViewListIcon,
    Assignment as AssignmentIcon,
    Visibility as VisibilityIcon,
    Category as CategoryIcon,
    Apartment as ApartmentIcon,
    People as PeopleIcon,
    Business as BusinessIcon,
    Storefront as StorefrontIcon,
    ReceiptLong as ReceiptLongIcon,
} from "@mui/icons-material"
import { useAuth } from "../contexts/AuthContext"

// Mapeamento de ícones por nome de rota
const routeIconMap: Record<string, React.ReactElement> = {
    dashboard: <DashboardIcon />,
    produtos: <InventoryIcon />,
    enderecos: <PlaceIcon />,
    relatorioenderecos: <AssessmentIcon />,
    configuracoes: <SettingsIcon />,
    controleacesso: <SecurityIcon />,
    painelentrada: <ShoppingCartIcon />,
    painelsaida: <LocalShippingIcon />,
    relatorios: <BarChartIcon />,
    estoque: <StorageIcon />,
    impressaoconferencia: <PrintIcon />,
    imprimiretiquetas: <LabelIcon />,
    imprimirprenota: <ReceiptLongIcon />,
    inventario: <ViewListIcon />,
    pedidos: <AssignmentIcon />,
    conferencia: <VisibilityIcon />,
    categorias: <CategoryIcon />,
    departamentos: <ApartmentIcon />,
    usuarios: <PeopleIcon />,
    fornecedores: <BusinessIcon />,
    clientes: <StorefrontIcon />,
    receipt_long: <ReceiptLongIcon />,
}

// Mapeamento de ícones por nome (fallback)
const iconMap: Record<string, React.ReactElement> = {
    dashboard: <DashboardIcon />,
    inventory: <InventoryIcon />,
    place: <PlaceIcon />,
    assessment: <AssessmentIcon />,
    settings: <SettingsIcon />,
    security: <SecurityIcon />,
    shopping_cart: <ShoppingCartIcon />,
    local_shipping: <LocalShippingIcon />,
    bar_chart: <BarChartIcon />,
    storage: <StorageIcon />,
    print: <PrintIcon />,
    label: <LabelIcon />,
    view_list: <ViewListIcon />,
    assignment: <AssignmentIcon />,
    visibility: <VisibilityIcon />,
    category: <CategoryIcon />,
    apartment: <ApartmentIcon />,
    people: <PeopleIcon />,
    business: <BusinessIcon />,
    storefront: <StorefrontIcon />,
    receipt_long: <ReceiptLongIcon />,
}

interface SidebarProps {
    collapsed: boolean
    toggleSidebar: () => void
    corTopo?: string
    nomeEmpresa?: string
}

export const Sidebar = ({
    collapsed,
    toggleSidebar,
    corTopo = "#0a0a6b",
    nomeEmpresa = "Sistema WMS",
}: SidebarProps) => {
    const [, setIsMobile] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [openSubMenu, setOpenSubMenu] = useState<string | null>(null)

    const navigate = useNavigate()
    const location = useLocation()
    const { logout, modulos } = useAuth()

    useEffect(() => {
        const checkIfMobile = () => {
            setIsMobile(window.innerWidth < 768)
        }

        checkIfMobile()
        window.addEventListener("resize", checkIfMobile)

        return () => {
            window.removeEventListener("resize", checkIfMobile)
        }
    }, [])

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen)
    }

    const isActive = (path: string) => {
        return location.pathname === path
    }

    const handleLogout = () => {
        logout()
    }

    const getIconForModule = (modulo: any) => {
        // Primeiro tenta encontrar o ícone pela rota
        if (modulo.rota && routeIconMap[modulo.rota.toLowerCase()]) {
            return routeIconMap[modulo.rota.toLowerCase()]
        }

        // Depois tenta pelo nome do ícone
        if (modulo.icone && iconMap[modulo.icone.toLowerCase()]) {
            return iconMap[modulo.icone.toLowerCase()]
        }

        // Finalmente, tenta pelo nome do módulo
        const moduloNome = modulo.nome?.toLowerCase() || ""
        for (const [key, icon] of Object.entries(routeIconMap)) {
            if (moduloNome.includes(key)) {
                return icon
            }
        }

        // Fallback para ícone padrão
        return <DashboardIcon />
    }

    // Função para lidar com cliques em itens do menu
    const handleMenuItemClick = (modulo: any) => {
        console.log("Clicou no módulo:", modulo)

        // Casos especiais para relatórios e controle de acesso
        if (modulo.nome.toLowerCase().includes("relatório") || modulo.rota.toLowerCase().includes("relatorio")) {
            console.log("Navegando para /relatorios")
            window.location.href = `${window.location.origin}/relatorios`
            return
        }

        if (
            modulo.nome.toLowerCase().includes("controle de acesso") ||
            modulo.rota.toLowerCase().includes("controleacesso")
        ) {
            console.log("Navegando para /controleacesso")
            window.location.href = `${window.location.origin}/controleacesso`
            return
        }

        // Para outros módulos, use a rota normal
        const rotaNormalizada = modulo.rota.toLowerCase().replace(/\s+/g, "").replace(/^\/+/, "")
        console.log("Navegando para rota normalizada:", rotaNormalizada)
        window.location.href = `${window.location.origin}/${rotaNormalizada}`
    }

    // Função para navegar para o Dashboard quando clicar no nome da empresa
    const navigateToDashboard = () => {
        console.log("Navegando para o Dashboard")
        window.location.href = `${window.location.origin}/dashboard`
    }

    const drawerWidth = collapsed ? 64 : 250

    console.log("Sidebar - Cor do topo:", corTopo)
    console.log("Sidebar - Nome da empresa:", nomeEmpresa)
    console.log("Sidebar - Módulos disponíveis:", modulos)

    const drawer = (
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: corTopo, color: "white" }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between", p: 2 }}>
                {!collapsed && (
                    <Typography
                        variant="h6"
                        noWrap
                        component="div"
                        sx={{
                            flexGrow: 1,
                            cursor: "pointer",
                            "&:hover": {
                                opacity: 0.8,
                                textDecoration: "underline",
                            },
                        }}
                        onClick={navigateToDashboard}
                    >
                        {nomeEmpresa}
                    </Typography>
                )}
                <IconButton onClick={toggleSidebar} sx={{ color: "white" }}>
                    {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                </IconButton>
            </Box>
            <Divider sx={{ bgcolor: "rgba(255,255,255,0.2)" }} />
            <List sx={{ flexGrow: 1 }}>
                {modulos.map((modulo) => {
                    const icon = getIconForModule(modulo)

                    return (
                        <Tooltip key={modulo.id} title={collapsed ? modulo.nome : ""} placement="right" arrow>
                            <ListItemButton
                                onClick={() => handleMenuItemClick(modulo)}
                                sx={{
                                    bgcolor: isActive(`/${modulo.rota}`) ? "rgba(255,255,255,0.1)" : "transparent",
                                    pl: collapsed ? 2 : 3,
                                    py: 1.5,
                                }}
                            >
                                <ListItemIcon sx={{ color: "white", minWidth: collapsed ? "auto" : 40 }}>{icon}</ListItemIcon>
                                {!collapsed && <ListItemText primary={modulo.nome} />}
                            </ListItemButton>
                        </Tooltip>
                    )
                })}
            </List>
            <Divider sx={{ bgcolor: "rgba(255,255,255,0.2)" }} />
            <List>
                <ListItemButton
                    onClick={handleLogout}
                    sx={{
                        pl: collapsed ? 2 : 3,
                        py: 1.5,
                    }}
                >
                    <ListItemIcon sx={{ color: "white", minWidth: collapsed ? "auto" : 40 }}>
                        <LogoutIcon />
                    </ListItemIcon>
                    {!collapsed && <ListItemText primary="Sair" />}
                </ListItemButton>
            </List>
        </Box>
    )

    return (
        <>
            {/* Mobile drawer */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: "block", md: "none" },
                    "& .MuiDrawer-paper": { width: 250, boxSizing: "border-box", bgcolor: corTopo },
                }}
            >
                {drawer}
            </Drawer>

            {/* Desktop drawer */}
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: "none", md: "block" },
                    "& .MuiDrawer-paper": {
                        width: drawerWidth,
                        boxSizing: "border-box",
                        transition: "width 0.3s",
                        overflowX: "hidden",
                        bgcolor: corTopo,
                    },
                }}
                open
            >
                {drawer}
            </Drawer>

            {/* Mobile toggle button */}
            <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{
                    display: { md: "none" },
                    position: "fixed",
                    top: 10,
                    left: 10,
                    zIndex: 1300,
                    bgcolor: corTopo,
                    color: "white",
                    "&:hover": { bgcolor: "rgba(10, 10, 107, 0.8)" },
                }}
            >
                <MenuIcon />
            </IconButton>
        </>
    )
}
