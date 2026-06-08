const https = require('https');

const gifs = {
  "0": [
    "https://media4.giphy.com/media/v1.Y2lkPTZjMDliOTUybHM4N29ib3ZkY3JxNDhjbXlkeDAycnFtYWYyM3QxajF2eXltZ2Z4ayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/QtipHdYxYopX3W6vMs/giphy.gif"
  ],
  "4": [
    "https://media0.giphy.com/media/3o7btXfjIjTcU64YdG/giphy.gif",
    "https://media.giphy.com/media/ANpwXNVebeJ0TK9bTL/giphy.gif"
  ],
  "6": [
    "https://media3.giphy.com/media/v1.Y2lkPTZjMDliOTUya3R1eHhuaW85Mno1OTlycmJ2OXFibnA5NW5qc3Vid3djbXZkMjZ0NyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oKIPoelgPeRrfqKlO/giphy.gif",
    "https://media.giphy.com/media/kDXtscxqmTgm9XIWXk/giphy.gif",
    "https://media.giphy.com/media/3DHe8wnmz5VKpyucJt/giphy.gif",
    "https://media.giphy.com/media/tBfzeRunuQrP2kuTEb/giphy.gif"
  ],
  "out": [
    "https://media3.giphy.com/media/Wq3WRGe9N5HkSqjITT/giphy.gif",
    "https://media.giphy.com/media/trVKor40BRBF649Wad/giphy.gif",
    "https://media.giphy.com/media/fXcP4RuOgAah2g9dOb/giphy.gif",
    "https://media.giphy.com/media/DYbTfb0Gqe148AAcMP/giphy.gif"
  ],
  "50": [
    "https://media0.giphy.com/media/v1.Y2lkPTZjMDliOTUyYm5ueGVod2Z0MHcxNTF1dWVvY2EzOXo5bGxhcXdxMWFsOWl5Z3d6YyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LRsCOm65R3NHVwqiml/giphy.gif",
    "https://media.giphy.com/media/uoakmctOIA3ibVo6bZ/giphy.gif",
    "https://media.giphy.com/media/PjSaG1p15sRtBQCTW7/giphy.gif"
  ],
  "100": [
    "https://media3.giphy.com/media/v1.Y2lkPTZjMDliOTUya3EyMXE1dzY1dXE0Y3cwMDVzb2p6c3QxbTZ0MTR6aWdvY242ZnRzdyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l1ugo9PYts0eHIRDG/giphy.gif",
    "https://media.giphy.com/media/1bbvNisg9SBccNc3tx/giphy.gif"
  ]
};

function getRedirect(url) {
  return new Promise((resolve) => {
    let id = '';
    const parts = url.split('/');
    if (url.includes('/media/')) {
      const idx = parts.indexOf('media');
      id = parts[idx + 1];
    } else {
      id = parts[parts.length - 2];
    }
    
    const pageUrl = `https://giphy.com/gifs/${id}`;
    
    https.get(pageUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      }
    }, (res) => {
      resolve({ url, pageUrl, id, statusCode: res.statusCode, location: res.headers.location });
    }).on('error', (err) => {
      resolve({ url, error: err.message });
    });
  });
}

async function main() {
  for (const key of Object.keys(gifs)) {
    console.log(`\n--- Event Category: ${key} ---`);
    for (const url of gifs[key]) {
      const info = await getRedirect(url);
      console.log(`URL: ${url}`);
      console.log(`Redirect Location: ${info.location}`);
      console.log(`Status: ${info.statusCode}`);
    }
  }
}

main();
