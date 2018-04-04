//importScripts('webxr-worker.js')
importScripts('../../dist/webxr-worker.js')
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
var cg = -1;
var cb = -1;

averageIntensityRGBA = function (buffer) {
    var w = buffer.size.width;
    var h = buffer.size.height;
    var pad = buffer.size.bytesPerRow - w * buffer.size.bytesPerPixel;
    var pixels = buffer.buffer;

    intensity = 0.0;
    var p = 0;
    for (var r = 0; r < h; r++) {
        var v = 0;
        for (var i = 0; i < w; i++) {
            v += (pixels[p++] + pixels[p++] + pixels[p++]) / 3
            p++
        }
        intensity += v / w;
        p += pad;
    }			
    intensity = (intensity / h) / 255.0;
}

averageIntensityLum = function (buffer) {
    var w = buffer.size.width;
    var h = buffer.size.height;
    var pad = buffer.size.bytesPerRow - w * buffer.size.bytesPerPixel;
    var pixels = buffer.buffer;

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

colorAtCenterRGB = function(buffer0) {
    var w = buffer0.size.width;
    var h = buffer0.size.height;
    var pixels = buffer0.buffer;

    var cx = Math.floor(w / 2) * buffer0.size.bytesPerPixel
    var cy = Math.floor(h / 2)
    var p = cy * buffer0.size.bytesPerRow + cx;
    cr = pixels[p++];
    cg = pixels[p++];
    cb = pixels[p];
}

// LUV == LuCbCr
// 
// Y = 0.299R + 0.587G + 0.114B
// U'= (B-Y)*0.565
// V'= (R-Y)*0.713

clamp = function (x, min, max) {
	if (x < min) {
		return min;
	}
	if (x > max) {
		return max;
	}
	return x;
}

colorAtCenterLUV = function(buffer0, buffer1) {
    var w = buffer0.size.width;
    var h = buffer0.size.height;
    var pixels = buffer0.buffer;

    var cx = Math.floor(w / 2) * buffer0.size.bytesPerPixel
    var cy = Math.floor(h / 2)
    var p = cy * buffer0.size.bytesPerRow + cx;
    var lum = pixels[p];

    w = buffer1.size.width;
    h = buffer1.size.height;
    pixels = buffer1.buffer;

    cx = Math.floor(w / 2) * buffer1.size.bytesPerPixel
    cy = Math.floor(h / 2)
    p = cy * buffer1.size.bytesPerRow + cx;
    cb = pixels[p++];
    cr = pixels[p];

    // luv -> rgb.  see https://www.fourcc.org/fccyvrgb.php
    var y=1.1643*(lum-16)
    var u=cb-128;
    var v=cr-128;
    cr=clamp(y+1.5958*v,            0, 255);
    cg=clamp(y-0.39173*u-0.81290*v, 0, 255);
    cb=clamp(y+2.017*u,             0, 255); 

    // Alternatives:
    //
    // var y=lum
    // var u=cb-128;
    // var v=cr-128;
    // cr=y+1.402*v;
    // cg=y-0.34414*u-0.71414*v;
    // cb=y+1.772*u;  
}

self.addEventListener('message',  function(event){
    try {
        var videoFrame = XRVideoFrame.createFromMessage(event);

        switch (videoFrame.pixelFormat) {
        case XRVideoFrame.IMAGEFORMAT_YUV420P:
            this.averageIntensityLum(videoFrame.buffer(0))
            this.colorAtCenterLUV(videoFrame.buffer(0),videoFrame.buffer(1))
            break;
        case XRVideoFrame.IMAGEFORMAT_RGBA32:
            this.averageIntensityRGBA(videoFrame.buffer(0))
            this.colorAtCenterRGB(videoFrame.buffer(0))
            break;
        }
        videoFrame.postReplyMessage({intensity: intensity, cr: cr, cg: cg, cb: cb})
        videoFrame.release();
    } catch(e) {
        console.error('page error', e)
    }
});

// setInterval( function(){
//     console.log("Help me!")
//     self.postMessage (Math.random() * 255.0);
//}, 500);
