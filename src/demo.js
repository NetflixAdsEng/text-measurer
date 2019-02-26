import TextMeasurer from './TextMeasurer'

window.measurer = new TextMeasurer()
document.body.appendChild(measurer.canvas)
const center = measurer.getCenterOfText('_-----')
console.log('center', center)

const normalizedCenter = center
const ctx = measurer.context
ctx.beginPath()
ctx.strokeStyle = 'pink'
ctx.moveTo(0, normalizedCenter)
ctx.lineTo(measurer.canvas.width, normalizedCenter)
ctx.stroke()