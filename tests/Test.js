export default class Test {
	run(){
		for(let name of Object.getOwnPropertyNames(Object.getPrototypeOf(this))){
			if(name.startsWith('test') && typeof this[name] === 'function'){
				this[name]()
			}
		}
	}

	assertEqual(item1, item2){
		if(item1 === item2) return true
		if(item1 == item2) return true
		throw new Error('Unequal? ' + item1 + " / " + item2)
	}

	assertFloatArraysEqual(array1, array2, decimalPrecision=5){
		if(Array.isArray(array1) === false && array1 instanceof Float32Array === false) throw new Error('Not equal: ' + array1 + ' / ' + array2)
		if(Array.isArray(array2) === false && array2 instanceof Float32Array === false) throw new Error('Not equal: ' + array1 + ' / ' + array2)
		if(array1.length != array2.length) throw new Error('Not equal: ' + array1 + ' / ' + array2)
		const precisionMultiplier = 10^decimalPrecision
		for(let i=0; i < array1.length; i++){
			const a1 = Math.trunc((array1[i] * precisionMultiplier)) / precisionMultiplier
			const a2 = Math.trunc((array2[i] * precisionMultiplier)) / precisionMultiplier
			if(a1 !== a2) throw new Error('Not equal: ' + array1 + ' / ' + array2)
		}
	}
}
