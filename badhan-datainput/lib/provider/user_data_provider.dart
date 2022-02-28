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
  static String TAG = "UserDataProvider";

  Future<ProviderResponse> redirectUser(String token) async {
    String url = "${Environment.API_URL}/users/redirection";
    String fName = "redirectUser():";
    Log.d(TAG, "$fName fetching from: $url");

    try {
      final body = {"token": token};
      final headers = await AuthToken.getHeaders();
      Log.d(TAG, "$headers");
      Response response = await patch(
        Uri.parse(url),
        headers: headers,
        body: json.encode(body),
      );

      Log.d(TAG, "$fName  ${response.body}");

      Map data = json.decode(response.body);
      if (data['statusCode'] == HttpSatusCode.CREATED) {
        AuthToken.saveToken(data["token"] ?? "");
        Log.d(TAG, "$fName : new token ${data['token'] ?? ""}");
        return ProviderResponse(
          success: true,
          message: "ok",
          //data: donationList,
        );
      } else {
        Log.d(TAG, "$fName not http 200");
        return ProviderResponse(
            success: false, message: "error fetching donation");
      }
    } catch (e) {
      Log.d(TAG, "$fName error");
      Log.d(TAG, "$fName $e");
      return ProviderResponse(success: false, message: "error");
    }
  }

  Future<ProviderResponse> getProfileData() async {
    String url = "${Environment.API_URL}/users/me";
    String fName = "getProfileData():";
    Log.d(TAG, "$fName fetching from: $url");

    try {
      Response response = await get(
        Uri.parse(url),
        headers: await await AuthToken.getHeaders(),
      );

      //Log.d(TAG, "$fName  ${response.body}");

      Map data = json.decode(response.body);
      if (data['statusCode'] == HttpSatusCode.OK) {
        ProfileData profileData = ProfileData.fromJson(data["donor"]);
        return ProviderResponse(
          success: true,
          message: "ok",
          data: profileData,
        );
      } else {
        Log.d(TAG, "$fName not http 200");
        return ProviderResponse(
            success: false, message: "error fetching donation");
      }
    } catch (e) {
      Log.d(TAG, "$fName error");
      Log.d(TAG, "$fName $e");
      return ProviderResponse(success: false, message: "error");
    }
  }
}
