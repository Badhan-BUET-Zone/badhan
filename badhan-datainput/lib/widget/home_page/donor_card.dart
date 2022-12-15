import 'package:badhandatainput/model/donor_model.dart';
import 'package:badhandatainput/constant/badhan_constants.dart';
import 'package:badhandatainput/util/custom_exceptions.dart';
import 'package:badhandatainput/util/debug.dart';
import 'package:badhandatainput/util/environment.dart';
import 'package:badhandatainput/widget/common/date_time_pickers.dart';
import 'package:badhandatainput/widget/common/profile_picture.dart';
import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../model/provider_response_model.dart';
import '../../provider/donor_data_provider.dart';
import 'editable_donor_diaglog.dart';

// ignore: must_be_immutable
class DonorCard extends StatefulWidget {
  DonorCard({Key? key, required this.newDonor, required this.lastDonation})
      : super(key: key) {
    submissionSection = SubmissionSection(
      newDonor: newDonor,
      lastDonation: lastDonation,
    );
  }

  NewDonor newDonor; // can't be final as it is editable here
  DateTime? lastDonation;
  SubmissionSection? submissionSection;

  @override
  State<DonorCard> createState() => _DonorCardState();
}

class _DonorCardState extends State<DonorCard> {
  static String tag = "DonorCard";

  @override
  Widget build(BuildContext context) {
    // Log.d(tag, "building donor card");
    ThemeData themeData = Theme.of(context);
    TextTheme textTheme = themeData.textTheme;
    //widget.submissionSection = SubmissionSection(
    // newDonor: widget.newDonor, lastDonation: widget.lastDonation);

    return Card(
      child: Container(
        padding: const EdgeInsets.all(15),
        child: Column(
          children: [
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Column(
                mainAxisAlignment: MainAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  ProfilePictureFromName(
                    showFullText: true,
                    name: BadhanConst.bloodGroup(widget.newDonor.bloodGroup),
                    radius: 20,
                    fontsize: 12.0,
                    characterCount: 2,
                    random: false,
                    defaultColor: Theme.of(context).primaryColor,
                  ),
                ],
              ),
              const SizedBox(
                width: 15,
              ),
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          widget.newDonor.name,
                          style: textTheme.titleSmall
                              ?.copyWith(fontWeight: FontWeight.bold),
                        ),
                        InkWell(
                          onTap: () async {
                            NewDonor? donorData = await showDialog(
                                context: context,
                                builder: (context) {
                                  return AlertDialog(
                                    content: EditableDonorDialog(
                                      donorData: widget.newDonor,
                                    ),
                                  );
                                });
                            if (donorData != null) {
                              setState(() {
                                Log.d(tag, "Donor name: ${donorData.name}");
                                Log.d(tag,
                                    "donation cnt : ${donorData.extraDonationCount}");
                                widget.newDonor = donorData;
                                widget.submissionSection!.newDonor = donorData;
                                widget.submissionSection!.redraw();
                              });
                            }
                          },
                          child: Tooltip(
                            message: "Edit donor info",
                            child: Icon(
                              FontAwesomeIcons.edit,
                              color: Colors.grey[600],
                              size: 20,
                            ),
                          ),
                        )
                      ],
                    ),
                    Row(
                      children: [
                        Text(
                          "${widget.newDonor.studentId} • ${widget.newDonor.extraDonationCount} donations • ",
                          style: TextStyle(
                              color: Colors.grey[600], fontSize: 12.0),
                        ),
                        Icon(
                          widget.newDonor.availableToAll
                              ? Icons.public
                              : Icons.lock,
                          size: 12.0,
                          color: Colors.grey[600],
                        )
                      ],
                    ),
                    const SizedBox(
                      height: 8,
                    ),
                    Text("Hall: ${BadhanConst.hall(widget.newDonor.hall)}"),
                    Text("Room: ${widget.newDonor.roomNumber}"),
                    Text("Address: ${widget.newDonor.address}"),
                    Text("Contact: ${widget.newDonor.phone}"),
                    Text("Comment: ${widget.newDonor.comment}"),
                    Row(
                      children: [
                        const Text("Last Donation:"),
                        DateInputWidget(
                          initialDate: widget.lastDonation,
                          onDateSelect: (DateTime date) {
                            setState(() {
                              widget.lastDonation = date;
                            });
                          },
                        )
                      ],
                    ),
                    const SizedBox(
                      height: 8,
                    ),
                  ],
                ),
              )
            ]),
            // submit button with submission logic and ui update
            /* SubmissionSection(
              newDonor: widget.newDonor,
              lastDonation: widget.lastDonation,
            ), */
            if (widget.submissionSection != null) widget.submissionSection!,
          ],
        ),
      ),
    );
  }
}

class SubmissionSection extends StatefulWidget {
  SubmissionSection({
    Key? key,
    required this.newDonor,
    required this.lastDonation,
  }) : super(key: key);

  NewDonor newDonor;
  final DateTime? lastDonation;
  _SubmissionSectionState? state;

  void redraw() {
    state?.redraw();
  }

  void submit() async {
    if (state != null) {
      state!.upload();
    } else {
      Log.d("SubmissionSection->", "state is null for ${newDonor.name}");
    }
  }

  @override
  //State<SubmissionSection> createState() => _SubmissionSectionState();
  State<SubmissionSection> createState() {
    return state = _SubmissionSectionState();
  }
}

class _SubmissionSectionState extends State<SubmissionSection> {
  static String tag = "SubmissionSection";
  static String donorCreatedSuccessfully = "Donor created successfully!";

  String? donorId;
  DonorData? duplicateDonorData;

  bool isDataValid = false;

  // state variables for ui update
  String submissionStatusText = "";
  Color submissionStatusTextColor = Colors.blue; // default color

  String buttonText = "Submit";
  Color buttonDataColor = Colors.green;

  bool isLoding = false; // for loading animation
  bool foundDuplicate = false; // for duplicate donor check
  bool submitButtonEnabled = true; // for submit button

  @override
  void initState() {
    super.initState();
    checkDuplicate();
    vallidateData();
  }

  void redraw() {
    setState(() {});
  }

  void checkDuplicate() {
    //Log.d(tag, "checkDuplicate ${widget.newDonor.extraDonationCount}");
    // https://github.com/Badhan-BUET-Zone/badhan-datainput/issues/21
    if (widget.lastDonation != null &&
        widget.newDonor.extraDonationCount == 0) {
      Log.d(tag, "donation cnt : ${widget.newDonor.extraDonationCount}");
      submissionStatusText = "Error! Total donation must be equal 1 or more";
      submissionStatusTextColor = Colors.red;
      buttonText = "Submit";
      buttonDataColor = Colors.green;
      isDataValid = false;
    } else if (submissionStatusText.contains("Error! Total")) {
      submissionStatusText = "";
      submissionStatusTextColor = Colors.green;
      buttonText = "Submit";
      buttonDataColor = Colors.green;
      isDataValid = false;
      foundDuplicate = false;
    }
  }

  bool vallidateData() {
    NewDonor newDonor = widget.newDonor;
    String errorText = "";

    // phone number constrainsts ==========
    if (newDonor.phone.length != 13) {
      errorText += "Phone length must be of 13 digits.";
    }

    // name constrains =============
    if (newDonor.name.length < 3 || newDonor.name.length > 500) {
      errorText += "\nName length must be between 3 and 500";
    }

    // student id contraints=========
    if (newDonor.studentId.length != 7) {
      errorText += "\nStudent Id must be of 7 digits.";
    }

    // room number constraints =============
    if (newDonor.roomNumber.length < 2 || newDonor.roomNumber.length > 500) {
      errorText += "\nRoom number length must be between 2 and 500";
    }

    // address constraints =============
    if (newDonor.address.length < 2 || newDonor.address.length > 500) {
      errorText += "\nAddress length must be between 2 and 500";
    }

    // comment constraints ==============
    if (newDonor.comment.length < 2 || newDonor.comment.length > 500) {
      errorText += "\nComment length must be between 2 and 500";
    }

    // donation count constrainst
    if (newDonor.extraDonationCount < 0) {
      errorText += "\nDonation count can't be negative!";
    }

    // https://github.com/Badhan-BUET-Zone/badhan-datainput/issues/21
    // last donation date must be specified if the donation count does not equal to zero.
    if (newDonor.extraDonationCount > 0 && widget.lastDonation == null) {
      errorText +=
          "\nDonation count is more than zero. Please select the donation date!";
    }

    // https://github.com/Badhan-BUET-Zone/badhan-datainput/issues/21
    if (widget.lastDonation != null &&
        widget.newDonor.extraDonationCount == 0) {
      errorText += "\nTotal donation must be equal 1 or more";
    }

    if (errorText.isNotEmpty) {
      setState(() {
        isLoding = false; // stop laoding animation
        submitButtonEnabled = false;
        foundDuplicate = false;
        submissionStatusText = errorText;
        submissionStatusTextColor = Colors.red;
        buttonDataColor = Colors.green;
        buttonText = "Submit";
        Log.d(tag, "${newDonor.name}'s data is not valid");
        Log.d(tag, "error: $errorText");
      });
      return false;
    }

    setState(() {
      //Log.d(tag, "${newDonor.name}'s data is valid");
      submitButtonEnabled = true;
      submissionStatusTextColor = Colors.green;
      buttonDataColor = Colors.green;
      buttonText = "Submit";
    });

    return true;
  }

  /// check if the donor is already created
  bool donorCreated() {
    bool status = submissionStatusText == donorCreatedSuccessfully;
    if (status) {
      redirectToDuplicateDonor();
    }
    return status;
  }

  /// redirect to the donor details page
  /// in the main website
  void redirectToDuplicateDonor() async {
    if (donorId != null) {
      String url = "${Environment.mainWebsite}/#/home/details?id=$donorId";
      Log.d(tag, "redirecting user to: $url");
      if (!await launch(url)) throw 'Could not launch $url';
    }
  }

  void upload() async {
    // check if duplicated donor is found
    // of donor is already created in previous submission:
    // 2nd is possible when you submit all multiple times
    if (foundDuplicate || donorCreated()) {
      Log.d(tag, "found duplicate donor!");
      return;
    }

    // uploading is in progress
    if (isLoding) {
      return;
    }

    // uploading started
    setState(() {
      isLoding = true;
      submissionStatusText = "";
    });

    // fontend validation ================================
    isDataValid = vallidateData();

    if (!isDataValid) {
      setState(() {
        isLoding = false;
        foundDuplicate = false;
        buttonDataColor = Colors.green;
        buttonText = "Submit";
      });
      return;
    }

    // input data format is ok for submission ==========================
    ProviderResponse response =
        await Provider.of<DonorDataProvider>(context, listen: false)
            .createDonor(widget.newDonor);

    if (!response.success && response.data != null) {
      donorId = response.data;
      setState(() {
        isLoding = false;
        foundDuplicate = true;
        submissionStatusText = response.message;
        submissionStatusTextColor = Colors.red;
        buttonDataColor = Colors.red;
        buttonText = "See Duplicate";
      });
    } else if (response.success && response.data != null) {
      DonorData donorData = response.data;
      donorId = donorData.id;
      setState(() {
        isLoding = false;
        foundDuplicate = false;
        submissionStatusTextColor = Colors.green;
        submissionStatusText = donorCreatedSuccessfully;
        buttonText = "See Donor";
      });
    } else {
      setState(() {
        isLoding = false;
        foundDuplicate = false;
        submissionStatusText = response.message;
        submissionStatusTextColor = Colors.red;
        buttonDataColor = Colors.green;
        buttonText = "Submit";
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    checkDuplicate();
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: Padding(
              padding: const EdgeInsets.only(left: 54),
              child: Text(
                submissionStatusText,
                style: TextStyle(color: submissionStatusTextColor),
              )),
        ),
        const SizedBox(
          width: 2,
        ),
        OutlinedButton.icon(
          onPressed: foundDuplicate ? redirectToDuplicateDonor : upload,
          icon: isLoding
              ? SizedBox(
                  child: CircularProgressIndicator(
                    color: buttonDataColor,
                    strokeWidth: 2.0,
                  ),
                  height: 10,
                  width: 10,
                )
              : Icon(
                  foundDuplicate ? Icons.copy : Icons.file_upload_outlined,
                  color: buttonDataColor,
                  size: 17.0,
                ),
          label: Text(
            buttonText,
            style: TextStyle(color: buttonDataColor),
          ),
          style: ButtonStyle(
            overlayColor: MaterialStateProperty.resolveWith<Color?>(
              (Set<MaterialState> states) {
                if (states.contains(MaterialState.hovered)) {
                  return buttonDataColor.withOpacity(0.04);
                }
                if (states.contains(MaterialState.focused) ||
                    states.contains(MaterialState.pressed)) {
                  return buttonDataColor.withOpacity(0.12);
                }
                return null; // Defer to the widget's default.
              },
            ),
          ),
        ),
      ],
    );
  }
}
