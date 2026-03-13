import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

const String _apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://172.20.33.15:9001',
);
const String _savedLoginKey = 'saved_login';
const String _authTokenKey = 'auth_token';

void main() {
  runApp(const WmsApp());
}

class WmsApp extends StatelessWidget {
  const WmsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'WMS Separação',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF2E67B0)),
        scaffoldBackgroundColor: const Color(0xFFF2F4F8),
        useMaterial3: true,
      ),
      home: const AuthGate(),
    );
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  bool _loading = true;
  String? _token;
  String? _usuario;

  @override
  void initState() {
    super.initState();
    _loadSession();
  }

  Future<void> _loadSession() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _token = prefs.getString(_authTokenKey);
      _usuario = prefs.getString(_savedLoginKey);
      _loading = false;
    });
  }

  Future<void> _onLoginSuccess(String token, String usuario) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_authTokenKey, token);
    setState(() {
      _token = token;
      _usuario = usuario;
    });
  }

  Future<void> _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_authTokenKey);
    setState(() {
      _token = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (_token == null || _usuario == null || _usuario!.isEmpty) {
      return LoginScreen(onLoginSuccess: _onLoginSuccess);
    }

    return SeparacaoScreen(
      token: _token!,
      usuario: _usuario!,
      onLogout: _logout,
    );
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.onLoginSuccess});

  final Future<void> Function(String token, String usuario) onLoginSuccess;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _usuarioController = TextEditingController();
  final _senhaController = TextEditingController();
  bool _salvarUsuario = true;
  bool _mostrarSenha = false;
  bool _loading = false;
  String? _erro;

  @override
  void initState() {
    super.initState();
    _loadSavedUser();
  }

  Future<void> _loadSavedUser() async {
    final prefs = await SharedPreferences.getInstance();
    final usuarioSalvo = prefs.getString(_savedLoginKey);
    if (usuarioSalvo != null && usuarioSalvo.isNotEmpty) {
      setState(() {
        _usuarioController.text = usuarioSalvo;
      });
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _loading = true;
      _erro = null;
    });

    try {
      final response = await http.post(
        Uri.parse('$_apiBaseUrl/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'login': _usuarioController.text.trim(),
          'senha': _senhaController.text,
        }),
      );

      final Map<String, dynamic> payload = jsonDecode(response.body);

      if (response.statusCode >= 400) {
        throw Exception(payload['error'] ?? 'Erro ao fazer login');
      }

      final token = payload['token'] as String?;
      final usuario =
          (payload['usuario']?['login'] as String?) ??
          _usuarioController.text.trim().toUpperCase();

      if (token == null || token.isEmpty) {
        throw Exception('Token inválido retornado pelo backend');
      }

      final prefs = await SharedPreferences.getInstance();
      if (_salvarUsuario) {
        await prefs.setString(_savedLoginKey, usuario);
      } else {
        await prefs.remove(_savedLoginKey);
      }

      await widget.onLoginSuccess(token, usuario);
    } catch (e) {
      setState(() {
        _erro = e.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _usuarioController.dispose();
    _senhaController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Card(
            margin: const EdgeInsets.all(20),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Form(
                key: _formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'WMS Separação',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text('Faça login para continuar'),
                    const SizedBox(height: 20),
                    TextFormField(
                      controller: _usuarioController,
                      decoration: const InputDecoration(labelText: 'Usuário'),
                      validator: (value) =>
                          (value == null || value.trim().isEmpty)
                          ? 'Informe o usuário'
                          : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _senhaController,
                      obscureText: !_mostrarSenha,
                      decoration: InputDecoration(
                        labelText: 'Senha',
                        suffixIcon: IconButton(
                          tooltip: _mostrarSenha
                              ? 'Ocultar senha'
                              : 'Exibir senha',
                          onPressed: () =>
                              setState(() => _mostrarSenha = !_mostrarSenha),
                          icon: Icon(
                            _mostrarSenha
                                ? Icons.visibility_off
                                : Icons.visibility,
                          ),
                        ),
                      ),
                      validator: (value) => (value == null || value.isEmpty)
                          ? 'Informe a senha'
                          : null,
                    ),
                    CheckboxListTile(
                      value: _salvarUsuario,
                      contentPadding: EdgeInsets.zero,
                      controlAffinity: ListTileControlAffinity.leading,
                      title: const Text('Salvar usuário neste dispositivo'),
                      onChanged: _loading
                          ? null
                          : (value) =>
                                setState(() => _salvarUsuario = value ?? true),
                    ),
                    if (_erro != null) ...[
                      Text(_erro!, style: const TextStyle(color: Colors.red)),
                      const SizedBox(height: 12),
                    ],
                    FilledButton(
                      onPressed: _loading ? null : _submit,
                      child: _loading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Entrar'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class Separacao {
  const Separacao({
    required this.chave,
    required this.codloja,
    required this.np,
    required this.cliente,
    required this.tipoentrega,
    required this.separador,
    required this.status,
    required this.progresso,
  });

  final String chave;
  final int codloja;
  final String np;
  final String cliente;
  final String tipoentrega;
  final String separador;
  final String status;
  final double progresso;

  factory Separacao.fromJson(Map<String, dynamic> json) {
    return Separacao(
      chave: (json['chave'] ?? '').toString(),
      codloja: int.tryParse((json['codloja'] ?? 0).toString()) ?? 0,
      np: (json['np'] ?? '').toString(),
      cliente: (json['cliente'] ?? '').toString(),
      tipoentrega: (json['tipoentrega'] ?? '').toString(),
      separador: (json['separador'] ?? '').toString(),
      status: (json['status'] ?? '').toString(),
      progresso: double.tryParse((json['progresso'] ?? 0).toString()) ?? 0,
    );
  }
}

class SeparacaoScreen extends StatefulWidget {
  const SeparacaoScreen({
    super.key,
    required this.token,
    required this.usuario,
    required this.onLogout,
  });

  final String token;
  final String usuario;
  final Future<void> Function() onLogout;

  @override
  State<SeparacaoScreen> createState() => _SeparacaoScreenState();
}

class _SeparacaoScreenState extends State<SeparacaoScreen> {
  bool _loading = true;
  String? _erro;
  List<Separacao> _tarefas = [];
  String _busca = '';
  String _aba = 'A';

  @override
  void initState() {
    super.initState();
    _carregar();
  }

  Future<void> _carregar() async {
    setState(() {
      _loading = true;
      _erro = null;
    });

    try {
      final response = await http.get(
        Uri.parse(
          '$_apiBaseUrl/separacao?usuario=${Uri.encodeQueryComponent(widget.usuario)}',
        ),
        headers: {'Authorization': 'Bearer ${widget.token}'},
      );

      if (response.statusCode == 401) {
        await widget.onLogout();
        return;
      }

      if (response.statusCode >= 400) {
        throw Exception('Erro ao carregar tarefas (${response.statusCode})');
      }

      final list = (jsonDecode(response.body) as List<dynamic>)
          .map((item) => Separacao.fromJson(item as Map<String, dynamic>))
          .toList();

      setState(() {
        _tarefas = list;
      });
    } catch (e) {
      setState(() {
        _erro = e.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  List<Separacao> get _filtradas {
    return _tarefas.where((tarefa) {
      final porAba = switch (_aba) {
        'P' => tarefa.status == 'P',
        'F' => tarefa.status == 'F',
        _ => tarefa.status == 'A',
      };

      final busca = _busca.toLowerCase();
      final porTexto =
          busca.isEmpty ||
          tarefa.cliente.toLowerCase().contains(busca) ||
          tarefa.np.toLowerCase().contains(busca) ||
          tarefa.codloja.toString().contains(busca);

      return porAba && porTexto;
    }).toList();
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'P':
        return 'Pendente';
      case 'F':
        return 'Feita';
      default:
        return 'Em andamento';
    }
  }

  @override
  Widget build(BuildContext context) {
    final tarefas = _filtradas;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF2E67B0),
        foregroundColor: Colors.white,
        title: const Text('Minhas Tarefas'),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: IconButton(
              onPressed: () async => widget.onLogout(),
              icon: const Icon(Icons.logout),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _carregar,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextField(
              decoration: const InputDecoration(
                filled: true,
                fillColor: Colors.white,
                hintText: 'Buscar por cliente, nota ou loja...',
                prefixIcon: Icon(Icons.search),
                border: OutlineInputBorder(
                  borderSide: BorderSide.none,
                  borderRadius: BorderRadius.all(Radius.circular(12)),
                ),
              ),
              onChanged: (value) => setState(() => _busca = value),
            ),
            const SizedBox(height: 12),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'P', label: Text('Pendentes')),
                ButtonSegment(value: 'A', label: Text('Ativas')),
                ButtonSegment(value: 'F', label: Text('Feitas')),
              ],
              selected: {_aba},
              onSelectionChanged: (value) => setState(() => _aba = value.first),
            ),
            const SizedBox(height: 12),
            if (_loading)
              const Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_erro != null)
              Padding(
                padding: const EdgeInsets.all(12),
                child: Text(_erro!, style: const TextStyle(color: Colors.red)),
              )
            else if (tarefas.isEmpty)
              const Padding(
                padding: EdgeInsets.all(12),
                child: Text('Nenhuma tarefa encontrada.'),
              )
            else
              ...tarefas.map(
                (tarefa) => Card(
                  color: Colors.white,
                  margin: const EdgeInsets.only(bottom: 10),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: const BorderSide(color: Color(0xFF2E67B0), width: 1),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Loja ${tarefa.codloja} • NF-${tarefa.np}'),
                        const SizedBox(height: 4),
                        Text(
                          tarefa.cliente,
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 18,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(tarefa.tipoentrega),
                        const SizedBox(height: 4),
                        Text('Separador: ${tarefa.separador}'),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              _statusLabel(tarefa.status),
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            Text('${tarefa.progresso.toStringAsFixed(0)}%'),
                          ],
                        ),
                        const SizedBox(height: 4),
                        LinearProgressIndicator(
                          value: tarefa.progresso / 100,
                          minHeight: 8,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _carregar,
        child: const Icon(Icons.refresh),
      ),
    );
  }
}
