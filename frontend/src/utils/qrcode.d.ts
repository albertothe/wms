/**
 * Gera um código de barras simples em um elemento canvas
 * @param canvas Elemento canvas onde o código será desenhado
 * @param text Texto a ser codificado
 */
export function generateBarcode(canvas: HTMLCanvasElement, text: string): void {
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Limpar o canvas
    ctx.fillStyle = "white"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Configurações do código de barras
    const barWidth = 2
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
    ctx.font = "12px Arial"
    ctx.textAlign = "center"
    ctx.fillText(text, canvas.width / 2, canvas.height - 5)
}

/**
 * Gera um QR Code usando a biblioteca QRCode
 * @param canvas Elemento canvas onde o código será desenhado
 * @param text Texto a ser codificado
 */
export function generateQRCode(canvas: HTMLCanvasElement, text: string): void {
    try {
        // Verificar se a biblioteca QRCode está disponível
        if (typeof QRCode === 'undefined') {
            // Fallback para a implementação simplificada se a biblioteca não estiver disponível
            generateSimpleQRCode(canvas, text);
            console.warn('Biblioteca QRCode não encontrada. Usando implementação simplificada.');
            return;
        }

        // Limpar o canvas
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Criar um elemento temporário para o QRCode
        const tempDiv = document.createElement('div');
        document.body.appendChild(tempDiv);

        // Configurar o QRCode
        const qrcode = new QRCode(tempDiv, {
            text: text,
            width: canvas.width,
            height: canvas.height,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H // Nível de correção de erro mais alto
        });

        // Aguardar a geração do QRCode
        setTimeout(() => {
            // Obter a imagem gerada
            const img = tempDiv.querySelector('img');
            if (img) {
                // Desenhar a imagem no canvas
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            }

            // Remover o elemento temporário
            document.body.removeChild(tempDiv);
        }, 50);
    } catch (error) {
        console.error('Erro ao gerar QR Code:', error);
        // Fallback para a implementação simplificada em caso de erro
        generateSimpleQRCode(canvas, text);
    }
}

/**
 * Implementação simplificada de QR Code (fallback)
 * @param canvas Elemento canvas onde o código será desenhado
 * @param text Texto a ser codificado
 */
function generateSimpleQRCode(canvas: HTMLCanvasElement, text: string): void {
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Limpar o canvas
    ctx.fillStyle = "white"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Configurações do QR Code
    const modules = 21 // Tamanho padrão de um QR Code (21x21)
    const moduleSize = Math.floor(Math.min(canvas.width, canvas.height) / modules)
    const startX = Math.floor((canvas.width - moduleSize * modules) / 2)
    const startY = Math.floor((canvas.height - moduleSize * modules) / 2)

    // Criar uma matriz para o QR Code
    const matrix: number[][] = Array(modules)
        .fill(0)
        .map(() => Array(modules).fill(0))

    // Preencher a matriz com um padrão baseado no texto
    for (let i = 0; i < modules; i++) {
        for (let j = 0; j < modules; j++) {
            // Usar uma função hash simples baseada no texto e posição
            const hash = (text.charCodeAt(i % text.length) + j) % 2
            matrix[i][j] = hash
        }
    }

    // Adicionar os padrões de localização (finder patterns)
    // Padrão superior esquerdo
    for (let i = 0; i < 7 && i < modules; i++) {
        for (let j = 0; j < 7 && j < modules; j++) {
            if (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4)) {
                matrix[i][j] = 1
            } else {
                matrix[i][j] = 0
            }
        }
    }

    // Padrão superior direito
    for (let i = 0; i < 7 && i < modules; i++) {
        for (let j = modules - 7; j < modules && j >= 0; j++) {
            if (
                i === 0 ||
                i === 6 ||
                j === modules - 1 ||
                j === modules - 7 ||
                (i >= 2 && i <= 4 && j >= modules - 5 && j <= modules - 3)
            ) {
                matrix[i][j] = 1
            } else {
                matrix[i][j] = 0
            }
        }
    }

    // Padrão inferior esquerdo
    for (let i = modules - 7; i < modules && i >= 0; i++) {
        for (let j = 0; j < 7 && j < modules; j++) {
            if (
                i === modules - 1 ||
                i === modules - 7 ||
                j === 0 ||
                j === 6 ||
                (i >= modules - 5 && i <= modules - 3 && j >= 2 && j <= 4)
            ) {
                matrix[i][j] = 1
            } else {
                matrix[i][j] = 0
            }
        }
    }

    // Desenhar o QR Code
    ctx.fillStyle = "black"
    for (let i = 0; i < modules; i++) {
        for (let j = 0; j < modules; j++) {
            if (matrix[i][j] === 1) {
                ctx.fillRect(startX + j * moduleSize, startY + i * moduleSize, moduleSize, moduleSize)
            }
        }
    }
}