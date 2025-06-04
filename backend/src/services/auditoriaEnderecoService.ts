import { productPool } from "../database"
import { logger } from "../utils/logger"

export interface AuditoriaParams {
  codendereco: string
  codproduto: string
  lote: string | null
  quantidade: number
  tipo: "entrada" | "saida"
  usuario?: string
}

export const auditarEndereco = async ({ codendereco, codproduto, lote, quantidade, tipo, usuario }: AuditoriaParams): Promise<void> => {
  try {
    await productPool.query(
      `INSERT INTO wms_auditoria_enderecos
        (codendereco, codproduto, lote, quantidade, tipo, usuario)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [codendereco, codproduto, lote, quantidade, tipo, usuario || null]
    )
  } catch (error) {
    logger.error("Erro ao registrar auditoria:", error)
  }
}
