
class VRSimplestExample extends XRExampleBase {
	constructor(domElement){
		super(domElement, true) 
		// We haven't implemented VR displays so the session creation will fail
	}


	// Called during construction
	initializeStageGroup(){
		fillInBoxScene(this.stageGroup)
	}

	// Called once per frame
	updateStageGroup(frame, stageCoordinateSystem, stagePose){
	}
}