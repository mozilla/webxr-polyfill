// could not get workers working, so am not using this.
//
// Tried to use Transferable ArrayBuffers but kept getting DOM Error 25. 
// 


averageIntensity = function (buffer) {
    var w = buffer.size.width;
    var h = buffer.size.height;
    var pad = buffer.size.bytesPerRow - w;
    var pixels = buffer.buffer;

    var intensity = 0.0;
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

    postMessage ((intensity / h) / 255.0);
}

onMessage = function (ev) {
    var frame = ev.detail.frame
    var camera = ev.detail.camera
    switch (frame.pixelFormat) {
        case "YUV420P":
    	this.averageIntensity(frame.buffers[0])
    }
}
