importScripts('webxr-worker.js')
//importScripts('../../dist/webxr-worker.js')
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
            "buffer": "e3x...d7d"   /// convert to Uint8 ArrayBuffer in code below
        },
        {
            "size": {
            "width": 160,
            "height": 90,
            "bytesPerRow": 320,
            "bytesPerPixel": 2
            },
            "buffer": "ZZF.../fIJ7"  /// convert to Uint8 ArrayBuffer in code below
        }
        ],
        "pixelFormatType": "kCVPixelFormatType_420YpCbCr8BiPlanarFullRange",
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
        "interfaceOrientation": 3,
            // 0 UIDeviceOrientationUnknown
            // 1 UIDeviceOrientationPortrait
            // 2 UIDeviceOrientationPortraitUpsideDown
            // 3 UIDeviceOrientationLandscapeRight
            // 4 UIDeviceOrientationLandscapeLeft
        "projectionMatrix": [4x4 camera projection matrix]
    }
    }
*/


var intensity = 0.0;
var cr = -1;
var cb = -1;

averageIntensity = function (buffer) {
    var w = buffer.size.width;
    var h = buffer.size.height;
    var pad = buffer.size.bytesPerRow - w;
    var pixels = new Uint8Array(buffer.buffer);

    intensity = 0.0;
    var p = 0;
    for (var r = 0; r < h; r++) {
        var v = 0;
        for (var i = 0; i < w; i++) {
            if (p < pixels.length) {
                v += pixels[p++]
            } else {
                console.error("overflow pixel buffer")
            }
        }
        intensity += v / w;
        p += pad;
    }			
    intensity = (intensity / h) / 255.0;
}

colorAtCenter = function(buffer) {
    var w = buffer.size.width;
    var h = buffer.size.height;
    var pixels = new Uint8Array(buffer.buffer);

    var cx = Math.floor(w / 2) * buffer.size.bytesPerPixel
    var cy = Math.floor(h / 2)
    var p = cy * buffer.size.bytesPerRow + cx;
    cb = pixels[p++];
    cr = pixels[p];
}

self.addEventListener('message',  function(event){
    var videoFrame = XRVideoFrame.createFromMessage(event);

    switch (videoFrame.pixelFormat) {
    case XRVideoFrame.IMAGEFORMAT_YUV420P:
        this.averageIntensity(videoFrame.buffer(0))
        this.colorAtCenter(videoFrame.buffer(1))

//					// pass the buffers back or they will be garbage collected
//					var buffers = frame.buffers
//					var buffs = []
//					for (var i = 0; i < buffers.length; i++) {
//						buffs.push(buffers[i].buffer)
//					}	
//					postMessage ({intensity: intensity, cr: cr, cb: cb, buffers: buffs, frame: frame}, buffs);
        videoFrame.postReplyMessage({intensity: intensity, cr: cr, cb: cb})
    }
    videoFrame.release();
});

// setInterval( function(){
//     console.log("Help me!")
//     self.postMessage (Math.random() * 255.0);
//}, 500);
