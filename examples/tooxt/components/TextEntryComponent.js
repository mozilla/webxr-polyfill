import el from '../../libs/potassium/El.js'
import obj from '../../libs/potassium/Obj.js'
import Component from '../../libs/potassium/Component.js'

export default class TextEntryComponent extends Component {
	constructor(dataObject=null, options={}){
		super(dataObject, options)
		this.el.appendChild(el.span('text entry'))

		this.inputEl = el.input({ type: 'text', 'placeholder': 'Placeholder'}).appendTo(this.el)

		const box = new THREE.Mesh(
			new THREE.BoxBufferGeometry(0.1, 0.1, 0.1),
			new THREE.MeshPhongMaterial({ color: '#DDFFDD' })
		)
		box.position.set(0, 0, -2)
		this.obj.add(box)


		// Temporarily add a model just so we can see something before we make a 3D text entry 
		/*
		this.model = obj.gltf('../models/BoomBox/gltf/BoomBox.gltf')
		this.model.scale.set(15, 15, 15)
		this.model.position.set(0, 0, -1.2)
		this.model.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)
		this.obj.add(this.model)
		*/
	}
}
