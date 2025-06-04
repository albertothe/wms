import QRCode from "qrcode"

/**
 * Gera um código de barras simples em um elemento canvas
 * @param canvas Elemento canvas onde o código será desenhado
 * @param text Texto a ser codificado
 * @param width Largura opcional do canvas
 * @param height Altura opcional do canvas
 */
export function generateBarcode(canvas: HTMLCanvasElement, text: string, width?: number, height?: number): void {
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Ajustar dimensões do canvas se fornecidas
    if (width && height) {
        canvas.width = width
        canvas.height = height
    }

    // Limpar o canvas
    ctx.fillStyle = "white"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Configurações do código de barras
    const barWidth = Math.max(1, Math.floor(canvas.width / (text.length * 8)))
    const barHeight = canvas.height - 20
    const startX = 10
    const startY = 10

    // Converter o texto em uma sequência de barras
    let x = startX
    ctx.fillStyle = "black"

    // Barra inicial
    ctx.fillRect(x, startY, barWidth, barHeight)
    x += barWidth * 2

    // Gerar barras baseadas no texto
    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i)

        // Usar o código ASCII para determinar a largura da barra
        const width = ((charCode % 3) + 1) * barWidth

        // Alternar entre barras e espaços
        if (i % 2 === 0) {
            ctx.fillRect(x, startY, width, barHeight)
        }

        x += width + barWidth
    }

    // Barra final
    ctx.fillRect(x, startY, barWidth, barHeight)

    // Adicionar o texto abaixo do código de barras
    ctx.fillStyle = "black"
    ctx.font = `${Math.max(8, Math.min(12, canvas.width / 15))}px Arial`
    ctx.textAlign = "center"
    ctx.fillText(text, canvas.width / 2, canvas.height - 5)
}

/**
 * Gera um QR Code usando a biblioteca QRCode
 * @param canvas Elemento canvas onde o código será desenhado
 * @param text Texto a ser codificado
 * @param size Tamanho opcional do QR code
 */
export function generateQRCode(canvas: HTMLCanvasElement, text: string, size?: number): void {
    try {
        // Ajustar dimensões do canvas se fornecido um tamanho
        if (size) {
            canvas.width = size
            canvas.height = size
        }

        // Usar a biblioteca QRCode para gerar um QR code válido
        QRCode.toCanvas(
            canvas,
            text,
            {
                width: canvas.width,
                margin: 1,
                errorCorrectionLevel: "M",
                color: {
                    dark: "#000000",
                    light: "#ffffff",
                },
            },
            (error) => {
                if (error) {
                    console.error("Erro ao gerar QR code:", error)

                    // Em caso de erro, desenhar um QR code de erro
                    const ctx = canvas.getContext("2d")
                    if (ctx) {
                        ctx.fillStyle = "white"
                        ctx.fillRect(0, 0, canvas.width, canvas.height)
                        ctx.fillStyle = "red"
                        ctx.font = "12px Arial"
                        ctx.textAlign = "center"
                        ctx.fillText("Erro ao gerar QR code", canvas.width / 2, canvas.height / 2)
                    }
                }
            },
        )
    } catch (error) {
        console.error("Erro ao gerar QR code:", error)

        // Em caso de erro, desenhar um QR code de erro
        const ctx = canvas.getContext("2d")
        if (ctx) {
            ctx.fillStyle = "white"
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.fillStyle = "red"
            ctx.font = "12px Arial"
            ctx.textAlign = "center"
            ctx.fillText("Erro ao gerar QR code", canvas.width / 2, canvas.height / 2)
        }
    }
}

/**
 * Gera um QR Code e retorna como uma URL de dados (data URL)
 * @param text Texto a ser codificado
 * @param size Tamanho do QR code (opcional, padrão: 200)
 * @returns URL de dados da imagem do QR code
 */
export function generateQRCodeAsDataURL(text: string, size = 200): string {
    return new Promise<string>((resolve) => {
        try {
            // Usar a biblioteca QRCode para gerar um QR code como data URL
            QRCode.toDataURL(
                text,
                {
                    width: size,
                    margin: 1,
                    errorCorrectionLevel: "M",
                    color: {
                        dark: "#000000",
                        light: "#ffffff",
                    },
                },
                (error, url) => {
                    if (error) {
                        console.error("Erro ao gerar QR code como data URL:", error)
                        resolve("")
                    } else {
                        resolve(url)
                    }
                },
            )
        } catch (error) {
            console.error("Erro ao gerar QR code como data URL:", error)
            resolve("")
        }
    }) as unknown as string
}

/**
 * Versão síncrona para gerar um QR Code como URL de dados
 * Esta função é útil quando você precisa do resultado imediatamente
 * @param text Texto a ser codificado
 * @param size Tamanho do QR code (opcional, padrão: 200)
 * @returns URL de dados da imagem do QR code
 */
export function generateQRCodeAsDataURLSync(text: string, size = 200): string {
    try {
        // Criar um canvas temporário
        const tempCanvas = document.createElement("canvas")
        tempCanvas.width = size
        tempCanvas.height = size

        // Gerar o QR code no canvas de forma síncrona
        QRCode.toCanvas(tempCanvas, text, {
            width: size,
            margin: 1,
            errorCorrectionLevel: "M",
            color: {
                dark: "#000000",
                light: "#ffffff",
            },
        })

        // Converter o canvas para data URL
        return tempCanvas.toDataURL("image/png")
    } catch (error) {
        console.error("Erro ao gerar QR code como data URL:", error)

        // Retornar uma imagem de erro ou vazia
        return ""
    }
}
