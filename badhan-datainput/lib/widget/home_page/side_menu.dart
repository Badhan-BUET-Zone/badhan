import 'package:auto_size_text/auto_size_text.dart';
import 'package:badhandatainput/constant/badhan_constants.dart';
import 'package:badhandatainput/widget/common/profile_picture.dart';
import 'package:badhandatainput/widget/home_page/editable_donor_diaglog.dart';
import 'package:badhandatainput/widget/responsive.dart';
import 'package:flutter/material.dart';
import '../../model/profile_data_model.dart';

class SideMenu extends StatefulWidget {
  const SideMenu(
      {Key? key,
      required this.initialSelectedIdx,
      required this.onDestinationSelected,
      required this.profileData})
      : super(key: key);

  final int initialSelectedIdx;
  final ProfileData profileData;
  final void Function(int index) onDestinationSelected;

  @override
  State<SideMenu> createState() => _SideMenuState();
}

class _SideMenuState extends State<SideMenu> {
  static String tag = "SideMenu";

  String profileDataStr = "";
  bool isAuthenticated = false;
  int _selectedIndex = 0;

  @override
  void initState() {
    super.initState();
    _selectedIndex = widget.initialSelectedIdx;
  }

  List<String> instructions = [
    "1) Phone : text",
    "2) Blood Group : text",
    "3) Hall Name : text",
    "4) Student ID : number",
    "5) Address : text",
    "6) Room Number : text",
    "7) Comment : text",
    "8) Total Donations : text(deafult value must be 0)",
    "9) Available To All: TRUE/FALSE",
  ];

  @override
  Widget build(BuildContext context) {
    bool isExpanded =
        Responsive.isDesktop(context) || Responsive.isMobile(context);
    return NavigationRail(
      onDestinationSelected: (idx) {
        setState(() {
          _selectedIndex = idx;
          widget.onDestinationSelected(idx);
        });
      },
      leading: ProfileDataWidget(
        isExpanded: isExpanded,
        profileData: widget.profileData,
      ),
      extended: isExpanded,
      selectedIndex: _selectedIndex,
      destinations: const [
        NavigationRailDestination(
          icon: Icon(Icons.upload_file_rounded),
          label: Text("Excel"),
        ),
        NavigationRailDestination(
          icon: Icon(Icons.file_present_sharp),
          label: Text("Google Sheet"),
        ),
        /* NavigationRailDestination(
          icon: Icon(Icons.article),
          label: Text("Badhan Form"),
        ), */
        NavigationRailDestination(
          icon: Icon(Icons.info),
          label: Text("Instructions"),
        ),
      ],
    );
  }
}

class ProfileDataWidget extends StatelessWidget {
  const ProfileDataWidget(
      {Key? key, required this.isExpanded, required this.profileData})
      : super(key: key);

  final ProfileData profileData;
  final bool isExpanded;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: (isExpanded) ? 256 : 50,
      padding: const EdgeInsets.all(8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          ProfilePictureFromName(
              showFullText: false,
              name: profileData.name,
              radius: 25,
              fontsize: 12,
              characterCount: 2),
          if (isExpanded)
            const SizedBox(
              width: 8,
            ),
          if (isExpanded)
            Expanded(
              child: Container(
                //color: Colors.red,
                padding: const EdgeInsets.only(right: 4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.start,
                  children: [
                    AutoSizeText(
                      profileData.name,
                      style: Theme.of(context)
                          .textTheme
                          .titleLarge
                          ?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    AutoSizeText(
                      BadhanConst.designation(profileData.designation),
                      style: Theme.of(context).textTheme.subtitle1,
                    )
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class AddDonorButtonWidget extends StatelessWidget {
  const AddDonorButtonWidget({
    Key? key,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      width: double.infinity,
      height: 60,
      child: ElevatedButton(
        style: ButtonStyle(
          shape: MaterialStateProperty.all<RoundedRectangleBorder>(
            RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10.0),
              //side: BorderSide(color: Colors.red)
            ),
          ),
        ),
        onPressed: () async {
          //final result =
          await showDialog(
              context: context,
              builder: (context) {
                return const AlertDialog(
                  content: EditableDonorDialog(),
                );
              });
        },
        child: const Text("Add donor"),
      ),
    );
  }
}
