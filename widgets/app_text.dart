import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

class AppText extends StatelessWidget {
  final int size;
  final String text;
  final Color color;

  AppText({
    Key? key,
    this.size=16,
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
      ),
    );
  }
}