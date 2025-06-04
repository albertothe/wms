/**
 * Função para imprimir um elemento HTML
 * @param element Elemento HTML a ser impresso
 * @param dispatchEvent Se deve disparar um evento após a impressão (padrão: false)
 */
export const printElement = (element: HTMLElement, dispatchEvent = false): void => {
  // Primeiro, vamos converter todos os canvas para imagens
  const canvases = element.querySelectorAll("canvas")
  const canvasPromises: Promise<void>[] = []

  canvases.forEach((canvas) => {
    const promise = new Promise<void>((resolve) => {
      try {
        // Criar uma imagem a partir do canvas
        const img = new Image()
        img.src = canvas.toDataURL("image/png")
        img.style.width = canvas.style.width || `${canvas.width}px`
        img.style.height = canvas.style.height || `${canvas.height}px`
        img.style.maxWidth = "100%"
        img.className = canvas.className

        // Substituir o canvas pela imagem quando a imagem estiver carregada
        img.onload = () => {
          if (canvas.parentNode) {
            canvas.parentNode.replaceChild(img, canvas)
          }
          resolve()
        }

        // Se houver erro, manter o canvas original
        img.onerror = () => {
          console.warn("Erro ao converter canvas para imagem, mantendo o canvas original")
          resolve()
        }
      } catch (error) {
        console.warn("Erro ao processar canvas:", error)
        resolve()
      }
    })

    canvasPromises.push(promise)
  })

  // Após converter todos os canvas, prosseguir com a impressão
  Promise.all(canvasPromises).then(() => {
    // Criar um iframe para impressão (isso isola o conteúdo a ser impresso)
    const iframe = document.createElement("iframe")
    iframe.style.position = "absolute"
    iframe.style.top = "-9999px"
    iframe.style.left = "-9999px"
    iframe.style.width = "0"
    iframe.style.height = "0"
    iframe.style.border = "none"

    // Adicionar o iframe ao documento
    document.body.appendChild(iframe)

    // Esperar o iframe carregar
    iframe.onload = () => {
      try {
        // Obter o documento do iframe
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document

        if (!iframeDoc) {
          throw new Error("Não foi possível acessar o documento do iframe")
        }

        // Adicionar estilos de impressão
        const style = iframeDoc.createElement("style")
        style.textContent = `
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
          }
          /* Estilos específicos para o grid de etiquetas */
          .etiqueta-container {
            display: flex !important;
            flex-wrap: wrap !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .etiqueta-item {
            display: inline-block !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-sizing: border-box !important;
            padding: 5px !important;
          }
          .etiqueta-item-pequeno {
            width: 25% !important;
          }
          .etiqueta-item-medio {
            width: 33.33% !important;
          }
          .etiqueta-item-grande {
            width: 50% !important;
          }
          .no-print {
            display: none !important;
          }
          /* Estilos originais */
          .etiqueta {
            border: 1px solid #ddd;
            padding: 8px;
            margin-bottom: 8px;
            page-break-inside: avoid;
          }
          .qrcode-container {
            display: flex;
            justify-content: center;
            margin-bottom: 5px;
          }
          .qrcode-image {
            width: 100px;
            height: 100px;
          }
          .etiqueta-info {
            font-size: 12px;
            line-height: 1.2;
          }
          .etiqueta-titulo {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 3px;
          }
          .etiqueta-endereco {
            font-weight: bold;
            margin-bottom: 3px;
          }
          .etiqueta-complemento {
            font-style: italic;
            color: #666;
          }
        `
        iframeDoc.head.appendChild(style)

        // Clonar o elemento para o iframe
        const elementClone = element.cloneNode(true) as HTMLElement
        iframeDoc.body.appendChild(elementClone)

        // Garantir que todos os recursos (imagens, etc.) sejam carregados
        setTimeout(() => {
          // Imprimir o iframe
          iframe.contentWindow?.print()

          // Remover o iframe após um tempo (para dar tempo de imprimir)
          setTimeout(() => {
            document.body.removeChild(iframe)

            // Disparar evento de impressão concluída, se solicitado
            if (dispatchEvent) {
              const event = new CustomEvent("printCompleted", { detail: { success: true } })
              window.dispatchEvent(event)
              console.log("Evento printCompleted disparado")
            }
          }, 1000)
        }, 1000)
      } catch (error) {
        console.error("Erro ao imprimir:", error)
        document.body.removeChild(iframe)

        // Disparar evento de erro, se solicitado
        if (dispatchEvent) {
          const event = new CustomEvent("printCompleted", { detail: { success: false, error } })
          window.dispatchEvent(event)
        }
      }
    }

    // Definir o conteúdo do iframe
    iframe.src = "about:blank"
  })
}

/**
 * Função para imprimir vários elementos HTML
 * @param elements Array de elementos HTML a serem impressos
 * @param dispatchEvent Se deve disparar um evento após a impressão (padrão: false)
 */
export const printMultipleElements = (elements: HTMLElement[], dispatchEvent = false): void => {
  // Criar um container para todos os elementos
  const container = document.createElement("div")

  // Adicionar cada elemento ao container
  elements.forEach((element) => {
    const clone = element.cloneNode(true) as HTMLElement
    container.appendChild(clone)

    // Adicionar quebra de página após cada elemento (exceto o último)
    if (element !== elements[elements.length - 1]) {
      const pageBreak = document.createElement("div")
      pageBreak.style.pageBreakAfter = "always"
      pageBreak.style.height = "0"
      container.appendChild(pageBreak)
    }
  })

  // Imprimir o container
  printElement(container, dispatchEvent)
}
