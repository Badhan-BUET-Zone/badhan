import 'dart:io';

import 'package:badhandatainput/model/donor_model.dart';
import 'package:badhandatainput/util/badhan_constants.dart';
import 'package:badhandatainput/widget/home_page/donor_card.dart';
import 'package:badhandatainput/widget/responsive.dart';
import 'package:excel/excel.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_staggered_grid_view/flutter_staggered_grid_view.dart';

import '../../util/debug.dart';

// ignore: must_be_immutable
class ExcelWidget extends StatefulWidget {
  ExcelWidget({Key? key, required this.newDonorList, required this.msg})
      : super(key: key);

  List<NewDonor> newDonorList;
  StringBuffer msg;

  @override
  _AddExcelWidgetState createState() {
    return _AddExcelWidgetState();
  }
}

class _AddExcelWidgetState extends State<ExcelWidget> {
  static String tag = "AddExcelWidget";
  String defaultMsg = "Import an excel file.";

  @override
  Widget build(BuildContext context) {
    bool isDesktop = Responsive.isDesktop(context);
    return Container(
      padding: const EdgeInsets.all(10),
      //color: Colors.amber,
      width: double.infinity,
      height: double.infinity,
      child: Stack(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Card(
                child: Container(
                  // top upload all bar
                  width: double.infinity,
                  margin: const EdgeInsets.symmetric(
                    horizontal: 4,
                  ),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                  color: Colors.white,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          widget.msg.toString(),
                          style: Theme.of(context).textTheme.titleSmall,
                        ),
                      ),
                      Tooltip(
                        message: "Upload all the donors",
                        child: TextButton.icon(
                          icon: const Icon(Icons.file_upload_outlined),
                          label: const Text("Upload all"),
                          onPressed: () {},
                        ),
                      )
                    ],
                  ),
                ),
              ),
              const SizedBox(
                height: 5,
              ),
              Expanded(
                // list of all donors
                child: SizedBox(
                    //color: Colors.red,
                    width: double.infinity,
                    //child: SingleChildScrollView(child: SelectableText(msg))),
                    child: !isDesktop
                        ? ListView.builder(
                            shrinkWrap: true,
                            itemCount: widget.newDonorList.length,
                            itemBuilder: (context, index) {
                              return DonorCard(
                                  newDonor: widget.newDonorList[index]);
                            },
                          )
                        : SingleChildScrollView(
                            child: StaggeredGrid.count(
                              crossAxisCount: 2,
                              children: widget.newDonorList.map((e) {
                                return DonorCard(newDonor: e);
                              }).toList(),
                            ),
                          )),
              ),
            ],
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
    widget.msg.clear();
    widget.msg.write("File name: ${file.name}, ");
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

    widget.newDonorList.clear();

    Excel excel = Excel.decodeBytes(bytes);

    StringBuffer buffer = StringBuffer();
    for (String sheetName in excel.tables.keys) {
      Log.d(tag, "$fName $sheetName"); //sheet Name
      widget.msg.write("Sheet: $sheetName");
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
          //Log.d(tag, "data: ${json.encode(dataMap)}");
          NewDonor newDonor = NewDonor.fromJson(dataMap);
          widget.newDonorList.add(newDonor);
          buffer.writeln(newDonor.toJson());
        }
        buffer.writeln("\n");
        r++;
      }
    }
    //Log.d(tag, buffer.toString());
    setState(() {
      //msg = buffer.toString();
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
        double d = data;
        return (d.toInt()).toString();
      case "bloodGroup":
        return BadhanConst.bloodGroupId(data as String);
      case "hall":
        return BadhanConst.hallId(data);
      case "studentId":
      case "extraDonationCount":
        return data.toInt();
      default:
        return data;
    }
  }

  void _openFile(String filePath) {
    Log.d(tag, "opening file from : $filePath");
    List<int> bytes = File(filePath).readAsBytesSync();
    _openFileFromByte(bytes);
  }
}
