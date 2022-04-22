import 'dart:convert';

import 'package:badhandatainput/model/profile_data_model.dart';
import 'package:badhandatainput/model/provider_response_model.dart';
import 'package:badhandatainput/util/auth_token_util.dart';
import 'package:flutter/cupertino.dart';
import 'package:http/http.dart';

import '../util/debug.dart';
import '../util/environment.dart';
import '../util/http_status_code.dart';

class UserDataProvider with ChangeNotifier {
  static String tag = "UserDataProvider";

  Future<ProviderResponse> redirectUser(String token) async {
    String url = "${Environment.apiUrl}/users/redirection";
    String fName = "redirectUser():";
    Log.d(tag, "$fName fetching from: $url");
    Log.d(tag, "$fName token: $token");

    try {
      final body = {"token": token};
      Response response = await patch(
        Uri.parse(url),
        headers: {
          'access-control-allow-origin': '*',
          'content-type': 'application/json',
        },
        body: json.encode(body),
      );

      Log.d(tag, "$fName  ${response.body}");

      Map data = json.decode(response.body);
      if (data['statusCode'] == HttpSatusCode.created) {
        AuthToken.saveToken(data["token"] ?? "");
        Log.d(tag, "$fName : new token ${data['token'] ?? ""}");
        ProfileData profileData = ProfileData.fromJson(data["donor"]);
        return ProviderResponse(
          success: true,
          message: "ok",
          data: profileData,
        );
      } else {
        Log.d(tag, "$fName not http 200");
        return ProviderResponse(
            success: false, message: "error fetching donation");
      }
    } catch (e) {
      Log.d(tag, "$fName error");
      Log.d(tag, "$fName $e");
      return ProviderResponse(success: false, message: "error");
    }
  }

  Future<ProviderResponse> getProfileData() async {
    String url = "${Environment.apiUrl}/users/me";
    String fName = "getProfileData():";
    Log.d(tag, "$fName fetching from: $url");

    try {
      Response response = await get(
        Uri.parse(url),
        headers: await AuthToken.getHeaders(),
      );

      //Log.d(TAG, "$fName  ${response.body}");

      Map data = json.decode(response.body);
      if (data['statusCode'] == HttpSatusCode.ok) {
        ProfileData profileData = ProfileData.fromJson(data["donor"]);
        Log.d(tag, "$fName User name: ${profileData.name}");
        return ProviderResponse(
          success: true,
          message: "ok",
          data: profileData,
        );
      } else {
        Log.d(tag, "$fName not http 200");
        return ProviderResponse(
            success: false, message: "error fetching donation");
      }
    } catch (e) {
      Log.d(tag, "$fName error");
      Log.d(tag, "$fName $e");
      return ProviderResponse(success: false, message: "error");
    }
  }

  Future<ProviderResponse> logout() async {
    String url = "${Environment.apiUrl}/users/signout";
    String fName = "logout():";
    Log.d(tag, "$fName logging out from: $url");

    try {
      Response response = await delete(
        Uri.parse(url),
        headers: await AuthToken.getHeaders(),
      );

      Log.d(tag, "$fName  ${response.body}");

      Map data = json.decode(response.body);
      if (data['statusCode'] == HttpSatusCode.ok) {
        return ProviderResponse(
          success: true,
          message: data['message'],
        );
      } else {
        String msg = "error while logging out";
        Log.d(tag, "$fName $msg");
        return ProviderResponse(
            success: false, message: msg);
      }
    } catch (e) {
      Log.d(tag, "$fName error");
      Log.d(tag, "$fName $e");
      return ProviderResponse(success: false, message: "Unexpected error.");
    }
  }
}
