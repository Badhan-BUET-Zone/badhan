import 'package:badhandatainput/constant/image_asset.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../model/donor_model.dart';
import '../util/badhan_constants.dart';
import '../util/debug.dart';
import '../widget/common/dialog_topbar.dart';
import '../widget/common/my_dropdown_list.dart';
import '../widget/common/my_text_field.dart';
import '../widget/responsive.dart';

class BadhanFromPage extends StatefulWidget {
  const BadhanFromPage({Key? key}) : super(key: key);
  @override
  _BadhanFromPageState createState() => _BadhanFromPageState();
}

class _BadhanFromPageState extends State<BadhanFromPage> {
  /// state variable
  /// data can be changed by user
  NewDonor newDonor = NewDonor(
      phone: "phone",
      bloodGroup: -1,
      hall: -1,
      name: "name",
      studentId: "0",
      address: "address",
      roomNumber: "roomNumber",
      availableToAll: false,
      comment: "comment",
      extraDonationCount: 0);

  static double responsiveWidthMargin(BuildContext context) {
    double width = MediaQuery.of(context).size.width;
    if (Responsive.isMobile(context)) {
      return width * 0.1;
    } else if (Responsive.isTablet(context)) {
      return width * 0.2;
    } else {
      return width * 0.3;
    }
  }

  @override
  Widget build(BuildContext context) {
    double height = MediaQuery.of(context).size.height;

    const double padding = 10;
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Image.asset(ImageAsset.logo, width: 40, height: 40,),
            const SizedBox(width: 10,),
            const Text("Badhan Buet Zone"),
          ],
        ),
        automaticallyImplyLeading: !kIsWeb,
      ),
      body: SingleChildScrollView(
        controller: ScrollController(),
        child: Container(
          padding: EdgeInsets.symmetric(
              horizontal: responsiveWidthMargin(context), vertical: 20),
          child: Column(
            //mainAxisSize: MainAxisSize.min,
            children: [
              const DialogTopBar(
                title: "Badhan Form",
                minimizable: false,
              ),
              MyTextField(
                  hint: "Name",
                  initalText: "",
                  onSubmitText: (String name) {
                    newDonor.name = name;
                  },
                  vanishTextOnSubmit: false),
              const SizedBox(
                height: padding,
              ),
              MyTextField(
                  hint: "Phone",
                  initalText: "",
                  onSubmitText: (String phone) {
                    newDonor.phone = phone;
                  },
                  vanishTextOnSubmit: false),
              const SizedBox(
                height: padding,
              ),
              MyTextField(
                  hint: "Student Id",
                  inputFormat: RegExp(r'[0-9]'),
                  initalText: "",
                  onSubmitText: (String studentId) {
                    newDonor.studentId = studentId;
                  },
                  vanishTextOnSubmit: false),
              const SizedBox(
                height: padding,
              ),
              MyDropDown(
                  hint: "Blood Group",
                  selectedValue: null,
                  onSelected: (String bg) {
                    newDonor.bloodGroup = BadhanConst.bloodGroupId(bg);
                  },
                  list: BadhanConst.bloodGroups),
              const SizedBox(
                height: padding,
              ),
              MyDropDown(
                  hint: "Hall",
                  selectedValue: null,
                  onSelected: (String hall) {
                    newDonor.hall = BadhanConst.hallId(hall);
                  },
                  list: BadhanConst.halls),
              const SizedBox(
                height: padding,
              ),
              MyTextField(
                  hint: "Room",
                  initalText: "",
                  onSubmitText: (String room) {
                    newDonor.roomNumber = room;
                  },
                  vanishTextOnSubmit: false),
              const SizedBox(
                height: padding,
              ),
              MyTextField(
                  hint: "Address",
                  initalText: "",
                  onSubmitText: (String address) {
                    newDonor.address = address;
                  },
                  vanishTextOnSubmit: false),
              const SizedBox(
                height: padding,
              ),
              MyTextField(
                  hint: "Comment",
                  initalText: "",
                  onSubmitText: (String comment) {
                    newDonor.comment = comment;
                  },
                  vanishTextOnSubmit: false),
              const SizedBox(
                height: padding,
              ),
              MyTextField(
                  hint: "Donation count",
                  initalText: "",
                  inputFormat: RegExp(r'[0-9]'),
                  onSubmitText: (String cnt) {
                    newDonor.extraDonationCount = int.parse(cnt);
                  },
                  vanishTextOnSubmit: false),
              const SizedBox(
                height: padding,
              ),
              MyDropDown(
                  hint: "Visibility",
                  selectedValue: null,
                  onSelected: (String visibility) {
                    newDonor.availableToAll =
                        visibility == BadhanConst.visibilites[1];
                  },
                  list: BadhanConst.visibilites),
              const SizedBox(
                height: padding,
              ),
              SizedBox(
                width: double.infinity,
                height: height * 0.05,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).pop(newDonor);
                  },
                  child: const Text("Submit form"),
                ),
              )
            ],
          ),
        ),
      ),
    );
  }
}
