# Coordinate Transformation Tool

Click anywhere on an aerial image and get the real-world GPS coordinates of that spot.

**Live demo:** https://omar122211.github.io/GPS/

![Screenshot of the Coordinate Transformation Tool](docs/screenshot.jpg)

## Features

- **Click → coordinates** — drop a pin anywhere on the image and get its latitude/longitude
- **Live preview** — crosshair and coordinates follow your cursor
- **Copy** the result or **open it in Google Maps**
- **Your own images** — change the image size and the four corner coordinates
- **Show your work** — scale factors and the full calculation for every click
- **Recent points** — the last 5 clicks are listed
- Works on phones, tablets and desktop; no frameworks, no build step

## How it works

The image is treated as a flat rectangle between its corner coordinates (top-left is the origin):

```
lat per pixel = (top latitude − bottom latitude) / image height
lng per pixel = (right longitude − left longitude) / image width

latitude  = top-left latitude  − y × lat per pixel
longitude = top-left longitude + x × lng per pixel
```

The included photo covers exactly the area between the default corners
(40.7589, −73.9851) → (40.7579, −73.9841) in Times Square, New York, so every click returns that spot's true location.

## Run it locally

No install needed — open `index.html` in a browser, or serve the folder with any static server.

## Credits

Aerial imagery: NYS ITS Geospatial Services (NYS Statewide Digital Orthoimagery Program).
