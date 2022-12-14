import 'package:flutter_dotenv/flutter_dotenv.dart';

// https://developer.school/tutorials/how-to-use-environment-variables-with-flutter-dotenv
class Environment {
  static const bool debug = true;
  static String get apiUrl {
    return debug ? dotenv.env['TEST_API_URL']! : dotenv.env['API_URL']!;
  }

  static String get mainWebsite {
    return debug
        ? dotenv.env['TEST_MAIN_WEBSITE']!
        : dotenv.env['MAIN_WEBSITE']!;
  }

  static String get badhanDataInputWebsite {
    return debug
        ? dotenv.env['TEST_BADHAN_DATA_INPUT_WEBSITE']!
        : dotenv.env['BADHAN_DATA_INPUT_WEBSITE']!;
  }

  static bool get isTest {
    return (dotenv.env["TEST"] == "true") ? true : false;
  }

  static String get testLoginPhone {
    if (!debug) return "";
    return dotenv.env['TEST_LOGIN_PHONE']!;
  }

  static String get testLoginPassword {
    if (!debug) return "";
    return dotenv.env['TEST_LOGIN_PASSWORD']!;
  }
}
