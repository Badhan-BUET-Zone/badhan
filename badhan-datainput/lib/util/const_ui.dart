import 'package:flutter/material.dart';

import '../widget/responsive.dart';

class ConstUI{
  static void showErrorToast(BuildContext context,Function before, String msg, ) {
    before(); // clear all data in the UI

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        duration: const Duration(seconds: 5),
        // width: MediaQuery.of(context).size.width * 0.2,
        margin: EdgeInsets.only(
            left: responsiveSnackbarMargin(context),
            right: 20,
            bottom: 20),
        behavior: SnackBarBehavior.floating,
        content: Text(msg),
        backgroundColor: Colors.red,
      ),
    );
  }

  static void showToast(
    BuildContext context,
    Function before,
    String msg,
    Color backgroundColor,
    Color textColor
  ) {
    before(); // clear all data in the UI

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        duration: const Duration(seconds: 4),
        // width: MediaQuery.of(context).size.width * 0.2,
        margin: EdgeInsets.only(
            left: responsiveSnackbarMargin(context), right: 20, bottom: 20),
        behavior: SnackBarBehavior.floating,
        content: Text(msg, style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: textColor),),
        backgroundColor: backgroundColor,
      ),
    );
  }

  static double responsiveSnackbarMargin(BuildContext context) {
    double width = MediaQuery.of(context).size.width;
    if (Responsive.isMobile(context)) {
      return width * 0.4;
    } else if (Responsive.isTablet(context)) {
      return width * 0.6;
    } else {
      return width * 0.7;
    }
  }
}