import 'dart:math';

import 'package:flutter/material.dart';

// ignore: must_be_immutable
class ProfilePictureFromName extends StatelessWidget {
  ProfilePictureFromName(
      {Key? key,
      required this.name,
      required this.radius,
      required this.fontsize,
      required this.characterCount,
      this.random,
      this.defaultColor})
      : super(key: key);

  final String name;
  final double radius;
  final double fontsize;
  final int characterCount;

  Color? defaultColor;

  bool? random;

  @override
  Widget build(BuildContext context) {
    return CircleAvatar(
      radius: radius,
      child: Text(
        name == ''
            ? ''
            : InitialName.parseName(name, characterCount)
                .toUpperCase(), // get initial name and set to UpperCase to all letter
        style: TextStyle(
          fontWeight: FontWeight.bold,
          fontSize: fontsize,
          letterSpacing: 1.4,
        ),
      ),
      // set background color
      // default color, random, and fixed color
      // default color if name is empty
      // random color to make the background color change every time the page is refreshed
      backgroundColor: defaultColor ??
          (random == true
              ? randomColor()
              : name == ''
                  ? colorName.colorDefault
                  : fixedColor(
                      InitialName.parseName(name, characterCount),
                    )),
      foregroundColor: Colors.white,
    );
  }
}

class InitialName {
  // @string name
  // @int count (optional) to limit the number of letters that appear
  static String parseName(String name, int? count) {
    // separate each word
    var parts = name.split(' ');
    var initial = '';

    // check length
    if (parts.length > 1) {
      // check max limit
      if (count != null) {
        for (var i = 0; i < count; i++) {
          // combine the first letters of each word
          initial += parts[i][0];
        }
      } else {
        // this default, if word > 1
        initial = parts[0][0] + parts[1][0];
      }
    } else {
      // this default, if word <=1
      initial = parts[0][0];
    }
    return initial;
  }
}

const colorName = ConstantColor();

// generate random color
randomColor() {
  return Color((Random().nextDouble() * 0xFFFFFF).toInt()).withOpacity(1.0);
}

// fixed color based on first leter
fixedColor(String text) {
  var split = text[0].toUpperCase();
  Color data;
  if (split == 'A') {
    data = colorName.colorNameA;
  } else if (split == 'B') {
    data = colorName.colorNameB;
  } else if (split == 'C') {
    data = colorName.colorNameC;
  } else if (split == 'D') {
    data = colorName.colorNameD;
  } else if (split == 'E') {
    data = colorName.colorNameE;
  } else if (split == 'F') {
    data = colorName.colorNameF;
  } else if (split == 'G') {
    data = colorName.colorNameG;
  } else if (split == 'H') {
    data = colorName.colorNameH;
  } else if (split == 'I') {
    data = colorName.colorNameI;
  } else if (split == 'J') {
    data = colorName.colorNameJ;
  } else if (split == 'K') {
    data = colorName.colorNameK;
  } else if (split == 'L') {
    data = colorName.colorNameL;
  } else if (split == 'M') {
    data = colorName.colorNameM;
  } else if (split == 'N') {
    data = colorName.colorNameN;
  } else if (split == 'O') {
    data = colorName.colorNameO;
  } else if (split == 'P') {
    data = colorName.colorNameP;
  } else if (split == 'Q') {
    data = colorName.colorNameQ;
  } else if (split == 'R') {
    data = colorName.colorNameR;
  } else if (split == 'S') {
    data = colorName.colorNameS;
  } else if (split == 'T') {
    data = colorName.colorNameT;
  } else if (split == 'U') {
    data = colorName.colorNameU;
  } else if (split == 'V') {
    data = colorName.colorNameV;
  } else if (split == 'W') {
    data = colorName.colorNameW;
  } else if (split == 'X') {
    data = colorName.colorNameX;
  } else if (split == 'Y') {
    data = colorName.colorNameY;
  } else if (split == 'Z') {
    data = colorName.colorNameY;
  } else {
    data = colorName.colorDefault;
  }
  return data;
}

// define constant color
// each letter has a different color, and is constant.
class ConstantColor {
  final colorNameA = const Color(0xFFAA00FF);
  final colorNameB = const Color(0xFF2196F3);
  final colorNameC = const Color(0xFF1DE9B6);
  final colorNameD = const Color(0xFFCDDC39);
  final colorNameE = const Color(0xFF689F38);
  final colorNameF = const Color(0xFF388E3C);
  final colorNameG = const Color(0xFFF57C00);
  final colorNameH = const Color(0xFFFFA000);
  final colorNameI = const Color(0xFFFBC02D);
  final colorNameJ = const Color(0xFFFFEA00);
  final colorNameK = const Color(0xFFE64A19);
  final colorNameL = const Color(0xFF5D4037);
  final colorNameM = const Color(0xFF7E57C2);
  final colorNameN = const Color(0xFF2196F3);
  final colorNameO = const Color(0xFFAA00FF);
  final colorNameP = const Color(0xFF2196F3);
  final colorNameQ = const Color(0xFF00B0FF);
  final colorNameR = const Color(0xFF00E5FF);
  final colorNameS = const Color(0xFFAA00FF);
  final colorNameT = const Color(0xFF2196F3);
  final colorNameU = const Color(0xFF64DD17);
  final colorNameV = const Color(0xFFAEEA00);
  final colorNameW = const Color(0xFFAA00FF);
  final colorNameX = const Color(0xFFFFAB00);
  final colorNameY = const Color(0xFFAA00FF);
  final colorNameZ = const Color(0xFF2196F3);
  final colorDefault = const Color(0xFF717171);
  const ConstantColor();
}

class MyTooltip extends StatelessWidget {
  final Widget child;
  final String message;

  const MyTooltip({Key? key, required this.message, required this.child}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final key = GlobalKey<State<Tooltip>>();
    return Tooltip(
      key: key,
      // use shape decoration for tooltip border
      decoration: const ShapeDecoration(
        color: Colors.white,
        shape: TooltipBorder(arrowArc: 0.1),
      ),
      textStyle:const TextStyle(
        color: Colors.black,
        fontSize: 10,
      ),
      padding: const EdgeInsets.fromLTRB(10, 5, 10, 5),
      message: message,
      verticalOffset: 25,
      waitDuration: const Duration(seconds: 10),
      // to show tooltip on click
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => _onTap(key),
        child: child,
      ),
    );
  }

  void _onTap(GlobalKey key) {
    final dynamic tooltip = key.currentState;
    tooltip?.ensureTooltipVisible();
  }
}

// create border tooltip
class TooltipBorder extends ShapeBorder {
  final double arrowWidth;
  final double arrowHeight;
  final double arrowArc;
  final double radius;

  const TooltipBorder({
    this.radius = 6.0,
    this.arrowWidth = 20.0,
    this.arrowHeight = 10.0,
    this.arrowArc = 0.0,
  }) : assert(arrowArc <= 1.0 && arrowArc >= 0.0);

  @override
  EdgeInsetsGeometry get dimensions => EdgeInsets.only(bottom: arrowHeight);

  @override
  Path getInnerPath(Rect rect, {TextDirection? textDirection}) {
    return Path();
  }

  @override
  Path getOuterPath(Rect rect, {TextDirection? textDirection}) {
    rect = Rect.fromPoints(
        rect.topLeft, rect.bottomRight - Offset(0, arrowHeight));
    double x = arrowWidth, y = arrowHeight, r = 1 - arrowArc;

    return Path()
      ..addRRect(RRect.fromRectAndRadius(rect, Radius.circular(radius)))
      ..moveTo(rect.topCenter.dx + x / 2, rect.topCenter.dy - x + 25 / 1.25)
      ..relativeLineTo(-x / 2 * r, -y * r)
      ..relativeQuadraticBezierTo(
          -x / 2 * (1 - r), y * (1 - r), -x * (1 - r), 0)
      ..relativeLineTo(-x / 2 * r, y * r);
  }

// set stroke color
  @override
  void paint(Canvas canvas, Rect rect, {TextDirection? textDirection}) {
    Paint paint = Paint()
      ..color = Colors.black
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;

    canvas.drawPath(getOuterPath(rect), paint);
    canvas.clipPath(getOuterPath(rect));
  }

  @override
  ShapeBorder scale(double t) => this;
}

// ignore: must_be_immutable
class ProfilePicture extends StatelessWidget {
  String name;

  // role is optional
  // it will be displayed under name
  String? role;
  double radius;
  double fontsize;

  // tooltip is optional
  // if "true", the tooltip will appear when the user clicks on the image
  bool? tooltip;

  // random is optional
  // if "true", background color will be random
  bool? random;

  // count is optional
  // to limit how many prefix names are displayed.

  int? count;
  // img is optional
  // if "not empty", the background color and initial name will change to image.

  final String? img;
  ProfilePicture({
    Key? key,
    required this.name,
    required this.radius,
    required this.fontsize,
    this.role,
    this.tooltip,
    this.random,
    this.count,
    this.img,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // check tooltip
    if (tooltip == true) {
      // if "true" return tooptip
      return MyTooltip(
        // when the user clicks on the profile picture, a message will appear
        // check if role is empty or not
        // if not add \n to create a break row
        message: role == '' ? name : name + '\n' + (role ?? ""),
        //  thrown into the avatar class.
        child: Avatar(
          radius: radius,
          name: name,
          fontsize: fontsize,
          random: random,
          count: count,
          img: img,
        ),
      );
    } else {
      // if "false" directly return to the avatar class
      return Avatar(
        radius: radius,
        name: name,
        fontsize: fontsize,
        random: random,
        count: count,
        img: img,
      );
    }
  }
}

// ignore: must_be_immutable
class Avatar extends StatelessWidget {
  Avatar({
    Key? key,
    required this.radius,
    required this.name,
    required this.fontsize,
    this.random,
    this.count,
    this.img,
  }) : super(key: key);

  final double radius;
  final String name;
  final double fontsize;
  bool? random;
  int? count;
  String? img;

  @override
  Widget build(BuildContext context) {
    // check image is available or not.
    return img == null
        ? NoImage(
            radius: radius,
            name: name,
            count: count!,
            fontsize: fontsize,
            random: random!)
        : WithImage(radius: radius, img: img!);
  }
}

// if image available
class WithImage extends StatelessWidget {
  const WithImage({
    Key? key,
    required this.radius,
    required this.img,
  }) : super(key: key);

  final double radius;
  final String img;

  @override
  Widget build(BuildContext context) {
    // thrown into the circle avatar class.
    return CircleAvatar(
      radius: radius,
      // use background image
      backgroundImage: NetworkImage(img),
      // set background color transparent
      backgroundColor: Colors.transparent,
    );
  }
}

// if no image
class NoImage extends StatelessWidget {
  const NoImage({
    Key? key,
    required this.radius,
    required this.name,
    required this.count,
    required this.fontsize,
    required this.random,
  }) : super(key: key);

  final double radius;
  final String name;
  final int count;
  final double fontsize;
  final bool random;

  @override
  Widget build(BuildContext context) {
    // thrown into the circle avatar class.
    return CircleAvatar(
      radius: radius,
      child: Text(
        name == ''
            ? ''
            : InitialName.parseName(name, count)
                .toUpperCase(), // get initial name and set to UpperCase to all letter
        style: TextStyle(
          fontWeight: FontWeight.bold,
          fontSize: fontsize,
          letterSpacing: 1.4,
        ),
      ),
      // set background color
      // default color, random, and fixed color
      // default color if name is empty
      // random color to make the background color change every time the page is refreshed
      backgroundColor: random == true
          ? randomColor()
          : name == ''
              ? colorName.colorDefault
              : fixedColor(
                  InitialName.parseName(name, count),
                ),
      foregroundColor: Colors.white,
    );
  }
}
