import 'dart:io';
import 'package:badhandatainput/widget/home_page/excel_widget.dart';
import 'package:badhandatainput/widget/home_page/side_menu.dart';
import 'package:badhandatainput/widget/responsive.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:badhandatainput/model/profile_data_model.dart';
import 'package:badhandatainput/model/provider_response_model.dart';
import 'package:badhandatainput/provider/user_data_provider.dart';
import 'package:excel/excel.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../util/auth_token_util.dart';
import '../util/debug.dart';

class MyHomePage extends StatefulWidget {
  const MyHomePage({Key? key, required this.title, required this.token})
      : super(key: key);
  static String param_route = "/home";
  final String title;
  final String token;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  static String TAG = "MyHomePage";

  String msg = "No data";
  String profileDataStr = "";
  bool isAuthenticated = false;

  @override
  Widget build(BuildContext context) {
    Log.d(TAG, "home page building");

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        automaticallyImplyLeading: Responsive.isMobile(context),
      ),
      drawer: Responsive.isMobile(context)
          ? Drawer(
              child: SideMenu(token: widget.token),
            )
          : null,
      body: Responsive(
        mobile: const ExcelWidget(),
        tablet: Row(
          mainAxisSize: MainAxisSize.max,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Flexible(
                flex: 4,
                child: SideMenu(token: widget.token)),
            const VerticalDivider(),
            const Expanded(
                flex: 8 ,
                child: ExcelWidget()),
          ],
        ),
        desktop: Row(
          mainAxisSize: MainAxisSize.max,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Flexible(
                flex: 2,
                child: SideMenu(token: widget.token)),
            const VerticalDivider(),
            const Expanded(
                flex: 10 ,
                child: ExcelWidget()),
          ],
        ),
      ), // This trailing comma makes auto-formatting nicer for build methods.
    );
  }
}
