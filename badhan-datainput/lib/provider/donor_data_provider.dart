import 'dart:convert';

import 'package:badhandatainput/model/donor_model.dart';
import 'package:badhandatainput/model/provider_response_model.dart';
import 'package:flutter/cupertino.dart';
import 'package:http/http.dart';

import '../util/auth_token_util.dart';
import '../util/debug.dart';
import '../util/environment.dart';
import '../util/http_status_code.dart';

class DonorDataProvider with ChangeNotifier {
  static String tag = "DonorDataProvider";

  Future<ProviderResponse> checkDuplicate(String phone) async {
    String url = "${Environment.apiUrl}/donors/checkDuplicate?phone=$phone";
    String fName = "checkDuplicate():";
    Log.d(tag, "$fName fetching from: $url");
    try {
      Response response = await get(
        Uri.parse(url),
        headers: await AuthToken.getHeaders(),
      );

      Log.d(tag, "$fName  ${response.body}");

      Map data = json.decode(response.body);
      if (data['statusCode'] == HttpSatusCode.ok) {
        DonorData? profileData;
        if (data['found']) {
          profileData = DonorData.fromJson(data["donor"]);
        }
        Log.d(tag, "$fName ${data['message']}");
        return ProviderResponse(
          success: true,
          message: data['message'],
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

  Future<ProviderResponse> createDonor(NewDonor newDonor) async {
    String url = "${Environment.apiUrl}/donors";
    String fName = "createDonor():";
    Log.d(tag, "$fName creating new donor ${newDonor.name} : $url");
    try {
      Response response = await post(
        Uri.parse(url),
        headers: await AuthToken.getHeaders(),
        body: json.encode(newDonor),
      );

      Log.d(tag, "$fName  ${response.body}");

      Map data = json.decode(response.body);

      if (data['statusCode'] == HttpSatusCode.created) {
        DonorData? donorData;
        Log.d(tag, "$fName ${data['message']}");
        donorData = DonorData.fromJson(data["newDonor"]); 
        return ProviderResponse(
          success: true,
          message: data['message'],
          data: donorData,
        );
      } else if (data['statusCode'] == HttpSatusCode.conflict) {
        String message = data['message'];
        Log.d(tag, message);
        String donorId = data['donorId'];

        return ProviderResponse(
            success: false, message: message, data: donorId);
      } else {
        Log.d(tag, "$fName unexpected status code");
        return ProviderResponse(
            success: false, message: data["message"]??"Error creating donor");
      }
    } catch (e) {
      Log.d(tag, "$fName error");
      Log.d(tag, "$fName $e");
      return ProviderResponse(success: false, message: "error");
    }
  }
}
