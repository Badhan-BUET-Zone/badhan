import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';

class DialogTopBar extends StatelessWidget {
  const DialogTopBar({
    Key? key,
    required this.title,
  }) : super(key: key);

  final String title;

  @override
  Widget build(BuildContext context) {
    ThemeData themeData = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(0, 0, 0, 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Text("         "),
          Text(
            title,
            style: themeData.textTheme.headline6
                ?.copyWith(color: themeData.primaryColor),
          ),
          //const Spacer(),
          IconButton(
              onPressed: () {
                Navigator.of(context).pop();
              },
              icon: const Icon(FontAwesomeIcons.timesCircle))
        ],
      ),
    );
  }
}
