importScripts('../../dist/webxr-worker.js')

console.log("loaded webxr-worker.js")

var openCVready = false;

var Module = {
  preRun: [function() {
    console.log("CV preRun")
    Module.FS_createPreloadedFile('./', 'haarcascade_eye.xml', 'haarcascade_eye.xml', true, false);
    Module.FS_createPreloadedFile('./', 'haarcascade_frontalface_default.xml', 'haarcascade_frontalface_default.xml', true, false);
    Module.FS_createPreloadedFile('./', 'haarcascade_profileface.xml', 'haarcascade_profileface.xml', true, false);
  }],
  onRuntimeInitialized: function() {
        openCVready = true;
        postMessage({type: "cvReady"});
  },
  setStatus: function(msg) {
        postMessage({type: "cvStatus", msg: msg});
  }
};

console.log("set up pre-load")

importScripts('opencv.js')

console.log("loaded opencv.js:" + cv);

/**
 * In the video callback,  ev.detail contains:
{
  "frame": {
    "buffers": [ // Array of base64 encoded string buffers
      {
        "size": {
          "width": 320,
          "height": 180,
          "bytesPerRow": 320,
          "bytesPerPixel": 1
        },
        "buffer": "e3x...d7d"   /// convert to Uint8 buffer in code below
      },
      {
        "size": {
          "width": 160,
          "height": 90,
          "bytesPerRow": 320,
          "bytesPerPixel": 2
        },
        "buffer": "ZZF.../fIJ7"  /// convert to Uint8 buffer in code below
      }
    ],
    "pixelFormat": "YUV420P",  /// Added in the code below, clients should ignore pixelFormatType
    "timestamp": 337791
  },
  "camera": {
    "cameraIntrinsics": [3x3 matrix],
        fx 0   px
        0  fy  py
        0  0   1
        fx and fy are the focal length in pixels.
        px and py are the coordinates of the principal point in pixels.
        The origin is at the center of the upper-left pixel.

    "cameraImageResolution": {
      "width": 1280,
      "height": 720
    },
    "viewMatrix": [4x4 camera view matrix],
    "arCamera": true;
    "cameraOrientation": 0,  // orientation in degrees of image relative to display
                            // normally 0, but on video mixed displays that keep the camera in a fixed 
                            // orientation, but rotate the UI, like on some phones, this will change
                            // as the display orientation changes
    "projectionMatrix": [4x4 camera projection matrix]
  }
}

*/

var face_cascade;
var eye_cascade;

function loadFaceDetectTrainingSet() {
    if (face_cascade == undefined) {
        face_cascade = new cv.CascadeClassifier();
        let load = face_cascade.load('haarcascade_frontalface_default.xml');
        console.log('load face detection training data', load);
    }
}

function loadEyesDetectTrainingSet() {
    if (eye_cascade == undefined) {
        eye_cascade = new cv.CascadeClassifier();
        let load = eye_cascade.load('haarcascade_eye.xml');
        console.log('load eye detection training data', load);
    }
}

function faceDetect(img_gray, roiRect) {
    loadFaceDetectTrainingSet();
    
    var roi_gray = img_gray
    if (roiRect) {
        roi_gray = img_gray.roi(roiRect);
    } else {
        roiRect = new cv.Rect(0, 0, img_gray.cols, img_gray.rows);
    }

    let faces = new cv.RectVector();
    let s1 = new cv.Size(15,15);
    let s2 = new cv.Size(120,120);
    face_cascade.detectMultiScale(roi_gray, faces, 1.3, 3, 0, s1, s2);

    let rects = [];

    for (let i = 0; i < faces.size(); i += 1) {
        let faceRect = faces.get(i);
        rects.push({
            x: faceRect.x + roiRect.x,
            y: faceRect.y + roiRect.y,
            width: faceRect.width,
            height: faceRect.height
        });
    }

    if (roi_gray != img_gray) roi_gray.delete()
    faces.delete();
    return rects;
}

function eyesDetect(img_gray) {	
    loadFaceDetectTrainingSet();
    loadEyesDetectTrainingSet();

    let faces = new cv.RectVector();
    let s1 = new cv.Size();
    let s2 = new cv.Size();
    face_cascade.detectMultiScale(img_gray, faces);//, 1.1, 3, 0);//, s1, s2);

    let rects = [];

    for (let i = 0; i < faces.size(); i += 1) {
        let faceRect = faces.get(i);
        let x = faceRect.x;
        let y = faceRect.y;
        let w = faceRect.width;
        let h = faceRect.height;

        rects.push({
            x: x,
            y: y,
            width: w,
            height: h
        });

        let roiRect = new cv.Rect(x, y, w, h);
        let roi_gray = img_gray.roi(roiRect);

        let eyes = new cv.RectVector();
        eye_cascade.detectMultiScale(roi_gray, eyes);//, 1.1, 3, 0, s1, s2);

        for (let j = 0; j < eyes.size(); j += 1) {

            let eyeRect = eyes.get(j);

            rects.push({
                x: x + eyeRect.x,
                y: y + eyeRect.y,
                width: eyeRect.width,
                height: eyeRect.height
            });
        }

        eyes.delete();
        roi_gray.delete();
    }

    faces.delete();

    return rects
}


// createCVMat
//
// this routine does two things (if needed) as part of copying the input buffer to a cv.Mat:
// - rotates the image so it is upright 
// - converts to greyscale 

var rotatedImage = null;

var img_gray = null;
var img_rgba = null;

function createCVMat2(rotation, buffer, pixelFormat) {
    var width = buffer.size.width
    var height = buffer.size.height

    if (!img_gray) img_gray = new cv.Mat();
    if (!img_rgba) img_rgba = new cv.Mat();
    if (!rotatedImage) rotatedImage = new cv.Mat();

    switch(pixelFormat) {
        case XRVideoFrame.IMAGEFORMAT_YUV420P:
            var b = new Uint8Array(buffer.buffer);
            img_gray.create(height,width,cv.CV_8U)
            img_gray.data.set(b);        
            break;
        case XRVideoFrame.IMAGEFORMAT_RGBA32:
            var b = new Uint8Array(buffer.buffer);
            img_rgba.create(height,width,cv.CV_8UC4)
            img_rgba.data.set(b);
            cv.cvtColor(img_rgba, img_gray, cv.COLOR_RGBA2GRAY, 0);
            break;
    }

    switch(rotation) {
        case -90:
            cv.rotate(img_gray, rotatedImage, cv.ROTATE_90_CLOCKWISE);
            return rotatedImage;
            break;
        case 90:
            cv.rotate(img_gray, rotatedImage, cv.ROTATE_90_COUNTERCLOCKWISE);
            return rotatedImage;
            break;
        case 180:
            cv.rotate(img_gray, rotatedImage, cv.ROTATE_180);
            return rotatedImage;
            break;
        default:
            return img_gray;            
    }
}

///////////
var endTime = 0;

self.addEventListener('message',  function(event){
    postMessage({type: "cvStart", time: ( performance || Date ).now()});

    var videoFrame = XRVideoFrame.createFromMessage(event);
    var faceRects = []

    if (openCVready) {   
        switch (videoFrame.pixelFormat) {
        case XRVideoFrame.IMAGEFORMAT_YUV420P:
        case XRVideoFrame.IMAGEFORMAT_RGBA32:
            var scale = 1;
            var buffer = videoFrame.buffer(0);
            var width = buffer.size.width;
            var height = buffer.size.height;

            // let's pick a size such that the video is below 256 in size in both dimensions
            while (width > 256 || height > 256) {
                width = width / 2
                height = height / 2
                scale = scale / 2;
            }
        
            // first, rotate the image such that it is oriented correctly relative to the display
            var rotation = videoFrame.camera.cameraOrientation;
            var image = createCVMat2(rotation, videoFrame.buffer(0), videoFrame.pixelFormat)
            postMessage({type: "cvAfterMat", time: ( performance || Date ).now()});

            if (scale != 1) {
                var m = new cv.Mat()
                cv.resize(image, m, new cv.Size(), scale, scale);

//             let w = Math.floor(image.cols /2);
//             let h = Math.floor(image.rows /2);
//             let roiRect = new cv.Rect(w/2, h/2, w, h);
                postMessage({type: "cvAfterResize", time: ( performance || Date ).now()});
        
                // now find faces
                faceRects = faceDetect(m);

                for (let i = 0; i < faceRects.length; i++) {
                    let rect = faceRects[i];
                    rect.x = rect.x / scale
                    rect.y = rect.y / scale
                    rect.width = rect.width / scale
                    rect.height = rect.height / scale
                }

                m.delete();
            } else {
                postMessage({type: "cvAfterResize", time: ( performance || Date ).now()});
                faceRects = faceDetect(image);
            }

        }
    }
    endTime = ( performance || Date ).now()
    videoFrame.postReplyMessage({type: "cvFrame", faceRects: faceRects, time: endTime})
    
    videoFrame.release();
});
