import el from '../libs/potassium/El.js'
import obj from '../libs/potassium/Obj.js'
import Page from '../libs/potassium/Page.js'
import Engine from '../libs/potassium/Engine.js'
import Component from '../libs/potassium/Component.js'
import DataObject from '../libs/potassium/DataObject.js'

import MainNavComponent from './components/MainNavComponent.js'
import TextEntryComponent from './components/TextEntryComponent.js'
import ModeSwitcherComponent from './components/ModeSwitcherComponent.js'

import {Anchors, ContentAsset, Contents, Layers, Realities} from './dataObjects.js'

export default class IndexPage extends Page {
	constructor(){
		super()
		this.realities = new Realities()
		this.layers = new Layers()
		this.controlGroup = obj.group().appendTo(this.scene) // This will contain the scenic groups
		this.controlGroup.position.set(0, 0, -10)
		this.scene.add(new THREE.AmbientLight(0xFFFFFF, 0.6))

		// Set up the navbar at the top during flat and overlay and the main nav in the controlGroup when in scenic
		this.mainNav = new MainNavComponent()
		this.el.appendChild(this.mainNav.el)
		this.controlGroup.add(this.mainNav.obj)

		// Set up a way for users to switch modes from flat, to overlay, to scenic
		this.modeSwitcherComponent = new ModeSwitcherComponent()
		this.modeSwitcherComponent.addListener((eventName, mode) => {
			this.setMode(mode)
		}, ModeSwitcherComponent.ModeChangedEvent)
		this.controlGroup.add(this.modeSwitcherComponent.obj)

		this.textEntryComponent = new TextEntryComponent()
		this.controlGroup.add(this.textEntryComponent.obj)

		// Frame out one row with two columns for flat mode
		this.row = el.div({
			class: 'row top-row'
		}).appendTo(this.el)
		this.leftCol = el.div(
			{ class: 'col-6' },
		).appendTo(this.row)
		this.rightCol = el.div(
			{ class: 'col-6' },
		).appendTo(this.row)

		// Create an overlay div
		this.overlayEl = el.div({ class: 'overlay' }).appendTo(this.el)

		this._displayMode(Engine.FLAT)

		// Ok, everything is set up so fetch the initial data
		DataObject.fetchAll(this.realities, this.layers).then(() => {
			console.log('Fetched and ready to go')
		})

		/*
		fetch('data:...').then(response => response.blob()).then(blob => { console.log('blob', blob) })
		var reader = new FileReader();
		reader.addEventListener("loadend", () => {
		   // reader.result contains the contents of blob as a typed array
		});
		reader.readAsArrayBuffer(blob) or reader.readAsText()
		*/
	}
	_displayMode(mode){
		switch (mode) {
			case Engine.FLAT:
				this.mainNav.el.style.display = ''
				this.overlayEl.style.display = 'none'
				this.leftCol.appendChild(this.modeSwitcherComponent.el)
				this.leftCol.appendChild(this.textEntryComponent.el)
				this.rightCol.appendChild(this.engine.el)
				this.controlGroup.visible = false
				this.modeSwitcherComponent.setMode(Engine.FLAT)
				break;
			case Engine.OVERLAY:
				this.mainNav.el.style.display = ''
				this.overlayEl.style.display = ''
				this.leftCol.appendChild(this.modeSwitcherComponent.el)
				this.leftCol.appendChild(this.textEntryComponent.el)
				//this.engine.el.remove()
				this.controlGroup.visible = false
				this.modeSwitcherComponent.setMode(Engine.OVERLAY)
				break;
			case Engine.SCENIC:
				this.mainNav.el.style.display = 'none'
				this.overlayEl.style.display = 'none'
				this.controlGroup.visible = true
				//this.engine.el.remove()
				this.modeSwitcherComponent.setMode(Engine.SCENIC)
				break;
			default:
				console.error('unknown mode', mode)
		}
	}
}
