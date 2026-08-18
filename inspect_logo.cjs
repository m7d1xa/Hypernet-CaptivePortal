const fs = require('fs');
const { PNG } = require('pngjs');

fs.createReadStream('src/assets/images/logo.png')
  .pipe(new PNG())
  .on('parsed', function() {
    console.log(`Dimensions: ${this.width}x${this.height}`);
    // Check top-left corner (0,0)
    let idx = 0;
    console.log(`Pixel (0,0): R=${this.data[idx]}, G=${this.data[idx+1]}, B=${this.data[idx+2]}, A=${this.data[idx+3]}`);
    // Check center pixel
    let centerIdx = (this.width * (this.height/2) + (this.width/2)) << 2;
    console.log(`Pixel (center): R=${this.data[centerIdx]}, G=${this.data[centerIdx+1]}, B=${this.data[centerIdx+2]}, A=${this.data[centerIdx+3]}`);
  });
