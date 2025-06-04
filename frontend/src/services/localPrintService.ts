// Serviço para comunicação com o serviço local de impressão
import api from "./api"

// Valor padrão caso não consiga obter do backend
const DEFAULT_LOCAL_PRINT_SERVICE_URL = "http://127.0.0.1:8080"

export interface LocalPrintService {
    isOnline(): Promise<boolean>
    getImpressoras(): Promise<any[]>
    imprimir(nomeImpressora: string, zplCode: string): Promise<boolean>
    testar(nomeImpressora: string): Promise<boolean>
}

class LocalPrintServiceImpl implements LocalPrintService {
    private baseUrl: string | null = null
    private configLoaded = false

    constructor() {
        this.loadConfig()
    }

    private async loadConfig(): Promise<void> {
        try {
            const response = await api.get("/impressora/zebra/config")
            const config = response.data

            if (config && config.localPrintService && config.localPrintService.url) {
                this.baseUrl = config.localPrintService.url
                console.log(`✅ Configuração do serviço local carregada: ${this.baseUrl}`)
            } else {
                this.baseUrl = DEFAULT_LOCAL_PRINT_SERVICE_URL
                console.warn(`⚠️ Usando URL padrão para serviço local: ${this.baseUrl}`)
            }
        } catch (error) {
            console.error("❌ Erro ao carregar configuração do serviço local:", error)
            this.baseUrl = DEFAULT_LOCAL_PRINT_SERVICE_URL
        } finally {
            this.configLoaded = true
        }
    }

    private async ensureConfigLoaded(): Promise<string> {
        if (!this.configLoaded) {
            await this.loadConfig()
        }
        return this.baseUrl || DEFAULT_LOCAL_PRINT_SERVICE_URL
    }

    async isOnline(): Promise<boolean> {
        try {
            const baseUrl = await this.ensureConfigLoaded()
            const response = await fetch(`${baseUrl}/health`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
                // Timeout de 3 segundos
                signal: AbortSignal.timeout(3000),
            })

            return response.ok
        } catch (error) {
            console.warn("Serviço local de impressão não está disponível:", error)
            return false
        }
    }

    async getImpressoras(): Promise<any[]> {
        try {
            const baseUrl = await this.ensureConfigLoaded()
            const response = await fetch(`${baseUrl}/impressoras`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            })

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`)
            }

            return await response.json()
        } catch (error) {
            console.error("Erro ao buscar impressoras do serviço local:", error)
            throw error
        }
    }

    async imprimir(nomeImpressora: string, zplCode: string): Promise<boolean> {
        try {
            const baseUrl = await this.ensureConfigLoaded()
            const response = await fetch(`${baseUrl}/imprimir`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    nomeImpressora,
                    zplCode,
                }),
            })

            return response.ok
        } catch (error) {
            console.error("Erro ao imprimir via serviço local:", error)
            throw error
        }
    }

    async testar(nomeImpressora: string): Promise<boolean> {
        try {
            const baseUrl = await this.ensureConfigLoaded()
            const response = await fetch(`${baseUrl}/testar`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    nomeImpressora,
                }),
            })

            return response.ok
        } catch (error) {
            console.error("Erro ao testar impressora via serviço local:", error)
            throw error
        }
    }
}

// Instância singleton
export const localPrintService = new LocalPrintServiceImpl()

// Função utilitária para verificar se deve usar serviço local ou servidor
export const shouldUseLocalService = async (): Promise<boolean> => {
    // Se estiver em desenvolvimento, sempre tentar o serviço local primeiro
    if (process.env.NODE_ENV === "development") {
        return await localPrintService.isOnline()
    }

    // Em produção, sempre usar o serviço local
    return true
}
