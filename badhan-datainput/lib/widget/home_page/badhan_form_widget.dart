import 'package:badhandatainput/util/const_ui.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../config/routes.dart';
import '../../util/environment.dart';

class BadhanFormWidget extends StatefulWidget {
  const BadhanFormWidget({
    Key? key,
  }) : super(key: key);

  @override
  _BadhanFormWidgetState createState() => _BadhanFormWidgetState();
}

class _BadhanFormWidgetState extends State<BadhanFormWidget> {
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Card(
          child: Container(
            // top upload all bar
            width: double.infinity,
            margin: const EdgeInsets.symmetric(
              horizontal: 4,
            ),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
            color: Colors.white,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        Text(
                          "Copy form link",
                          style: Theme.of(context).textTheme.titleSmall,
                        ),
                        const SizedBox(width: 4),
                        InkWell(
                          onTap: () {
                            Clipboard.setData(ClipboardData(
                                text:
                                    "${Environment.badhanDataInputWebsite}/#${MyFluroRouter.badhanFormPage}"));
                            ConstUI.showToast(
                                context,
                                () {},
                                "Link copied to clipboard",
                                Colors.black,
                                Colors.white);
                          },
                          child: const Icon(
                            Icons.copy,
                            color: Colors.black,
                            size: 16,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                Tooltip(
                  message: kIsWeb
                      ? "Open badhan form in a new tab."
                      : "Open badhan form",
                  child: TextButton.icon(
                    icon: const Icon(Icons.file_upload_outlined),
                    label: const Text("Open badhan form"),
                    onPressed: () async {
                      String url =
                          "${Environment.badhanDataInputWebsite}/#${MyFluroRouter.badhanFormPage}";
                      if (kIsWeb) {
                        // if the plaftorm is web

                        if (!await launch(url)) throw 'Could not launch $url';
                      } else {
                        if (!await launch(url)) throw 'Could not launch $url';
                      }
                    },
                  ),
                )
              ],
            ),
          ),
        ),
      ],
    );
  }
}
