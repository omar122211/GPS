// Coordinate Transformation Tool
// Converts a pixel on an aerial image to GPS coordinates by linear interpolation
// between the image's corner coordinates (top-left is the origin).
(() => {
  const $ = (id) => document.getElementById(id);

  const config = {
    width: 420,
    height: 555,
    topLeft: { lat: 40.7589, lng: -73.9851 },
    topRight: { lat: 40.7589, lng: -73.9841 },
    bottomLeft: { lat: 40.7579, lng: -73.9851 },
    bottomRight: { lat: 40.7579, lng: -73.9841 },
  };
  const CORNERS = [
    ["topLeft", "TL", 0, 0],
    ["topRight", "TR", 100, 0],
    ["bottomLeft", "BL", 0, 100],
    ["bottomRight", "BR", 100, 100],
  ];

  const image = $("aerialImage");
  const history = [];
  let selected = null;

  // ---------- math ----------
  function scaleFactors() {
    const latSpan = config.topLeft.lat - config.bottomLeft.lat;
    const lngSpan = config.topRight.lng - config.topLeft.lng;
    return {
      latSpan,
      lngSpan,
      latPerPixel: latSpan / config.height,
      lngPerPixel: lngSpan / config.width,
    };
  }

  function pixelToCoordinates(x, y) {
    const { latPerPixel, lngPerPixel } = scaleFactors();
    return {
      lat: config.topLeft.lat - y * latPerPixel,
      lng: config.topLeft.lng + x * lngPerPixel,
    };
  }

  // pointer position → pixel in the configured image size (works when the image is scaled down)
  function eventToPixel(e) {
    const rect = image.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width) * (config.width / rect.width);
    const y = Math.min(Math.max(e.clientY - rect.top, 0), rect.height) * (config.height / rect.height);
    return { x, y };
  }

  const fmt = (n, d = 6) => n.toFixed(d);
  const hemi = (lat, lng) =>
    `${fmt(Math.abs(lat))}°${lat >= 0 ? "N" : "S"}, ${fmt(Math.abs(lng))}°${lng >= 0 ? "E" : "W"}`;

  // small helper: element with text (no HTML parsing)
  function el(tag, text, className) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function lines(container, rows) {
    container.replaceChildren(
      ...rows.flatMap((r, i) => {
        const parts = Array.isArray(r) ? r : [r];
        const nodes = parts.map((p) => (typeof p === "string" ? document.createTextNode(p) : p));
        return i < rows.length - 1 ? [...nodes, document.createElement("br")] : nodes;
      })
    );
  }

  // ---------- rendering ----------
  function renderImageSize() {
    image.style.width = config.width + "px";
    image.style.aspectRatio = `${config.width} / ${config.height}`;
  }

  function renderCorners() {
    image.querySelectorAll(".reference-point").forEach((p) => p.remove());
    for (const [key, tag, left, top] of CORNERS) {
      const point = el("div", undefined, `reference-point ${key}`);
      point.style.left = left + "%";
      point.style.top = top + "%";
      point.append(el("div", `${tag}  ${config[key].lat}°, ${config[key].lng}°`, "point-label"));
      image.append(point);
    }
  }

  function renderScale() {
    const s = scaleFactors();
    lines($("scaleFactors"), [
      [el("b", "Spans")],
      `latitude   ${fmt(s.latSpan)}°`,
      `longitude  ${fmt(s.lngSpan)}°`,
      [el("b", "Per pixel")],
      `latitude   ${fmt(s.latPerPixel, 8)}° / px`,
      `longitude  ${fmt(s.lngPerPixel, 8)}° / px`,
    ]);
  }

  function placePin(x, y) {
    image.querySelector(".click-point")?.remove();
    const pin = el("div", undefined, "click-point");
    pin.style.left = (x / config.width) * 100 + "%";
    pin.style.top = (y / config.height) * 100 + "%";
    pin.append(el("span", undefined, "ring"), el("span", undefined, "pin"));
    image.append(pin);
  }

  function showResult(x, y) {
    const { lat, lng } = pixelToCoordinates(x, y);
    const s = scaleFactors();
    selected = { lat, lng };
    placePin(x, y);

    const coords = $("coordinates");
    coords.classList.remove("placeholder");
    coords.textContent = hemi(lat, lng);
    $("pixelInfo").textContent = `pixel (${Math.round(x)}, ${Math.round(y)}) · image ${config.width}×${config.height}px`;

    lines($("transformationFormula"), [
      [el("b", "Target pixel"), ` (${Math.round(x)}, ${Math.round(y)})`],
      `lat = ${config.topLeft.lat} − (${Math.round(y)} × ${fmt(s.latPerPixel, 8)})`,
      `    = ${fmt(lat)}°`,
      `lng = ${config.topLeft.lng} + (${Math.round(x)} × ${fmt(s.lngPerPixel, 8)})`,
      `    = ${fmt(lng)}°`,
    ]);

    $("copyBtn").disabled = false;
    const maps = $("mapsLink");
    maps.href = `https://www.google.com/maps?q=${fmt(lat)},${fmt(lng)}`;
    maps.setAttribute("aria-disabled", "false");

    history.unshift({ x: Math.round(x), y: Math.round(y), lat, lng });
    history.length = Math.min(history.length, 5);
    renderHistory();
  }

  function renderHistory() {
    const list = $("history");
    if (!history.length) {
      list.replaceChildren(el("li", "Your clicks will appear here", "empty"));
      return;
    }
    list.replaceChildren(
      ...history.map((h, i) => {
        const li = el("li");
        const left = el("span");
        left.append(el("span", `#${history.length - i} `, "n"), document.createTextNode(`${fmt(h.lat)}, ${fmt(h.lng)}`));
        li.append(left, el("span", `(${h.x}, ${h.y})`, "px"));
        return li;
      })
    );
  }

  function resetResult(message) {
    image.querySelector(".click-point")?.remove();
    selected = null;
    const coords = $("coordinates");
    coords.classList.add("placeholder");
    coords.textContent = message;
    $("pixelInfo").textContent = "No point selected yet";
    $("transformationFormula").textContent = "Click on the image to see the transformation…";
    $("copyBtn").disabled = true;
    $("mapsLink").removeAttribute("href");
    $("mapsLink").setAttribute("aria-disabled", "true");
  }

  // ---------- reading the form ----------
  function readNumber(id) {
    const v = parseFloat($(id).value);
    return Number.isFinite(v) ? v : NaN;
  }

  function updateTransformation() {
    const next = {
      width: Math.round(readNumber("imageWidth")),
      height: Math.round(readNumber("imageHeight")),
      topLeft: { lat: readNumber("topLeftLat"), lng: readNumber("topLeftLng") },
      topRight: { lat: readNumber("topRightLat"), lng: readNumber("topRightLng") },
      bottomLeft: { lat: readNumber("bottomLeftLat"), lng: readNumber("bottomLeftLng") },
      bottomRight: { lat: readNumber("bottomRightLat"), lng: readNumber("bottomRightLng") },
    };

    const error = validate(next);
    const box = $("configError");
    if (error) {
      box.textContent = error;
      box.hidden = false;
      return;
    }
    box.hidden = true;

    Object.assign(config, next);
    renderImageSize();
    renderCorners();
    renderScale();
    resetResult("Configuration updated — click the image");
  }

  function validate(c) {
    if (![c.width, c.height].every((n) => Number.isFinite(n) && n >= 100 && n <= 2000))
      return "Image width and height must be between 100 and 2000 px.";
    const all = [c.topLeft, c.topRight, c.bottomLeft, c.bottomRight];
    if (all.some((p) => !Number.isFinite(p.lat) || !Number.isFinite(p.lng)))
      return "Every corner needs a latitude and a longitude.";
    if (all.some((p) => Math.abs(p.lat) > 90 || Math.abs(p.lng) > 180))
      return "Latitude must be between −90 and 90, longitude between −180 and 180.";
    if (c.topLeft.lat <= c.bottomLeft.lat) return "The top edge must be north of the bottom edge (top latitude > bottom latitude).";
    if (c.topRight.lng === c.topLeft.lng) return "The left and right edges need different longitudes.";
    return "";
  }

  // ---------- events ----------
  image.addEventListener("click", (e) => {
    const { x, y } = eventToPixel(e);
    showResult(x, y);
  });

  const readout = $("hoverReadout");
  image.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    const { x, y } = eventToPixel(e);
    const { lat, lng } = pixelToCoordinates(x, y);
    const px = (x / config.width) * 100, py = (y / config.height) * 100;
    $("xhH").style.top = py + "%";
    $("xhV").style.left = px + "%";
    readout.style.left = px + "%";
    readout.style.top = py + "%";
    readout.classList.toggle("flip-x", px > 55);
    readout.classList.toggle("flip-y", py > 85);
    readout.textContent = `${fmt(lat)}, ${fmt(lng)}`;
    image.classList.add("hovering");
  });
  image.addEventListener("pointerleave", () => image.classList.remove("hovering"));

  $("updateBtn").addEventListener("click", updateTransformation);
  document.querySelectorAll(".sidebar input").forEach((input) =>
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") updateTransformation(); })
  );

  $("copyBtn").addEventListener("click", async () => {
    if (!selected) return;
    const btn = $("copyBtn");
    try {
      await navigator.clipboard.writeText(`${fmt(selected.lat)}, ${fmt(selected.lng)}`);
      btn.textContent = "Copied ✓";
    } catch {
      btn.textContent = "Copy failed";
    }
    btn.classList.add("copied");
    setTimeout(() => { btn.textContent = "Copy"; btn.classList.remove("copied"); }, 1500);
  });

  // ---------- start ----------
  updateTransformation();
  resetResult("Click the image");
})();
