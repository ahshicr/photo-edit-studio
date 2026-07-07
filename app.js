"use strict";

(() => {
  const state = {
    baseCanvas: document.createElement("canvas"),
    cropMode: false,
    cropStart: null,
    cropRect: null,
    history: [],
    actions: ["已载入示例图像"]
  };

  const elements = {
    input: document.getElementById("imageInput"),
    preview: document.getElementById("previewCanvas"),
    canvasWrap: document.getElementById("canvasWrap"),
    cropBox: document.getElementById("cropBox"),
    dropZone: document.getElementById("dropZone"),
    imageInfo: document.getElementById("imageInfo"),
    historyList: document.getElementById("historyList"),
    undo: document.getElementById("undoButton"),
    reset: document.getElementById("resetButton"),
    downloadTop: document.getElementById("downloadButton"),
    downloadSide: document.getElementById("downloadButtonSide"),
    startCrop: document.getElementById("startCropButton"),
    applyCrop: document.getElementById("applyCropButton"),
    aspectRatio: document.getElementById("aspectRatio"),
    rotateLeft: document.getElementById("rotateLeftButton"),
    rotateRight: document.getElementById("rotateRightButton"),
    flipX: document.getElementById("flipXButton"),
    flipY: document.getElementById("flipYButton"),
    applyAdjustments: document.getElementById("applyAdjustmentsButton"),
    addText: document.getElementById("addTextButton"),
    exportQuality: document.getElementById("exportQuality"),
    qualityValue: document.getElementById("qualityValue")
  };

  const controls = {
    brightness: document.getElementById("brightness"),
    contrast: document.getElementById("contrast"),
    saturation: document.getElementById("saturation"),
    temperature: document.getElementById("temperature"),
    sharpness: document.getElementById("sharpness")
  };

  const valueLabels = {
    brightness: document.getElementById("brightnessValue"),
    contrast: document.getElementById("contrastValue"),
    saturation: document.getElementById("saturationValue"),
    temperature: document.getElementById("temperatureValue"),
    sharpness: document.getElementById("sharpnessValue")
  };

  const textInputs = {
    content: document.getElementById("textContent"),
    size: document.getElementById("textSize"),
    color: document.getElementById("textColor"),
    x: document.getElementById("textX"),
    y: document.getElementById("textY")
  };

  const exportInputs = {
    name: document.getElementById("fileName"),
    format: document.getElementById("exportFormat"),
    quality: document.getElementById("exportQuality")
  };

  const previewContext = elements.preview.getContext("2d", { willReadFrequently: true });
  const baseContext = state.baseCanvas.getContext("2d", { willReadFrequently: true });

  init();

  function init() {
    drawSampleImage();
    bindEvents();
    syncAdjustmentLabels();
    renderPreview();
    renderHistory();
  }

  function bindEvents() {
    elements.input.addEventListener("change", (event) => {
      const file = event.target.files && event.target.files[0];
      if (file) loadFile(file);
      event.target.value = "";
    });

    elements.dropZone.addEventListener("dragover", (event) => {
      event.preventDefault();
      elements.dropZone.classList.add("dragging");
    });

    elements.dropZone.addEventListener("dragleave", () => {
      elements.dropZone.classList.remove("dragging");
    });

    elements.dropZone.addEventListener("drop", (event) => {
      event.preventDefault();
      elements.dropZone.classList.remove("dragging");
      const file = event.dataTransfer.files && event.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) loadFile(file);
    });

    Object.entries(controls).forEach(([key, input]) => {
      input.addEventListener("input", () => {
        valueLabels[key].textContent = input.value;
        renderPreview();
      });
    });

    document.querySelectorAll("[data-preset]").forEach((button) => {
      button.addEventListener("click", () => applyPreset(button.dataset.preset));
    });

    elements.applyAdjustments.addEventListener("click", () => {
      pushHistory();
      commitPreviewToBase("应用基础调节");
      resetAdjustments();
    });

    elements.startCrop.addEventListener("click", () => {
      state.cropMode = true;
      state.cropRect = null;
      elements.cropBox.hidden = true;
      addAction("进入裁剪框选模式");
    });

    elements.applyCrop.addEventListener("click", applyCrop);
    elements.rotateLeft.addEventListener("click", () => rotateImage(-90));
    elements.rotateRight.addEventListener("click", () => rotateImage(90));
    elements.flipX.addEventListener("click", () => flipImage("x"));
    elements.flipY.addEventListener("click", () => flipImage("y"));
    elements.addText.addEventListener("click", addText);
    elements.undo.addEventListener("click", undo);
    elements.reset.addEventListener("click", resetToSample);
    elements.downloadTop.addEventListener("click", downloadImage);
    elements.downloadSide.addEventListener("click", downloadImage);
    elements.exportQuality.addEventListener("input", () => {
      elements.qualityValue.textContent = elements.exportQuality.value;
    });

    elements.canvasWrap.addEventListener("pointerdown", startCropDrag);
    elements.canvasWrap.addEventListener("pointermove", updateCropDrag);
    window.addEventListener("pointerup", finishCropDrag);
  }

  function drawSampleImage() {
    state.baseCanvas.width = 1600;
    state.baseCanvas.height = 1000;
    const ctx = baseContext;
    const gradient = ctx.createLinearGradient(0, 0, 1600, 1000);
    gradient.addColorStop(0, "#232526");
    gradient.addColorStop(0.42, "#6b7a70");
    gradient.addColorStop(1, "#d9ac5e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1600, 1000);

    ctx.fillStyle = "rgba(255,255,255,0.12)";
    for (let i = 0; i < 42; i += 1) {
      const x = (i * 173) % 1600;
      const y = (i * 97) % 1000;
      ctx.fillRect(x, y, 180 + (i % 5) * 34, 2);
    }

    ctx.fillStyle = "rgba(11,12,12,0.42)";
    ctx.fillRect(110, 120, 520, 760);
    ctx.fillStyle = "rgba(242,239,231,0.92)";
    ctx.font = "700 86px Microsoft YaHei, Arial";
    ctx.fillText("影修工坊", 150, 250);
    ctx.font = "38px Microsoft YaHei, Arial";
    ctx.fillText("上传图片后可本地裁剪、调色、加字和导出", 154, 330);
    ctx.fillStyle = "#42d1c5";
    ctx.fillRect(154, 390, 280, 10);

    ctx.fillStyle = "rgba(239,125,139,0.78)";
    ctx.beginPath();
    ctx.arc(1040, 460, 230, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(66,209,197,0.76)";
    ctx.beginPath();
    ctx.arc(1190, 610, 180, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillRect(870, 730, 450, 28);
    ctx.fillRect(900, 786, 300, 20);
    updateCanvasSize();
  }

  function loadFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        pushHistory();
        const size = fitWithin(image.width, image.height, 3200);
        state.baseCanvas.width = size.width;
        state.baseCanvas.height = size.height;
        baseContext.clearRect(0, 0, size.width, size.height);
        baseContext.drawImage(image, 0, 0, size.width, size.height);
        resetAdjustments();
        renderPreview();
        addAction(`载入图片：${file.name}`);
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function fitWithin(width, height, maxSide) {
    const scale = Math.min(1, maxSide / Math.max(width, height));
    return {
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale))
    };
  }

  function renderPreview() {
    updateCanvasSize();
    previewContext.clearRect(0, 0, elements.preview.width, elements.preview.height);
    previewContext.filter = filterString();
    previewContext.drawImage(state.baseCanvas, 0, 0);
    previewContext.filter = "none";
    applyTemperature(previewContext, Number(controls.temperature.value));
    applySharpness(previewContext, Number(controls.sharpness.value));
  }

  function updateCanvasSize() {
    elements.preview.width = state.baseCanvas.width;
    elements.preview.height = state.baseCanvas.height;
    elements.imageInfo.textContent = `${state.baseCanvas.width} x ${state.baseCanvas.height}`;
  }

  function filterString() {
    const brightness = 100 + Number(controls.brightness.value);
    const contrast = 100 + Number(controls.contrast.value);
    const saturation = 100 + Number(controls.saturation.value);
    return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
  }

  function applyTemperature(ctx, value) {
    if (!value) return;
    const imageData = ctx.getImageData(0, 0, elements.preview.width, elements.preview.height);
    const data = imageData.data;
    const amount = value * 0.62;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = clamp(data[i] + amount, 0, 255);
      data[i + 2] = clamp(data[i + 2] - amount, 0, 255);
    }
    ctx.putImageData(imageData, 0, 0);
  }

  function applySharpness(ctx, value) {
    if (value < 2) return;
    const amount = value / 100;
    const width = elements.preview.width;
    const height = elements.preview.height;
    const source = ctx.getImageData(0, 0, width, height);
    const output = ctx.createImageData(width, height);
    const src = source.data;
    const dst = output.data;
    const center = 1 + amount * 4;
    const side = -amount;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * 4;
        for (let channel = 0; channel < 3; channel += 1) {
          const current = src[index + channel] * center;
          const left = src[(y * width + Math.max(0, x - 1)) * 4 + channel] * side;
          const right = src[(y * width + Math.min(width - 1, x + 1)) * 4 + channel] * side;
          const up = src[(Math.max(0, y - 1) * width + x) * 4 + channel] * side;
          const down = src[(Math.min(height - 1, y + 1) * width + x) * 4 + channel] * side;
          dst[index + channel] = clamp(current + left + right + up + down, 0, 255);
        }
        dst[index + 3] = src[index + 3];
      }
    }
    ctx.putImageData(output, 0, 0);
  }

  function applyPreset(name) {
    const presets = {
      clean: { brightness: 8, contrast: 10, saturation: 8, temperature: 0, sharpness: 18 },
      portrait: { brightness: 12, contrast: -4, saturation: 10, temperature: 8, sharpness: 8 },
      warm: { brightness: 6, contrast: 8, saturation: 12, temperature: 28, sharpness: 10 },
      cool: { brightness: 0, contrast: 12, saturation: -6, temperature: -26, sharpness: 16 },
      mono: { brightness: 4, contrast: 24, saturation: -100, temperature: 0, sharpness: 22 },
      film: { brightness: -4, contrast: 18, saturation: -14, temperature: 18, sharpness: 6 }
    };
    const preset = presets[name];
    if (!preset) return;
    Object.entries(preset).forEach(([key, value]) => {
      controls[key].value = value;
    });
    syncAdjustmentLabels();
    renderPreview();
    addAction(`套用风格：${presetName(name)}`);
  }

  function presetName(name) {
    return {
      clean: "清透",
      portrait: "人像",
      warm: "暖调",
      cool: "冷调",
      mono: "黑白",
      film: "胶片"
    }[name] || name;
  }

  function commitPreviewToBase(actionName) {
    baseContext.clearRect(0, 0, state.baseCanvas.width, state.baseCanvas.height);
    baseContext.drawImage(elements.preview, 0, 0);
    renderPreview();
    addAction(actionName);
  }

  function resetAdjustments() {
    Object.values(controls).forEach((input) => {
      input.value = input.id === "sharpness" ? 0 : 0;
    });
    syncAdjustmentLabels();
    renderPreview();
  }

  function syncAdjustmentLabels() {
    Object.entries(controls).forEach(([key, input]) => {
      valueLabels[key].textContent = input.value;
    });
  }

  function startCropDrag(event) {
    if (!state.cropMode || event.button !== 0) return;
    const point = pointerToCanvas(event);
    if (!point) return;
    state.cropStart = point;
    state.cropRect = { x: point.x, y: point.y, width: 1, height: 1 };
    drawCropBox();
  }

  function updateCropDrag(event) {
    if (!state.cropMode || !state.cropStart) return;
    const point = pointerToCanvas(event);
    if (!point) return;
    const rect = makeCropRect(state.cropStart, point);
    state.cropRect = constrainAspect(rect);
    drawCropBox();
  }

  function finishCropDrag() {
    state.cropStart = null;
  }

  function pointerToCanvas(event) {
    const rect = elements.preview.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const x = (event.clientX - rect.left) * (elements.preview.width / rect.width);
    const y = (event.clientY - rect.top) * (elements.preview.height / rect.height);
    if (x < 0 || y < 0 || x > elements.preview.width || y > elements.preview.height) return null;
    return { x: clamp(x, 0, elements.preview.width), y: clamp(y, 0, elements.preview.height) };
  }

  function makeCropRect(start, end) {
    return {
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y)
    };
  }

  function constrainAspect(rect) {
    const value = elements.aspectRatio.value;
    if (value === "free" || rect.width < 2 || rect.height < 2) return rect;
    const [w, h] = value.split(":").map(Number);
    const ratio = w / h;
    let width = rect.width;
    let height = rect.height;
    if (width / height > ratio) width = height * ratio;
    else height = width / ratio;
    return {
      x: clamp(rect.x, 0, elements.preview.width - width),
      y: clamp(rect.y, 0, elements.preview.height - height),
      width,
      height
    };
  }

  function drawCropBox() {
    if (!state.cropRect || state.cropRect.width < 2 || state.cropRect.height < 2) {
      elements.cropBox.hidden = true;
      return;
    }
    const canvasRect = elements.preview.getBoundingClientRect();
    const wrapRect = elements.canvasWrap.getBoundingClientRect();
    const scaleX = canvasRect.width / elements.preview.width;
    const scaleY = canvasRect.height / elements.preview.height;
    elements.cropBox.hidden = false;
    elements.cropBox.style.left = `${canvasRect.left - wrapRect.left + state.cropRect.x * scaleX}px`;
    elements.cropBox.style.top = `${canvasRect.top - wrapRect.top + state.cropRect.y * scaleY}px`;
    elements.cropBox.style.width = `${state.cropRect.width * scaleX}px`;
    elements.cropBox.style.height = `${state.cropRect.height * scaleY}px`;
  }

  function applyCrop() {
    const rect = state.cropRect;
    if (!rect || rect.width < 8 || rect.height < 8) return;
    pushHistory();
    const crop = normalizedRect(rect);
    const next = document.createElement("canvas");
    next.width = crop.width;
    next.height = crop.height;
    next.getContext("2d").drawImage(
      state.baseCanvas,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      crop.width,
      crop.height
    );
    resizeBaseTo(next.width, next.height);
    baseContext.drawImage(next, 0, 0);
    state.cropMode = false;
    state.cropRect = null;
    elements.cropBox.hidden = true;
    renderPreview();
    addAction("应用裁剪");
  }

  function normalizedRect(rect) {
    return {
      x: Math.round(clamp(rect.x, 0, state.baseCanvas.width - 1)),
      y: Math.round(clamp(rect.y, 0, state.baseCanvas.height - 1)),
      width: Math.round(clamp(rect.width, 1, state.baseCanvas.width - rect.x)),
      height: Math.round(clamp(rect.height, 1, state.baseCanvas.height - rect.y))
    };
  }

  function rotateImage(degrees) {
    pushHistory();
    const next = document.createElement("canvas");
    const turnsRight = ((degrees % 360) + 360) % 360 === 90;
    next.width = state.baseCanvas.height;
    next.height = state.baseCanvas.width;
    const ctx = next.getContext("2d");
    if (turnsRight) {
      ctx.translate(next.width, 0);
      ctx.rotate(Math.PI / 2);
    } else {
      ctx.translate(0, next.height);
      ctx.rotate(-Math.PI / 2);
    }
    ctx.drawImage(state.baseCanvas, 0, 0);
    resizeBaseTo(next.width, next.height);
    baseContext.drawImage(next, 0, 0);
    renderPreview();
    addAction(degrees > 0 ? "右转90度" : "左转90度");
  }

  function flipImage(axis) {
    pushHistory();
    const next = document.createElement("canvas");
    next.width = state.baseCanvas.width;
    next.height = state.baseCanvas.height;
    const ctx = next.getContext("2d");
    if (axis === "x") {
      ctx.translate(next.width, 0);
      ctx.scale(-1, 1);
    } else {
      ctx.translate(0, next.height);
      ctx.scale(1, -1);
    }
    ctx.drawImage(state.baseCanvas, 0, 0);
    resizeBaseTo(next.width, next.height);
    baseContext.drawImage(next, 0, 0);
    renderPreview();
    addAction(axis === "x" ? "水平翻转" : "垂直翻转");
  }

  function addText() {
    const content = textInputs.content.value.trim();
    if (!content) return;
    pushHistory();
    const size = clamp(Number(textInputs.size.value) || 48, 12, 220);
    const x = state.baseCanvas.width * clamp(Number(textInputs.x.value) || 50, 0, 100) / 100;
    const y = state.baseCanvas.height * clamp(Number(textInputs.y.value) || 88, 0, 100) / 100;
    baseContext.save();
    baseContext.font = `700 ${size}px Microsoft YaHei, PingFang SC, Arial, sans-serif`;
    baseContext.textAlign = "center";
    baseContext.textBaseline = "middle";
    baseContext.lineWidth = Math.max(2, size * 0.08);
    baseContext.strokeStyle = "rgba(0,0,0,0.56)";
    baseContext.fillStyle = textInputs.color.value || "#ffffff";
    baseContext.strokeText(content, x, y);
    baseContext.fillText(content, x, y);
    baseContext.restore();
    renderPreview();
    addAction("添加文字/水印");
  }

  function downloadImage() {
    const output = document.createElement("canvas");
    output.width = elements.preview.width;
    output.height = elements.preview.height;
    output.getContext("2d").drawImage(elements.preview, 0, 0);
    const mime = exportInputs.format.value;
    const quality = clamp(Number(exportInputs.quality.value) / 100, 0.4, 1);
    const ext = mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png";
    const fileName = sanitizeFileName(exportInputs.name.value || "edited-photo");
    const link = document.createElement("a");
    link.href = output.toDataURL(mime, quality);
    link.download = `${fileName}.${ext}`;
    link.click();
    addAction(`导出 ${ext.toUpperCase()}`);
  }

  function sanitizeFileName(value) {
    return String(value).trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-") || "edited-photo";
  }

  function resizeBaseTo(width, height) {
    state.baseCanvas.width = width;
    state.baseCanvas.height = height;
  }

  function pushHistory() {
    const snapshot = state.baseCanvas.toDataURL("image/png");
    state.history.push(snapshot);
    if (state.history.length > 12) state.history.shift();
  }

  function undo() {
    const snapshot = state.history.pop();
    if (!snapshot) return;
    const image = new Image();
    image.onload = () => {
      resizeBaseTo(image.width, image.height);
      baseContext.drawImage(image, 0, 0);
      resetAdjustments();
      renderPreview();
      addAction("撤销上一步");
    };
    image.src = snapshot;
  }

  function resetToSample() {
    pushHistory();
    drawSampleImage();
    resetAdjustments();
    state.cropMode = false;
    state.cropRect = null;
    elements.cropBox.hidden = true;
    addAction("重置为示例图像");
  }

  function addAction(text) {
    state.actions.unshift(text);
    state.actions = state.actions.slice(0, 8);
    renderHistory();
  }

  function renderHistory() {
    elements.historyList.innerHTML = state.actions.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    elements.undo.disabled = state.history.length === 0;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
})();
