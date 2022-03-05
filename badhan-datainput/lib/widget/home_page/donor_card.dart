import 'package:badhandatainput/model/donor_model.dart';
import 'package:badhandatainput/util/badhan_constants.dart';
import 'package:badhandatainput/widget/common/profile_picture.dart';
import 'package:flutter/material.dart';

class DonorCard extends StatelessWidget {
  const DonorCard({Key? key, required this.newDonor}) : super(key: key);

  final NewDonor newDonor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(15),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Column(
          mainAxisAlignment: MainAxisAlignment.start,
          children: [
            ProfilePictureFromName(
              name: makeTwoWordBloodGroup(newDonor.bloodGroup),
              radius: 25,
              fontsize: 16,
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
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.start,
          children: [
            Text(newDonor.name),
            Text(BadhanConst.hall(newDonor.hall)),
            Text(newDonor.roomNumber),
            Text(newDonor.address),
            Text(newDonor.availableToAll.toString()),
            Text(newDonor.phone),
            Text(newDonor.extraDonationCount.toString()),
          ],
        )
      ]),
    );
  }

  String makeTwoWordBloodGroup(int bdId) {
    String bg = BadhanConst.bloodGroup(newDonor.bloodGroup);
    int idx = bg.indexOf(RegExp("[+-]"));
    bg = bg.substring(0, idx) + " " + bg.substring(idx);
    return bg;
  }
}
