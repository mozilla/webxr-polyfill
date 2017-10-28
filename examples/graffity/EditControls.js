const DOUBLETAP_TIME_SENSITIVITY = 400;

const STATE_NONE = 0;
const STATE_MOVE_Y_OR_SCALE = 3;
const STATE_MOVE_XZ = 4;

const MOVE_SPEED = 0.005;
const SCALE_SPEED = 0.01;

export default class EditControls {
    constructor(app) {
        this.app = app;
        this.canvas = app.canvas;
        
        this.reset();
        
        this.canvas.addEventListener('touchstart', e => {
            this.onTouchStart(e);
        }, false);
        this.canvas.addEventListener('touchmove', e => {
            this.onTouchMove(e);
        }, false);
        this.canvas.addEventListener('touchend', e => {
            this.onTouchEnd(e);
        }, false);
        this.canvas.addEventListener('touchcancel', e => {
            this.onTouchCancel(e);
        }, false);
    }
    copyTouch(touch) {
        return {
            identifier: touch.identifier,
            clientX: touch.clientX,
            clientY: touch.clientY
        };
    }
    saveTouchInfo(touch, slot) {
        const saveTouch = this.copyTouch(touch);
        saveTouch.ts = performance.now();
        this.touches[slot] = saveTouch;
    }
    getTouchInfoById(touchList, id) {
        for (let i = 0; i < touchList.length; i++) {
            if (touchList[i].identifier === id) {
                return this.copyTouch(touchList[i]);
            }
        }
        return null;
    }
    isDoubleTap(touch) {
        const lastTouch = this.touches[0];
        if (!lastTouch) {
            return false;
        }
        const ts = performance.now();
        if (ts - lastTouch.ts <= DOUBLETAP_TIME_SENSITIVITY) {
            return true;
        }
        return false;
    }
    handleModeOnTap(pickInfo, isDoubleTap) {
        const lastPickInfo = this.lastPickInfo;
        let mode;
        
        if (this.app.mode == EditControls.MODE_VIEW) {
            if (pickInfo && pickInfo.hit) {
                this.app.setMode(EditControls.MODE_EDIT_TRANSLATE);
                this.pickedMesh = pickInfo.pickedMesh;
            }
            return;
        }
        if (!isDoubleTap) {
            return;
        }
        
        if (lastPickInfo && pickInfo && lastPickInfo.hit && pickInfo.hit && lastPickInfo.pickedMesh.name == pickInfo.pickedMesh.name) {
            // edit modes
            mode = EditControls.MODE_EDIT_TRANSLATE;
        } else {
            // view mode
            mode = EditControls.MODE_VIEW;
        }
        this.app.setMode(mode);
    }
    reset() {
        this.state = STATE_NONE;
        this.touches = [];
        this.pickedMesh = null;
        this.lastPickInfo = null;
        this.cameraBasis = null;
        this.scaleDistance = 0;
    }
    handleOneTouchStart(touches) {
        const touch = touches[0];
        const pickInfo = this.app.pick(this.getTouchPos(touch));
        let isDoubleTap = this.isDoubleTap(touch);
        
        this.touches = [];
        this.saveTouchInfo(touch, 0);
        this.handleModeOnTap(pickInfo, isDoubleTap);
        
        this.state = STATE_MOVE_XZ;
        this.lastPickInfo = pickInfo;
    }
    handleOneTouchMove(touch) {
        const savedTouch = this.touches[0];
        const dx = touch.clientX - savedTouch.clientX;
        const dy = touch.clientY - savedTouch.clientY;

        this.pickedMesh.position.setFromMatrixPosition(this.pickedMesh.matrix);
        if (Math.abs(dx) >= Math.abs(dy)) {
            // move along camera X axis
            this.pickedMesh.position.addScaledVector(this.cameraBasis.x, MOVE_SPEED * dx);
        } else {
            // move along camera Z axis
            this.pickedMesh.position.addScaledVector(this.cameraBasis.z, MOVE_SPEED * dy);
        }
        
        this.pickedMesh.updateMatrix();
        this.pickedMesh.updateMatrixWorld(true);
        
        this.saveTouchInfo(touch, 0);
    }
    handleTwoTouchesStart(touches) {
        const touch1 = touches[0];
        const touch2 = touches[1];
        this.touches = [];
        this.saveTouchInfo(touch1, 0);
        this.saveTouchInfo(touch2, 1);
        
        this.state = STATE_MOVE_Y_OR_SCALE;
        
        this.scaleDistance = this.getTouchesDistance(touch1, touch2);
    }
    getTouchesDistance(touch1, touch2) {
        let dx = touch2.clientX - touch1.clientX;
        let dy = touch2.clientY - touch1.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    onTouchStart(e) {
        e.preventDefault();
        
        if (e.touches.length == 1) {
            this.handleOneTouchStart(e.touches);
        } else if (e.touches.length == 2) {
            this.handleTwoTouchesStart(e.touches);
        } else {
            this.state = STATE_NONE;
        }
        
        if (this.app.mode == EditControls.MODE_VIEW) {
            this.reset();
            return;
        }
        
        this.calculateCameraBasis();
    }
    handleTwoTouchesMove(touches) {
        const savedTouch1 = this.touches[0];
        const savedTouch2 = this.touches[1];
        let touch1 = this.getTouchInfoById(touches, savedTouch1.identifier);
        let touch2 = this.getTouchInfoById(touches, savedTouch2.identifier);
        if (!touch1 || !touch2) {
            return;
        }
        
        let dx1 = touch1.clientX - savedTouch1.clientX;
        let dy1 = touch1.clientY - savedTouch1.clientY;
        let dx2 = touch2.clientX - savedTouch2.clientX;
        let dy2 = touch2.clientY - savedTouch2.clientY;

        let isScale = true;
        if ((dy1 > 0 && dy2 > 0) || (dy1 < 0 && dy2 < 0)) {
            isScale = false;
        }
        
        let scaleDistance = this.getTouchesDistance(touch1, touch2);

        this.pickedMesh.position.setFromMatrixPosition(this.pickedMesh.matrix);
        this.pickedMesh.scale.setFromMatrixScale(this.pickedMesh.matrix);
        if (!isScale) {
            // move along camera Y axis
            this.pickedMesh.position.addScaledVector(new THREE.Vector3(0, -1, 0), MOVE_SPEED * dy1);
        } else {
            // scale
            const scaleDelta = scaleDistance - this.scaleDistance;
            this.pickedMesh.scale.addScalar(SCALE_SPEED * scaleDelta);
        }
        
        this.saveTouchInfo(touch1, 0);
        this.saveTouchInfo(touch2, 1);
        
        this.scaleDistance = scaleDistance;

        this.pickedMesh.updateMatrix();
        this.pickedMesh.updateMatrixWorld(true);
    }
    onTouchEnd(e) {
        e.preventDefault();
        this.state = STATE_NONE;
    }
    onTouchCancel(e) {
        e.preventDefault();
        this.reset();
    }
    onTouchMove(e) {
        e.preventDefault();
        
        // check mode and state
        if (this.app.mode == EditControls.MODE_VIEW || this.state == STATE_NONE) {
            return;
        }
        
        if (e.touches.length == 1) {
            if (this.state != STATE_MOVE_XZ) {
                return;
            }
            this.handleOneTouchMove(e.touches[0]);
        } else if (e.touches.length == 2) {
            if (this.state != STATE_MOVE_Y_OR_SCALE) {
                return;
            }
            this.handleTwoTouchesMove(e.touches);
        } else {
            this.state = STATE_NONE;
        }
    }

    getTouchPos(e) {
        var x, y;
        var canvasRect = this.canvas.getBoundingClientRect();
        x = e.clientX - canvasRect.left;
        y = e.clientY - canvasRect.top;
        
        var ndcX = (x / canvasRect.width) * 2 - 1;
        var ndcY = -(y / canvasRect.height) * 2 + 1;
        return {x: x, y: y, ndcX: ndcX, ndcY: ndcY};
    }
    calculateCameraBasis() {
        this.cameraBasis = {
            x: new THREE.Vector3(),
            y: new THREE.Vector3(),
            z: new THREE.Vector3()
        };
        this.app.camera.matrix.extractBasis(this.cameraBasis.x, this.cameraBasis.y, this.cameraBasis.z);
        this.cameraBasis.x.normalize();
        this.cameraBasis.y.normalize();
        this.cameraBasis.z.normalize();
    }
    removePickedMesh() {
        if (this.pickedMesh) {
            this.app.scene.remove(this.pickedMesh);
            this.reset();
            this.app.setMode(EditControls.MODE_VIEW);
        }
    }
}

EditControls.EVENT_DOUBLETAP = 'double-tap';
EditControls.MODE_VIEW = 'view';
EditControls.MODE_EDIT_TRANSLATE = 'edit-translate';
//~ EditControls.MODE_EDIT_ROTATE = 'edit-rotate'; @TODO implement rotating
