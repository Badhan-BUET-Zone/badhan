import 'dart:io';

import 'package:excel/excel.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../../util/debug.dart';

class ExcelWidget extends StatefulWidget {
  const ExcelWidget({Key? key}) : super(key: key);

  @override
  _AddExcelWidgetState createState() => _AddExcelWidgetState();
}

class _AddExcelWidgetState extends State<ExcelWidget> {
  static String tag = "AddExcelWidget";
  String msg = "No data";

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      //color: Colors.amber,
      width: double.infinity,
      height: double.infinity,
      child: Stack(
        children: [
          Container(
              //color: Colors.red,
              width: double.infinity,
              child: SingleChildScrollView(child: Text(msg))),
          Container(
            alignment: Alignment.bottomRight,
            padding: const EdgeInsets.only(right: 10, bottom: 10),
            child: FloatingActionButton(
              onPressed: _uploadFile,
              tooltip: 'Add Excel file',
              child: const Icon(Icons.add),
            ),
          )
        ],
      ),
    );
  }

  // see: https://pub.dev/packages/file_picker
  void _uploadFile() async {
    final result = await FilePicker.platform
        .pickFiles(allowedExtensions: ['xlsx'], type: FileType.custom);

    if (result == null) {
      Log.d(tag, "No file Picked");
      return;
    }

    PlatformFile file = result.files.first;

    Log.d(tag, "file name: ${file.name}");
    //Log.d(TAG, "file bytes: ${file.bytes}");
    Log.d(tag, "file size: ${file.size}");
    Log.d(tag, "file extension: ${file.extension}");
    //Log.d(TAG, "file path: ${file.path}");

    // https: //stackoverflow.com/questions/45924474/how-do-you-detect-the-host-platform-from-dart-code
    if (kIsWeb && file.bytes != null) {
      _openFileFromByte(file.bytes!);
    } else if (file.path != null) {
      _openFile(file.path!);
    }
  }

  void _openFileFromByte(List<int> bytes) {
    String fName = "_openFileFromByte():";

    Excel excel = Excel.decodeBytes(bytes);

    StringBuffer buffer = StringBuffer();
    for (String sheetName in excel.tables.keys) {
      Log.d(tag, "$fName $sheetName"); //sheet Name
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
    Log.d(tag, buffer.toString());
    setState(() {
      msg = buffer.toString();
    });
  }

  void _openFile(String filePath) {
    String fName = "_openFile():";
    Log.d(tag, "opening file from : $filePath");
    List<int> bytes = File(filePath).readAsBytesSync();
    _openFileFromByte(bytes);
  }
}
