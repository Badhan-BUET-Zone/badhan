import 'package:badhandatainput/model/donor_model.dart';
import 'package:badhandatainput/widget/home_page/excel_widget.dart';
import 'package:badhandatainput/widget/home_page/side_menu.dart';
import 'package:badhandatainput/widget/responsive.dart';
import 'package:flutter/material.dart';

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

  String msg = "No data";
  String profileDataStr = "";
  bool isAuthenticated = false;
  final List<NewDonor> _newDonorList = [];

  @override
  Widget build(BuildContext context) {
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
        mobile: ExcelWidget(newDonorList: _newDonorList),
        tablet: Row(
          mainAxisSize: MainAxisSize.max,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Flexible(flex: 4, child: SideMenu(token: widget.token)),
            const VerticalDivider(),
            Expanded(flex: 8, child: ExcelWidget(newDonorList: _newDonorList)),
          ],
        ),
        desktop: Row(
          mainAxisSize: MainAxisSize.max,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Flexible(flex: 3, child: SideMenu(token: widget.token)),
            const VerticalDivider(),
            Expanded(flex: 10, child: ExcelWidget(newDonorList: _newDonorList)),
          ],
        ),
      ),
    );
  }
}
