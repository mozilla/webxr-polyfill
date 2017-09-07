
class VRSimplestExample extends XRExampleBase {
	constructor(domElement){
		super(domElement, true, false) 
	}

	// Called during construction
	initializeStageGroup(){
		let mesh = new THREE.Mesh(
			new THREE.BoxBufferGeometry(0.2, 0.2, 0.2),
			new THREE.MeshPhongMaterial({ color: '#DDFFDD' })
		)
		mesh.position.set(0, 1.6, -1)
		this.stageGroup.add(mesh)
		this.stageGroup.add(new THREE.AmbientLight('#FFF', 0.2))
		this.stageGroup.add(new THREE.DirectionalLight('#FFF', 0.6))
	}

	// Called once per frame
	updateStageGroup(frame, stageCoordinateSystem, stagePose){
		// Uncomment the next line to spin the box
		// this.stageGroup.children[0].rotation.y += 0.01
	}
}