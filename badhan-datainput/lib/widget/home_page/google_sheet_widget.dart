import 'package:badhandatainput/util/const_ui.dart';
import 'package:badhandatainput/util/debug.dart';
import 'package:badhandatainput/util/google_sheet_parser.dart';
import 'package:flutter/material.dart';

import '../../model/donor_model.dart';
import '../common/all_donors_widget.dart';
import '../common/my_text_field.dart';

class GoogleSheetWidget extends StatefulWidget {
  const GoogleSheetWidget({
    Key? key,
  }) : super(key: key);
  @override
  _GoogleSheetWidgetState createState() {
    //Log.d("ExcelWidget", "Creating new ExcelWidget");
    return _GoogleSheetWidgetState();
  }
}

class _GoogleSheetWidgetState extends State<GoogleSheetWidget> {
  static String tag = "ExcelWidget";
  final String defaultMsg = "Import an excel file.";

  final List<NewDonor> newDonorList = [];
  final StringBuffer msg = StringBuffer(
      "Import an excel file."); // message displayed in the topbar. e.g."Import an excel file"
  // key: phone number, value: last donation date
  final Map<String, DateTime> lastDonationMap = {};

  @override
  Widget build(BuildContext context) {
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
                        child: Padding(
                          padding: const EdgeInsets.only(
                            top: 8.0,
                            bottom: 8.0,
                          ),
                          child: MyTextField(
                            hint: "Paste a public google sheet link here",
                            onSubmitText: (String link) {
                              Log.d(tag, "link: $link");
                              fetchGoogleSheetData(link);
                            },
                            vanishTextOnSubmit: false,
                            suffixIcon:
                                const Icon(Icons.link, color: Colors.white),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(
                height: 5,
              ),
              AllDonorsWidget(
                  newDonorList: newDonorList, lastDonationMap: lastDonationMap),
            ],
          ),
        ],
      ),
    );
  }

  // clears all the data in the excel widget
  void _clearAll() {
    setState(() {
      msg.clear();
      msg.write("Import an excel file.");
      newDonorList.clear();
    });
  }

  void fetchGoogleSheetData(String link) async {
    try {
      List<Map<String, String>> dataList =
          await GoogleSheetParser.parseSheet(link);

      Log.d(tag, "dataList: $dataList");
    } catch (e) {
      Log.d(tag, "Error: $e");
      ConstUI.showErrorToast(context, () {}, e.toString());
    }
  }
}
