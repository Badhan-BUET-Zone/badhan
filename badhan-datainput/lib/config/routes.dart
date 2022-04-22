import 'package:badhandatainput/pages/home_page.dart';
import 'package:badhandatainput/pages/landing_page.dart';
import 'package:badhandatainput/util/debug.dart';
import 'package:fluro/fluro.dart';

class MyFluroRouter {
  static const String tag = "MyFluroRouter";
  static final FluroRouter router = FluroRouter();

  static final Handler _homeHander =
      Handler(handlerFunc: ((context, Map<String, dynamic> parameters) {
    Log.d(tag, parameters.toString());
    String token = parameters['token']?.first ?? "";
    return MyHomePage(title: "Badhan data input", token: token);
  }));

  static final Handler _landingHandler =
      Handler(handlerFunc: ((context, Map<String, dynamic> parameters) {
    Log.d(tag, parameters.toString());
    return const LandingPage();
  }));

  static void setUpRouter() {
    router.define("/", handler: _landingHandler, transitionType: TransitionType.fadeIn);
    router.define("/home",
        handler: _homeHander, transitionType: TransitionType.fadeIn);
  }
}
