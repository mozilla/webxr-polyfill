import ARKitWrapper from './platform/ARKitWrapper.js'


const CUBE_SIZE = 0.1;

class App {
    constructor(canvasId) {
        this.isDebug = true;
        this.deviceId = null;
        
        this.clock = new THREE.Clock();
        this.initScene(canvasId);
        
        this.cubesNum = 0;

        this.initAR();

        this.raycaster = new THREE.Raycaster();
        this.registerUIEvents();
        
        this.orientation = null;
        this.fixOrientationMatrix = new THREE.Matrix4();
        this.orientationAngle = 0;
    }

    initAR() {
        this.ar = ARKitWrapper.GetOrCreate();
        this.ar.init({
            ui: {
                arkit: {
                    statistics: this.isDebug,
                    plane: true,
                    focus: true,
                    anchors: true,
                    points: false
                },
                custom: {
                    rec: true,
                    rec_time: true,
                    mic: true,
                    build: true,
                    warnings: true,
                    debug: true,
                    application: 'Graffiti'
                }
            }
        }).then(this.onARInit.bind(this));

        this.ar.addEventListener(ARKitWrapper.WATCH_EVENT, this.onARWatch.bind(this));

        this.ar.addEventListener(ARKitWrapper.RECORD_START_EVENT, () => {
            // do something when recording is started
        });

        this.ar.addEventListener(ARKitWrapper.RECORD_STOP_EVENT, () => {
            // do something when recording is stopped
        });

        this.ar.addEventListener(ARKitWrapper.DID_MOVE_BACKGROUND_EVENT, () => {
            this.onARDidMoveBackground();
        });

        this.ar.addEventListener(ARKitWrapper.WILL_ENTER_FOREGROUND_EVENT, () => {
            this.onARWillEnterForeground();
        });

        this.ar.addEventListener(ARKitWrapper.INTERRUPTION_EVENT, () => {
            // do something on interruption event
        });

        this.ar.addEventListener(ARKitWrapper.INTERRUPTION_ENDED_EVENT, () => {
            // do something on interruption event ended
        });

        this.ar.addEventListener(ARKitWrapper.MEMORY_WARNING_EVENT, () => {
            // do something on memory warning
        });

        this.ar.addEventListener(ARKitWrapper.ENTER_REGION_EVENT, (e) => {
            // do something when enter a region
            console.log('ENTER_REGION_EVENT', e.detail);
        });

        this.ar.addEventListener(ARKitWrapper.EXIT_REGION_EVENT, (e) => {
            // do something when leave a region
            console.log('EXIT_REGION_EVENT', e.detail);
        });

        this.ar.addEventListener(ARKitWrapper.SESSION_FAILS_EVENT, (e) => {
            // do something when the session fails
            console.log('SESSION_FAILS_EVENT', e.detail);
        });

        this.ar.addEventListener(ARKitWrapper.TRACKING_CHANGED_EVENT, (e) => {
            // do something when tracking status is changed
            console.log('TRACKING_CHANGED_EVENT', e.detail);
        });

        this.ar.addEventListener(ARKitWrapper.HEADING_UPDATED_EVENT, (e) => {
            // do something when heading is updated
            console.log('HEADING_UPDATED_EVENT', e.detail);
        });

        this.ar.addEventListener(ARKitWrapper.SIZE_CHANGED_EVENT, (e) => {
            this.resize(e.detail.size.width, e.detail.size.height);
        });

        this.ar.addEventListener(ARKitWrapper.PLAINS_ADDED_EVENT, (e) => {
            // do something when new plains appear
            console.log('PLAINS_ADDED_EVENT', e.detail);
        });

        this.ar.addEventListener(ARKitWrapper.PLAINS_REMOVED_EVENT, (e) => {
            // do something when plains are removed
            console.log('PLAINS_REMOVED_EVENT', e.detail);
        });

        this.ar.addEventListener(ARKitWrapper.ANCHORS_UPDATED_EVENT, (e) => {
            // do something when anchors are updated
            console.log('ANCHORS_UPDATED_EVENT', e.detail);
        });
        
        this.ar.addEventListener(ARKitWrapper.LOCATION_UPDATED_EVENT, (e) => {
            // do something when location is updated
            console.log('LOCATION_UPDATED_EVENT', e.detail);
        });
        
        this.ar.addEventListener(ARKitWrapper.SHOW_DEBUG_EVENT, e => {
            const options = e.detail;
            this.isDebug = Boolean(options.debug);
            
            this.fpsStats.domElement.style.display = this.isDebug ? '' : 'none';
        });
        
        this.ar.addEventListener(ARKitWrapper.ORIENTATION_CHANGED_EVENT, e => {
            this.updateOrientation(e.detail.orientation);
        });
    }

    updateOrientation(orientation) {
        this.orientation = orientation;
        switch (this.orientation) {
            case ARKitWrapper.ORIENTATION_PORTRAIT:
                this.orientationAngle = Math.PI / 2;
                break;
            case ARKitWrapper.ORIENTATION_UPSIDE_DOWN:
                this.orientationAngle = -Math.PI / 2;
                break;
            case ARKitWrapper.ORIENTATION_LANDSCAPE_LEFT:
                this.orientationAngle = -Math.PI;
                break;
            default:
                this.orientationAngle = 0;
                break;
        }
    }

    createCube(name) {
        let geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
        let material = new THREE.MeshLambertMaterial({color: 0x7d4db2, reflectivity: 0, wireframe: false, opacity: 0.8});
        let cubeMesh = new THREE.Mesh(geometry, material);
        cubeMesh.name = name;
        
        return cubeMesh;
    }
    resize(width, height) {
        this.width = width;
        this.height = height;
        this.engine.setSize(width, height, false);
    }
    initScene(canvasId) {
        this.canvas = document.getElementById(canvasId);
        
        this.scene = new THREE.Scene();
        this.engine = new THREE.WebGLRenderer({
            antialias: true,
            canvas: this.canvas,
            alpha: true
        });
        this.resize(window.innerWidth, window.innerHeight);
        
        this.engine.setClearColor('#000', 0);

        this.camera = new THREE.PerspectiveCamera(37.94, this.width / this.height, 0.001, 1000);
        
        this.camera.position.set(0, 1.6, 0);
        this.camera.lookAt(new THREE.Vector3(0, 1.6, -100));

        this.scene.add(this.camera);
        
        let light = new THREE.PointLight(0xffffff, 2, 0);
        this.camera.add(light);
        
        this.camera.matrixAutoUpdate = false;
        
        this.fpsStats = new Stats();
        this.fpsStats.setMode(0);
        this.fpsStats.domElement.style.display = 'none';
        this.fpsStats.domElement.style.left = 'auto';
        this.fpsStats.domElement.style.right = '0px';
        document.body.appendChild(this.fpsStats.domElement);
    }
    
    cleanScene() {
        let children2Remove = [];

        this.scene.children.forEach(child => {
            if (!child.isCamera) {
                children2Remove.push(child);
            }
        });

        children2Remove.forEach(child => {
            child.parent.remove(child);
        });
        
        this.cubesNum = 0;
    }

    registerUIEvents() {
        this.tapPos = {x: 0, y: 0};
        this.canvas.addEventListener('click', e => {
            let normX = e.clientX / this.width;
            let normY = e.clientY / this.height;
            
            this.tapPos = {x: 2 * normX - 1, y: -2 * normY + 1};
            
            this.ar.hitTest(normX, normY).then(data => this.onARHitTest(data)).catch(e => e);
        });
        
        document.querySelector('#message').onclick = function() {
            this.style.display = 'none';
        }
    }

    requestAnimationFrame() {
        window.requestAnimationFrame(this.render.bind(this));
    }
    
    watchAR() {
        this.ar.watch({
            location: {
                accuracy: ARKitWrapper.LOCATION_ACCURACY_HUNDRED_METERS
            },
            camera: true,
            anchors: true,
            planes: true,
            lightEstimate: true,
            heading: {
                accuracy: 360
            }
        });
    }
    
    render(time) {
        let deltaTime = Math.max(0.001, Math.min(this.clock.getDelta(), 1));
        
        if (this.isDebug) {
            this.fpsStats.begin();
        }
        
        this.engine.render(this.scene, this.camera);
        
        if (this.isDebug) {
            this.fpsStats.end();
        }
    }
    onARHitTest(data) {
        let info;
        let planeResults = [];
        let planeExistingUsingExtentResults = [];
        let planeExistingResults = [];

        if (data.planes.length) {
            // search for planes
            planeResults = data.planes;
            
            planeExistingUsingExtentResults = planeResults.filter(
                hitTestResult => hitTestResult.point.type == ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE_USING_EXTENT
            );
            planeExistingResults = planeResults.filter(
                hitTestResult => hitTestResult.point.type == ARKitWrapper.HIT_TEST_TYPE_EXISTING_PLANE
            );
            
            if (planeExistingUsingExtentResults.length) {
                // existing planes using extent first
                planeExistingUsingExtentResults = planeExistingUsingExtentResults.sort((a, b) => a.point.distance - b.point.distance);
                info = planeExistingUsingExtentResults[0].point;
            } else if (planeExistingResults.length) {
                // then other existing planes
                planeExistingResults = planeExistingResults.sort((a, b) => a.point.distance - b.point.distance);
                info = planeExistingResults[0].point;
            } else {
                // other plane types
                planeResults = planeResults.sort((a, b) => a.point.distance - b.point.distance);
                info = planeResults[0].point;
            }
        } else if (data.points.length) {
            // feature points if any
            info = data.points[0];
        }

        let transform;
        if (info) {
            // if hit testing is positive
            transform = info.worldTransform;
        } else {
            // if hit testing is negative put object at distance 1m from camera
            this.raycaster.setFromCamera(
                {x: this.tapPos.x, y: this.tapPos.y},
                this.camera
            );
            
            let objPos = this.raycaster.ray.origin.clone();
            objPos.add(this.raycaster.ray.direction);
            transform = new THREE.Matrix4();
            transform.makeTranslation(objPos.x, objPos.y, objPos.z);
            transform = transform.toArray();
            transform = this.ar.createARMatrix(transform);
        }
        this.ar.addAnchor(
            null,
            transform
        ).then(info => this.onARAddObject(info));
    }
    onARAddObject(info) {
        const cubeMesh = this.createCube(info.uuid);
        cubeMesh.matrixAutoUpdate = false;
        
        info.transform.v3.y += CUBE_SIZE / 2;
        cubeMesh.matrix.fromArray(this.ar.flattenARMatrix(info.transform));
        this.scene.add(cubeMesh);
        this.cubesNum++;

        this.requestAnimationFrame();
    }
    
    onARDidMoveBackground() {
        this.ar.stop().then(() => {
            this.cleanScene();
        });
    }
    
    onARWillEnterForeground() {
        this.watchAR();
    }
    
    onARInit(e) {
        if (!this.ar.deviceInfo || !this.ar.deviceInfo.uuid) {
            return;
        }

        this.deviceId = this.ar.deviceInfo.uuid;
        this.updateOrientation(this.ar.deviceInfo.orientation);
        
        this.resize(
            this.ar.deviceInfo.viewportSize.width,
            this.ar.deviceInfo.viewportSize.height
        );
        
        this.watchAR();
    }
    
    onARWatch() {
        const camera = this.ar.getData('camera');
        if (!camera) return;

        if (this.orientationAngle != 0) {
            this.fixOrientationMatrix.makeRotationZ(this.orientationAngle);
            this.camera.matrix.fromArray(
                this.ar.flattenARMatrix(camera.cameraTransform)
            ).multiply(this.fixOrientationMatrix);
        } else {
            this.camera.matrix.fromArray(
                this.ar.flattenARMatrix(camera.cameraTransform)
            );
        }
        
        this.camera.projectionMatrix.fromArray(
            this.ar.flattenARMatrix(camera.projectionCamera)
        );
        
        this.requestAnimationFrame();
    }
    
    showMessage(txt) {
        document.querySelector('#message').textContent = txt;
        document.querySelector('#message').style.display = 'block';
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.app = new App('app-canvas');
});
