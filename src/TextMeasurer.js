const PADDING_TO_HEIGHT = 0.2;
const FONT_KEYS = ["fontFamily", "fontWeight", "fontSize"];

class TextMeasurer {
  constructor({
    fontFamily = "Times",
    fontWeight = "normal",
    fontSize = 200,
    _centerText = false
  } = {}) {
    this._queueRecalc = true;
    this._center = 0;
    this.fontFamily = fontFamily;
    this.fontWeight = fontWeight;
    this.fontSize = parseInt(fontSize, 10);
    this.canvas = document.createElement("canvas");
    this.context = this.canvas.getContext("2d");
    this.text = "";
    this._centerText = _centerText;
    this._initializeCanvas();
  }

  updateFont(fontOpts = {}) {
    const fontKeys = Object.keys(fontOpts).filter(key =>
      FONT_KEYS.includes(key)
    );
    if (fontKeys.length) {
      fontKeys.forEach(key => {
        if (fontOpts[key]) {
          this[key] = fontOpts[key];
        }
      });

      this.context.font = `${this.fontWeight} ${this.fontSize}px ${
        this.fontFamily
      }`;
    }
  }

  _initializeCanvas() {
    // approximating min necessary width to fit text
    this.canvas.width = this.fontSize * this.text.length;
    // adding padding to account for accents and such
    this.pad = Math.round(PADDING_TO_HEIGHT * this.fontSize);
    this.canvas.height = this.fontSize + this.pad * 2;
    this._center = this.canvas.height / 2;
    this.context.font = `${this.fontWeight} ${this.fontSize}px ${
      this.fontFamily
    }`;
    this.context.textBaseline = "top";
    this.context.textAlign = "center";
  }

  getCenterOfText(text, { centerText = false, useCenterOfMass = true } = {}) {
    const { canvas, context } = this;

    context.clearRect(0, 0, canvas.width, canvas.height);
    this.text = text || this.text;
    this._initializeCanvas();
    context.fillText(this.text, canvas.width / 2, this.pad, canvas.width);
    this._imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    const measureFn = useCenterOfMass ? getCM : getAbsCenter;
    this._center = measureFn(this._imageData);
    this._queueRecalc = false;

    // center text
    // for debug purposes when rendering internal canvas
    if (centerText) {
      const fixingOffset = canvas.height / 2 - this._center;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillText(
        this.text,
        canvas.width / 2,
        this.pad + Math.round(fixingOffset),
        canvas.width
      );
    }

    return this._center;
  }

  // get offset which should vertically center text according to its calculated center
  getCenteringOffset(text, centerCalcOpts) {
    var center = this.getCenterOfText(text, centerCalcOpts);
    return this.canvas.height / 2 - center;
  }
}

// get center of mass based on alpha value at each ImageData pixel
function getCM(imageData) {
  const { data, height, width } = imageData;
  const imageDataRowWidth = 4 * width;
  let totalAlpha = 0;
  // sum of (alpha value * y value in image matrix)
  let alphaTimesY = 0;
  for (let i = 3, n = data.length; i < n; i += 4) {
    const rowIdx = Math.floor(i / imageDataRowWidth);
    const alpha = data[i];
    if (alpha > 0) {
      alphaTimesY += alpha * (rowIdx + 0.5);
      totalAlpha += alpha;
    }
  }
  const center = alphaTimesY / totalAlpha;
  return center;
}

function getAbsCenter(imageData) {
  const { data, height, width } = imageData;
  const imageDataRowWidth = 4 * width;
  let topY, bottomY;
  // find top y-value of text
  for (let i = 3, n = data.length; i < n; i += 4) {
    const rowIdx = Math.floor(i / imageDataRowWidth);
    const alpha = data[i];
    if (alpha > 0) {
      topY = rowIdx;
      break;
    }
  }
  // find bottom y-value of text
  for (let i = data.length - 1; i > 0; i -= 4) {
    const rowIdx = Math.floor(i / imageDataRowWidth);
    const alpha = data[i];
    if (alpha > 0) {
      bottomY = rowIdx;
      break;
    }
  }

  return Math.round((topY + bottomY) / 2);
}

export default TextMeasurer;
