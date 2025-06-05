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
// backend/src/routes/enderecos.ts
const express_1 = __importDefault(require("express"));
const database_1 = require("../database");
const enderecosController_1 = require("../controllers/enderecosController");
const auth_1 = require("../middleware/auth");
const auditoriaEnderecoService_1 = require("../services/auditoriaEnderecoService");
const router = express_1.default.Router();
// GET - listar todos os endereços
router.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield database_1.productPool.query("SELECT * FROM wms_enderecos ORDER BY codendereco");
        res.json(result.rows);
    }
    catch (err) {
        res.status(500).json({ erro: "Erro ao buscar endereços" });
    }
}));
// GET - listar endereços por produto (expansão na tabela de produtos)
router.get("/enderecos-por-produto/:codproduto", enderecosController_1.listarEnderecosPorProduto);
// Função utilitária para montar o código do endereço
const construirCodendereco = (rua, predio, andar, apto) => {
    let codigo = `R${rua.trim().toUpperCase()}P${predio.trim().toUpperCase()}`;
    if (andar && apto) {
        codigo += `A${andar.trim().toUpperCase()}A${apto.trim().toUpperCase()}`;
    }
    return codigo;
};
// POST - adicionar novo endereço base
router.post("/", (0, auth_1.verificarPermissao)("incluir"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { rua, predio, andar, apto } = req.body;
    const codendereco = construirCodendereco(rua, predio, andar, apto);
    try {
        const result = yield database_1.productPool.query(`INSERT INTO wms_enderecos (codendereco, rua, predio, andar, apto)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`, [codendereco, rua, predio, andar || null, apto || null]);
        res.status(201).json(result.rows[0]);
    }
    catch (err) {
        if (err.code === "23505") {
            return res.status(400).json({ erro: "Endereço já existe." });
        }
        res.status(500).json({ erro: "Erro ao inserir endereço" });
    }
}));
// PUT - atualizar endereço base (rua, prédio, andar, apto e codendereco)
router.put("/:id", (0, auth_1.verificarPermissao)("editar"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const { rua, predio, andar, apto } = req.body;
    const novoCodendereco = construirCodendereco(rua, predio, andar, apto);
    try {
        const existe = yield database_1.productPool.query("SELECT 1 FROM wms_enderecos WHERE codendereco = $1", [novoCodendereco]);
        if (((_a = existe.rowCount) !== null && _a !== void 0 ? _a : 0) > 0 && novoCodendereco !== id) {
            return res.status(400).json({ erro: "Já existe um endereço com esse código." });
        }
        const result = yield database_1.productPool.query(`UPDATE wms_enderecos
       SET codendereco = $1, rua = $2, predio = $3, andar = $4, apto = $5
       WHERE codendereco = $6
       RETURNING *`, [novoCodendereco, rua, predio, andar || null, apto || null, id]);
        res.json(result.rows[0]);
    }
    catch (err) {
        console.error("Erro ao atualizar endereço:", err);
        res.status(500).json({ erro: "Erro ao atualizar endereço" });
    }
}));
// POST - Adicionar endereço ao lote do produto
router.post("/produto/lote", (0, auth_1.verificarPermissao)("incluir"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { codproduto, lote, codendereco, qtde } = req.body;
    try {
        const { rowCount } = yield database_1.productPool.query(`SELECT 1 FROM wms_estoque_local WHERE codproduto = $1 AND lote = $2 AND codendereco = $3`, [codproduto, lote, codendereco]);
        if ((rowCount !== null && rowCount !== void 0 ? rowCount : 0) > 0) {
            yield database_1.productPool.query(`UPDATE wms_estoque_local
         SET quantidade = quantidade + $4
         WHERE codproduto = $1 AND lote = $2 AND codendereco = $3`, [codproduto, lote, codendereco, qtde]);
        }
        else {
            yield database_1.productPool.query(`INSERT INTO wms_estoque_local (codproduto, lote, codendereco, quantidade)
         VALUES ($1, $2, $3, $4)`, [codproduto, lote, codendereco, qtde]);
        }
        yield (0, auditoriaEnderecoService_1.auditarEndereco)({
            codendereco,
            codproduto,
            lote,
            quantidade: qtde,
            tipo: "entrada",
            usuario: (_a = req.usuario) === null || _a === void 0 ? void 0 : _a.usuario,
        });
        res.status(201).json({ mensagem: "Endereço adicionado com sucesso ao lote." });
    }
    catch (error) {
        console.error("Erro ao adicionar endereço ao lote:", error.message || error);
        res.status(500).json({ erro: "Erro ao adicionar endereço ao lote", detalhe: error.message || error });
    }
}));
router.put("/:codproduto/:lote/:codendereco", (0, auth_1.verificarPermissao)("editar"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    const codproduto = (_a = req.params.codproduto) === null || _a === void 0 ? void 0 : _a.trim();
    const lote = (_b = req.params.lote) === null || _b === void 0 ? void 0 : _b.trim();
    const codendereco = (_c = req.params.codendereco) === null || _c === void 0 ? void 0 : _c.trim();
    const { qtde } = req.body;
    if (!codproduto || !lote || !codendereco || qtde === undefined) {
        return res.status(400).json({ erro: "Parâmetros inválidos ou incompletos" });
    }
    try {
        const atual = yield database_1.productPool.query(`SELECT quantidade FROM wms_estoque_local WHERE codproduto = $1 AND lote = $2 AND codendereco = $3`, [codproduto, lote, codendereco]);
        yield database_1.productPool.query(`
      UPDATE wms_estoque_local
      SET quantidade = $1
      WHERE codproduto = $2 AND lote = $3 AND codendereco = $4
    `, [qtde, codproduto, lote, codendereco]);
        const anterior = Number.parseFloat(((_d = atual.rows[0]) === null || _d === void 0 ? void 0 : _d.quantidade) || "0");
        const diferenca = qtde - anterior;
        if (diferenca !== 0) {
            yield (0, auditoriaEnderecoService_1.auditarEndereco)({
                codendereco,
                codproduto,
                lote,
                quantidade: Math.abs(diferenca),
                tipo: diferenca > 0 ? "entrada" : "saida",
                usuario: (_e = req.usuario) === null || _e === void 0 ? void 0 : _e.usuario,
            });
        }
        res.sendStatus(204);
    }
    catch (err) {
        console.error("Erro ao editar endereço:", err);
        res.status(500).json({ erro: "Erro ao editar endereço" });
    }
}));
// DELETE - remover endereço de um produto
router.delete("/:codproduto/:lote/:codendereco", (0, auth_1.verificarPermissao)("excluir"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { codproduto, lote, codendereco } = req.params;
    try {
        const estoque = yield database_1.productPool.query(`SELECT quantidade FROM wms_estoque_local WHERE codproduto = $1 AND lote = $2 AND codendereco = $3`, [codproduto, lote, codendereco]);
        yield database_1.productPool.query(`
      DELETE FROM wms_estoque_local
      WHERE codproduto = $1 AND lote = $2 AND codendereco = $3
    `, [codproduto, lote, codendereco]);
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
        res.sendStatus(204);
    }
    catch (err) {
        console.error("Erro ao excluir endereço:", err);
        res.status(500).json({ erro: "Erro ao excluir endereço" });
    }
}));
// DELETE - excluir endereço base
router.delete("/:id", (0, auth_1.verificarPermissao)("excluir"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        yield database_1.productPool.query("DELETE FROM wms_enderecos WHERE codendereco = $1", [id]);
        res.sendStatus(204);
    }
    catch (err) {
        res.status(500).json({ erro: "Erro ao excluir endereço" });
    }
}));
// GET - relatório de produtos por endereço
router.get("/relatorio", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield database_1.productPool.query(`
      SELECT
        e.codendereco, 
        e.rua, 
        e.predio,
        e.andar,
        e.apto,
        el.codproduto, 
        p.c_descr AS produto, 
        el.lote,
        el.quantidade
      FROM wms_enderecos e
      JOIN wms_estoque_local el ON el.codendereco = e.codendereco
      JOIN a_produt p ON p.c_codigo = el.codproduto
      WHERE el.quantidade > 0
      ORDER BY
        e.codendereco, 
        e.rua, 
        e.predio, 
        e.andar, 
        e.apto, 
        el.lote, 
        el.codproduto;
    `);
        res.json(result.rows);
    }
    catch (error) {
        console.error("Erro ao buscar relatório:", error.message || error);
        res.status(500).json({ erro: "Erro ao gerar relatório", detalhe: error.message || error });
    }
}));
// GET - auditoria de movimentação de endereços
router.get("/auditoria", (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield database_1.productPool.query(`SELECT codendereco, codproduto, lote, quantidade, tipo, usuario, datahora
       FROM wms_auditoria_enderecos
       ORDER BY datahora DESC`);
        res.json(result.rows);
    }
    catch (error) {
        console.error("Erro ao buscar auditoria:", error);
        res.status(500).json({ erro: "Erro ao gerar auditoria" });
    }
}));
exports.default = router;
