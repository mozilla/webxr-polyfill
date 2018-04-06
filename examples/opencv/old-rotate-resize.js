// createCVMat
//
// this routine does two things (if needed) as part of copying the input buffer to a cv.Mat:
// - rotates the image so it is upright 
// - converts to greyscale 

var rotatedImage = null;
var lastRotation = -1;

function createCVMat(rotation, buffer, pixelFormat) {
    var width = buffer.size.width
    var height = buffer.size.height

    if (!rotatedImage || (lastRotation != rotation)) {
        lastRotation = rotation;
        if (rotatedImage) rotatedImage.delete()

        if(rotation == 90 ||  rotation == -90) {
            rotatedImage = new cv.Mat(width, height, cv.CV_8U)
        } else {
            rotatedImage = new cv.Mat(height, width, cv.CV_8U)
        }
    }
    var src, dest;
    src = dest = 0;

    var i, j;
    var b = new Uint8Array(buffer.buffer);
    var r = rotatedImage.data;

    var rowExtra = buffer.size.bytesPerRow - buffer.size.bytesPerPixel * width;
    switch(rotation) {
    case -90:
        // clockwise
        dest = height - 1;
        for (j = 0; j < height; j++) {
            switch(pixelFormat) {
                case XRVideoFrame.IMAGEFORMAT_YUV420P:
                    for (var i = 0; i < width; i++) {
                        r[dest] = b[src++]
                        dest += height; // up the row
                    }
                    break;
                case XRVideoFrame.IMAGEFORMAT_RGBA32:
                    for (var i = 0; i < width; i++) {
                        r[dest] = (b[src++] + b[src++] + b[src++]) / 3 
                        src++
                        dest += height; // up the row
                    }
                    break;
            }
            dest -= width * height;
            dest --;
            src += rowExtra;
        }								
        break;

    case 90:
        // anticlockwise
        dest = width * (height - 1);
        for (j = 0; j < height; j++) {
            switch(pixelFormat) {
                case XRVideoFrame.IMAGEFORMAT_YUV420P:
                    for (var i = 0; i < width; i++) {
                        r[dest] = b[src++]
                        dest -= height; // down the row
                    }
                    break;
                case XRVideoFrame.IMAGEFORMAT_RGBA32:
                    for (var i = 0; i < width; i++) {
                        r[dest] = (b[src++] + b[src++] + b[src++]) / 3 
                        src++
                        dest -= height; // down the row
                    }
                    break;
            }
            dest += width * height;
            dest ++;
            src += rowExtra;
        }								
        break;

    case 180:
        // 180
        dest = width * height - 1;
        for (j = 0; j < height; j++) {
            switch(pixelFormat) {
                case XRVideoFrame.IMAGEFORMAT_YUV420P:        
                    for (var i = 0; i < width; i++) {
                        r[dest--] = b[src++]
                    }
                    break;
                case XRVideoFrame.IMAGEFORMAT_RGBA32:
                    for (var i = 0; i < width; i++) {
                        r[dest--] = (b[src++] + b[src++] + b[src++]) / 3 
                        src++
                    }
                break;
            }
            src += rowExtra;
        }								
        break;

    case 0:
    default:
        // copy
        for (j = 0; j < height; j++) {
            switch(pixelFormat) {
                case XRVideoFrame.IMAGEFORMAT_YUV420P:        
                    for (var i = 0; i < width; i++) {
                        r[dest++] = b[src++]
                    }
                    break;
                case XRVideoFrame.IMAGEFORMAT_RGBA32:
                    for (var i = 0; i < width; i++) {
                        r[dest++] = (b[src++] + b[src++] + b[src++]) / 3 
                        src++
                    }
                break;
            }
        src += rowExtra;
        }								
    }	
    return rotatedImage;	
}
