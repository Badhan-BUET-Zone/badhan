import 'package:badhandatainput/config/color_palette.dart';
import 'package:badhandatainput/provider/donor_data_provider.dart';
import 'package:badhandatainput/provider/user_data_provider.dart';
import 'package:badhandatainput/config/routes.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import 'util/debug.dart';
import 'util/environment.dart';

Future<void> main() async {
  await dotenv.load(fileName: "dotenv");
  Log.d("main", "website: ${Environment.mainWebsite}");
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
        ChangeNotifierProvider.value(value: DonorDataProvider()),
      ],
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        title: 'Badhan Data Input 2',
        theme: ThemeData(
            fontFamily: GoogleFonts.openSans().fontFamily,
            primarySwatch: Colors.red,
            scaffoldBackgroundColor: Palette.scaffold),
        initialRoute: MyFluroRouter.homePage,
        onGenerateRoute: MyFluroRouter.router.generator,
      ),
    );
  }
}
