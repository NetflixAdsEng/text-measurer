const PADDING_TO_HEIGHT = 0.2
const FONT_KEYS = ['fontFamily', 'fontWeight', 'fontSize']

class TextMeasurer {
	constructor({
		fontFamily = 'Times',
		fontWeight = 'normal',
		fontSize = 200,
		canvasHeight,
		_centerText = false,
		_bgColor,
		_textColor
	} = {}) {
		this.canvasHeight = canvasHeight
		this.canvas = document.createElement('canvas')
		this.context = this.canvas.getContext('2d')
		this.text = ''
		this._centerText = _centerText
		this._bgColor = _bgColor
		this._textColor = _textColor
		this.updateFont({
			fontFamily,
			fontWeight,
			fontSize
		})
		this._initializeCanvas(this.text)
	}

	updateFont(fontOpts = {}) {
		const fontKeys = Object.keys(fontOpts).filter(key => FONT_KEYS.includes(key))
		if (fontKeys.length) {
			fontKeys.forEach(key => {
				if (fontOpts[key]) {
					if (fontOpts[key] === 'fontSize') {
						this[key] = parseInt(fontOpts[key], 10)
					} else {
						this[key] = fontOpts[key]
					}
				}
			})

			// this.context.font = `${this.fontWeight} ${this.fontSize}px ${this.fontFamily}`
		}
	}

	_initializeCanvas(text) {
		// approximating min necessary width to fit text
		this.canvas.width = this.fontSize * text.length
		// adding padding to account for accents and such
		const defaultPad = Math.round(PADDING_TO_HEIGHT * this.fontSize)
		const defaultHeight = this.fontSize + defaultPad * 2
		if (this.canvasHeight && this.canvasHeight >= defaultHeight) {
			this.canvas.height = this.canvasHeight
			this.pad = Math.round((this.canvasHeight - this.fontSize) / 2)
		} else {
			this.pad = defaultPad
			this.canvas.height = defaultHeight
		}
		this._center = this.canvas.height / 2
		this.context.font = `${this.fontWeight} ${this.fontSize}px ${this.fontFamily}`
		this.context.textBaseline = 'top'
		this.context.textAlign = 'center'
	}

	renderText(text) {
		const { canvas, context } = this

		// skip rerender if same text
		if (text === this.text) {
			return
		}

		// reset internal metric values
		delete this._topY
		delete this._bottomY
		delete this._centerY

		this.text = text || this.text
		this._initializeCanvas(this.text)
		context.clearRect(0, 0, canvas.width, canvas.height)
		context.fillText(this.text, Math.round(canvas.width / 2), this.pad, canvas.width)
		this.imageData = context.getImageData(0, 0, canvas.width, canvas.height)
	}

	// internal base function for calculating or pulling cached metric
	_calcMetric(text, prop, measureFn) {
		if (!this.imageData || (text && text !== this.text)) {
			this.renderText(text)
		}

		if (this[prop] === undefined) {
			this[prop] = measureFn(this.imageData)
		}
		return this[prop]
	}

	calcTopY(text) {
		return this._calcMetric(text, '_topY', getTopY)
	}

	calcBottomY(text) {
		return this._calcMetric(text, '_bottomY', getBottomY)
	}

	calcCenterY(text, { useCenterOfMass = false }) {
		return this._calcMetric(text, '_centerY', useCenterOfMass ? getCM : getAbsCenter)
	}

	// keeping for demo at the moment
	getCenterOfText(text, { centerText = false, useCenterOfMass = true, usePerChar = false } = {}) {
		const { canvas, context } = this

		context.clearRect(0, 0, canvas.width, canvas.height)

		this.text = text || this.text
		this._initializeCanvas(this.text)

		const measureFn = useCenterOfMass ? getCM : getAbsCenter

		let measureResult
		if (usePerChar) {
			measureResult = this.getAvgOfPerLetterMedian(this.text, measureFn)
		} else {
			context.fillText(this.text, Math.round(canvas.width / 2), this.pad, canvas.width)
			const imgData = context.getImageData(0, 0, canvas.width, canvas.height)

			measureResult = measureFn(imgData)
		}

		this._center = measureResult.center
		this._topY = measureResult.topY
		this._bottomY = measureResult.bottomY

		// center text
		// for debug purposes when rendering internal canvas
		if (centerText || this._bgColor || this._textColor) {
			const fixingOffset = centerText ? canvas.height / 2 - this._center : 0

			if (this._bgColor) {
				context.fillStyle = this._bgColor
				context.fillRect(0, 0, canvas.width, canvas.height)
			} else {
				context.clearRect(0, 0, canvas.width, canvas.height)
			}

			this._textColor && (context.fillStyle = this._textColor)
			context.fillText(this.text, Math.round(canvas.width / 2), this.pad + fixingOffset, canvas.width)
		}

		return this._center
	}

	// get offset which should vertically center text according to its calculated center
	getCenteringOffset(text, centerCalcOpts) {
		const center = this.getCenterOfText(text, centerCalcOpts)
		context.fillText(this.text, Math.round(canvas.width / 2), this.pad, canvas.width)
		this.imageData = context.getImageData(0, 0, canvas.width, canvas.height)

		const measureFn = useCenterOfMass ? getCM : getAbsCenter
		const measureResult = measureFn(this.imageData)
		return this.canvas.height / 2 - center
	}

	// get percentage of text height at which center occurs
	getCenterHeightPercentage(text, centerCalcOpts) {
		const center = this.getCenterOfText(text, centerCalcOpts)

		// get top and bottom y vals after calculating center
		// const topY = this._topY;
		// const bottomY = this._bottomY;
		const topY = this.pad
		const bottomY = this.canvas.height - this.pad

		return (center - topY) / (bottomY - topY)
	}

	getAvgOfPerLetterMedian(text, measureFn) {
		const textWithoutSpaces = Array.prototype.filter.call(text, c => !/\s/.test(c))
		const centerResultsPerChar = textWithoutSpaces.map(char => {
			this._initializeCanvas(char)
			this.context.fillText(char, Math.round(this.canvas.width / 2), this.pad, this.canvas.width)
			const imgData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height)

			const measureResult = measureFn(imgData)
			measureResult.width = this.canvas.width

			return measureResult
		})

		// reset canvas
		this._initializeCanvas(text)

		const totalWidth = getSum(centerResultsPerChar.map(result => result.width))
		const centerWidthProducts = centerResultsPerChar.map(({ center, width }) => center * width)
		const center = getSum(centerWidthProducts) / totalWidth

		const topY = centerResultsPerChar.reduce((top, result) => Math.min(top, result.top), Infinity)
		const bottomY = centerResultsPerChar.reduce((bottom, result) => Math.max(bottom, result.bottom), -Infinity)

		return {
			center,
			topY,
			bottomY
		}
	}
}

function getSum(nums) {
	return nums.reduce((sum, num) => sum + num)
}

function avg(nums) {
	const sum = getSum(nums)
	const n = nums.length
	return sum / n
}

// get center of mass based on alpha value at each ImageData pixel
function getCM(imageData) {
	const { data, height, width } = imageData
	const imageDataRowWidth = 4 * width
	let totalAlpha = 0,
		topY
	// sum of (alpha value * y value in image matrix)
	let alphaTimesY = 0
	for (let i = 3, n = data.length; i < n; i += 4) {
		const rowIdx = Math.floor(i / imageDataRowWidth)
		const alpha = data[i]
		if (alpha > 0) {
			// store first rowIdx when alpha is greater than zero
			if (topY === undefined) {
				topY = rowIdx
			}

			alphaTimesY += alpha * (rowIdx + 0.5)
			totalAlpha += alpha
		}
	}

	if (topY === undefined) {
		topY = 0
	}

	const center = alphaTimesY / totalAlpha
	const bottomY = getBottomY(imageData)
	return { center, bottomY, topY }
}

function getAbsCenter(imageData) {
	const { data, height, width } = imageData
	const imageDataRowWidth = 4 * width

	// find top y-value of text
	const topY = getTopY(imageData)

	// find bottom y-value of text
	const bottomY = getBottomY(imageData)

	return {
		center: Math.round((topY + bottomY) / 2),
		bottomY,
		topY
	}
}

function getTopY(imageData) {
	const { data, height, width } = imageData
	const imageDataRowWidth = 4 * width

	for (let i = 3, n = data.length; i < n; i += 4) {
		const rowIdx = Math.floor(i / imageDataRowWidth)
		const alpha = data[i]
		if (alpha > 0) {
			return rowIdx
		}
	}
	return 0
}

function getBottomY(imageData) {
	const { data, height, width } = imageData
	const imageDataRowWidth = 4 * width

	// find bottom y-value in imageData
	for (let i = data.length - 1; i > 0; i -= 4) {
		const rowIdx = Math.floor(i / imageDataRowWidth)
		const alpha = data[i]
		if (alpha > 0) {
			return rowIdx
		}
	}
	// if don't find nonzero alpha value, return last idx value
	return height - 1
}

export default TextMeasurer
