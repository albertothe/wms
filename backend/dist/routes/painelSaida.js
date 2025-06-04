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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/painelSaida.ts
const express_1 = __importDefault(require("express"));
const database_1 = require("../database");
const router = express_1.default.Router();
// Rota para listar capas (sem os produtos)
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const query = `
      SELECT DISTINCT
        data,
        codloja, 
        op,
        prenota,
        np,
        tipo,
        status,
        separacao,
        coddestinario,
        destinario
      FROM vs_pwb_fpainel_saida
      ORDER BY data DESC
    `;
        const result = yield database_1.productPool.query(query);
        res.json(result.rows);
    }
    catch (err) {
        console.error('Erro ao buscar capas de pré-notas:', err);
        res.status(500).json({ erro: 'Erro ao buscar pré-notas' });
    }
}));
// Rota para listar os produtos da prenota
router.get('/:prenota', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { prenota } = req.params;
    try {
        const query = `
      SELECT 
        codproduto,
        produto,
        qtde_saida,
        vlr_unitario,
        vlr_total
      FROM vs_pwb_fpainel_saida
      WHERE prenota = $1
    `;
        const result = yield database_1.productPool.query(query, [prenota]);
        res.json(result.rows);
    }
    catch (err) {
        console.error(`Erro ao buscar produtos da prenota ${prenota}:`, err);
        res.status(500).json({ erro: 'Erro ao buscar detalhes da pré-nota' });
    }
}));
exports.default = router;
