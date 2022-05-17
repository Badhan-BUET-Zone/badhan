import 'package:badhandatainput/util/badhan_constants.dart';
import 'package:badhandatainput/util/const_ui.dart';
import 'package:badhandatainput/util/custom_exceptions.dart';
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
  static String tag = "GoogleSheetWidget";

  bool isLoading = false;
  final List<NewDonor> newDonorList = [];
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
              if (isLoading)
                const Padding(
                  padding: EdgeInsets.only(top: 10.0),
                  child: Center(
                    child: CircularProgressIndicator(),
                  ),
                ),
              if (!isLoading)
                const SizedBox(
                  height: 5,
                ),
              if (!isLoading)
                AllDonorsWidget(
                    newDonorList: newDonorList,
                    lastDonationMap: lastDonationMap),
            ],
          ),
        ],
      ),
    );
  }

  // clears all the data in the excel widget
  void _clearAll() {
    setState(() {
      newDonorList.clear();
      lastDonationMap.clear();
    });
  }

  void fetchGoogleSheetData(String link) async {
    isLoading = true;
    _clearAll();
    try {
      List<Map<String, String>> dataList =
          await GoogleSheetParser.parseSheet(link);

      Map<String, dynamic> mappedData = {};
      int r = 1;
      for (Map<String, String> data in dataList) {
        data.forEach((key, value) {
          String header = BadhanConst.headerMap(key);
          if (header == "lastDonation" && value.isNotEmpty) {
            String phone = mappedData["phone"] ?? "";
            if (phone.isEmpty) {
              throw MyExpection(
                  "Phone number column must be appear before last donation column!");
            }
            try {
              Log.d(tag, "$phone : $value");
              if (value != "0" && phone != "") {
                DateTime dateTime = DateTime.parse(value);
                lastDonationMap[phone] = dateTime;
              }
            } catch (_) {
              /// https://github.com/Badhan-BUET-Zone/badhan-datainput/issues/26
              throw MyExpection(
                  "Invalid last donation date format on row $r.\nDate format must be yyyy-mm-dd.");
            }
          } else {
            mappedData[header] = BadhanConst.dataMapFromString(header, value);
          }
        });
        NewDonor newDonor = NewDonor.fromJson(mappedData);
        newDonorList.add(newDonor);
        r++;
      }

      setState(() {
        isLoading = false;
      });

      Log.d(tag, "dataList: $dataList");
    } catch (e) {
      isLoading = false;
      _clearAll();
      Log.d(tag, "Error: $e");
      ConstUI.showErrorToast(context, () {}, e.toString());
    }
    
  }
}
