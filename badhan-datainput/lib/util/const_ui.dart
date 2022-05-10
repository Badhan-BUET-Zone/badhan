import 'package:flutter/material.dart';

class ConstUI{
  static void showErrorToast(BuildContext context,Function before, String msg, ) {
    before(); // clear all data in the UI

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        duration: const Duration(seconds: 5),
        // width: MediaQuery.of(context).size.width * 0.2,
        margin: EdgeInsets.only(
            left: MediaQuery.of(context).size.width * 0.7,
            right: 20,
            bottom: 20),
        behavior: SnackBarBehavior.floating,
        content: Text(msg),
        backgroundColor: Colors.red,
      ),
    );
  }
}