class ProviderResponse {
  bool success;
  String message;
  dynamic data;

  ProviderResponse({
    required this.success,
    required this.message,
    this.data,
  });

  Map<String, dynamic> toJson() => {
        "success": success,
        "message": message,
        "data": data,
      };
}
