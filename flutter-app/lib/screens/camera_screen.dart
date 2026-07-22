import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import '../services/upload_service.dart';

class CameraScreen extends StatefulWidget {
  final String sessionId;
  
  const CameraScreen({super.key, required this.sessionId});

  @override
  State<CameraScreen> createState() => _CameraScreenState();
}

class _CameraScreenState extends State<CameraScreen> {
  CameraController? _cameraController;
  final FaceDetector _faceDetector = FaceDetector(
    options: FaceDetectorOptions(
      enableContours: true,
      enableClassification: true,
      performanceMode: FaceDetectorMode.fast,
    ),
  );
  bool _isDetecting = false;

  @override
  void initState() {
    super.initState();
    _initializeCamera();
  }

  Future<void> _initializeCamera() async {
    final cameras = await availableCameras();
    if (cameras.isEmpty) return;

    final frontCamera = cameras.firstWhere(
      (camera) => camera.lensDirection == CameraLensDirection.front,
      orElse: () => cameras.first,
    );

    _cameraController = CameraController(
      frontCamera,
      ResolutionPreset.medium,
      enableAudio: false,
      imageFormatGroup: ImageFormatGroup.jpeg,
    );

    await _cameraController!.initialize();
    if (mounted) {
      setState(() {});
      _startImageStream();
    }
  }

  void _startImageStream() {
    _cameraController!.startImageStream((image) async {
      if (_isDetecting) return;
      _isDetecting = true;

      try {
        final inputImage = _createInputImage(image);
        if (inputImage == null) {
          _isDetecting = false;
          return;
        }

        final faces = await _faceDetector.processImage(inputImage);
        
        if (faces.isNotEmpty) {
          // Face detected! Capture an image.
          // Note: Image stream is very fast. In production, we add a cooldown or quality check.
          await _captureAndUpload();
        }
      } catch (e) {
        debugPrint('Face detection error: $e');
      } finally {
        // Cooldown to avoid spamming the backend
        await Future.delayed(const Duration(milliseconds: 1000));
        _isDetecting = false;
      }
    });
  }

  InputImage? _createInputImage(CameraImage image) {
    final WriteBuffer allBytes = WriteBuffer();
    for (final Plane plane in image.planes) {
      allBytes.putUint8List(plane.bytes);
    }
    final bytes = allBytes.done().buffer.asUint8List();

    final Size imageSize = Size(image.width.toDouble(), image.height.toDouble());
    final camera = _cameraController!.description;
    final imageRotation = InputImageRotationValue.fromRawValue(camera.sensorOrientation);
    if (imageRotation == null) return null;

    final inputImageFormat = InputImageFormatValue.fromRawValue(image.format.raw);
    if (inputImageFormat == null) return null;

    final planeData = image.planes.map(
      (Plane plane) {
        return InputImagePlaneMetadata(
          bytesPerRow: plane.bytesPerRow,
          height: plane.height,
          width: plane.width,
        );
      },
    ).toList();

    final inputImageData = InputImageData(
      size: imageSize,
      imageRotation: imageRotation,
      inputImageFormat: inputImageFormat,
      planeData: planeData,
    );

    return InputImage.fromBytes(bytes: bytes, inputImageData: inputImageData);
  }

  Future<void> _captureAndUpload() async {
    try {
      await _cameraController!.stopImageStream();
      final XFile file = await _cameraController!.takePicture();
      
      // Enqueue to background uploader
      await UploadService.enqueueUpload(file.path, widget.sessionId);
      
      // Restart stream
      _startImageStream();
    } catch (e) {
      debugPrint('Capture error: $e');
      _startImageStream();
    }
  }

  @override
  void dispose() {
    _cameraController?.dispose();
    _faceDetector.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_cameraController == null || !_cameraController!.value.isInitialized) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      body: Stack(
        children: [
          CameraPreview(_cameraController!),
          // Overlay for face bounding box can be added here
          const Positioned(
            bottom: 30,
            left: 0,
            right: 0,
            child: Text(
              'Align your face in the camera',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white, fontSize: 18, backgroundColor: Colors.black54),
            ),
          )
        ],
      ),
    );
  }
}
