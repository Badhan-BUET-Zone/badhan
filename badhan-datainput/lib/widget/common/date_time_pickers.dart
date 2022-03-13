import 'package:badhandatainput/util/debug.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class DateInputWidget extends StatefulWidget {
  final Function onDateSelect;
  final DateTime? initialDate;
  final DateTime? firstDate;
  final DateTime? lastDate;
  const DateInputWidget(
      {Key? key,
      required this.onDateSelect,
      this.initialDate,
      this.firstDate,
      this.lastDate})
      : super(key: key);

  @override
  _DateInputWidgetState createState() => _DateInputWidgetState();
}

class _DateInputWidgetState extends State<DateInputWidget> {
  static String tag = "DateInput";
  late String dateString;
  final DateFormat _dateFormat = DateFormat("dd-MMM-yyyy");

  @override
  void initState() {
    
    dateString = widget.initialDate != null
        ? _dateFormat.format(widget.initialDate!)
        : "select date";
    Log.d(tag, "initSate(): $dateString");
    super.initState();
  }

  void openDatePickerDialog() async {
    DateTime? newDate = await showDatePicker(
      context: context,
      initialDate: widget.initialDate ??
          DateTime(
              DateTime.now().year, DateTime.now().month, DateTime.now().day),
      firstDate: widget.firstDate ?? DateTime(DateTime.now().year - 50, 1),
      lastDate: widget.lastDate ?? DateTime(DateTime.now().year + 1),
      helpText: 'Select a date',
    );

    setState(() {
      dateString = _dateFormat.format(newDate!);
      widget.onDateSelect(newDate);
      Log.d(tag, "openDatePickerDialog(): $dateString");
    });
  }

  @override
  Widget build(BuildContext context) {
    ThemeData themeData = Theme.of(context);
    return TextButton.icon(
      icon: Icon(Icons.calendar_today, color: themeData.primaryColor, size: 16,),
      onPressed: openDatePickerDialog,
      label: Text(dateString),
    );
  }
}
