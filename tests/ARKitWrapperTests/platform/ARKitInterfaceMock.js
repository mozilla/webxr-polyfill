class webkitMessageHandler {
    constructor(name) {
        this.name = name;
    }

    postMessage(data) {
        if (data && data.callback) {
            window[data.callback](data);
        }
    }
}

class ARKitInterfaceMock {
    constructor() {
        this.messageHandlers = {
            arInitAR: new webkitMessageHandler('init'),
            arWatchAR: new webkitMessageHandler('watchAR'),
            arStopAR: new webkitMessageHandler('stopAR'),
            arAddObject: new webkitMessageHandler('addObject'),
            arAddAnchor: new webkitMessageHandler('addAnchor'),
            arHitTest: new webkitMessageHandler('hitTest'),
            arShowDebug: new webkitMessageHandler('showDebug'),
            arDidMoveBackground: new webkitMessageHandler('didMoveBackground'),
            arWillEnterForeground: new webkitMessageHandler('willEnterForeground'),
            arLoadURL: new webkitMessageHandler('loadURL')
        };
    }
}

export default ARKitInterfaceMock;
