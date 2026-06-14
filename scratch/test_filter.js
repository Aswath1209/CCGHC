const { createCanvas } = require('@napi-rs/canvas');
const canvas = createCanvas(100, 100);
const ctx = canvas.getContext('2d');
ctx.filter = 'hue-rotate(90deg)';
console.log('Supported filter value:', ctx.filter);
