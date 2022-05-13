import 'package:flutter/material.dart';
import 'package:flutter_speed_dial/flutter_speed_dial.dart';

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
                        child: MyTextField(
                          hint: "Paste a public google sheet link here",
                          onSubmitText: (String link) {},
                          vanishTextOnSubmit: false,
                        ),
                      ),
                      ElevatedButton(
                        onPressed: () {},
                        child: const Text("Import"),
                      )
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
}
