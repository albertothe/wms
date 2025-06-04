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
const router = express_1.default.Router();
// GET - listar todos os endereços
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield database_1.productPool.query('SELECT * FROM pwb_enderecos ORDER BY codendereco');
        res.json(result.rows);
    }
    catch (err) {
        res.status(500).json({ erro: 'Erro ao buscar endereços' });
    }
}));
// GET - listar endereços por produto (expansão na tabela de produtos)
router.get('/enderecos-por-produto/:codproduto', enderecosController_1.listarEnderecosPorProduto);
// POST - adicionar novo endereço
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { rua, predio } = req.body;
    try {
        const result = yield database_1.productPool.query('INSERT INTO pwb_enderecos (rua, predio) VALUES ($1, $2) RETURNING *', [rua, predio]);
        res.status(201).json(result.rows[0]);
    }
    catch (err) {
        res.status(500).json({ erro: 'Erro ao inserir endereço' });
    }
}));
// POST - adicionar endereço a produto (pwb_estoque_local)
router.post('/produto', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { codproduto, codendereco, qtde } = req.body;
    try {
        const result = yield database_1.productPool.query('INSERT INTO pwb_estoque_local (codproduto, codendereco, quantidade) VALUES ($1, $2, $3) RETURNING *', [codproduto, codendereco, qtde]);
        res.status(201).json(result.rows[0]);
    }
    catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ erro: 'Este endereço já está cadastrado para este produto.' });
        }
        res.status(500).json({ erro: 'Erro ao adicionar endereço ao produto' });
    }
}));
// PUT - atualizar quantidade de um endereço de produto
router.put('/:codproduto/:codendereco', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { codproduto, codendereco } = req.params;
    const { qtde } = req.body;
    try {
        const result = yield database_1.productPool.query('UPDATE pwb_estoque_local SET quantidade = $1 WHERE codproduto = $2 AND codendereco = $3 RETURNING *', [qtde, codproduto, codendereco]);
        res.json(result.rows[0]);
    }
    catch (err) {
        res.status(500).json({ erro: 'Erro ao atualizar endereço do produto' });
    }
}));
// DELETE - remover endereço de um produto
router.delete('/:codproduto/:codendereco', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { codproduto, codendereco } = req.params;
    try {
        yield database_1.productPool.query('DELETE FROM pwb_estoque_local WHERE codproduto = $1 AND codendereco = $2', [codproduto, codendereco]);
        res.sendStatus(204);
    }
    catch (err) {
        res.status(500).json({ erro: 'Erro ao remover endereço do produto' });
    }
}));
// PUT - atualizar endereço base
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { rua, predio } = req.body;
    try {
        const result = yield database_1.productPool.query('UPDATE pwb_enderecos SET rua = $1, predio = $2 WHERE codendereco = $3 RETURNING *', [rua, predio, id]);
        res.json(result.rows[0]);
    }
    catch (err) {
        res.status(500).json({ erro: 'Erro ao atualizar endereço' });
    }
}));
// DELETE - excluir endereço base
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        yield database_1.productPool.query('DELETE FROM pwb_enderecos WHERE codendereco = $1', [id]);
        res.sendStatus(204);
    }
    catch (err) {
        res.status(500).json({ erro: 'Erro ao excluir endereço' });
    }
}));
exports.default = router;
