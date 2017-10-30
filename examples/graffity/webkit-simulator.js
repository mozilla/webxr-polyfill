class webkitSimulatorMessageHandler {
    constructor(simulator, name, isAsync) {
        this.name = name;
        this.isAsync = !(isAsync === false);
        this.simulator = simulator;
        this.data = {
            location: null,
            camera: null
        };
    }
    
    postMessage(data) {
        console.log('webkitSimulatorMessageHandler:postMessage', this.name, data);
        
        if (this.name === 'loadUrl') {
            location.href = data.url;
            return;
        }
        if (this.name == 'setUIOptions') {
            window[data.callback]();
            return;
        }
        if (this.name === 'stopAR') {
            //~ clearInterval(this.simulator.watchARIntervalId);
            navigator.geolocation.clearWatch(this.simulator.watchARIntervalId);
            this.simulator.watchARIntervalId = null;
            
            window[data.callback]();
            return;
        }

        if (data && data.callback) {
            if (!this.isAsync) {
                console.log('webkitSimulatorMessageHandler:postMessage callback', this.name);
                window[data.callback]('data callback simulator: ' + this.name);
                return;
            } 

            if (this.name === 'watchAR') {
                const options = {
                    enableHighAccuracy: true,
                    maximumAge: 0,
                    timeout: 3000
                };
                this.simulator.watchARIntervalId = navigator.geolocation.watchPosition(
                    pos => {
                        console.log('get location success', pos, this.data);
                        this.data.location = {};
                        this.data.location.latitude = pos.coords.latitude;
                        this.data.location.longitude = pos.coords.longitude;
                        
                        this.data.camera = {};

                        this.data.camera.projectionCamera = {
                            v0: {x: 1.636377, y: 0, z: 0, w: 0},
                            v1: {x: 0, y: 2.909114, z: 0, w: 0},
                            v2: {x: 0.004712701, y: 0.02586138, z: -1.000002, w: -1},
                            v3: {x: 0, y: 0, z: -0.002000002, w: 0}
                        };
                        this.data.camera.cameraTransform = {
                            v0: {x: 1, y: 0, z: 0, w: 0},
                            v1: {x: 0, y: 1, z: 0, w: 0},
                            v2: {x: 0, y: 0, z: 1, w: 0},
                            v3: {x: 0, y: 2, z: 10, w: 1}
                        };
                        
                        console.log('this.data', this.data);
                        window[data.callback](this.data);
                    },
                    err => {
                        console.log('cannot get location', err);
                    },
                    options
                );
                
                //~ setInterval(() => {console.log('this.data',  this.data); window[data.callback](this.data);}, 3000);
                
                console.log('this.simulator.watchARIntervalId', this.simulator.watchARIntervalId);
            } else {
                setTimeout(() => {
                    if (this.name === 'addObject' || this.name === 'addAnchor') {
                        data.transform = data.options.transform;
                        window[data.callback](data);
                        return;
                    } else if (this.name === 'hitTest') {
                        data.planes = [
                            {
                                point: {
                                    distance: 1,
                                    type: 8,
                                    worldTransform: {
                                        v0: {x: 1, y: 1, z: -1, w: 0},
                                        v1: {x: 0, y: 1, z: 1, w: 0},
                                        v2: {x: 0, y: 0, z: -1, w: 0},
                                        v3: {x: 0, y: 0, z: 0, w: 1}
                                    }
                                }
                            }
                        ];
                        
                        window[data.callback](data);
                        return;
                    } else if (this.name === 'initAR') {
                        data.uuid = 'uuid';
                        data.viewportSize = {width: window.innerWidth, height: window.innerHeight};
                        window[data.callback](data);
                        return;
                    }
                    window[data.callback]('data callback simulator: ' + this.name);
                }, 3000);
            }
        }
    }

}
class webkitSimulator {
    constructor() {
        this.watchARIntervalId = null;
        
        this.messageHandlers = {
            arInitAR: new webkitSimulatorMessageHandler(this, 'initAR'),
            arWatchAR: new webkitSimulatorMessageHandler(this, 'watchAR'),
            arStopAR: new webkitSimulatorMessageHandler(this, 'stopAR'),
            arAddObject: new webkitSimulatorMessageHandler(this, 'addObject'),
            arAddAnchor: new webkitSimulatorMessageHandler(this, 'addAnchor'),
            arHitTest: new webkitSimulatorMessageHandler(this, 'hitTest'),
            arShowDebug: new webkitSimulatorMessageHandler(this, 'showDebug'),
            arDidMoveBackground: new webkitSimulatorMessageHandler(this, 'didMoveBackground'),
            arWillEnterForeground: new webkitSimulatorMessageHandler(this, 'willEnterForeground'),
            arLoadUrl: new webkitSimulatorMessageHandler(this, 'loadUrl'),
            arSetUIOptions: new webkitSimulatorMessageHandler(this, 'setUIOptions')
        };
    }
}
if (!window.webkit) {
    window.webkit = new webkitSimulator();
}
