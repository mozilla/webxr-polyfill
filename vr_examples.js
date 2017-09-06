
class VRSimplestExample extends XRExampleBase {
	constructor(domElement){
		super(domElement, true, false) 
	}

	// Called during construction
	initializeStageGroup(){
		fillInBoxScene(this.stageGroup)
	}

	// Called once per frame
	updateStageGroup(frame, stageCoordinateSystem, stagePose){
	}
}