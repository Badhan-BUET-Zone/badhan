import 'package:badhandatainput/model/donor_model.dart';
import 'package:badhandatainput/util/auth_token_util.dart';
import 'package:badhandatainput/util/debug.dart';
import 'package:badhandatainput/widget/common/auth_fail_widget.dart';
import 'package:badhandatainput/widget/home_page/excel_widget.dart';
import 'package:badhandatainput/widget/home_page/side_menu.dart';
import 'package:badhandatainput/widget/responsive.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../model/profile_data_model.dart';
import '../model/provider_response_model.dart';
import '../provider/user_data_provider.dart';

class MyHomePage extends StatefulWidget {
  const MyHomePage({Key? key, required this.title, required this.token})
      : super(key: key);
  static String route = "/home";
  final String title;
  final String token;
  @override
  State<MyHomePage> createState() {
    return _MyHomePageState();
  }
}

class _MyHomePageState extends State<MyHomePage> {
  static String tag = "MyHomePage";

  bool isLoggingOut = false;

  final StringBuffer _msg = StringBuffer("Import an excel file.");
  String profileDataStr = "";
  bool isAuthenticated = false;
  final List<NewDonor> _newDonorList = [];
  final Map<String, DateTime> _lastDonationMap = {};
  ProfileData? _profileData;

  /// logout the user when logout button
  /// in the appbar is clicked
  /// to logout, logout api is called
  /// and cached token is deleted
  void logout() async {
    // show a dialog of logging out =====================
    showDialog(
        context: context,
        builder: (context) {
          return AlertDialog(
            content: Row(
              children: [
                const CircularProgressIndicator(),
                Container(
                  margin: const EdgeInsets.only(left: 14),
                  child: const Text("Logging out..."),
                ),
              ],
            ),
          );
        });

    // call the logout api and clear the cache =====================
    ProviderResponse response =
        await Provider.of<UserDataProvider>(context, listen: false).logout();
    if (response.success) {
      AuthToken.deleteToken(); // clear token from cache
      Navigator.of(context).pushNamed("/");
    } else {
      Navigator.of(context).pop();
    }

    // show a snackbar with a message from the response==============
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        duration: const Duration(seconds: 15),
        // width: MediaQuery.of(context).size.width * 0.2,
        margin: EdgeInsets.only(
            left: MediaQuery.of(context).size.width * 0.7,
            right: 20,
            bottom: 20),
        behavior: SnackBarBehavior.floating,
        content: Text(response.message),
        backgroundColor: response.success ? Colors.green : Colors.red,
      ),
    );
  }

  /// try to fetch profile data if redirected in any previous call.
  /// otherwise redirect user using auth token provided as url query param if not authenticated
  Future<ProfileData?> _fetchProfileData() async {
    ProviderResponse response;

    // if user profile data is already fetched in previous request
    if (_profileData != null) return _profileData;

    // try to get the profile data of the user
    if (!isAuthenticated) {
      response = await Provider.of<UserDataProvider>(context, listen: false)
          .getProfileData();
      if (response.success) {
        isAuthenticated = true;
        return response.data;
      }
    }

    // if user if not redirected yet
    if (!isAuthenticated) {
      Log.d(tag, "_fetchProfileData: redirectng user");
      response = await Provider.of<UserDataProvider>(context, listen: false)
          .redirectUser(widget.token);

      if (response.success) {
        isAuthenticated = true;
        return response.data;
      }
    }

    return null; // user is not authenticated
  }

  /* @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(widget.title),
            if (isAuthenticated)
              IconButton(
                onPressed: logout, // call logout method
                icon: const Icon(Icons.login),
                tooltip: "Logout",
              )
          ],
        ),
        automaticallyImplyLeading: Responsive.isMobile(context),
      ),
      drawer: Responsive.isMobile(context)
          ? _profileData == null
              ? FutureBuilder(
                  future: _fetchProfileData(),
                  builder: (context, AsyncSnapshot<ProfileData?> snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return const Center(child: CircularProgressIndicator());
                    }

                    _profileData = snapshot.data;

                    if (_profileData == null) {
                      return const Center(
                          child: Text("Failed Authentication!"));
                    }

                    return Drawer(
                      child: SideMenu(profileData: _profileData!),
                    );
                  },
                )
              : Drawer(
                  child: SideMenu(profileData: _profileData!),
                )
          : null,
      body: _profileData == null
          ? FutureBuilder(
              future: _fetchProfileData(),
              builder: (context, AsyncSnapshot<ProfileData?> snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }

                _profileData = snapshot.data;

                if (_profileData == null) {
                  return const AuthFailedWidget();
                }

                return _ResponsiveHomePage(
                  newDonorList: _newDonorList,
                  msg: _msg,
                  profileData: _profileData,
                  lastDonationMap: _lastDonationMap,
                );
              },
            )
          : _ResponsiveHomePage(
              newDonorList: _newDonorList,
              msg: _msg,
              profileData: _profileData,
              lastDonationMap: _lastDonationMap,
            ),
    );
  } */

  AppBar? _appBar;
  AppBar _getAppBar() {
    _appBar ??= AppBar(
        title: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(widget.title),
            if (isAuthenticated)
              IconButton(
                onPressed: logout, // call logout method
                icon: const Icon(Icons.login),
                tooltip: "Logout",
              )
          ],
        ),
        automaticallyImplyLeading: Responsive.isMobile(context),
      );
    return _appBar!;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: FutureBuilder(
        future: _fetchProfileData(),
        builder: (context, AsyncSnapshot<ProfileData?> snapshot) {
          
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
    
          _profileData = snapshot.data;
    
          return Scaffold(
            appBar: _getAppBar(),
            drawer: Responsive.isMobile(context)
                ? Drawer(
                    child: SideMenu(profileData: _profileData!),
                  )
                : null,
            body: _profileData == null
                ? const AuthFailedWidget()
                : _ResponsiveHomePage(
                    newDonorList: _newDonorList,
                    msg: _msg,
                    profileData: _profileData,
                    lastDonationMap: _lastDonationMap,
                  ),
          );
        },
      ),
    );
  }
}

class _ResponsiveHomePage extends StatelessWidget {
  const _ResponsiveHomePage({
    Key? key,
    required List<NewDonor> newDonorList,
    required StringBuffer msg,
    required ProfileData? profileData,
    required Map<String, DateTime> lastDonationMap,
  })  : _newDonorList = newDonorList,
        _msg = msg,
        _profileData = profileData,
        _lastDonationMap = lastDonationMap,
        super(key: key);

  final List<NewDonor> _newDonorList;
  final Map<String, DateTime> _lastDonationMap;
  final StringBuffer _msg;
  final ProfileData? _profileData;

  @override
  Widget build(BuildContext context) {
    return Responsive(
      mobile: ExcelWidget(
        newDonorList: _newDonorList,
        msg: _msg,
        lastDonationMap: _lastDonationMap,
      ),
      tablet: Row(
        mainAxisSize: MainAxisSize.max,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Flexible(flex: 3, child: SideMenu(profileData: _profileData!)),
          const VerticalDivider(),
          Expanded(
              flex: 8,
              child: ExcelWidget(
                newDonorList: _newDonorList,
                msg: _msg,
                lastDonationMap: _lastDonationMap,
              )),
        ],
      ),
      desktop: Row(
        mainAxisSize: MainAxisSize.max,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Flexible(flex: 3, child: SideMenu(profileData: _profileData!)),
          const VerticalDivider(),
          Expanded(
              flex: 10,
              child: ExcelWidget(
                newDonorList: _newDonorList,
                msg: _msg,
                lastDonationMap: _lastDonationMap,
              )),
        ],
      ),
    );
  }
}
