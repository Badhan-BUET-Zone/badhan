import 'package:badhandatainput/util/environment.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../util/debug.dart';

class AuthFailedWidget extends StatelessWidget {
  static String tag = "AuthFailedWidget";
  const AuthFailedWidget({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: MediaQuery.of(context).size.width * 0.3,
        child: RichText(
          text: TextSpan(
            style: const TextStyle(color: Colors.grey, fontSize: 20.0),
            children: [
            const TextSpan(text: "Please authenticate from the "),
            TextSpan(
              text: "Badhan BUET Zone app",
              style: const TextStyle(color: Colors.blue),
              // https://stackoverflow.com/questions/58145606/make-specific-parts-of-a-text-clickable-in-flutter
              recognizer: TapGestureRecognizer()
                ..onTap = () async {
                  String url = "${Environment.mainWebsite}/#/home";
                  Log.d(tag, "opening: $url");
                  if (!await launch(url)) throw 'Could not launch $url';
                },
            ),
            const TextSpan(
                text:
                    " to use this site. Go to App > Donor Creation > Advanced Donor Creation."),
          ]),
        ),
      ),
    );
  }
}
