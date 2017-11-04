import el from '../libs/potassium/El.js'
import obj from '../libs/potassium/Obj.js'
import Page from '../libs/potassium/Page.js'
import Engine from '../libs/potassium/Engine.js'
import Component from '../libs/potassium/Component.js'
import DataObject from '../libs/potassium/DataObject.js'

import MainNavComponent from './components/MainNavComponent.js'
import SettingsComponent from './components/SettingsComponent.js'
import TextEntryComponent from './components/TextEntryComponent.js'
import ModeSwitcherComponent from './components/ModeSwitcherComponent.js'

import {Anchors, ContentAsset, Contents, Layers, Realities} from './dataObjects.js'

export default class IndexPage extends Page {
	constructor(){
		super()
		this.realities = new Realities()
		this.layers = new Layers()

		// The controlGroup will hold all of the scenic UI controls
		this.controlGroup = obj.group({ name: 'control group' }).appendTo(this.scene)
		this.controlGroup.position.set(0, 0, -5)
		this.scene.add(new THREE.AmbientLight(0xFFFFFF, 0.6))

		// Set up the navbar at the top during flat and overlay and the main nav in the controlGroup when scenic
		this.mainNavComponent = new MainNavComponent()
		this.el.appendChild(this.mainNavComponent.el)
		this.controlGroup.add(this.mainNavComponent.obj)
		this.mainNavComponent.addListener((eventName, mode) => {
			this.setMode(mode)
		}, ModeSwitcherComponent.ModeChangedEvent)

		this.settingsComponent = new SettingsComponent()
		this.controlGroup.add(this.settingsComponent.obj)

		this.textEntryComponent = new TextEntryComponent()
		this.controlGroup.add(this.textEntryComponent.obj)

		// Frame out one row with two columns or a single center column for flat mode
		this.row = el.div({
			class: 'row top-row flat-only'
		}).appendTo(this.el)
		this.leftCol = el.div(
			{ class: 'col-6' }
		).appendTo(this.row)
		this.rightCol = el.div(
			{ class: 'col-6' }
		).appendTo(this.row)
		this.centerCol = el.div(
			{ class: 'col-12' }
		).appendTo(this.row)

		// Create a div for overlay mode
		this.overlayEl = el.div({ class: 'overlay overlay-only' }).appendTo(this.el)

		this._displayMode(Engine.FLAT)

		// Set up our URL router to handle view switching
		this._router.addRoute(/^settings$/, 'settings')
		this._router.addRoute(/^$/, 'edit')
		this._router.addListener(this._handleRoutes.bind(this))
		this._router.start()

		// Ok, everything is set up so fetch the initial data
		DataObject.fetchAll(this.realities, this.layers)

		/*
		fetch('data:...').then(response => response.blob()).then(blob => { console.log('blob', blob) })
		var reader = new FileReader();
		reader.addEventListener("loadend", () => {
		   // reader.result contains the contents of blob as a typed array
		});
		reader.readAsArrayBuffer(blob) or reader.readAsText()
		*/
	}
	_handleRoutes(eventName, path, ...params){
		switch(eventName){
			case 'settings':
				this._showSettings(...params)
				break
			case 'edit':
			default:
				this._showEdit(...params)
				break
		}
	}
	_showSettings(){
		console.log('show settings')
		this.leftCol.style.display = 'none'
		this.rightCol.style.display = 'none'
		this.centerCol.style.display = ''
		this.textEntryComponent.el.style.display = 'none'
		this.settingsComponent.el.style.display = ''
	}
	_showEdit(){
		console.log('show edit')
		this.leftCol.style.display = ''
		this.rightCol.style.display = ''
		this.centerCol.style.display = 'none'
		this.textEntryComponent.el.style.display = ''
		this.settingsComponent.el.style.display = 'none'
	}
	_displayMode(mode){
		switch (mode) {
			case Engine.FLAT:
				this.mainNavComponent.el.style.display = ''
				this.controlGroup.visible = false
				this.leftCol.appendChild(this.textEntryComponent.el)
				this.rightCol.appendChild(this.engine.el)
				this.centerCol.appendChild(this.settingsComponent.el)
				this.mainNavComponent.setMode(Engine.FLAT)
				break;
			case Engine.OVERLAY:
				this.mainNavComponent.el.style.display = ''
				this.controlGroup.visible = false
				this.overlayEl.appendChild(this.textEntryComponent.el)
				this.overlayEl.appendChild(this.settingsComponent.el)
				// The Page will move this.engine.el
				this.mainNavComponent.setMode(Engine.OVERLAY)
				break;
			case Engine.SCENIC:
				this.mainNavComponent.el.style.display = 'none'
				this.controlGroup.visible = true
				// The Page will move this.engine.el
				this.mainNavComponent.setMode(Engine.SCENIC)
				break;
			default:
				console.error('unknown mode', mode)
		}
	}
}
