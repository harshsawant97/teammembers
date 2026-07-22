import 'package:dio/dio.dart';
import 'package:workmanager/workmanager.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const String uploadTask = "uploadImageTask";

class UploadService {
  static Future<void> init() async {
    await Workmanager().initialize(
      callbackDispatcher,
      isInDebugMode: true,
    );
  }

  static Future<void> enqueueUpload(String filePath, String sessionId) async {
    await Workmanager().registerOneOffTask(
      "upload_$sessionId",
      uploadTask,
      inputData: {
        "filePath": filePath,
        "sessionId": sessionId,
      },
      constraints: Constraints(
        networkType: NetworkType.connected,
      ),
    );
  }
}

@pragma('vm:entry-point')
void callbackDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    if (task == uploadTask) {
      try {
        final filePath = inputData!['filePath'];
        final sessionId = inputData['sessionId'];

        const storage = FlutterSecureStorage();
        final token = await storage.read(key: 'jwt_token');

        final dio = Dio();
        final formData = FormData.fromMap({
          "sessionId": sessionId,
          "image": await MultipartFile.fromFile(filePath, filename: "capture.jpg"),
        });

        final response = await dio.post(
          'http://10.0.2.2:3000/api/v1/attendance/mark',
          data: formData,
          options: Options(
            headers: {
              'Authorization': 'Bearer ${token ?? ''}',
            },
          ),
        );

        if (response.statusCode == 200 || response.statusCode == 201) {
          return Future.value(true);
        } else {
          return Future.value(false); // will trigger retry based on Workmanager policy
        }
      } catch (e) {
        return Future.value(false);
      }
    }
    return Future.value(true);
  });
}
