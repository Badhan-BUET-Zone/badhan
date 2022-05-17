import 'dart:convert';
import 'dart:developer';

import 'package:badhandatainput/util/custom_exceptions.dart';
import 'package:html/dom.dart' as dom;
import 'package:html/parser.dart';
import 'package:http/http.dart' as http;

class GoogleSheetParser {
  /// Parses the google sheet and returns a list of maps
  /// with the keys being the column names and the values being the values
  /// in the column
  /// Example:
  /// [{'name': 'John', 'age': '30'}, {'name': 'Jane', 'age': '25'}]
  /// If the sheet is empty, returns an empty list
  /// If the sheet is not found, throws an exception
  static Future<List<Map<String, String>>> parseSheet(String url) async {
    /// fetch the public google sheet as html response

    List<Map<String, String>> dataList = [];

    try {
      http.Response res = await http.Client().get(Uri.parse(url));

      if (res.statusCode == 200) {
        dom.Document body = parse(res.body);
        dom.Element table = body.getElementsByTagName("table").first;
        dom.Element tbody = table.getElementsByTagName("tbody").first;

        List<String> header = [];

        int r = 1;
        for (dom.Element tr in tbody.getElementsByTagName("tr")) {
          //StringBuffer sb = StringBuffer();
          Map<String, String> data = {};

          int c = 0;
          for (dom.Element td in tr.getElementsByTagName("td")) {
            if (td.text != "") {
              //sb.write(td.text);
              //sb.write(" ");
              if (r == 1) {
                header.add(td.text); // get the mapped header name
              } else {
                data[header[c]] = td.text;
              }
              c++;
            }
          }
          /* if (sb.toString() != "") {
            log(sb.toString());
          } */
          if (data.isNotEmpty) {
            dataList.add(data);
          }
          r++;
        }
      } else {
        throw MyExpection("Failed to fetch google sheet.");
      }
    } catch (e) {
      throw MyExpection("Link is not valid.");
    }

    //log("Data List: ");
    //log(json.encode(dataList));

    return dataList;
  }
}
