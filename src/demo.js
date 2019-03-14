import TextMeasurer from "./TextMeasurer";
import FFO from "fontfaceobserver";

const CENTER_OF_CANVAS_COLOR = "aqua";
const CENTER_OF_TEXT_COLOR = "magenta";
const NETFLIX_STOCK_COPY = [
  "WATCH NOW",
  "WATCH TRAILER",
  "COMING SOON",
  "LEARN MORE",
  "EN SAVOIR PLUS",
  "NEW EPISODES",
  "NOW STREAMING",
  "DÉCOUVREZ NETFLIX",
  // Arabic
  "شاهد الآن",
  // Hebrew
  "צפו עכשיו",
  // Thai
  "รับชมได้แล้ว"
];

const textInput = document.getElementById("change-text");
const changeBtn = document.getElementById("change-button");
const toggleTextCenterCheckbox = document.getElementById(
  "toggle-text-centering"
);
const toggleCanvasCenterCheckbox = document.getElementById(
  "toggle-canvas-center"
);
const toggleMeasureFnCheckbox = document.getElementById("toggle-measure-fn");
const select = document.getElementById("copy-select");

let centerText = true;
let drawCanvasCenter = true;
let useCM = true;

function initMeasurer() {
  window.measurer = new TextMeasurer({
    fontFamily: "Netflix Sans",
    fontSize: 60,
    fontWeight: "normal"
  });
  document.body.insertBefore(measurer.canvas, textInput);
  const center = measurer.getCenterOfText("WATCH NOW");
  console.log("center", center);

  const ctx = measurer.context;
  const canvas = measurer.canvas;

  const updateCanvas = () => {
    const text = textInput.value;

    if (text === "شاهد الآن") {
      measurer.updateFont({
        fontFamily: "Neue Helvetica Arab"
      });
    } else if (text === "צפו עכשיו") {
      measurer.updateFont({
        fontFamily: "Noto Sans Hebrew"
      });
    } else if (text === "รับชมได้แล้ว") {
      measurer.updateFont({
        fontFamily: "Graphik Thai"
      });
    } else {
      measurer.updateFont({
        fontFamily: "Netflix Sans"
      });
    }

    const center = measurer.getCenterOfText(text, {
      centerText,
      useCenterOfMass: useCM
    });

    // show padding
    const currFillStyle = ctx.fillStyle;
    ctx.fillStyle = "#333";
    ctx.fillRect(0, 0, canvas.width, measurer.pad);
    ctx.fillRect(0, canvas.height - measurer.pad, canvas.width, measurer.pad);
    ctx.fillStyle = currFillStyle;

    // canvas center
    drawCanvasCenter &&
      drawHorizLine(CENTER_OF_CANVAS_COLOR, Math.floor(canvas.height / 2));

    // text center
    !centerText && drawHorizLine(CENTER_OF_TEXT_COLOR, center);
  };

  updateCanvas("WATCH NOW");

  changeBtn.addEventListener("click", updateCanvas);
  textInput.addEventListener("keyup", e => {
    e.code === "Enter" && updateCanvas();
  });
  toggleTextCenterCheckbox.addEventListener("change", () => {
    centerText = toggleTextCenterCheckbox.checked;
    updateCanvas();
  });
  toggleCanvasCenterCheckbox.addEventListener("change", () => {
    drawCanvasCenter = toggleCanvasCenterCheckbox.checked;
    updateCanvas();
  });
  toggleMeasureFnCheckbox.addEventListener("change", () => {
    useCM = toggleMeasureFnCheckbox.checked;
    updateCanvas();
  });
  select.addEventListener("input", event => {
    const text = event.target.value;
    textInput.value = text;
    updateCanvas();
  });

  function drawHorizLine(color, y) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.moveTo(0, y);
    ctx.lineTo(measurer.canvas.width, y);
    ctx.stroke();
  }
}

function loadFont() {
  const fontData = {
    "Netflix Sans": { weight: 500 },
    "Graphik Thai": { weight: 500 },
    "Noto Sans Hebrew": { weight: 700 },
    "Neue Helvetica Arab": { weight: 700 }
  };

  const loadPromises = Object.keys(fontData).map(fam => {
    const data = fontData[fam];
    const loader = new FFO(fam, data);
    return loader.load().catch(err => {
      console.error(err);
    });
  });

  Promise.all(loadPromises).then(initMeasurer);
}

function initSelect() {
  NETFLIX_STOCK_COPY.forEach(copy => {
    const opt = document.createElement("option");
    opt.value = copy;
    opt.innerText = copy;
    select.appendChild(opt);
  });
}

initSelect();
loadFont();
