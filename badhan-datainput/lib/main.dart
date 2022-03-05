import 'package:badhandatainput/provider/user_data_provider.dart';
import 'package:badhandatainput/routes.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import 'pages/home_page.dart';

Future<void> main() async {
  await dotenv.load(fileName: "dotenv");
  print(dotenv.env['TEST_API_URL']);
  MyFluroRouter.setUpRouter();
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: UserDataProvider()),
      ],
      child: MaterialApp(
        title: 'Badhan Data Input',
        theme: ThemeData(
          fontFamily: GoogleFonts.openSans().fontFamily,
          primarySwatch: Colors.red,
        ),
        initialRoute: "/home",
        onGenerateRoute: MyFluroRouter.router.generator,
      ),
    );
  }
}
