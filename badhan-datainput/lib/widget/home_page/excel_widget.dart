import 'dart:io';

import 'package:badhandatainput/model/donor_model.dart';
import 'package:badhandatainput/util/badhan_constants.dart';
import 'package:badhandatainput/widget/home_page/donor_card.dart';
import 'package:badhandatainput/widget/responsive.dart';
import 'package:excel/excel.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_speed_dial/flutter_speed_dial.dart';
import 'package:flutter_staggered_grid_view/flutter_staggered_grid_view.dart';

import '../../util/debug.dart';

// ignore: must_be_immutable
class ExcelWidget extends StatefulWidget {
  ExcelWidget(
      {Key? key,
      required this.newDonorList,
      required this.msg,
      required this.lastDonationMap})
      : super(key: key);

  List<NewDonor> newDonorList;
  StringBuffer msg;
  final Map<String, DateTime> lastDonationMap;

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
                        message:
                            "Import a formatted excel. Follow instructions.",
                        child: TextButton.icon(
                          icon: const Icon(Icons.file_upload_outlined),
                          label: const Text("Import Excel"),
                          onPressed: _uploadFile,
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
                              NewDonor donor = widget.newDonorList[index];
                              return DonorCard(
                                newDonor: donor,
                                lastDonation:
                                    widget.lastDonationMap[donor.phone],
                              );
                            },
                          )
                        : SingleChildScrollView(
                            child: StaggeredGrid.count(
                              crossAxisCount: 2,
                              children: widget.newDonorList.map((e) {
                                return DonorCard(
                                  newDonor: e,
                                  lastDonation: widget.lastDonationMap[e.phone],
                                );
                              }).toList(),
                            ),
                          )),
              ),
            ],
          ),
          Container(
            alignment: Alignment.bottomRight,
            padding: const EdgeInsets.only(right: 10, bottom: 10),
            child: SpeedDial(
              animatedIcon: AnimatedIcons.menu_close,
              overlayOpacity: 0,
              children: [
                SpeedDialChild(
                    onTap: _uploadFile,
                    //tooltip: 'Add Excel file',
                    label: "Import Excel",
                    child: const Icon(Icons.file_upload),
                    backgroundColor: Colors.amber,
                    labelBackgroundColor: Colors.amber),
                if (widget.newDonorList.isNotEmpty)
                  SpeedDialChild(
                      onTap: () {},
                      label: "Upload all",
                      child: const Icon(Icons.file_upload_outlined),
                      backgroundColor: Colors.amber,
                      labelBackgroundColor: Colors.amber),
                if (widget.newDonorList.isNotEmpty)
                  SpeedDialChild(
                      onTap: _clearAll,
                      label: "Clear all",
                      child: const Icon(Icons.clear_rounded),
                      backgroundColor: Colors.amber,
                      labelBackgroundColor: Colors.amber)
              ],
            ),
          )
        ],
      ),
    );
  }

  void _clearAll() {
    setState(() {
      widget.msg.clear();
      widget.msg.write("Import an excel file.");
      widget.newDonorList.clear();
    });
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

  void _openFileFromByte(List<int> bytes) async {
    String fName = "_openFileFromByte():";

    widget.newDonorList.clear();

    Excel excel = Excel.decodeBytes(bytes);

    //StringBuffer buffer = StringBuffer();
    for (String sheetName in excel.tables.keys) {
      Log.d(tag, "$fName $sheetName"); //sheet Name
      widget.msg.write("Sheet: $sheetName");
      // buffer.writeln("Sheet name: $sheetName");
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
            if (header[c] == "lastDonation") {
              try {
                if (data.value.toString() != "0") {
                  DateTime dateTime = DateTime.parse(data.value);
                  widget.lastDonationMap[dataMap['phone']] = dateTime;
                  Log.d(tag, "${dataMap['phone']} : $dateTime");
                }
              } catch (e) {
                Log.d(tag, e.toString());
              }
            } else {
              dataMap[header[c]] = _dataMap(header[c], data.value);
            }
          }
          c++; // next column
        }
        if (r > 1) {
          //buffer.writeln(json.encode(dataMap));
          //Log.d(tag, "data: ${json.encode(dataMap)}");
          NewDonor newDonor = NewDonor.fromJson(dataMap);
          //DonorData? duplicateDonor = await _checkDuplicate(newDonor.phone);
          //if (duplicateDonor == null) {
          widget.newDonorList.add(newDonor);
          //}
          // buffer.writeln(newDonor.toJson());
        }
        //buffer.writeln("\n");
        r++; // new row
      }
    }
    setState(() {});
  }

  String headerMap(String old) {
    switch (old.toLowerCase()) {
      case "phone":
        return "phone";
      case "blood group":
        return "bloodGroup";
      case "room number":
        return "roomNumber";
      case "student id":
        return "studentId";
      case "total donations":
        return "extraDonationCount";
      case "available to all":
        return "availableToAll";
      case "last donation":
        return "lastDonation";
      default: // name, hall , address, comment
        return old.toLowerCase();
    }
  }

  dynamic _dataMap(String header, dynamic data) {
    switch (header) {
      case "phone":
        return (data.toInt()).toString();
      case "bloodGroup":
        return BadhanConst.bloodGroupId(data as String);
      case "hall":
        return BadhanConst.hallId(data);
      case "studentId":
        return data.toInt().toString();
      case "extraDonationCount":
        return data.toInt();
      case "comment":
        String comment = data;
        return comment.trim() == "" ? "no comments" : comment.trim();
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
