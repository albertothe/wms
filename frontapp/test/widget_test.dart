import 'package:flutter_test/flutter_test.dart';

import 'package:frontapp/main.dart';

void main() {
  testWidgets('renderiza tela de login', (WidgetTester tester) async {
    await tester.pumpWidget(const WmsApp());

    expect(find.text('WMS Separação'), findsOneWidget);
    expect(find.text('Entrar'), findsOneWidget);
  });
}
