class InputFormatException implements Exception {
  final String message;

  InputFormatException(this.message);

  @override
  String toString() {
    return message;
  }
}
