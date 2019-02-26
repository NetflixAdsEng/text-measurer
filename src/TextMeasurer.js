class TextMeasurer {
  constructor({
    fontFamily = "Times",
    fontWeight = "normal",
    fontSize = 200
  } = {}) {
		this._queueRecalc = true
		this._center = 0
		this.fontFamily = fontFamily
		this.fontWeight = fontWeight
		this.fontSize = fontSize
    this.canvas = document.createElement("canvas");
		this.context = this.canvas.getContext("2d");
		this.text = ''
		this.initializeCanvas()
	}

	initializeCanvas() {
		// approximating min necessary width to fit text
		this.canvas.width = this.fontSize * this.text.length
		this.canvas.height = this.fontSize
		this._center = this.canvas.height / 2
		this.context.font = `${this.fontWeight} ${this.fontSize}px ${this.fontFamily}`
		this.context.textBaseline = 'top'
		this.context.textAlign = 'center'
	}

	getCenterOfText(text) {
		const { canvas, context } = this

		if (this._queueRecalc) {
			context.clearRect(0, 0, canvas.width, canvas.height)
			this.text = text || this.text;
			this.initializeCanvas()
			// context.fillStyle = 'blue'
			// context.fillRect(0, 0, canvas.width, canvas.height)
			context.fillText(this.text, canvas.width / 2, 0, canvas.width)
			this._imageData = context.getImageData(0, 0, canvas.width, canvas.height)
			this._center = getCM(this._imageData)
			this._queueRecalc = false
		}
		return this._center
	}
}

// get center of mass based on alpha value at each ImageData pixel
function getCM(imageData) {
	const { data, height, width } = imageData
	const imageDataRowWidth = 4 * width
	let totalAlpha = 0
	// sum of (alpha value * y value in image matrix)
	let alphaTimesY = 0
	for (let i = 3, n = data.length; i < n; i += 4) {
		const rowIdx = Math.floor(i / imageDataRowWidth)
		const alpha = data[i]
		if (alpha > 0) {
			alphaTimesY += alpha * (rowIdx + 0.5)
			totalAlpha += alpha
		}
	}
	const center = alphaTimesY / totalAlpha
	return center
}

export default TextMeasurer;
