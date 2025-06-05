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
const express_1 = __importDefault(require("express"));
const database_1 = require("../database");
const auditoriaEnderecoService_1 = require("../services/auditoriaEnderecoService");
const router = express_1.default.Router();
// Rota para listar produtos
router.get("/", (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield database_1.productPool.query(`
      SELECT 
        codproduto,
        produto,
        complemento,
        unidade,
        codbarra,
        referencia,
        controla_lote,
        qtde_estoque,
        qtde_reserva,
        qtde_disponivel,
        qtde_avaria,
        facing
      FROM vs_wms_fprodutos_estoque
    `);
        res.json(result.rows);
    }
    catch (err) {
        console.error("Erro ao buscar produtos:", err);
        res.status(500).send("Erro ao buscar produtos");
    }
}));
// Nova rota para buscar produtos com estoque sem endereço (mover para depois da rota principal)
router.get("/sem-endereco", (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield database_1.productPool.query(`
      SELECT 
        p.codproduto,
        p.produto,
        p.qtde_estoque,
        p.controla_lote
      FROM vs_wms_fprodutos_estoque p
      WHERE p.qtde_estoque > 0
      AND NOT EXISTS (
        SELECT 1 
        FROM wms_estoque_local el 
        WHERE el.codproduto = p.codproduto
        AND el.quantidade > 0
      )
    `);
        res.json(result.rows);
    }
    catch (err) {
        console.error("Erro ao buscar produtos sem endereço:", err);
        res.status(500).send("Erro ao buscar produtos sem endereço");
    }
}));
// Rota para buscar lotes de um produto
router.get("/:codproduto/lotes", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { codproduto } = req.params;
    try {
        const result = yield database_1.productPool.query(`
      SELECT 
        lote,
        qtde_lote,
        qtde_reserva,
        (qtde_lote - qtde_reserva) AS qtde_disponivel
      FROM vs_wms_flotes
      WHERE codproduto = $1
    `, [codproduto]);
        res.json(result.rows);
    }
    catch (err) {
        console.error(`Erro ao buscar lotes do produto ${codproduto}:`, err);
        res.status(500).send("Erro ao buscar lotes do produto");
    }
}));
// Rota para buscar endereços por produto e lote
router.get("/:codproduto/enderecos-lote/:lote", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { codproduto, lote } = req.params;
    try {
        const result = yield database_1.productPool.query(`
      SELECT 
        e.codendereco,
        e.rua,
        e.predio,
        e.andar,
        e.apto,
        el.quantidade AS qtde
      FROM wms_estoque_local el
      INNER JOIN wms_enderecos e ON e.codendereco = el.codendereco
      WHERE el.codproduto = $1 AND el.lote = $2
      `, [codproduto, lote]);
        res.json(result.rows);
    }
    catch (err) {
        console.error(`Erro ao buscar endereços por lote para produto ${codproduto}, lote ${lote}:`, err);
        res.status(500).send("Erro ao buscar endereços por lote");
    }
}));
// POST - Adicionar endereço ao lote do produto
router.post("/:codproduto/:lote", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { codproduto, lote } = req.params;
    const { codendereco, qtde } = req.body;
    try {
        yield database_1.productPool.query(`INSERT INTO wms_estoque_local (codproduto, lote, codendereco, quantidade)
       VALUES ($1, $2, $3, $4)`, [codproduto, lote, codendereco, qtde]);
        yield (0, auditoriaEnderecoService_1.auditarEndereco)({
            codendereco,
            codproduto,
            lote,
            quantidade: qtde,
            tipo: "entrada",
            usuario: (_a = req.usuario) === null || _a === void 0 ? void 0 : _a.usuario,
        });
        res.status(201).send("Endereço adicionado ao lote com sucesso");
    }
    catch (error) {
        console.error(`Erro ao adicionar endereço ${codendereco} ao produto ${codproduto}, lote ${lote}:`, error);
        res.status(500).send("Erro ao adicionar endereço ao lote");
    }
}));
// PUT - editar endereço por lote
router.put("/:codproduto/:lote/:codendereco", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { codproduto, lote, codendereco } = req.params;
    const { qtde } = req.body;
    try {
        const atual = yield database_1.productPool.query(`SELECT quantidade FROM wms_estoque_local WHERE codproduto = $1 AND lote = $2 AND codendereco = $3`, [codproduto, lote, codendereco]);
        yield database_1.productPool.query(`UPDATE wms_estoque_local
       SET quantidade = $1
       WHERE codproduto = $2 AND lote = $3 AND codendereco = $4`, [qtde, codproduto, lote, codendereco]);
        const anterior = Number.parseFloat(((_a = atual.rows[0]) === null || _a === void 0 ? void 0 : _a.quantidade) || "0");
        const diferenca = qtde - anterior;
        if (diferenca !== 0) {
            yield (0, auditoriaEnderecoService_1.auditarEndereco)({
                codendereco,
                codproduto,
                lote,
                quantidade: Math.abs(diferenca),
                tipo: diferenca > 0 ? "entrada" : "saida",
                usuario: (_b = req.usuario) === null || _b === void 0 ? void 0 : _b.usuario,
            });
        }
        res.status(200).send("Quantidade atualizada com sucesso");
    }
    catch (err) {
        console.error(`Erro ao editar endereço ${codendereco} do produto ${codproduto}, lote ${lote}:`, err);
        res.status(500).send("Erro ao editar endereço do lote");
    }
}));
// DELETE - excluir endereço de um lote
router.delete("/:codproduto/:lote/:codendereco", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { codproduto, lote, codendereco } = req.params;
    try {
        const estoque = yield database_1.productPool.query(`SELECT quantidade FROM wms_estoque_local WHERE codproduto = $1 AND lote = $2 AND codendereco = $3`, [codproduto, lote, codendereco]);
        yield database_1.productPool.query(`DELETE FROM wms_estoque_local
       WHERE codproduto = $1 AND lote = $2 AND codendereco = $3`, [codproduto, lote, codendereco]);
        const qtde = Number.parseFloat(((_a = estoque.rows[0]) === null || _a === void 0 ? void 0 : _a.quantidade) || "0");
        if (qtde > 0) {
            yield (0, auditoriaEnderecoService_1.auditarEndereco)({
                codendereco,
                codproduto,
                lote,
                quantidade: qtde,
                tipo: "saida",
                usuario: (_b = req.usuario) === null || _b === void 0 ? void 0 : _b.usuario,
            });
        }
        res.status(204).send();
    }
    catch (err) {
        console.error(`Erro ao excluir endereço ${codendereco} do produto ${codproduto}, lote ${lote}:`, err);
        res.status(500).send("Erro ao excluir endereço do lote");
    }
}));
// Rota para buscar produtos por endereço
router.get("/por-endereco/:codendereco", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { codendereco } = req.params;
    try {
        const result = yield database_1.productPool.query(`
      SELECT 
        p.codproduto,
        p.produto,
        p.complemento,
        p.unidade,
        p.codbarra,
        el.lote,
        el.quantidade
      FROM wms_estoque_local el
      INNER JOIN vs_wms_fprodutos_estoque p ON p.codproduto = el.codproduto
      WHERE el.codendereco = $1
      ORDER BY p.produto
      `, [codendereco]);
        res.json(result.rows);
    }
    catch (err) {
        console.error(`Erro ao buscar produtos do endereço ${codendereco}:`, err);
        res.status(500).send("Erro ao buscar produtos do endereço");
    }
}));
exports.default = router;
