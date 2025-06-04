"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditarEndereco = void 0;
const database_1 = require("../database");
const logger_1 = require("../utils/logger");
const auditarEndereco = (_a) => __awaiter(void 0, [_a], void 0, function* ({ codendereco, codproduto, lote, quantidade, tipo, usuario }) {
    try {
        yield database_1.productPool.query(`INSERT INTO wms_auditoria_enderecos
        (codendereco, codproduto, lote, quantidade, tipo, usuario)
       VALUES ($1, $2, $3, $4, $5, $6)`, [codendereco, codproduto, lote, quantidade, tipo, usuario || null]);
    }
    catch (error) {
        logger_1.logger.error("Erro ao registrar auditoria:", error);
    }
});
exports.auditarEndereco = auditarEndereco;
