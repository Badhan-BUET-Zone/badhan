import 'package:badhandatainput/model/donor_model.dart';
import 'package:badhandatainput/util/badhan_constants.dart';
import 'package:badhandatainput/widget/common/profile_picture.dart';
import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';

class DonorCard extends StatelessWidget {
  const DonorCard({Key? key, required this.newDonor}) : super(key: key);

  final NewDonor newDonor;

  @override
  Widget build(BuildContext context) {
    ThemeData themeData = Theme.of(context);
    TextTheme textTheme = themeData.textTheme;

    return Card(
      child: Container(
        padding: const EdgeInsets.all(15),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Column(
            mainAxisAlignment: MainAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              ProfilePictureFromName(
                name: makeTwoWordBloodGroup(newDonor.bloodGroup),
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
          Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.start,
            children: [
              Text(
                newDonor.name,
                style: textTheme.titleSmall,
              ),
              Row(
                children: [
                  Text(
                    "${newDonor.extraDonationCount} donations • ",
                    style: TextStyle(color: Colors.grey[600], fontSize: 12.0),
                  ),
                  Icon(
                    newDonor.availableToAll ? Icons.public : Icons.lock,
                    size: 12.0,
                    color: Colors.grey[600],
                  )
                ],
              ),
              Text("Hall: ${BadhanConst.hall(newDonor.hall)}"),
              Text("Room: ${newDonor.roomNumber}"),
              Text("Address: ${newDonor.address}"),
              Text("Contact: ${newDonor.phone}"),
            ],
          )
        ]),
      ),
    );
  }

  String makeTwoWordBloodGroup(int bdId) {
    String bg = BadhanConst.bloodGroup(newDonor.bloodGroup);
    int idx = bg.indexOf(RegExp("[+-]"));
    bg = bg.substring(0, idx) + " " + bg.substring(idx);
    return bg;
  }
}
