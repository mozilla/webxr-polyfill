import el from '../libs/potassium/El.js'
import obj from '../libs/potassium/Obj.js'
import Page from '../libs/potassium/Page.js'
import Component from '../libs/potassium/Component.js'
import DataObject from '../libs/potassium/DataObject.js'

import {Anchors, ContentAsset, Contents, Layers, Realities} from './dataObjects.js'

let IndexPage = class extends Page {
	constructor(){
		super()
		this.realities = new Realities()
		this.layers = new Layers()

		this.scene.add(new THREE.AmbientLight(0xFFFFFF, 0.6))

		this.mainNav = new MainNavComponent()
		this.el.appendChild(this.mainNav.el)
		this.scene.add(this.mainNav.obj)

		this.textEntryComponent = new TextEntryComponent()
		this.scene.add(this.textEntryComponent.obj)

		this.row = el.div({
			class: 'row top-row'
		}).appendTo(this.el)
		this.leftCol = el.div(
			{ class: 'col-6' },
			this.textEntryComponent.el
		).appendTo(this.row)
		this.rightCol = el.div(
			{ class: 'col-6' },
			this.engine.el
		).appendTo(this.row)

		// Ok, everything is set up so fetch the initial data
		DataObject.fetchAll(this.realities, this.layers).then(() => {
			console.log('Fetched and ready to go')
		})
	}	
}

let TextEntryComponent = class extends Component {
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

/*
MainNavComponent renders the main navigation links.
*/
let MainNavComponent = class extends Component {
	constructor(dataObject=null, options={}){
		super(dataObject, options)
		this.el.addClass('main-nav-component')
		this.navEl = el.nav().appendTo(this.el)
		this.siteNameEl = el.a(
			{ href: '#' },
			el.h1('Tooxt')
		).appendTo(this.navEl)

		this.rightLinks = el.ul(
			{ class: 'right-links'},
			el.li(el.a({ href: '#settings' }, 'settings'))
		).appendTo(this.navEl)
	}
	addLink(href, anchorText, className) {
		this.rightLinks.append(el.li(el.a({ 'href': href, 'class': className }, anchorText )))
	}
}

export {IndexPage, MainNavComponent}