import 'dart:io';

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
  const MyHomePage({Key? key, required this.title}) : super(key: key);
  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  static String TAG = "MyHomePage";

  String msg = "No data";

  @override
  Widget build(BuildContext context) {
    /* String token =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI1ZTY3NzcxNmNhMmRjODU3OTM4ZDdjNzMiLCJhY2Nlc3MiOiJhdXRoIiwiaWF0IjoxNjQ2MDM0NDI2fQ.PjsIV7392TsOmMU84Q5fxZJgwfZXjOR3o1kACiJhfd0";
    Provider.of<UserDataProvider>(context, listen: false)
        .redirectUser(token)
        .then(((value) {
      
    })); */
    Provider.of<UserDataProvider>(context, listen: false)
        .getProfileData()
        .then(((ProviderResponse value) {
      if (value.success) {
        ProfileData profileData = value.data;
        Log.d(TAG, "user name: ${profileData.name}");
      }
    }));

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
      ),
      body: SingleChildScrollView(
        controller: ScrollController(),
        child: Padding(
          padding: EdgeInsets.all(20),
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: <Widget>[Text(msg)],
            ),
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _uploadFile,
        tooltip: 'Increment',
        child: const Icon(Icons.add),
      ), // This trailing comma makes auto-formatting nicer for build methods.
    );
  }

  // see: https://pub.dev/packages/file_picker
  void _uploadFile() async {
    final result = await FilePicker.platform
        .pickFiles(allowedExtensions: ['xlsx'], type: FileType.custom);

    if (result == null) {
      Log.d(TAG, "No file Picked");
      return;
    }

    PlatformFile file = result.files.first;

    Log.d(TAG, "file name: ${file.name}");
    Log.d(TAG, "file bytes: ${file.bytes}");
    Log.d(TAG, "file size: ${file.size}");
    Log.d(TAG, "file extension: ${file.extension}");
    Log.d(TAG, "file path: ${file.path}");

    _openFile(file.path!);
  }

  void _openFile(String filePath) {
    String fName = "_openFile():";
    Log.d(TAG, "opening file from : $filePath");
    List<int> bytes = File(filePath).readAsBytesSync();
    Excel excel = Excel.decodeBytes(bytes);

    StringBuffer buffer = StringBuffer();
    for (String sheetName in excel.tables.keys) {
      Log.d(TAG, "$fName $sheetName"); //sheet Name
      buffer.writeln("Sheet name: $sheetName");
      /* print(excel.tables[table]!.maxCols);
      print(excel.tables[table]!.maxRows); */
      int r = 1;
      List<String> header = [];
      for (List<Data?> row in excel.tables[sheetName]!.rows) {
        int c = 0;
        for (Data? data in row) {
          if (data == null) continue;
          if (r == 1) {
            header.add("${data.value}");
          } else {
            buffer.writeln("${header[c]}: ${data.value} ");
          }
          c++;
        }
        buffer.writeln("\n");
        r++;
      }
    }
    Log.d(TAG, buffer.toString());
    setState(() {
      msg = buffer.toString();
    });
  }
}
