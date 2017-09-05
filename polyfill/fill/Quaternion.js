/*
Quaternion wraps a vector of length 4 used as an orientation value.

Taken from https://github.com/googlevr/webvr-polyfill/blob/master/src/math-util.js which took it from Three.js
*/
export default class Quaternion {
	constructor(x=0, y=0, z=0, w=1) {
		this.x = x
		this.y = y
		this.z = z
		this.w = w
	}

	set(x, y, z, w) {
		this.x = x
		this.y = y
		this.z = z
		this.w = w
		return this
	}

	copy(quaternion) {
		this.x = quaternion.x
		this.y = quaternion.y
		this.z = quaternion.z
		this.w = quaternion.w
		return this
	}

	setFromEulerXYZ(x, y, z){
		const c1 = Math.cos(x / 2)
		const c2 = Math.cos(y / 2)
		const c3 = Math.cos(z / 2)
		const s1 = Math.sin(x / 2)
		const s2 = Math.sin(y / 2)
		const s3 = Math.sin(z / 2)
		this.x = s1 * c2 * c3 + c1 * s2 * s3
		this.y = c1 * s2 * c3 - s1 * c2 * s3
		this.z = c1 * c2 * s3 + s1 * s2 * c3
		this.w = c1 * c2 * c3 - s1 * s2 * s3
		return this
	}

	setFromEulerYXZ: function(x, y, z){
		const c1 = Math.cos(x / 2)
		const c2 = Math.cos(y / 2)
		const c3 = Math.cos(z / 2)
		const s1 = Math.sin(x / 2)
		const s2 = Math.sin(y / 2)
		const s3 = Math.sin(z / 2)
		this.x = s1 * c2 * c3 + c1 * s2 * s3
		this.y = c1 * s2 * c3 - s1 * c2 * s3
		this.z = c1 * c2 * s3 - s1 * s2 * c3
		this.w = c1 * c2 * c3 + s1 * s2 * s3
		return this
	}

	setFromAxisAngle(axis, angle){
		// http://www.euclideanspace.com/maths/geometry/rotations/conversions/angleToQuaternion/index.htm
		// assumes axis is normalized
		const halfAngle = angle / 2
		const s = Math.sin(halfAngle)
		this.x = axis.x * s
		this.y = axis.y * s
		this.z = axis.z * s
		this.w = Math.cos(halfAngle)
		return this
	},

	multiply(q){
		return this.multiplyQuaternions(this, q)
	}

	multiplyQuaternions(a, b){
		// from http://www.euclideanspace.com/maths/algebra/realNormedAlgebra/quaternions/code/index.htm
		const qax = a.x, qay = a.y, qaz = a.z, qaw = a.w
		const qbx = b.x, qby = b.y, qbz = b.z, qbw = b.w
		this.x = qax * qbw + qaw * qbx + qay * qbz - qaz * qby
		this.y = qay * qbw + qaw * qby + qaz * qbx - qax * qbz
		this.z = qaz * qbw + qaw * qbz + qax * qby - qay * qbx
		this.w = qaw * qbw - qax * qbx - qay * qby - qaz * qbz
		return this
	}

	inverse(){
		this.x *= -1
		this.y *= -1
		this.z *= -1
		this.normalize()
		return this
	}

	normalize(){
		let l = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w)
		if (l === 0) {
			this.x = 0
			this.y = 0
			this.z = 0
			this.w = 1
		} else {
			l = 1 / l
			this.x = this.x * l
			this.y = this.y * l
			this.z = this.z * l
			this.w = this.w * l
		}
		return this
	}

	slerp(qb, t){
		// http://www.euclideanspace.com/maths/algebra/realNormedAlgebra/quaternions/slerp/
		if(t === 0) return this
		if(t === 1) return this.copy(qb)

		const x = this.x, y = this.y, z = this.z, w = this.w
		const cosHalfTheta = w * qb.w + x * qb.x + y * qb.y + z * qb.z
		if (cosHalfTheta < 0) {
			this.w = - qb.w
			this.x = - qb.x
			this.y = - qb.y
			this.z = - qb.z
			cosHalfTheta = - cosHalfTheta
		} else {
			this.copy(qb)
		}
		if (cosHalfTheta >= 1.0) {
			this.w = w
			this.x = x
			this.y = y
			this.z = z
			return this
		}

		const halfTheta = Math.acos(cosHalfTheta)
		const sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta)
		if (Math.abs(sinHalfTheta) < 0.001) {
			this.w = 0.5 * (w + this.w)
			this.x = 0.5 * (x + this.x)
			this.y = 0.5 * (y + this.y)
			this.z = 0.5 * (z + this.z)

			return this
		}

		const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta
		const ratioB = Math.sin(t * halfTheta) / sinHalfTheta
		this.w = (w * ratioA + this.w * ratioB)
		this.x = (x * ratioA + this.x * ratioB)
		this.y = (y * ratioA + this.y * ratioB)
		this.z = (z * ratioA + this.z * ratioB)
		return this
	}
}