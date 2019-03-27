# Text Measurer

Utility for calculating text metrics by measuring HTML5 Canvas-rendered pixel data

## Usage

First you'll want to instantiate the measurer:

```js
const measurer = new TextMeasurer({
  fontFamily, // string : name of font to use
  // defaults to 'Times'

  fontSize, // number : value of font size (in px)
  // defaults to 12

  fontWeight // string | number : any valid font-weight CSS value
  // defaults to 'normal'
});
```

If you need to update certain font properties, you can use the `updateFont` method to do so:

```js
measurer.updateFont({
  fontFamily,
  fontSize,
  fontWeight
});
```

You can then render the text and then calculate the top, bottom, and center y-values of that text:

```js
const text = "Cool Text";

// call this to initially render text
measurer.renderText(text);

// then you can calculate desired values
const topY = measurer.calcTopY();
const bottomY = measurer.calcBottomY();
const centerY = measurer.calcCenterY();

// you can also just pass the text
// to these calculating methods will
// will call the renderText method internally
measurer.calcTopY(text);
```

## Methods

* **renderText** - params : - text : string - render text in internal canvas
* **calcTopY** - params : - text : (optional) string - calculates top y-value
* **calcBottomY** - params : - text : (optional) string - calculates bottom y-value
* **calcCenterY** - params : - text : (optional) string - calculates center y-value

## Instance Properties

* **canvas** : Internal `HTMLElementCanvas` instance - `height` calculated using font size value as initial height plus some padding (see **pad** property below) - `width` calculated using `text length x font size`
* **context** : Internal `CanvasRenderingContext2D` instance from `this.canvas`
* **text** : Last text rendered
* **pad** : Vertical padding to account for any diacritical marks (e.g. accents) - calculated as fraction of font size
* **imageData** : Stored image data from last render
