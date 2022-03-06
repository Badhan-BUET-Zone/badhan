import 'package:badhandatainput/model/donor_model.dart';
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
  //static String tag = "MyHomePage";

  final StringBuffer _msg = StringBuffer("Import an excel file.");
  String profileDataStr = "";
  bool isAuthenticated = false;
  final List<NewDonor> _newDonorList = [];
  ProfileData? _profileData;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(widget.title),
            IconButton(
              onPressed: () {
                setState(() {
                  _msg.clear();
                  _msg.write("Import an excel file.");
                  _newDonorList.clear();
                });
              },
              icon: const Icon(Icons.clear_all_rounded),
              tooltip: "Clear All",
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
                  return const Center(child: Text("Failed Authentication!"));
                }

                return _ResponsiveHomePage(
                    newDonorList: _newDonorList,
                    msg: _msg,
                    profileData: _profileData);
              },
            )
          : _ResponsiveHomePage(
              newDonorList: _newDonorList,
              msg: _msg,
              profileData: _profileData),
    );
  }

  Future<ProfileData?> _fetchProfileData() async {
    ProviderResponse response;

    if (_profileData != null) return _profileData;

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

class _ResponsiveHomePage extends StatelessWidget {
  const _ResponsiveHomePage({
    Key? key,
    required List<NewDonor> newDonorList,
    required StringBuffer msg,
    required ProfileData? profileData,
  })  : _newDonorList = newDonorList,
        _msg = msg,
        _profileData = profileData,
        super(key: key);

  final List<NewDonor> _newDonorList;
  final StringBuffer _msg;
  final ProfileData? _profileData;

  @override
  Widget build(BuildContext context) {
    return Responsive(
      mobile: ExcelWidget(
        newDonorList: _newDonorList,
        msg: _msg,
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
              )),
        ],
      ),
    );
  }
}
