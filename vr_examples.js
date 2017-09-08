
class VRSimplestExample extends XRExampleBase {
	constructor(domElement){
		super(domElement, true, false) 
	}

	// Called during construction
	initializeStageGroup(){
		// Add a teapot at about eye level
		var geometry = new THREE.TeapotBufferGeometry(0.1)
		let materialColor = new THREE.Color()
		materialColor.setRGB(1.0, 1.0, 1.0)
		let material = new THREE.MeshLambertMaterial({
			color: materialColor,
			side: THREE.DoubleSide
		})
		let mesh = new THREE.Mesh(geometry, material)
		mesh.position.set(0, 1.4, -1)
		this.stageGroup.add(mesh)

		// Add a box at the stage origin
		let box = new THREE.Mesh(
			new THREE.BoxBufferGeometry(0.1, 0.1, 0.1),
			new THREE.MeshPhongMaterial({ color: '#DDFFDD' })
		)
		box.position.set(0, 0, 0)
		this.stageGroup.add(box)

		this.stageGroup.add(new THREE.AmbientLight('#FFF', 0.2))
		let directionalLight = new THREE.DirectionalLight('#FFF', 0.6)
		directionalLight.position.set(0, 10, 0)
		this.stageGroup.add(directionalLight)
	}

	// Called once per frame
	updateStageGroup(frame, stageCoordinateSystem, stagePose){
		// Uncomment the next line to spin the box
		// this.stageGroup.children[0].rotation.y += 0.01
	}
}