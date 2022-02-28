import 'dart:html';

import 'package:flutter/material.dart';

class LandingPage extends StatelessWidget {
  const LandingPage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
          child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Image.network(
            "https://badhan-buet.web.app/img/badhanlogo.d2a732ea.png",
            height: 250,
            headers: const {
              'access-control-allow-origin': '*',
            },
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
            onPressed: () {
              window.open("https://badhan-buet.web.app/#/about", "_blank");
            },
            child: Text("VISIT OFFICIAL WEBSITE"),
          ),
        ],
      )),
    );
  }
}
