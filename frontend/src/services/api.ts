import axios from "axios"

// Modificar a criação da instância do axios para usar a variável de ambiente:
const api = axios.create({
  baseURL: process.env.REACT_APP_API || "http://localhost:9001",
})

// Adicionar logs para debug:
console.log("API URL:", process.env.REACT_APP_API || "http://localhost:9001")

// Adicionar um interceptor para incluir o token de autenticação em todas as requisições
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log(`Requisição ${config.method?.toUpperCase()} para ${config.url} com token`)
    } else {
      console.log(`Requisição ${config.method?.toUpperCase()} para ${config.url} sem token`)
    }
    return config
  },
  (error) => {
    console.error("Erro na requisição:", error)
    return Promise.reject(error)
  },
)

// Adicionar um interceptor para tratar respostas
api.interceptors.response.use(
  (response) => {
    console.log(`Resposta ${response.status} de ${response.config.url}`)
    return response
  },
  (error) => {
    if (error.response) {
      console.error(`Erro ${error.response.status} de ${error.config.url}:`, error.response.data)

      // Se o erro for 401 (não autorizado), redirecionar para a página de login
      if (error.response.status === 401) {
        console.log("Erro 401: Não autorizado, redirecionando para login")
        localStorage.removeItem("authToken")
        localStorage.removeItem("usuario")
        localStorage.removeItem("modulos")
        // Evitar redirecionamento automático para evitar loops
        if (window.location.pathname !== "/") {
          window.location.href = "/"
        }
      }
    } else if (error.request) {
      console.error(`Sem resposta para ${error.config.url}:`, error.request)
    } else {
      console.error(`Erro na configuração da requisição:`, error.message)
    }
    return Promise.reject(error)
  },
)

export default api
