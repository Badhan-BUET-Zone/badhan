import 'package:badhandatainput/model/donor_model.dart';
import 'package:badhandatainput/constant/badhan_constants.dart';
import 'package:badhandatainput/widget/common/dialog_topbar.dart';
import 'package:badhandatainput/widget/common/my_dropdown_list.dart';
import 'package:badhandatainput/widget/common/my_text_field.dart';
import 'package:flutter/material.dart';

class EditableDonorDialog extends StatefulWidget {
  const EditableDonorDialog({Key? key, this.donorData}) : super(key: key);

  final NewDonor? donorData;

  @override
  State<EditableDonorDialog> createState() => _EditableDonorDialogState();
}

class _EditableDonorDialogState extends State<EditableDonorDialog> {
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

  @override
  void initState() {
    super.initState();
    if (widget.donorData != null) {
      newDonor = NewDonor(
          phone: widget.donorData!.phone,
          bloodGroup: widget.donorData!.bloodGroup,
          hall: widget.donorData!.hall,
          name: widget.donorData!.name,
          studentId: widget.donorData!.studentId,
          address: widget.donorData!.address,
          roomNumber: widget.donorData!.roomNumber,
          availableToAll: widget.donorData!.availableToAll,
          comment: widget.donorData!.comment,
          extraDonationCount: widget.donorData!.extraDonationCount);
    }
  }

  @override
  Widget build(BuildContext context) {
    double height = MediaQuery.of(context).size.height;
    const double padding = 10;
    return SizedBox(
      width: MediaQuery.of(context).size.width * .3,
      child: ListView(
        //mainAxisSize: MainAxisSize.min,
        shrinkWrap: true,
        children: [
          DialogTopBar(title: !editable() ? "Add Donor" : "Edit Donor", minimizable: true,),
          MyTextField(
              hint: "Name",
              initalText: editable() ? widget.donorData!.name : "",
              onSubmitText: (String name) {
                newDonor.name = name;
              },
              vanishTextOnSubmit: false),
          const SizedBox(
            height: padding,
          ),
          MyTextField(
              hint: "Phone",
              initalText: editable() ? widget.donorData!.phone : "",
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
              initalText: editable() ? widget.donorData!.studentId : "",
              onSubmitText: (String studentId) {
                newDonor.studentId = studentId;
              },
              vanishTextOnSubmit: false),
          const SizedBox(
            height: padding,
          ),
          MyDropDown(
              hint: "Blood Group",
              selectedValue: editable()
                  ? BadhanConst.bloodGroup(widget.donorData!.bloodGroup)
                  : null,
              onSelected: (String bg) {
                newDonor.bloodGroup = BadhanConst.bloodGroupId(bg);
              },
              list: BadhanConst.bloodGroups),
          const SizedBox(
            height: padding,
          ),
          MyDropDown(
              hint: "Hall",
              selectedValue:
                  editable() ? BadhanConst.hall(widget.donorData!.hall) : null,
              onSelected: (String hall) {
                newDonor.hall = BadhanConst.hallId(hall);
              },
              list: BadhanConst.halls),
          const SizedBox(
            height: padding,
          ),
          MyTextField(
              hint: "Room",
              initalText: editable() ? widget.donorData!.roomNumber : "",
              onSubmitText: (String room) {
                newDonor.roomNumber = room;
              },
              vanishTextOnSubmit: false),
          const SizedBox(
            height: padding,
          ),
          MyTextField(
              hint: "Address",
              initalText: editable() ? widget.donorData!.address : "",
              onSubmitText: (String address) {
                newDonor.address = address;
              },
              vanishTextOnSubmit: false),
          const SizedBox(
            height: padding,
          ),
          MyTextField(
              hint: "Comment",
              initalText: editable() ? widget.donorData!.comment : "",
              onSubmitText: (String comment) {
                newDonor.comment = comment;
              },
              vanishTextOnSubmit: false),
          const SizedBox(
            height: padding,
          ),
          MyTextField(
              hint: "Donation count",
              initalText:
                  editable() ? "${widget.donorData!.extraDonationCount}" : "",
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
              selectedValue: editable()
                  ? BadhanConst
                      .visibilites[widget.donorData!.availableToAll ? 1 : 0]
                  : null,
              onSelected: (String visibility) {
                newDonor.availableToAll = visibility == BadhanConst.visibilites[1];
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
              child: Text(!editable() ? "Add" : "Done"),
            ),
          )
        ],
      ),
    );
  }

  bool editable() {
    return widget.donorData != null;
  }
}
