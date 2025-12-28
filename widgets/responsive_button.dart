import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:untitled1/misc/colors.dart';
import 'package:untitled1/widgets/app_text.dart';

class ResponsiveButton extends StatelessWidget {
  final bool? isResponsive;
  final double? width;
  final VoidCallback? onPressed;
  final String buttonText; // Button text

  ResponsiveButton({
    super.key,
    this.width = 120,
    this.isResponsive,
    this.onPressed,
    required this.buttonText, required Color backgroundColor, required Color textColor, // Ensure buttonText is passed
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(

      onTap: onPressed,
      child: Container(
        width: isResponsive == true ? double.maxFinite : width,
        height: 60,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(10),
          color: AppColors.mainColor,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            isResponsive == true
                ? Container(
              margin: const EdgeInsets.only(left: 20),
              child: AppText(
                text: buttonText, // Display button text
                color: Colors.white,
              ),
            )
                : Container(),
            if (isResponsive == true)
              Container(
                margin: const EdgeInsets.only(left: 5),
              ),
            AppText(
              text: buttonText,
              color: Colors.white,
            ),
          ],
        ),
      ),
    );
  }
}
