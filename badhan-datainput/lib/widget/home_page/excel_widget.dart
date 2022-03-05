import 'dart:convert';
import 'dart:io';

import 'package:badhandatainput/model/donor_model.dart';
import 'package:badhandatainput/util/badhan_constants.dart';
import 'package:badhandatainput/widget/home_page/donor_card.dart';
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

  List<NewDonor> newDonorList = [];

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
            //child: SingleChildScrollView(child: SelectableText(msg))),
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: newDonorList.length,
              itemBuilder: (context, index) {
                return DonorCard(newDonor: newDonorList[index]);
              },
            ),
          ),
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

    newDonorList.clear();

    Excel excel = Excel.decodeBytes(bytes);

    StringBuffer buffer = StringBuffer();
    for (String sheetName in excel.tables.keys) {
      Log.d(tag, "$fName $sheetName"); //sheet Name
      buffer.writeln("Sheet name: $sheetName");
      /* print(excel.tables[table]!.maxCols);
      print(excel.tables[table]!.maxRows); */
      int r = 1;
      List<String> header = [];
      Map<String, dynamic> dataMap = {};
      for (List<Data?> row in excel.tables[sheetName]!.rows) {
        int c = 0;
        for (Data? data in row) {
          if (data == null) continue;
          if (r == 1) {
            header.add(headerMap("${data.value}"));
          } else {
            //buffer.writeln("${header[c]}: ${data.value} ");
            dataMap[header[c]] = _dataMap(header[c], data.value);
          }
          c++;
        }
        if (r > 1) {
          //buffer.writeln(json.encode(dataMap));
          NewDonor newDonor = NewDonor.fromJson(dataMap);
          newDonorList.add(newDonor);
          buffer.writeln(newDonor.toJson());
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

  String headerMap(String old) {
    switch (old) {
      case "Phone":
        return "phone";
      case "BloodGroup":
        return "bloodGroup";
      case "Room Number":
        return "roomNumber";
      case "Student ID":
        return "studentId";
      case "Total Donations":
        return "extraDonationCount";
      case "Available To All":
        return "availableToAll";
      default: // name, hall , address, comment
        return old.toLowerCase();
    }
  }

  dynamic _dataMap(String header, dynamic data) {
    switch (header) {
      case "phone":
        return data.toString();
      case "bloodGroup":
        return BadhanConst.bloodGroupId(data as String);
      case "hall":
        return BadhanConst.hallId(data);
      default:
        return data;
    }
  }

  void _openFile(String filePath) {
    String fName = "_openFile():";
    Log.d(tag, "opening file from : $filePath");
    List<int> bytes = File(filePath).readAsBytesSync();
    _openFileFromByte(bytes);
  }
}
