import 'package:badhandatainput/model/donor_model.dart';
import 'package:badhandatainput/util/badhan_constants.dart';
import 'package:badhandatainput/util/debug.dart';
import 'package:badhandatainput/widget/common/profile_picture.dart';
import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';

import 'editable_donor_diaglog.dart';

// ignore: must_be_immutable
class DonorCard extends StatefulWidget {
  DonorCard({Key? key, required this.newDonor}) : super(key: key);

  NewDonor newDonor;

  @override
  State<DonorCard> createState() => _DonorCardState();
}

class _DonorCardState extends State<DonorCard> {
  static String tag = "DonorCard";
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
                    name: makeTwoWordBloodGroup(widget.newDonor.bloodGroup),
                    radius: 18,
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
                          child: Icon(
                            FontAwesomeIcons.edit,
                            color: Colors.grey[600],
                            size: 20,
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
                /* TextButton(onPressed: () {}, child: const Text("Delete")),
                const SizedBox(
                  width: 8,
                ), */
                OutlinedButton(
                  onPressed: () {
                    //Log.d(DonorCard.tag, 'hi');
                  },
                  child: const Text(
                    "Submit",
                    style: TextStyle(color: Colors.green),
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
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String makeTwoWordBloodGroup(int bdId) {
    String bg = BadhanConst.bloodGroup(widget.newDonor.bloodGroup);
    int idx = bg.indexOf(RegExp("[+-]"));
    bg = bg.substring(0, idx) + " " + bg.substring(idx);
    return bg;
  }
}
