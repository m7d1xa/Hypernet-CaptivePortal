const fs = require('fs');
const { PNG } = require('pngjs');

fs.createReadStream('src/assets/images/logo.png')
  .pipe(new PNG({ filterType: 4 }))
  .on('parsed', function() {
    console.log(`Image parsed: ${this.width}x${this.height}`);
    let whitePixels = 0;
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        let idx = (this.width * y + x) << 2;
        let r = this.data[idx];
        let g = this.data[idx + 1];
        let b = this.data[idx + 2];
        let a = this.data[idx + 3];

        // Calculate lightness / distance from white
        // White is (255, 255, 255)
        let minVal = Math.min(r, g, b);
        let maxVal = Math.max(r, g, b);

        // If pixel is very close to white, make it transparent with smooth gradient alpha
        if (minVal > 220) {
          whitePixels++;
          // Smooth alpha drop off for antialiasing near edges
          let threshold = 220;
          let factor = (255 - minVal) / (255 - threshold); // 0 at 255, 1 at 220
          this.data[idx + 3] = Math.floor(Math.max(0, Math.min(255, factor * 255)));
        }
      }
    }

    console.log(`Processed ${whitePixels} near-white pixels out of ${this.width * this.height}`);
    
    this.pack().pipe(fs.createWriteStream('src/assets/images/logo.png'))
      .on('finish', () => console.log('Saved transparent logo.png!'));
  });
