import 'package:flutter/material.dart';
import 'package:flutter_staggered_grid_view/flutter_staggered_grid_view.dart';

import '../../model/donor_model.dart';
import '../home_page/donor_card.dart';
import '../responsive.dart';

class AllDonorsWidget extends StatelessWidget {
  const AllDonorsWidget({
    Key? key,
    required this.newDonorList,
    required this.lastDonationMap,
  }) : super(key: key);

  final List<NewDonor> newDonorList;
  final Map<String, DateTime> lastDonationMap;

  @override
  Widget build(BuildContext context) {
    bool isDesktop = Responsive.isDesktop(context);
    return Expanded(
      // list of all donors
      child: SizedBox(
          //color: Colors.red,
          width: double.infinity,
          //child: SingleChildScrollView(child: SelectableText(msg))),
          child: !isDesktop
              ? ListView.builder(
                  // for mobile and tablet
                  controller: ScrollController(),
                  shrinkWrap: true,
                  itemCount: newDonorList.length,
                  itemBuilder: (context, index) {
                    NewDonor donor = newDonorList[index];
                    return DonorCard(
                      newDonor: donor,
                      lastDonation: lastDonationMap[donor.phone],
                    );
                  },
                )
              : SingleChildScrollView(
                  controller: ScrollController(),
                  // for desktop show in gribview
                  child: StaggeredGrid.count(
                    crossAxisCount: 2,
                    children: newDonorList.map((e) {
                      return DonorCard(
                        newDonor: e,
                        lastDonation: lastDonationMap[e.phone],
                      );
                    }).toList(),
                  ),
                )),
    );
  }
}
