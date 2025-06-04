"use client"

import type React from "react"
import { useState } from "react"
import { Box } from "@mui/material"
import { Sidebar } from "./Sidebar"

interface LayoutProps {
    children: React.ReactNode
    collapsed?: boolean
    toggleSidebar?: () => void
    corTopo?: string
    nomeEmpresa?: string
}

const Layout = ({
    children,
    collapsed: propCollapsed,
    toggleSidebar: propToggleSidebar,
    corTopo = "#0a0a6b",
    nomeEmpresa = "Sistema WMS",
}: LayoutProps) => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

    const toggleSidebar = () => {
        setSidebarCollapsed(!sidebarCollapsed)
        if (propToggleSidebar) {
            propToggleSidebar()
        }
    }

    const collapsed = propCollapsed !== undefined ? propCollapsed : sidebarCollapsed

    return (
        <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f5f5f5" }}>
            <Sidebar collapsed={collapsed} toggleSidebar={toggleSidebar} corTopo={corTopo} nomeEmpresa={nomeEmpresa} />
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    transition: "margin 0.3s",
                    marginLeft: collapsed ? "64px" : "250px",
                    "@media (max-width: 768px)": {
                        marginLeft: 0,
                    },
                }}
            >
                {children}
            </Box>
        </Box>
    )
}

export default Layout
export { Layout }
