import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

// https://developer.school/tutorials/how-to-use-environment-variables-with-flutter-dotenv
class Environment {
  static String get apiUrl {
    return isTest ? dotenv.env['TEST_API_URL']! : dotenv.env['API_URL']!;
  }

  static String get mainWebsite {
    return isTest
        ? dotenv.env['TEST_MAIN_WEBSITE']!
        : dotenv.env['MAIN_WEBSITE']!;
  }

  static String get badhanDataInputWebsite {
    return isTest
        ? dotenv.env['TEST_BADHAN_DATA_INPUT_WEBSITE']!
        : dotenv.env['BADHAN_DATA_INPUT_WEBSITE']!;
  }

  static bool get isTest {
    return (dotenv.env["TEST"] == "true") ? true : false;
  }

  static String get testLoginPhone {
    if (isTest && kDebugMode) return "";
    return dotenv.env['TEST_LOGIN_PHONE']!;
  }

  static String get testLoginPassword {
    if (isTest) return "";
    return dotenv.env['TEST_LOGIN_PASSWORD']!;
  }
}
