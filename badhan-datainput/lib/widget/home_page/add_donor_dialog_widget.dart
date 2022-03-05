import 'package:badhandatainput/model/donor_model.dart';
import 'package:badhandatainput/util/badhan_constants.dart';
import 'package:badhandatainput/widget/common/dialog_topbar.dart';
import 'package:badhandatainput/widget/common/my_dropdown_list.dart';
import 'package:badhandatainput/widget/common/my_text_field.dart';
import 'package:flutter/material.dart';

class AddOrEditDonorWidget extends StatefulWidget {
  AddOrEditDonorWidget({Key? key, this.newDonor}) : super(key: key);

  NewDonor? newDonor;

  @override
  State<AddOrEditDonorWidget> createState() => _AddOrEditDonorWidgetState();
}

class _AddOrEditDonorWidgetState extends State<AddOrEditDonorWidget> {
  @override
  Widget build(BuildContext context) {
    return Container();
  }
}

class EditDonorWidget extends StatefulWidget {
  const EditDonorWidget({Key? key, required this.newDonor}) : super(key: key);

  final NewDonor newDonor;

  @override
  State<EditDonorWidget> createState() => _EditDonorWidgetState();
}

class _EditDonorWidgetState extends State<EditDonorWidget> {
  @override
  Widget build(BuildContext context) {
    return Container();
  }
}

class AddDonorDialog extends StatefulWidget {
  const AddDonorDialog({Key? key}) : super(key: key);

  @override
  State<AddDonorDialog> createState() => _AddDonorDialogState();
}

class _AddDonorDialogState extends State<AddDonorDialog> {
  @override
  Widget build(BuildContext context) {
    double height = MediaQuery.of(context).size.height;
    const double padding = 10;
    return Container(
      width: MediaQuery.of(context).size.width * .3,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const DialogTopBar(title: "Add Donor"),
          MyTextField(
              hint: "Name",
              onSubmitText: (String name) {},
              vanishTextOnSubmit: true),
          const SizedBox(
            height: padding,
          ),
          MyTextField(
              hint: "Phone",
              onSubmitText: (String name) {},
              vanishTextOnSubmit: true),
          const SizedBox(
            height: padding,
          ),
          MyTextField(
              hint: "Student Id",
              onSubmitText: (String name) {},
              vanishTextOnSubmit: true),
          const SizedBox(
            height: padding,
          ),
          MyDropDown(
              hint: "Blood Group",
              onSelected: (String bg) {},
              list: BadhanConst.bloodGroups),
          const SizedBox(
            height: padding,
          ),
          MyDropDown(
              hint: "Hall",
              onSelected: (String bg) {},
              list: BadhanConst.halls),
          const SizedBox(
            height: padding,
          ),
          MyTextField(
              hint: "Room",
              onSubmitText: (String name) {},
              vanishTextOnSubmit: true),
          const SizedBox(
            height: padding,
          ),
          MyTextField(
              hint: "Address",
              onSubmitText: (String name) {},
              vanishTextOnSubmit: true),
          const SizedBox(
            height: padding,
          ),
          MyTextField(
              hint: "Comment",
              onSubmitText: (String name) {},
              vanishTextOnSubmit: true),
          const SizedBox(
            height: padding,
          ),
          MyTextField(
              hint: "Donation count",
              onSubmitText: (String name) {},
              vanishTextOnSubmit: true),
          const SizedBox(
            height: padding,
          ),
          SizedBox(
            width: double.infinity,
            height: height * 0.05,
            child: ElevatedButton(
              onPressed: () {
                ///_saveForm(context);
              },
              child: const Text("ADD"),
            ),
          )
        ],
      ),
    );
  }
}
