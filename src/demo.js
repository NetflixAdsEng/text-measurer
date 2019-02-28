import TextMeasurer from "./TextMeasurer";

const textInput = document.getElementById("change-text");
const changeBtn = document.getElementById("change-button");

window.measurer = new TextMeasurer({
  fontFamily: "Netflix Sans",
  fontSize: 30,
  fontWeight: "normal"
});
document.body.insertBefore(measurer.canvas, textInput);
const center = measurer.getCenterOfText("WATCH NOW");
console.log("center", center);

const normalizedCenter = center;
const ctx = measurer.context;

// drawTextCenterLine();

changeBtn.addEventListener("click", () => {
  measurer.getCenterOfText(textInput.value);
});

function drawTextCenterLine() {
  ctx.beginPath();
  ctx.strokeStyle = "pink";
  ctx.moveTo(0, normalizedCenter);
  ctx.lineTo(measurer.canvas.width, normalizedCenter);
  ctx.stroke();
}
