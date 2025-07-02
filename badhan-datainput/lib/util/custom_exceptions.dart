class MyExpection implements Exception {
  final String message;

  MyExpection(this.message);

  @override
  String toString() {
    return message;
  }
}
