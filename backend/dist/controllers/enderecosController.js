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
exports.listarEnderecosPorProduto = void 0;
const database_1 = require("../database");
const listarEnderecosPorProduto = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { codproduto } = req.params;
    try {
        const query = `
      SELECT 
        el.codendereco,
        e.rua,
        e.predio,
        el.quantidade AS qtde
      FROM 
        pwb_estoque_local el
      INNER JOIN 
        pwb_enderecos e ON e.codendereco = el.codendereco
      WHERE 
        el.codproduto = $1
    `;
        const result = yield database_1.productPool.query(query, [codproduto]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Erro ao buscar endereços por produto:', error);
        res.status(500).json({ erro: 'Erro ao buscar endereços por produto' });
    }
});
exports.listarEnderecosPorProduto = listarEnderecosPorProduto;
