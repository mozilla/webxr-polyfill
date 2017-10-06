/*
	Functions that generate DOM elements like el.div(...) will live in el
*/
let el = {}
export default el

/*
	domElementFunction is the behind the scenes logic for the functions like el.div(...)
	Below you will find the loop that uses domElementFunction
*/
el.domElementFunction = function(tagName, ...params){
	// Create a boring DOM element
	let element = document.createElement(tagName)

	// A convenience function to allow chaining like `let fooDiv = el.div().appendTo(document.body)`
	element.appendTo = function(parent){
		parent.appendChild(this)
		return this
	}

	// if element.parentElement exists, call removeChild(element) on it 
	element.remove = function(){
		if(this.parentElement){
			this.parentElement.removeChild(this)
		}
		return this
	}

	// A convenience function to allow appending strings, dictionaries of attributes, arrays of subchildren, or children
	element.append = function(child=null){
		if(child === null){ return }
		if(typeof child === 'string'){
			this.appendChild(document.createTextNode(child))
		} else if(Array.isArray(child)){
			for(let subChild of child){
				this.append(subChild)
			}
		// If it's an object but not a DOM element, consider it a dictionary of attributes
		} else if(typeof child === 'object' && typeof child.nodeType === 'undefined'){
			for(let key in child){
				if(child.hasOwnProperty(key) == false){
					continue
				}
				this.setAttribute(key, child[key])
			}
		} else {
			this.appendChild(child)
		}
		return this
	}

	element.documentPosition = function(){
		return el.documentOffset(this)
	}

	/*
	Sort element.children *in place* using the comparator function
	See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort for an explanation of the comparator function
	*/
	element.sort = function(comparator=el.defaultComparator){
		// Populate the holding array while removing children from the DOM
		let holdingArray = [];
		while(this.children.length > 0){
			holdingArray.push(this.removeChild(this.children.item(0)))
		}
		holdingArray.sort(comparator)
		for(let child of holdingArray){
			this.appendChild(child);
		}
		return this
	}

	// Sort element.children *in place* using child[attributeName] and the comparator function
	element.sortByAttribute = function(attributeName, comparator=el.defaultComparator){
		this.sort((el1, el2) => {
			return comparator(el1.getAttribute(attributeName), el2.getAttribute(attributeName))
		})
		return this
	}

	// Convenience functions to add and remove classes from this element without duplication
	element.addClass = function(className){
		const classAttribute = this.getAttribute('class') || ''
		const classes = classAttribute.split(/\s+/)
		if(classes.indexOf(className) != -1){
			// Already has that class
			return this
		}
		this.setAttribute('class', (classAttribute + ' ' + className).trim())
		return this
	}
	element.removeClass = function(className){
		let classAttribute = this.getAttribute('class') || ''
		const classes = classAttribute.split(/\s+/)
		const index = classes.indexOf(className)
		if(index == -1){
			// Already does not have that class
			return this
		}
		classes.splice(index, 1)
		classAttribute = classes.join(' ').trim()
		if(classAttribute.length == 0){
			this.removeAttribute('class')
		} else {
			this.setAttribute('class', classes.join(' ').trim())
		}
		return this
	}

	// Append the children parameters
	for(let child of params){
		element.append(child)
	}
	return element
}

// This comparator stringifies the passed values and returns the comparison of those values
el.defaultComparator = function(el1, el2){
	if(el1 === el2) return 0
	let str1 = '' + el1
	let str2 = '' + el2
	if(str1 == str2) return 0
	if(str1 < str2) return -1
	return 1
}

// Traverse the document tree to calculate the offset in the entire document of this element
el.documentOffset = function(element){
	let left = 0
	let top = 0
	var findPos = function(obj) {
		left += obj.offsetLeft
		top += obj.offsetTop
		if(obj.offsetParent){
			findPos(obj.offsetParent)
		}
	}
	findPos(element)
	return [left, top]
}

/* 
	The tag names that will be used to generate all of the element generating functions like el.div(...) and el.button(...)
	These names were ovingly copied from the excellent Laconic.js 
	https://github.com/joestelmach/laconic/blob/master/laconic.js
*/
el.TAGS = ['a', 'abbr', 'address', 'area', 'article', 'aside', 'audio', 'b',
	'base', 'bdo', 'blockquote', 'body', 'br', 'button', 'canvas', 'caption',
	'cite', 'code', 'col', 'colgroup', 'command', 'datalist', 'dd', 'del',
	'details', 'dfn', 'div', 'dl', 'dt', 'em', 'embed', 'fieldset',
	'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5',
	'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'i', 'iframe', 'img',
	'input', 'ins', 'keygen', 'kbd', 'label', 'legend', 'li', 'link', 'map',
	'mark', 'menu', 'meta', 'meter', 'nav', 'noscript', 'object', 'ol',
	'optgroup', 'option', 'output', 'p', 'picture', 'param', 'pre', 'progress', 
	'q', 'rp', 'rt', 'ruby', 's', 'samp', 'script', 'section', 'select', 
	'small', 'source', 'span', 'strong', 'style', 'sub', 'summary', 'sup', 
	'table', 'tbody', 'td', 'textarea', 'tfoot', 'th', 'thead', 'time', 'title',
	'tr', 'ul', 'var', 'video', 'wbr']

// This loop generates the element generating functions like el.div(...)
for(let tag of el.TAGS){
	let innerTag = tag
	el[innerTag] = function(...params){
		return el.domElementFunction(innerTag, ...params)
	}
}