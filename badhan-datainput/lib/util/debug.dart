import 'dart:io';

class Log {
  static void d(String TAG, String msg) {
    print("${DateTime.now()}: $TAG -> $msg");
  }
}
