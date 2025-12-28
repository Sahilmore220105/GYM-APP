import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:untitled1/misc/colors.dart';
import 'package:untitled1/widgets/app_text.dart';

class AppButtons extends StatelessWidget {
  final Color color;
  final Color backgroundcolor;
  String? text;
  IconData? icon;
  double size;
  final Color bordercolor;
  bool? isIcon;

  AppButtons({Key?key,
    this.isIcon=false,
    this.text="hi",
    this.icon,
    required this.size,
    required this.color,
    required this.backgroundcolor,
    required this.bordercolor}):super(key:key);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
          border: Border.all(
            color: bordercolor,
            width: 1.0,
          ),
          borderRadius: BorderRadius.circular(15),
          color: backgroundcolor),
      child: isIcon==false?Center(child: AppText(text: text!,color: color,)):Center(child: Icon(icon,color: color,)),
    );
  }
}