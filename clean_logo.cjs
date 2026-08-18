const fs = require('fs');
const { PNG } = require('pngjs');

fs.createReadStream('src/assets/images/logo.png')
  .pipe(new PNG({ filterType: 4 }))
  .on('parsed', function() {
    console.log(`Cleaning image: ${this.width}x${this.height}`);
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        let idx = (this.width * y + x) << 2;
        let r = this.data[idx];
        let g = this.data[idx + 1];
        let b = this.data[idx + 2];
        let a = this.data[idx + 3];

        // If pixel alpha is not fully opaque, or if color is dark background
        // Let me check if alpha < 250 or if color is dark grey background
        if (a < 200) {
          this.data[idx] = 0;
          this.data[idx + 1] = 0;
          this.data[idx + 2] = 0;
          this.data[idx + 3] = 0;
        } else {
          // If it's dark grey background (r < 80 && g < 80 && b < 80)
          if (r < 75 && g < 75 && b < 80) {
            this.data[idx] = 0;
            this.data[idx + 1] = 0;
            this.data[idx + 2] = 0;
            this.data[idx + 3] = 0;
          }
        }
      }
    }

    this.pack().pipe(fs.createWriteStream('src/assets/images/logo.png'))
      .on('finish', () => console.log('Successfully cleaned logo.png!'));
  });
