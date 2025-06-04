"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const produtos_1 = __importDefault(require("./routes/produtos"));
const enderecos_1 = __importDefault(require("./routes/enderecos"));
const painelSaida_1 = __importDefault(require("./routes/painelSaida"));
const auth_1 = __importDefault(require("./routes/auth"));
// Carrega variáveis do .env
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 9001;
app.use((0, cors_1.default)({
    origin: '*', // ou especifique: 'http://172.20.33.21:9000'
}));
app.use(express_1.default.json());
// Rotas
app.use('/produtos', produtos_1.default);
app.use('/enderecos', enderecos_1.default);
app.use('/painel-saida', painelSaida_1.default);
app.use('/login', auth_1.default);
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
