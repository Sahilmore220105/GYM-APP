import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

class AppLargeText extends StatelessWidget {
  final int size;
  final String text;
  final Color color;

  AppLargeText({
    Key? key,
    this.size=30,
    required this.text,
    this.color= Colors.black,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: TextStyle(
        fontSize: size.toDouble(),
        color: color,
        fontWeight: FontWeight.bold,

      ),
    );
  }
}