import ARKitWrapper from '../../polyfill/platform/ARKitWrapper.js'
import EditControls from './EditControls.js'
import API from './mrs_api/src/api/index.js'

const MRS_URL = 'http://13.88.19.161:3000';
const MRS_API = new API(MRS_URL);

const CUBE_SIZE = 0.1;

class App {
    constructor(canvasId) {
        this.showMessage('LOADING...');
        this.mode = EditControls.MODE_VIEW;
        
        this.isDebug = false;
        this.isGalleryLoaded = false;
        this.deviceId = null;

        this.orientation = null;
        this.fixOrientationMatrix = new THREE.Matrix4();
        this.orientationAngle = 0;

        this.clock = new THREE.Clock();
        this.initScene(canvasId);

        this.cubesNum = 0;
        this.protos = {};
        this.dataOfUser = null;

        this.initAR();

        this.raycaster = new THREE.Raycaster();
        this.registerUIEvents();
    }
    run() {
        let render = (time) => {
            this.render(time);
            window.requestAnimationFrame(render);
        };
        render();
    }
    setMode(mode) {
        this.mode = mode;
        switch (mode) {
            case EditControls.MODE_VIEW:
                document.querySelector('#removeObject').style.display = 'none';
                document.querySelector('#rotate').style.display = 'none';
                break;
            case EditControls.MODE_EDIT_TRANSLATE:
                document.querySelector('#removeObject').style.display = '';
                document.querySelector('#rotate').style.display = '';
                break;
        }
    }
    removePickedMesh() {
        this.editControls.removePickedMesh();
        this.getPickableMeshes(true);
    }
    initAR() {
        this.ar = ARKitWrapper.GetOrCreate();
        this.ar.init({
            ui: {
                arkit: {
                    statistics: this.isDebug,
                    plane: true,
                    focus: false,
                    anchors: false,
                    points: false
                },
                custom: {
                    rec: true,
                    rec_time: true,
                    mic: true,
                    build: false,
                    warnings: false,
                    debug: false,
                    browser: false,
                    showUIAtOnce: false
                }
            }
        }).then(this.onARInit.bind(this));

        this.auth();

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
            /*
            let location = false;
            function getLayerAndAnchors(data) {
                location = true;

                const layersAnchors = MRS_API.getLayersAnchors({
                    id: data.layer.id,
                    latitude: e.latitude,
                    longitude: e.longitude,
                    elevation: e.altitude,
                    page: 1
                })
                .then((res, rej) => res)
                .then((anchors) => {
                    const models = anchors.map((anchor) => {
                        return MRS_API.getAnchorsModels(anchor.id, 1);
                    });
                });

            };

            if (!location && this.dataOfUser) {
                getLayerAndAnchors(this.dataOfUser);
            };
            */
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

    getGallery() {
        const swiperWrapper = document.getElementsByClassName('swiper-wrapper')[0];
        const loader = new THREE.GLTFLoader();

        MRS_API.getGalleries(1)
            .then((res) => {
                return res;
            })
            .then(gallery => gallery[0].id)
            .then(id => MRS_API.getGalleryModels(id, 1))
            .then(models => {
                    models.forEach(model => {
                            console.log('model', model);
                            let swiperSlide = document.createElement('div');
                            swiperSlide.classList.add('swiper-slide');
                            let div = document.createElement('div');
                            div.classList.add('imageHolder');
                            let url = MRS_URL + '/' + model.Model.thumbPath;
                            div.style.backgroundImage = `url('${url}')`;
                            div.setAttribute('modelId', model.modelId);
                            swiperSlide.appendChild(div);
                            swiperWrapper.appendChild(swiperSlide);
                        });
                    return models;
                }
            )
            .then(models => {
                    let model = models[0];
                    let url = MRS_URL + '/' + model.Model.modelPath;
                    loader.load(url, (gltf) => {
                        const mesh = gltf.scene.children[0];
                        this.protos[model.modelId] = mesh;
                        if (models.length == Object.keys(this.protos).length) {
                            this.isGalleryLoaded = true;
                            this.onGalleryLoaded();
                        }
                    });
                }
            );
    }
    onGalleryLoaded() {
        this.hideMessage();
        document.querySelector('#ui').style.display = '';
        document.querySelector('.swiper-container').style.display = '';
        this.getPickableMeshes(true);
    }
    auth() {
        // @todo: this logic should be inside MRS class
        if (window.localStorage.apiKey) {
            MRS_API.getUser(window.localStorage.apiKey)
                .then((res) => {
                    this.dataOfUser = res;
                    this.getGallery();
                });
        } else {
            MRS_API.createUser({ username: 'test', email: 'mail@test.com' })
                .then((res) => {
                    window.localStorage.setItem('apiKey', MRS_API.apiKey);
                    this.dataOfUser = res;
                    this.getGallery();
                })
        }
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

        this.camera.position.set(0, 1.6, 10);
        this.camera.lookAt(new THREE.Vector3(0, 1.6, -100));

        this.scene.add(this.camera);

        let light = new THREE.PointLight(0xffffff, 2, 0);
        this.camera.add(light);

        this.camera.matrixAutoUpdate = false;

        /*@todo remove this cube */
        const cubeMesh = this.createCube('cube1');
        cubeMesh.position.set(0, 1, 0);
        cubeMesh.scale.set(10, 10, 10);
        this.scene.add(cubeMesh);
        this.cubeMesh = cubeMesh;
        this.cubesNum++;

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
        
        this.editControls = new EditControls(this);
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
    onARAddObject(info, modelId) {
        let mesh;
        if (modelId) {
            mesh = this.protos[modelId];
            if (!mesh) {
                return;
            }
            mesh = mesh.clone(true);
            mesh.name = info.uuid;
        } else {
            mesh = this.createCube(info.uuid);
            info.transform.v3.y += CUBE_SIZE / 2;
        }
        mesh.matrixAutoUpdate = false;

        mesh.matrix.fromArray(this.ar.flattenARMatrix(info.transform));
        this.scene.add(mesh);

        this.cubesNum++;

        this.getPickableMeshes(true);
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

    pick(pos) {
        let pickInfo = {};
        this.raycaster.setFromCamera(
            {x: pos.ndcX, y: pos.ndcY},
            this.camera
        );
        const intersects = this.raycaster.intersectObjects(this.getPickableMeshes());
        if (!intersects.length) {
            pickInfo.hit = false;
            return pickInfo;
        }
        pickInfo.hit = true;
        pickInfo.pickedMesh = intersects[0].object;
        pickInfo.pickedPoint = intersects[0].point;
        pickInfo.pointerX = pos.x;
        pickInfo.pointerY = pos.y;
        pickInfo.ndcX = pos.ndcX;
        pickInfo.ndcY = pos.ndcY;
        return pickInfo;
    }
    getPickableMeshes(forceUpdate) {
        if (this.pickableMeshes && !forceUpdate) {
            return this.pickableMeshes;
        }
        this.pickableMeshes = [];
        var cnt = this.scene.children.length;
        for (var i = 0; i < cnt; i++) {
            const mesh = this.scene.children[i];
            if (mesh.type != 'Mesh') {
                continue;
            }
            
            this.pickableMeshes.push(mesh);
        }
        return this.pickableMeshes;
    }

    showMessage(txt) {
        document.querySelector('#message').textContent = txt;
        document.querySelector('#message').style.display = 'block';
    }
    hideMessage() {
        document.querySelector('#message').style.display = 'none';
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.app = new App('app-canvas');
});
