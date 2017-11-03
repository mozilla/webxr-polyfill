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
	}
}
