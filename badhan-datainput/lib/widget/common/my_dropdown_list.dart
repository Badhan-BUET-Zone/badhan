import 'package:flutter/material.dart';

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
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
          border: Border.all(
            width: 0.5,
            //color: Theme.of(context).primaryColor,
          ),
          borderRadius: BorderRadius.circular(8)),
      child: DropdownButtonHideUnderline(
        child: ButtonTheme(
          alignedDropdown: true,
          child: DropdownButton(
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
          ),
        ),
      ),
    );
  }
}
