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
// backend/routes/produtos.ts
const express_1 = __importDefault(require("express"));
const database_1 = require("../database"); // <-- usa o nome correto aqui
const router = express_1.default.Router();
// Rota para listar produtos
router.get('/', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield database_1.productPool.query(`
      SELECT 
        pro.c_codigo AS codproduto,
        pro.c_descr AS produto,
        pro.c_compl AS complemento,
        pro.c_unidade as unidade,
        pro.c_codbar AS codbarra,
        pro.c_refer AS referencia,
        est.c_estloja AS qtde_estoque,
        est.c_resloja AS qtde_reserva,
        est.c_estloja + est.c_resloja AS qtde_disponivel,
        est.c_est_avarias AS qtde_avaria
      FROM a_produt pro
      INNER JOIN a_estfil est ON est.c_codprod = pro.c_codigo AND est.c_fil = '08'
      WHERE pro.c_status = 'A'
        AND pro.c_class BETWEEN '06001' and '06099'
    `);
        res.json(result.rows);
    }
    catch (err) {
        console.error(err);
        res.status(500).send('Erro ao buscar produtos');
    }
}));
// Rota para buscar endereços de um produto
router.get('/:codproduto/enderecos', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { codproduto } = req.params;
    try {
        const result = yield database_1.productPool.query(`
      SELECT 
        e.rua,
        e.predio,
        el.quantidade AS qtde
      FROM pwb_estoque_local el
      INNER JOIN pwb_enderecos e ON e.codendereco = el.codendereco
      WHERE el.codproduto = $1
      `, [codproduto]);
        res.json(result.rows);
    }
    catch (err) {
        console.error(err);
        res.status(500).send('Erro ao buscar endereços do produto');
    }
}));
exports.default = router;
