import XRLayer from './XRLayer.js'

/*
XRWebGLLayer defines the WebGL or WebGL 2 context that is rendering the visuals for this layer.
*/
export default class XRWebGLLayer extends XRLayer {
	constructor(session, context){
		super()
		this._session = session
		this._context = context
		this._framebuffer = null // TODO
	}

	get context(){ return this._context }

	get antialias(){
		// readonly attribute boolean antialias;
		throw 'Not implemented'
	}

	get depth(){
		// readonly attribute boolean depth;
		throw 'Not implemented'
	}

	get stencil(){
		// readonly attribute boolean stencil;
		throw 'Not implemented'
	}

	get alpha(){
		// readonly attribute boolean alpha;
		throw 'Not implemented'
	}

	get multiview(){
		// readonly attribute boolean multiview;
		throw 'Not implemented'
	}
	
	get framebuffer(){
		return this._framebuffer
	}

	get framebufferWidth(){
		return this._context.drawingBufferWidth
	}

	get framebufferHeight(){
		return this._context.drawingBufferHeight
	}

	requestViewportScaling(viewportScaleFactor){
		// void requestViewportScaling(double viewportScaleFactor);
		throw 'Not implemented'
	}
}