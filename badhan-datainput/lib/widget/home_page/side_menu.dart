import 'package:badhandatainput/widget/common/profile_picture.dart';
import 'package:badhandatainput/widget/home_page/editable_donor_diaglog.dart';
import 'package:flutter/material.dart';
import '../../model/profile_data_model.dart';
class SideMenu extends StatefulWidget {
  const SideMenu({Key? key, required this.profileData}) : super(key: key);

  final ProfileData profileData;

  @override
  State<SideMenu> createState() => _SideMenuState();
}

class _SideMenuState extends State<SideMenu> {
  //static String tag = "SideMenu";

  String profileDataStr = "";
  bool isAuthenticated = false;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(10),
      child: Center(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  ProfilePictureFromName(
                      name: widget.profileData.name,
                      radius: 30,
                      fontsize: 15,
                      characterCount: 2),
                  const SizedBox(
                    width: 15,
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.profileData.name,
                        style: Theme.of(context)
                            .textTheme
                            .titleLarge
                            ?.copyWith(fontWeight: FontWeight.bold),
                      ),
                      Text(
                        designation(widget.profileData.designation),
                        style: Theme.of(context).textTheme.subtitle1,
                      )
                    ],
                  ),
                ],
              ),
              const SizedBox(
                height: 10,
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
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
              )
            ],
          )
      ),
    );
  }

  String designation(int id) {
    switch (id) {
      case 3:
        return "Super admin";
      default:
        return "";
    }
  }
}
