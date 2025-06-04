declare module "jsbarcode" {
    interface JsBarcodeOptions {
        format?: string
        width?: number
        height?: number
        displayValue?: boolean
        text?: string
        fontOptions?: string
        font?: string
        textAlign?: string
        textPosition?: string
        textMargin?: number
        fontSize?: number
        background?: string
        lineColor?: string
        margin?: number
        marginTop?: number
        marginBottom?: number
        marginLeft?: number
        marginRight?: number
        flat?: boolean
        valid?: (valid: boolean) => void
    }

    function JsBarcode(element: HTMLElement | SVGElement | string, data: string, options?: JsBarcodeOptions): void

    namespace JsBarcode {
        function getModule(name: string): any
    }

    export = JsBarcode
}
