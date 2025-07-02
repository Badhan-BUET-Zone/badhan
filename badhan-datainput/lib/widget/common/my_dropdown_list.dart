import 'package:flutter/material.dart';

// ignore: must_be_immutable
class MyDropDown extends StatefulWidget {
  String? selectedValue;
  String hint;
  Function onSelected;
  List<String> list;

  MyDropDown({
    Key? key,
    this.selectedValue,
    required this.hint,
    required this.onSelected,
    required this.list,
  }) : super(key: key);

  @override
  _MyDropDownState createState() => _MyDropDownState();
}

class _MyDropDownState extends State<MyDropDown> {
  // customize dropdwon design
  // https://www.youtube.com/watch?v=-6GBAGj-h4Q
  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: DropdownButtonFormField(
        hint: Text(widget.hint),
        value: widget.selectedValue,
        items: widget.list.map((String items) {
          return DropdownMenuItem(
            value: items,
            child: Text(items),
          );
        }).toList(),
        onChanged: (String? newValue) {
          setState(() {
            widget.selectedValue = newValue!;
            widget.onSelected(newValue);
          });
        },
        decoration: InputDecoration(
          labelText: widget.hint,
          contentPadding: const EdgeInsets.symmetric(horizontal: 12),
          labelStyle: TextStyle(
            color: Theme.of(context).primaryColor,
            fontSize: Theme.of(context).textTheme.subtitle2?.fontSize,
          ),
          border: OutlineInputBorder(
            borderSide: BorderSide(
              color: Theme.of(context).primaryColor,
            ),
            borderRadius: BorderRadius.circular(5),
          ),
          focusedBorder: OutlineInputBorder(
            borderSide: BorderSide(
              color: Theme.of(context).primaryColor,
            ),
            borderRadius: BorderRadius.circular(5),
          ),
        ),
      ),
    );
  }
}
