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
// backend/src/routes/auth.ts
const express_1 = __importDefault(require("express"));
const database_1 = require("../database");
const crypto_1 = __importDefault(require("crypto"));
const router = express_1.default.Router();
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { login, senha } = req.body;
    if (!login || !senha) {
        return res.status(400).json({ error: 'Login e senha são obrigatórios.' });
    }
    const loginUpper = login.toUpperCase();
    const hash = crypto_1.default.createHash('md5').update(loginUpper + senha).digest('hex');
    try {
        const result = yield database_1.productPool.query('SELECT c_usuario FROM a_usuari WHERE c_usuario = $1 AND c_senha = $2', [loginUpper, hash]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
        }
        return res.json({ sucesso: true });
    }
    catch (error) {
        console.error('Erro na autenticação:', error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
}));
exports.default = router;
