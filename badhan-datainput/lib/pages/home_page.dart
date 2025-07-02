import 'package:auto_size_text/auto_size_text.dart';
import 'package:badhandatainput/util/auth_token_util.dart';
import 'package:badhandatainput/util/debug.dart';
import 'package:badhandatainput/util/environment.dart';
import 'package:badhandatainput/widget/common/auth_fail_widget.dart';
import 'package:badhandatainput/widget/home_page/badhan_form_widget.dart';
import 'package:badhandatainput/widget/home_page/excel_widget.dart';
import 'package:badhandatainput/widget/home_page/google_sheet_widget.dart';
import 'package:badhandatainput/widget/home_page/side_menu.dart';
import 'package:badhandatainput/widget/responsive.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../model/profile_data_model.dart';
import '../model/provider_response_model.dart';
import '../provider/user_data_provider.dart';
import '../util/const_ui.dart';

// ignore: must_be_immutable
class MyHomePage extends StatefulWidget {
  // title and token is intialized in lib/config/routes.dart
  // when the user navigates to the home page
  // and MyHomePage instance is created
  final String title;
  String token; // token recieved from query params in the url from main website

  MyHomePage({Key? key, required this.title, required this.token})
      : super(key: key);

  @override
  State<MyHomePage> createState() {
    return _MyHomePageState();
  }
}

/// State of the home page
/// First it authenticate user and fetch profile data
class _MyHomePageState extends State<MyHomePage> {
  static String tag = "MyHomePage";

  bool isLoggingOut = false;
  String profileDataStr = "";

  bool isAuthenticated = false; // becomes true when profile data is fetched
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
      widget.token = "";
      AuthToken.deleteToken(); // clear token from cache
      Navigator.of(context).pushNamed("/");
    } else {
      Navigator.of(context).pop();
    }

    // show a snackbar with a message from the response==============
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        duration: const Duration(seconds: 4),
        // width: MediaQuery.of(context).size.width * 0.2,
        margin: EdgeInsets.only(
            left: ConstUI.responsiveSnackbarMargin(context),
            right: 20,
            bottom: 20),
        behavior: SnackBarBehavior.floating,
        content: AutoSizeText(response.message),
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
      }else{
        // test login
        if (Environment.isTest) {
          response = await Provider.of<UserDataProvider>(context, listen: false)
              .testLogin();
          if(response.success){
            response =
                await Provider.of<UserDataProvider>(context, listen: false)
                    .getProfileData();
            if (response.success) {
              isAuthenticated = true;
              return response.data;
            }
          }
        }
      }
    }

    // if user if not redirected yet
    if (!isAuthenticated && widget.token != "") {
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

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: _fetchProfileData(),
      builder: (context, AsyncSnapshot<ProfileData?> snapshot) {
        /// waiting for the authentication to be done
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
              body: Center(child: CircularProgressIndicator()));
        }

        _profileData = snapshot.data;

        return HomeWidget(
          title: widget.title,
          isAuthenticated: isAuthenticated,
          logout: logout,
          profileData: _profileData,
        );
      },
    );
  }
}

class HomeWidget extends StatefulWidget {
  const HomeWidget({
    Key? key,
    required this.title,
    required this.isAuthenticated,
    required this.logout,
    required this.profileData,
  }) : super(key: key);

  final String title;
  final bool isAuthenticated;
  final void Function() logout;
  final ProfileData? profileData;

  @override
  State<HomeWidget> createState() => _HomeWidgetState();
}

class _HomeWidgetState extends State<HomeWidget> {
  static String tag = "HomeWidget";

  int lastSelectedMenuIdx = 0;
  Widget? mainWidget;
  final ExcelWidget excelWidget = const ExcelWidget();
  final GoogleSheetWidget googleSheetWidget = const GoogleSheetWidget();
  final BadhanFormWidget badhanFormWidget = const BadhanFormWidget();

  @override
  void initState() {
    super.initState();
    mainWidget = excelWidget;
  }

  AppBar _getAppBar(bool isMobile) {
    AppBar _appBar = AppBar(
      title: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(widget.title),
          if (widget.isAuthenticated)
            IconButton(
              onPressed: widget.logout, // call logout method
              icon: const Icon(Icons.login),
              tooltip: "Logout",
            )
        ],
      ),

      // decide whether to menu button or not
      // hambuerger button is used in mobile view to show the menu
      automaticallyImplyLeading: isMobile && widget.isAuthenticated,
    );
    return _appBar;
  }

  void onMenuSelected(int idx) {
    lastSelectedMenuIdx = idx;
    //Log.d(tag, "Selected menu: $idx");
    switch (idx) {
      case 0: // excel
        mainWidget = excelWidget;
        break;
      case 1:
        mainWidget = googleSheetWidget;
        break;
      /* case 2:
        mainWidget = badhanFormWidget;
        break; */
      case 2:
        mainWidget = const Center(
          child: Text("Instruction will be here"),
        );
    }
    setState(() {
      toggleDrawer();
    });
  }

  ///https://stackoverflow.com/questions/43807184/how-to-close-scaffolds-drawer-after-an-item-tap
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  toggleDrawer() async {
    if (_scaffoldKey.currentState!.isDrawerOpen) {
      _scaffoldKey.currentState!.openEndDrawer();
    } else {
      _scaffoldKey.currentState!.openDrawer();
    }
  }

  @override
  Widget build(BuildContext context) {
    bool isMobile = Responsive.isMobile(context);
    return Scaffold(
      key: _scaffoldKey,
      appBar: _getAppBar(isMobile),
      drawer: isMobile && widget.isAuthenticated
          ? Drawer(
              child: SideMenu(
                initialSelectedIdx: lastSelectedMenuIdx,
                onDestinationSelected: onMenuSelected,
                profileData: widget.profileData!,
              ),
            )
          : null,
      body: widget.profileData == null
          ? const AuthFailedWidget() // user is not authenticated
          : Responsive(
              mobile: mainWidget!,
              tablet: Row(
                children: [
                  SideMenu(
                    initialSelectedIdx: lastSelectedMenuIdx,
                    profileData: widget.profileData!,
                    onDestinationSelected: onMenuSelected,
                  ),
                  Expanded(
                    child: mainWidget!,
                  ),
                ],
              ),
              desktop: Row(
                children: [
                  SideMenu(
                    initialSelectedIdx: lastSelectedMenuIdx,
                    profileData: widget.profileData!,
                    onDestinationSelected: onMenuSelected,
                  ),
                  Expanded(
                    child: mainWidget!,
                  ),
                ],
              ),
            ),
    );
  }
}
