import EventHandlerBase from '../../polyfill/fill/EventHandlerBase.js'

export default class EditControls extends EventHandlerBase {
    constructor(canvas) {
        super();
        this.canvas = canvas;
        
        this.touches = null;
        this.doubleTapPossible = false;
        
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
            clientY: touch.clientY,
            ts: 
        }
    }
    onTouchStart(e) {
        e.preventDefault();
        
        if (e.touches.length == 1 && !this.touches) {
            // double tap is possible only when there is one touch
            this.doubleTapPossible = true;
        }
        
        
    }
    onTouchMove(e) {
        e.preventDefault();
    }
    onTouchEnd(e) {
        e.preventDefault();
    }
    onTouchCancel(e) {
        e.preventDefault();
    }
    
    
    
}

EditControls.EVENT_DOUBLETAP = 'double-tap';
