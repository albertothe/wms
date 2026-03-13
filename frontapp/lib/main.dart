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
const Color _brandRed = Color(0xFF640B0B);

void main() {
  runApp(const WmsApp());
}

class WmsApp extends StatelessWidget {
  const WmsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SEnd',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: _brandRed),
        scaffoldBackgroundColor: const Color(0xFFF0F0F0),
        navigationBarTheme: NavigationBarThemeData(
          indicatorColor: _brandRed.withOpacity(0.15),
          iconTheme: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return const IconThemeData(color: _brandRed);
            }
            return const IconThemeData(color: Color(0xFF64748B));
          }),
          labelTextStyle: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return const TextStyle(color: _brandRed, fontWeight: FontWeight.w700);
            }
            return const TextStyle(color: Color(0xFF64748B));
          }),
        ),
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

    return AppTabsScreen(
      token: _token!,
      usuario: _usuario!,
      onLogout: _logout,
    );
  }
}

class AppTabsScreen extends StatefulWidget {
  const AppTabsScreen({
    super.key,
    required this.token,
    required this.usuario,
    required this.onLogout,
  });

  final String token;
  final String usuario;
  final Future<void> Function() onLogout;

  @override
  State<AppTabsScreen> createState() => _AppTabsScreenState();
}

class _AppTabsScreenState extends State<AppTabsScreen> {
  int _paginaAtual = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _paginaAtual,
        children: [
          SeparacaoScreen(
            token: widget.token,
            usuario: widget.usuario,
            onLogout: widget.onLogout,
          ),
          BlankPanelScreen(
            titulo: 'Painel de Saída',
            onLogout: widget.onLogout,
          ),
          BlankPanelScreen(
            titulo: 'Painel de Entrada',
            onLogout: widget.onLogout,
          ),
          BlankPanelScreen(titulo: 'Produtos', onLogout: widget.onLogout),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _paginaAtual,
        onDestinationSelected: (index) {
          setState(() {
            _paginaAtual = index;
          });
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.assignment_outlined),
            selectedIcon: Icon(Icons.assignment),
            label: 'SEPARAÇÃO',
          ),
          NavigationDestination(
            icon: Icon(Icons.exit_to_app_outlined),
            selectedIcon: Icon(Icons.exit_to_app),
            label: 'SAÍDA',
          ),
          NavigationDestination(
            icon: Icon(Icons.input_outlined),
            selectedIcon: Icon(Icons.input),
            label: 'ENTRADA',
          ),
          NavigationDestination(
            icon: Icon(Icons.inventory_2_outlined),
            selectedIcon: Icon(Icons.inventory_2),
            label: 'PRODUTOS',
          ),
        ],
      ),
    );
  }
}

class BlankPanelScreen extends StatelessWidget {
  const BlankPanelScreen({
    super.key,
    required this.titulo,
    required this.onLogout,
  });

  final String titulo;
  final Future<void> Function() onLogout;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: _brandRed,
        foregroundColor: Colors.white,
        title: Text(titulo),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: IconButton(
              onPressed: () async => onLogout(),
              icon: const Icon(Icons.logout),
            ),
          ),
        ],
      ),
      body: const SizedBox.expand(),
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
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 28),
        child: Column(
          children: [
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: _brandRed,
                borderRadius: BorderRadius.circular(18),
              ),
              child: const Icon(Icons.inventory_2_outlined, color: Colors.white, size: 44),
            ),
            const SizedBox(height: 20),
            const Text(
              'SEnd',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 50,
                height: 1,
                fontWeight: FontWeight.w800,
                color: _brandRed,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Sistema de endereçamento',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w500,
                color: _brandRed,
              ),
            ),
            const SizedBox(height: 24),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: Card(
                color: const Color(0xFFF7F7F7),
                elevation: 8,
                shadowColor: Colors.black26,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                  side: const BorderSide(color: Color(0xFFEAEAEA)),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Text('Acesso ao Sistema', style: TextStyle(fontSize: 34, fontWeight: FontWeight.w700)),
                        const SizedBox(height: 6),
                        const Text('Insira suas credenciais para acessar o painel'),
                        const SizedBox(height: 18),
                        const Text('Usuário', style: TextStyle(fontWeight: FontWeight.w600)),
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: _usuarioController,
                          decoration: const InputDecoration(
                            hintText: 'Seu usuário',
                            prefixIcon: Icon(Icons.person_outline),
                          ),
                          validator: (value) =>
                              (value == null || value.trim().isEmpty) ? 'Informe o usuário' : null,
                        ),
                        const SizedBox(height: 14),
                        const Text('Senha', style: TextStyle(fontWeight: FontWeight.w600)),
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: _senhaController,
                          obscureText: !_mostrarSenha,
                          decoration: InputDecoration(
                            hintText: '••••••••',
                            prefixIcon: const Icon(Icons.lock_outline),
                            suffixIcon: IconButton(
                              tooltip: _mostrarSenha ? 'Ocultar senha' : 'Exibir senha',
                              onPressed: () => setState(() => _mostrarSenha = !_mostrarSenha),
                              icon: Icon(_mostrarSenha ? Icons.visibility_off : Icons.visibility),
                            ),
                          ),
                          validator: (value) =>
                              (value == null || value.isEmpty) ? 'Informe a senha' : null,
                        ),
                        const SizedBox(height: 8),
                        CheckboxListTile(
                          value: _salvarUsuario,
                          contentPadding: EdgeInsets.zero,
                          activeColor: _brandRed,
                          controlAffinity: ListTileControlAffinity.leading,
                          title: const Text('Lembrar meu usuário'),
                          onChanged: _loading
                              ? null
                              : (value) => setState(() => _salvarUsuario = value ?? true),
                        ),
                        if (_erro != null) ...[
                          Text(_erro!, style: const TextStyle(color: Colors.red)),
                          const SizedBox(height: 12),
                        ],
                        FilledButton(
                          style: FilledButton.styleFrom(
                            backgroundColor: _brandRed,
                            foregroundColor: Colors.white,
                            minimumSize: const Size(double.infinity, 50),
                            textStyle: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700),
                          ),
                          onPressed: _loading ? null : _submit,
                          child: _loading
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                )
                              : const Text('Entrar'),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              '© 2026 JMonte - Sistema de Endereçamento.',
              style: TextStyle(color: Color(0xFF475569), fontSize: 14),
            ),
          ],
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

  Separacao copyWith({double? progresso}) {
    return Separacao(
      chave: chave,
      codloja: codloja,
      np: np,
      cliente: cliente,
      tipoentrega: tipoentrega,
      separador: separador,
      status: status,
      progresso: progresso ?? this.progresso,
    );
  }

  static String normalizarStatus(dynamic status) {
    final valor = (status ?? '').toString().trim().toUpperCase();
    if (valor == 'S') {
      return 'A';
    }
    if (valor == 'P' || valor == 'F' || valor == 'A') {
      return valor;
    }
    return 'A';
  }

  factory Separacao.fromJson(Map<String, dynamic> json) {
    return Separacao(
      chave: (json['chave'] ?? '').toString(),
      codloja: int.tryParse((json['codloja'] ?? 0).toString()) ?? 0,
      np: (json['np'] ?? '').toString(),
      cliente: (json['cliente'] ?? '').toString(),
      tipoentrega: (json['tipoentrega'] ?? '').toString(),
      separador: (json['separador'] ?? '').toString(),
      status: normalizarStatus(json['status']),
      progresso: double.tryParse((json['progresso'] ?? 0).toString()) ?? 0,
    );
  }
}

class SeparacaoItem {
  const SeparacaoItem({
    required this.codproduto,
    required this.produto,
    required this.qtdeTotal,
    required this.qtdeSeparada,
  });

  final String codproduto;
  final String produto;
  final double qtdeTotal;
  final double qtdeSeparada;

  SeparacaoItem copyWith({double? qtdeSeparada}) {
    return SeparacaoItem(
      codproduto: codproduto,
      produto: produto,
      qtdeTotal: qtdeTotal,
      qtdeSeparada: qtdeSeparada ?? this.qtdeSeparada,
    );
  }

  factory SeparacaoItem.fromJson(Map<String, dynamic> json) {
    return SeparacaoItem(
      codproduto: (json['codproduto'] ?? '').toString(),
      produto: (json['produto'] ?? '').toString(),
      qtdeTotal: double.tryParse((json['qtde_total'] ?? 0).toString()) ?? 0,
      qtdeSeparada: double.tryParse((json['qtde_separada'] ?? 0).toString()) ?? 0,
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
  final Set<String> _expandida = {};
  final Map<String, List<SeparacaoItem>> _itensPorChave = {};
  final Set<String> _itensCarregando = {};
  final Set<String> _finalizando = {};
  final Map<String, String> _erroItens = {};

  @override
  void initState() {
    super.initState();
    _carregar();
  }

  Future<void> _carregarItens(Separacao tarefa) async {
    if (_itensPorChave.containsKey(tarefa.chave) ||
        _itensCarregando.contains(tarefa.chave)) {
      return;
    }

    setState(() {
      _itensCarregando.add(tarefa.chave);
      _erroItens.remove(tarefa.chave);
    });

    try {
      final response = await http.get(
        Uri.parse(
          '$_apiBaseUrl/separacao/itens?chave=${Uri.encodeQueryComponent(tarefa.chave)}',
        ),
        headers: {'Authorization': 'Bearer ${widget.token}'},
      );

      if (response.statusCode == 401) {
        await widget.onLogout();
        return;
      }

      if (response.statusCode >= 400) {
        throw Exception('Erro ao carregar produtos (${response.statusCode})');
      }

      final itens = (jsonDecode(response.body) as List<dynamic>)
          .map((item) => SeparacaoItem.fromJson(item as Map<String, dynamic>))
          .toList();

      setState(() {
        _itensPorChave[tarefa.chave] = itens;
      });
    } catch (e) {
      setState(() {
        _erroItens[tarefa.chave] = e.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() {
          _itensCarregando.remove(tarefa.chave);
        });
      }
    }
  }

  Future<void> _toggleExpandir(Separacao tarefa) async {
    final expandida = _expandida.contains(tarefa.chave);
    if (expandida) {
      setState(() {
        _expandida.remove(tarefa.chave);
      });
      return;
    }

    setState(() {
      _expandida.add(tarefa.chave);
    });
    await _carregarItens(tarefa);
  }

  String _formatarQuantidade(double valor) {
    final inteiro = valor.truncateToDouble() == valor;
    return inteiro ? valor.toStringAsFixed(0) : valor.toStringAsFixed(2);
  }

  Future<void> _abrirDialogoQuantidade(
    Separacao tarefa,
    SeparacaoItem item,
  ) async {
    final controller = TextEditingController(
      text: _formatarQuantidade(item.qtdeSeparada),
    );
    String? erro;
    bool salvando = false;

    await showDialog<void>(
      context: context,
      barrierDismissible: !salvando,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            Future<void> salvarQuantidade() async {
              final texto = controller.text.trim().replaceAll(',', '.');
              final quantidade = double.tryParse(texto);

              if (quantidade == null) {
                setDialogState(() => erro = 'Informe uma quantidade válida.');
                return;
              }

              if (quantidade < 0 || quantidade > item.qtdeTotal) {
                setDialogState(
                  () => erro =
                      'A quantidade deve estar entre 0 e ${_formatarQuantidade(item.qtdeTotal)}.',
                );
                return;
              }

              setDialogState(() {
                erro = null;
                salvando = true;
              });

              try {
                final response = await http.post(
                  Uri.parse('$_apiBaseUrl/separacao/item'),
                  headers: {
                    'Authorization': 'Bearer ${widget.token}',
                    'Content-Type': 'application/json',
                  },
                  body: jsonEncode({
                    'chave': tarefa.chave,
                    'codloja': tarefa.codloja,
                    'np': tarefa.np,
                    'codproduto': item.codproduto,
                    'qtde_separada': quantidade,
                  }),
                );

                if (response.statusCode == 401) {
                  if (mounted) {
                    Navigator.of(context).pop();
                  }
                  await widget.onLogout();
                  return;
                }

                if (response.statusCode >= 400) {
                  final payload = jsonDecode(response.body) as Map<String, dynamic>;
                  throw Exception(payload['erro'] ?? 'Erro ao salvar quantidade');
                }

                if (!mounted) {
                  return;
                }

                setState(() {
                  final itens = _itensPorChave[tarefa.chave] ?? [];
                  _itensPorChave[tarefa.chave] = itens
                      .map(
                        (it) => it.codproduto == item.codproduto
                            ? it.copyWith(qtdeSeparada: quantidade)
                            : it,
                      )
                      .toList();

                  final itensAtualizados = _itensPorChave[tarefa.chave] ?? [];
                  final total = itensAtualizados.fold<double>(
                    0,
                    (acc, it) => acc + it.qtdeTotal,
                  );
                  final separado = itensAtualizados.fold<double>(
                    0,
                    (acc, it) => acc + it.qtdeSeparada,
                  );
                  final progresso =
                      total <= 0 ? 0.0 : (separado / total) * 100;

                  _tarefas = _tarefas
                      .map(
                        (t) => t.chave == tarefa.chave
                            ? t.copyWith(progresso: progresso)
                            : t,
                      )
                      .toList();
                });

                Navigator.of(context).pop();
              } catch (e) {
                setDialogState(() {
                  erro = e.toString().replaceFirst('Exception: ', '');
                  salvando = false;
                });
              }
            }

            return AlertDialog(
              title: const Text('Informar Quantidade'),
              content: SizedBox(
                width: 420,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.produto,
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: controller,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      decoration: InputDecoration(
                        labelText: 'Quantidade Separada',
                        helperText:
                            'Total: ${_formatarQuantidade(item.qtdeTotal)} un',
                        errorText: erro,
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: salvando ? null : () => Navigator.of(context).pop(),
                  child: const Text('Cancelar'),
                ),
                FilledButton(
                  onPressed: salvando ? null : salvarQuantidade,
                  child: salvando
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Confirmar Quantidade'),
                ),
              ],
            );
          },
        );
      },
    );

    controller.dispose();
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

  bool _podeFinalizar(Separacao tarefa) {
    if (tarefa.status != 'A') {
      return false;
    }

    return tarefa.progresso >= 100;
  }

  Future<void> _finalizarSeparacao(Separacao tarefa) async {
    if (_finalizando.contains(tarefa.chave)) {
      return;
    }

    setState(() {
      _finalizando.add(tarefa.chave);
    });

    try {
      final response = await http.post(
        Uri.parse('$_apiBaseUrl/separacao/finalizar'),
        headers: {
          'Authorization': 'Bearer ${widget.token}',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({'chave': tarefa.chave}),
      );

      if (response.statusCode == 401) {
        await widget.onLogout();
        return;
      }

      if (response.statusCode >= 400) {
        final payload = jsonDecode(response.body) as Map<String, dynamic>;
        throw Exception(payload['erro'] ?? 'Erro ao finalizar separação');
      }

      await _carregar();
    } catch (e) {
      if (!mounted) {
        return;
      }

      final mensagem = e.toString().replaceFirst('Exception: ', '');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(mensagem), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) {
        setState(() {
          _finalizando.remove(tarefa.chave);
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final tarefas = _filtradas;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: _brandRed,
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
                    side: const BorderSide(color: _brandRed, width: 1),
                  ),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: () => _toggleExpandir(tarefa),
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  'Loja ${tarefa.codloja} • NF-${tarefa.np}',
                                ),
                              ),
                              Icon(
                                _expandida.contains(tarefa.chave)
                                    ? Icons.keyboard_arrow_up
                                    : Icons.keyboard_arrow_down,
                              ),
                            ],
                          ),
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
                          if (_podeFinalizar(tarefa)) ...[
                            const SizedBox(height: 12),
                            SizedBox(
                              width: double.infinity,
                              child: FilledButton.icon(
                                style: FilledButton.styleFrom(
                                  backgroundColor: Colors.green,
                                ),
                                onPressed: _finalizando.contains(tarefa.chave)
                                    ? null
                                    : () => _finalizarSeparacao(tarefa),
                                icon: _finalizando.contains(tarefa.chave)
                                    ? const SizedBox(
                                        height: 16,
                                        width: 16,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                        ),
                                      )
                                    : const Icon(Icons.check_circle_outline),
                                label: const Text('Finalizar separação'),
                              ),
                            ),
                          ],
                          if (_expandida.contains(tarefa.chave)) ...[
                            const SizedBox(height: 14),
                            const Divider(height: 1),
                            const SizedBox(height: 12),
                            const Text(
                              'Produtos para separar',
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 18,
                              ),
                            ),
                            const SizedBox(height: 10),
                            if (_itensCarregando.contains(tarefa.chave))
                              const Padding(
                                padding: EdgeInsets.symmetric(vertical: 12),
                                child: Center(
                                  child: CircularProgressIndicator(),
                                ),
                              )
                            else if (_erroItens.containsKey(tarefa.chave))
                              Text(
                                _erroItens[tarefa.chave]!,
                                style: const TextStyle(color: Colors.red),
                              )
                            else if ((_itensPorChave[tarefa.chave] ?? []).isEmpty)
                              const Text('Nenhum produto encontrado para esta venda.')
                            else
                              ..._itensPorChave[tarefa.chave]!.map(
                                (item) => InkWell(
                                  borderRadius: BorderRadius.circular(12),
                                  onTap: () => _abrirDialogoQuantidade(tarefa, item),
                                  child: Container(
                                    width: double.infinity,
                                    margin: const EdgeInsets.only(bottom: 10),
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                        color: const Color(0xFFE2E8F0),
                                      ),
                                      color: Colors.white,
                                    ),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          item.codproduto,
                                          style: const TextStyle(
                                            color: Color(0xFF64748B),
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          item.produto,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w700,
                                            fontSize: 18,
                                          ),
                                        ),
                                        const SizedBox(height: 8),
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 10,
                                            vertical: 4,
                                          ),
                                          decoration: BoxDecoration(
                                            borderRadius: BorderRadius.circular(
                                              999,
                                            ),
                                            border: Border.all(
                                              color: const Color(0xFFBBD2F1),
                                            ),
                                          ),
                                          child: Text(
                                            '${_formatarQuantidade(item.qtdeSeparada)} / ${_formatarQuantidade(item.qtdeTotal)} un',
                                            style: const TextStyle(
                                              color: _brandRed,
                                              fontWeight: FontWeight.w700,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                          ],
                        ],
                      ),
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
