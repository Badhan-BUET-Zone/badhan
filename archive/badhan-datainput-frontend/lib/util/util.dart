import 'package:flutter/material.dart';
import '../widget/home_page/donor_card.dart';
import 'const_ui.dart';

class Util {
  /// submit all the new donors to the server
  static void submitAll(BuildContext context, List<DonorCard> donorCardList){
    if (donorCardList.isEmpty) {
      ConstUI.showErrorToast(context, () {}, "No new donors to upload.");
      return;
    }

    for (DonorCard donor in donorCardList) {
      // donor.upload();
      if (donor.submissionSection != null) {
        donor.submissionSection!.submit();
      }
    }
  }
}


