import 'package:jwt_decoder/jwt_decoder.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AuthToken {
  static String _token = "";

  static void saveToken(String token) async {
    _token = token;
    SharedPreferences prefs = await SharedPreferences.getInstance();
    prefs.setString('token', token);
  }

  static Future<String> getToken() async {
    if (_token == "") {
      SharedPreferences prefs = await SharedPreferences.getInstance();
      _token = prefs.getString("token") as String;
    }
    return _token;
  }

  static Future<Map<String, String>> getHeaders() async {
    return {
      'access-control-allow-origin': '*',
      'content-type': 'application/json',
      'x-auth': await getToken(),
    };
  }

  static Future<String> parseUserId() async {
    String token = await getToken();
    Map<String, dynamic> decodedToken = JwtDecoder.decode(token);
    return decodedToken['_id'] ?? "";
  }

  static void deleteToken() async {
    SharedPreferences prefs = await SharedPreferences.getInstance();
    prefs.clear();
  }
}
