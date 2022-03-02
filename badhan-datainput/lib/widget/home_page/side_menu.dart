import 'package:badhandatainput/widget/common/profile_picture.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../model/profile_data_model.dart';
import '../../model/provider_response_model.dart';
import '../../provider/user_data_provider.dart';
import '../../util/debug.dart';

class SideMenu extends StatefulWidget {
  const SideMenu({Key? key, required this.token}) : super(key: key);

  final String token;

  @override
  State<SideMenu> createState() => _SideMenuState();
}

class _SideMenuState extends State<SideMenu> {
  static String tag = "SideMenu";

  String profileDataStr = "";
  bool isAuthenticated = false;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(10),
      child: Center(
          child: FutureBuilder(
        future: _fetchProfileData(),
        builder: (context, AsyncSnapshot<ProfileData?> snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const CircularProgressIndicator();
          }
    
          ProfileData? profileData = snapshot.data;
    
          if (profileData == null) {
            return const Text("Failed Authentication!");
          }
    
          /* Log.d(tag, "user name: ${profileData.name}");
          StringBuffer buffer = StringBuffer();
          buffer.writeln("Username: ${profileData.name}");
          buffer.writeln("Phone ${profileData.phone}");
          buffer.writeln("profile data: ");
          buffer.writeln(profileData.toJson());
    
          profileDataStr = buffer.toString(); */
    
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  ProfilePictureFromName(
                      name: profileData.name,
                      radius: 30,
                      fontsize: 15,
                      characterCount: 2),
                  const SizedBox(
                    width: 15,
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        profileData.name,
                        style: Theme.of(context)
                            .textTheme
                            .titleLarge
                            ?.copyWith(fontWeight: FontWeight.bold),
                      ),
                      Text(
                        designation(profileData.designation),
                        style: Theme.of(context).textTheme.subtitle1,
                      )
                    ],
                  ),
                ],
              ),
            ],
          );
        },
      )),
    );
  }

  String designation(int id) {
    switch (id) {
      case 3:
        return "Super admin";
      default:
        return "";
    }
  }

  Future<ProfileData?> _fetchProfileData() async {
    ProviderResponse response;

    if (!isAuthenticated) {
      response = await Provider.of<UserDataProvider>(context, listen: false)
          .redirectUser(widget.token);

      if (response.success) {
        isAuthenticated = true;
        return response.data;
      }
    }

    if (!isAuthenticated) {
      response = await Provider.of<UserDataProvider>(context, listen: false)
          .getProfileData();
      if (response.success) {
        isAuthenticated = true;
        return response.data;
      }
    }

    return null;
  }
}
