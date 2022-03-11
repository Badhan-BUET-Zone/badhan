import 'package:badhandatainput/model/donor_model.dart';
import 'package:badhandatainput/util/badhan_constants.dart';
import 'package:badhandatainput/util/debug.dart';
import 'package:badhandatainput/util/environment.dart';
import 'package:badhandatainput/widget/common/date_time_pickers.dart';
import 'package:badhandatainput/widget/common/profile_picture.dart';
import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../model/provider_response_model.dart';
import '../../provider/donor_data_provider.dart';
import 'editable_donor_diaglog.dart';

// ignore: must_be_immutable
class DonorCard extends StatefulWidget {
  DonorCard({Key? key, required this.newDonor, required this.lastDonation})
      : super(key: key);

  NewDonor newDonor; // can't be final as it is editable here
  DateTime? lastDonation;

  @override
  State<DonorCard> createState() => _DonorCardState();
}

class _DonorCardState extends State<DonorCard> {
  static String tag = "DonorCard";
  final DateFormat _dateFormat = DateFormat("dd-MMM-yyyy");

  @override
  Widget build(BuildContext context) {
    ThemeData themeData = Theme.of(context);
    TextTheme textTheme = themeData.textTheme;

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
                                Log.d(tag, donorData.name);
                                widget.newDonor = donorData;
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
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                _SubmitButton(
                  newDonor: widget.newDonor,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SubmitButton extends StatefulWidget {
  const _SubmitButton({
    Key? key,
    required this.newDonor,
  }) : super(key: key);

  final NewDonor newDonor;

  @override
  State<_SubmitButton> createState() => _SubmitButtonState();
}

class _SubmitButtonState extends State<_SubmitButton> {
  static String tag = "SubmitButton";
  bool isLoding = false;
  bool foundDuplicate = false;
  DonorData? duplicateDonorData;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: () async {
        if (isLoding) {
          return;
        }

        // if duplicate donor found
        if (foundDuplicate) {
          // then open url in main site
          // home/details?id=5e677716ca2dc857938d7c73
          String url =
              "${Environment.mainWebsite}/#/home/details?id=${duplicateDonorData!.id}";
          Log.d(tag, "opening: $url");
          if (!await launch(url)) throw 'Could not launch $url';
          return;
        }

        setState(() {
          isLoding = true;
        });
        duplicateDonorData = await _checkDuplicate(widget.newDonor.phone);
        setState(() {
          isLoding = false;
          foundDuplicate = duplicateDonorData != null;
        });
      },
      icon: isLoding
          ? const SizedBox(
              child: CircularProgressIndicator(
                color: Colors.green,
                strokeWidth: 2.0,
              ),
              height: 10,
              width: 10,
            )
          : Icon(
              foundDuplicate ? Icons.copy : Icons.file_upload_outlined,
              color: Colors.green,
              size: 17.0,
            ),
      label: Text(
        foundDuplicate ? "See duplicate" : "Submit",
        style: const TextStyle(color: Colors.green),
      ),
      style: ButtonStyle(
        overlayColor: MaterialStateProperty.resolveWith<Color?>(
          (Set<MaterialState> states) {
            if (states.contains(MaterialState.hovered)) {
              return Colors.green.withOpacity(0.04);
            }
            if (states.contains(MaterialState.focused) ||
                states.contains(MaterialState.pressed)) {
              return Colors.green.withOpacity(0.12);
            }
            return null; // Defer to the widget's default.
          },
        ),
      ),
    );
  }

  Future<DonorData?> _checkDuplicate(String phone) async {
    ProviderResponse providerResponse =
        await Provider.of<DonorDataProvider>(context, listen: false)
            .checkDuplicate(phone);
    return providerResponse.success ? providerResponse.data : null;
  }
}
