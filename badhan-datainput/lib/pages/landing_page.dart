import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class LandingPage extends StatelessWidget {
  const LandingPage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
          child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Image.asset(
            "assets/images/badhanlogo.png",
            width: 200,
            height: 200,
          ),
          Text(
            "Badhan",
            style: Theme.of(context)
                .textTheme
                .headline3
                ?.copyWith(color: Colors.red, fontWeight: FontWeight.bold),
          ),
          Text(
            "BUET Zone",
            style: Theme.of(context)
                .textTheme
                .titleLarge
                ?.copyWith(color: Colors.red),
          ),
          const SizedBox(
            height: 15,
          ),
          ElevatedButton(
            style: ButtonStyle(
              shape: MaterialStateProperty.all<RoundedRectangleBorder>(
                RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(25.0),
                  //side: BorderSide(color: Colors.red)
                ),
              ),
            ),
            onPressed: () async {
              String url = "https://badhan-buet.web.app/#/about";
              //window.open("https://badhan-buet.web.app/#/about", "_blank");

              if (!await launch(url)) throw 'Could not launch $url';
            },
            child: const Text("VISIT OFFICIAL WEBSITE"),
          ),
        ],
      )),
    );
  }
}
