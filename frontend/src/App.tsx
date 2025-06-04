"use client"

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { ThemeProvider, createTheme } from "@mui/material/styles"
import CssBaseline from "@mui/material/CssBaseline"
import { ptBR } from "@mui/material/locale"
import { AuthProvider } from "./contexts/AuthContext"
import ProtectedRoute from "./components/ProtectedRoute"
import Login from "./components/Login"
import Dashboard from "./pages/Dashboard"
import Produtos from "./pages/Produtos"
import Enderecos from "./pages/Enderecos"
import RelatorioEnderecos from "./pages/RelatorioEnderecos"
import Configuracoes from "./pages/Configuracoes"
import ControleAcesso from "./pages/ControleAcesso"
import PainelEntrada from "./pages/PainelEntrada"
import PainelSaida from "./pages/PainelSaida"
import ImprimirEtiquetasEnderecos from "./pages/ImprimirEtiquetasEnderecos"

const theme = createTheme(
  {
    palette: {
      primary: {
        main: "#0a0a6b",
      },
      secondary: {
        main: "#19857b",
      },
      background: {
        default: "#f5f5f5",
      },
    },
    typography: {
      fontFamily: ["Roboto", "Arial", "sans-serif"].join(","),
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 4,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 4,
          },
        },
      },
    },
  },
  ptBR,
)

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/produtos"
              element={
                <ProtectedRoute requiredPermission={{ rota: "produtos", tipo: "visualizar" }}>
                  <Produtos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/enderecos"
              element={
                <ProtectedRoute requiredPermission={{ rota: "enderecos", tipo: "visualizar" }}>
                  <Enderecos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/relatorioenderecos"
              element={
                <ProtectedRoute>
                  <RelatorioEnderecos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/configuracoes"
              element={
                <ProtectedRoute requiredPermission={{ rota: "configuracoes", tipo: "visualizar" }}>
                  <Configuracoes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/controleacesso"
              element={
                <ProtectedRoute>
                  <ControleAcesso />
                </ProtectedRoute>
              }
            />
            <Route
              path="/painelentrada"
              element={
                <ProtectedRoute requiredPermission={{ rota: "painelentrada", tipo: "visualizar" }}>
                  <PainelEntrada />
                </ProtectedRoute>
              }
            />
            <Route
              path="/painelsaida"
              element={
                <ProtectedRoute requiredPermission={{ rota: "painelsaida", tipo: "visualizar" }}>
                  <PainelSaida />
                </ProtectedRoute>
              }
            />
            <Route
              path="/relatorios"
              element={
                <ProtectedRoute>
                  <RelatorioEnderecos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/imprimir-etiquetas-enderecos"
              element={
                <ProtectedRoute>
                  <ImprimirEtiquetasEnderecos />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  )
}

export default App
