import CMS from "decap-cms-app";
import Cropper from "cropperjs";
import "cropperjs/dist/cropper.css";
import "./cms.css";
import registerPreview from "./preview.js";

const escapeHtml = value => String(value || "").replace(/[<>&"]/g, character => ({
  "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;",
})[character]);
const escapeAttribute = value => escapeHtml(value).replace(/\n/g, " ");
const decodeHtml = value => {
  const element = document.createElement("textarea");
  element.innerHTML = value || "";
  return element.value;
};
const previewUrl = value => {
  const path = String(value || "");
  const base = window.location.pathname.replace(/\/admin\/?$/, "");
  return path.startsWith("/") ? base + path : path;
};

CMS.registerEditorComponent({
  id: "dls-image",
  label: "Фото с настройками",
  fields: [
    { name: "src", label: "Изображение", widget: "image", choose_url: false },
    { name: "alt", label: "Описание для доступности", widget: "string" },
    { name: "caption", label: "Подпись", widget: "string", required: false },
    { name: "size", label: "Размер", widget: "select", default: "normal", options: [
      { label: "По ширине текста", value: "normal" },
      { label: "Широкое", value: "wide" },
      { label: "Компактное по центру", value: "compact" },
    ] },
  ],
  pattern: /^<figure class="media-image media-image--(normal|wide|compact)"><img src="([^"]*)" alt="([^"]*)"><figcaption>(.*?)<\/figcaption><\/figure>$/m,
  fromBlock: match => ({ size: match[1], src: decodeHtml(match[2]), alt: decodeHtml(match[3]), caption: decodeHtml(match[4]) }),
  toBlock: data => `<figure class="media-image media-image--${escapeAttribute(data.size || "normal")}"><img src="${escapeAttribute(data.src)}" alt="${escapeAttribute(data.alt)}"><figcaption>${escapeHtml(data.caption)}</figcaption></figure>`,
  toPreview: data => `<figure class="media-image media-image--${escapeAttribute(data.size || "normal")}"><img src="${escapeAttribute(previewUrl(data.src))}" alt="${escapeAttribute(data.alt)}"><figcaption>${escapeHtml(data.caption)}</figcaption></figure>`,
});

CMS.registerEditorComponent({
  id: "dls-gallery",
  label: "Галерея фотографий",
  fields: [
    { name: "title", label: "Название галереи", widget: "string", required: false },
    { name: "images", label: "Фотографии", label_singular: "Фотография", widget: "list", min: 2, fields: [
      { name: "src", label: "Изображение", widget: "image", choose_url: false },
      { name: "alt", label: "Описание", widget: "string" },
      { name: "caption", label: "Подпись", widget: "string", required: false },
    ] },
  ],
  pattern: /^<section class="media-gallery" data-title="([^"]*)" data-images="([^"]*)"><\/section>$/m,
  fromBlock: match => ({ title: decodeHtml(match[1]), images: JSON.parse(decodeHtml(match[2]) || "[]") }),
  toBlock: data => `<section class="media-gallery" data-title="${escapeAttribute(data.title)}" data-images="${escapeAttribute(JSON.stringify(data.images || []))}"></section>`,
  toPreview: data => galleryMarkup(data),
});

CMS.registerEditorComponent({
  id: "dls-video",
  label: "Видео",
  fields: [
    { name: "url", label: "Ссылка на видео", widget: "string", hint: "YouTube, Rutube, VK Video или прямая ссылка на MP4/WebM" },
    { name: "title", label: "Название видео", widget: "string" },
    { name: "caption", label: "Подпись", widget: "string", required: false },
  ],
  pattern: /^<div class="media-video" data-url="([^"]*)" data-title="([^"]*)" data-caption="([^"]*)"><\/div>$/m,
  fromBlock: match => ({ url: decodeHtml(match[1]), title: decodeHtml(match[2]), caption: decodeHtml(match[3]) }),
  toBlock: data => `<div class="media-video" data-url="${escapeAttribute(data.url)}" data-title="${escapeAttribute(data.title)}" data-caption="${escapeAttribute(data.caption)}"></div>`,
  toPreview: data => videoMarkup(data),
});

CMS.registerEditorComponent({
  id: "dls-callout",
  label: "Выделенный блок",
  fields: [
    { name: "type", label: "Вид", widget: "select", default: "info", options: [
      { label: "Информация", value: "info" },
      { label: "Важно", value: "important" },
      { label: "Цитата/мысль", value: "idea" },
    ] },
    { name: "title", label: "Заголовок", widget: "string", required: false },
    { name: "text", label: "Текст", widget: "text" },
  ],
  pattern: /^<aside class="article-callout article-callout--(info|important|idea)" data-title="([^"]*)">([\s\S]*?)<\/aside>$/m,
  fromBlock: match => ({ type: match[1], title: decodeHtml(match[2]), text: decodeHtml(match[3]) }),
  toBlock: data => `<aside class="article-callout article-callout--${escapeAttribute(data.type || "info")}" data-title="${escapeAttribute(data.title)}">${escapeHtml(data.text)}</aside>`,
  toPreview: data => calloutMarkup(data),
});

CMS.registerEditorComponent({
  id: "dls-button",
  label: "Кнопка-ссылка",
  fields: [
    { name: "text", label: "Текст кнопки", widget: "string" },
    { name: "url", label: "Ссылка", widget: "string" },
    { name: "style", label: "Стиль", widget: "select", default: "primary", options: [
      { label: "Синяя", value: "primary" },
      { label: "Контурная", value: "outline" },
    ] },
  ],
  pattern: /^<p class="article-action"><a class="article-button article-button--(primary|outline)" href="([^"]*)">(.*?)<\/a><\/p>$/m,
  fromBlock: match => ({ style: match[1], url: decodeHtml(match[2]), text: decodeHtml(match[3]) }),
  toBlock: data => `<p class="article-action"><a class="article-button article-button--${escapeAttribute(data.style || "primary")}" href="${escapeAttribute(data.url)}">${escapeHtml(data.text)}</a></p>`,
  toPreview: data => `<p class="article-action"><a class="article-button article-button--${escapeAttribute(data.style || "primary")}" href="${escapeAttribute(data.url)}">${escapeHtml(data.text)}</a></p>`,
});

CMS.registerEditorComponent({
  id: "dls-table",
  label: "Таблица",
  fields: [
    { name: "caption", label: "Название таблицы", widget: "string", required: false },
    { name: "headers", label: "Заголовки столбцов", widget: "list", min: 1, field: { name: "value", label: "Заголовок", widget: "string" } },
    { name: "rows", label: "Строки", label_singular: "Строка", widget: "list", min: 1, fields: [
      { name: "cells", label: "Ячейки", widget: "list", min: 1, field: { name: "value", label: "Значение", widget: "string" } },
    ] },
  ],
  pattern: /^<div class="article-table" data-table="([^"]*)"><\/div>$/m,
  fromBlock: match => JSON.parse(decodeHtml(match[1]) || "{}"),
  toBlock: data => `<div class="article-table" data-table="${escapeAttribute(JSON.stringify(data))}"></div>`,
  toPreview: data => tableMarkup(data),
});

function galleryMarkup(data) {
  const images = Array.isArray(data.images) ? data.images : [];
  return `<section class="media-gallery">${data.title ? `<h3>${escapeHtml(data.title)}</h3>` : ""}<div class="media-gallery-grid">${images.map(image => `<figure><img src="${escapeAttribute(previewUrl(image.src))}" alt="${escapeAttribute(image.alt)}"><figcaption>${escapeHtml(image.caption)}</figcaption></figure>`).join("")}</div></section>`;
}

function videoMarkup(data) {
  const source = videoSource(data.url);
  const title = data.title || "Видео";
  if (!source) return `<p><a href="${escapeAttribute(data.url)}">${escapeHtml(title)}</a></p>`;
  const player = source.type === "file"
    ? `<video controls preload="metadata" src="${source.src}"></video>`
    : `<iframe src="${source.src}" title="${escapeAttribute(title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
  return `<figure class="media-video-frame"><div class="embed">${player}</div>${data.caption ? `<figcaption>${escapeHtml(data.caption)}</figcaption>` : ""}</figure>`;
}

function videoSource(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return { type: "embed", src: `https://www.youtube-nocookie.com/embed/${escapeAttribute(url.pathname.slice(1))}` };
    if (host.endsWith("youtube.com")) {
      const id = url.searchParams.get("v") || url.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/)?.[1];
      if (id) return { type: "embed", src: `https://www.youtube-nocookie.com/embed/${escapeAttribute(id)}` };
    }
    if (host.endsWith("rutube.ru")) {
      const id = url.pathname.match(/\/(?:video|play\/embed)\/([^/?]+)/)?.[1];
      if (id) return { type: "embed", src: `https://rutube.ru/play/embed/${escapeAttribute(id)}` };
    }
    if (host.endsWith("vk.com") || host.endsWith("vkvideo.ru")) {
      if (url.pathname.includes("video_ext.php")) return { type: "embed", src: escapeAttribute(url.href) };
      const match = url.pathname.match(/video(-?\d+)_([0-9]+)/);
      if (match) return { type: "embed", src: `https://vk.com/video_ext.php?oid=${match[1]}&id=${match[2]}&hd=2` };
    }
    if (/\.(mp4|webm|ogg)$/i.test(url.pathname)) return { type: "file", src: escapeAttribute(url.href) };
  } catch (error) {
    return null;
  }
  return null;
}

function calloutMarkup(data) {
  return `<aside class="article-callout article-callout--${escapeAttribute(data.type || "info")}">${data.title ? `<strong>${escapeHtml(data.title)}</strong>` : ""}<p>${escapeHtml(data.text)}</p></aside>`;
}

function tableMarkup(data) {
  const headers = Array.isArray(data.headers) ? data.headers : [];
  const rows = Array.isArray(data.rows) ? data.rows : [];
  return `<div class="table-wrap"><table>${data.caption ? `<caption>${escapeHtml(data.caption)}</caption>` : ""}<thead><tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${(row.cells || []).map(cell => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function mountImageStudio() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "image-studio-launch";
  button.textContent = "Подготовить фото";
  button.addEventListener("click", openImageStudio);
  document.body.appendChild(button);
}

function openImageStudio() {
  const modal = document.createElement("div");
  modal.className = "image-studio-modal";
  modal.innerHTML = `<div class="image-studio-dialog" role="dialog" aria-modal="true" aria-label="Подготовка фотографии">
    <div class="image-studio-head"><div><b>Подготовка фотографии</b><span>Обрежьте и сожмите фото перед загрузкой в медиатеку</span></div><button type="button" data-close aria-label="Закрыть">×</button></div>
    <div class="image-studio-stage"><div class="image-studio-empty">Выберите JPG, PNG или WebP</div><img alt="Редактируемое изображение"></div>
    <div class="image-studio-controls">
      <label class="image-studio-file">Открыть фото<input type="file" accept="image/jpeg,image/png,image/webp" hidden></label>
      <label>Пропорции <select data-ratio><option value="NaN">Свободно</option><option value="1.7777778" selected>16:9</option><option value="1.3333333">4:3</option><option value="1">1:1</option><option value="0.8">4:5</option></select></label>
      <button type="button" data-action="left">↶ 90°</button><button type="button" data-action="right">↷ 90°</button>
      <button type="button" data-action="flip-x">Отразить ↔</button><button type="button" data-action="flip-y">Отразить ↕</button>
      <button type="button" data-action="zoom-in">Увеличить +</button><button type="button" data-action="zoom-out">Уменьшить −</button>
      <label>Ширина <select data-width><option value="1280">1280 px</option><option value="1600" selected>1600 px</option><option value="1920">1920 px</option><option value="2560">2560 px</option></select></label>
      <label>Формат <select data-format><option value="image/webp" selected>WebP</option><option value="image/jpeg">JPEG</option><option value="image/png">PNG</option></select></label>
      <label>Качество <input data-quality type="range" min="60" max="100" value="88"><output>88%</output></label>
    </div>
    <div class="image-studio-foot"><span data-status>После экспорта загрузите файл через поле изображения или кнопку «+» в редакторе.</span><button type="button" data-export disabled>Скачать готовое фото</button></div>
  </div>`;
  document.body.appendChild(modal);

  const image = modal.querySelector("img");
  let cropper;
  let sourceName = "photo";
  let scaleX = 1;
  let scaleY = 1;
  const close = () => { if (cropper) cropper.destroy(); modal.remove(); };
  modal.querySelector("[data-close]").addEventListener("click", close);
  modal.addEventListener("mousedown", event => { if (event.target === modal) close(); });
  document.addEventListener("keydown", function escape(event) {
    if (event.key === "Escape") {
      document.removeEventListener("keydown", escape);
      close();
    }
  });
  modal.querySelector("input[type=file]").addEventListener("change", event => {
    const file = event.target.files[0];
    if (!file) return;
    sourceName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]+/g, "-");
    const reader = new FileReader();
    const initCropper = () => {
      if (cropper) cropper.destroy();
      image.onload = null;
      image.src = reader.result;
      image.style.display = "block";
      modal.querySelector(".image-studio-empty").style.display = "none";
      if (image.complete && image.naturalWidth > 0) {
        cropper = new Cropper(image, { aspectRatio: 16 / 9, viewMode: 1, autoCropArea: 1, background: false });
        modal.querySelector("[data-export]").disabled = false;
      } else {
        image.onload = () => {
          cropper = new Cropper(image, { aspectRatio: 16 / 9, viewMode: 1, autoCropArea: 1, background: false });
          modal.querySelector("[data-export]").disabled = false;
        };
      }
    };
    reader.onload = initCropper;
    reader.readAsDataURL(file);
  });
  modal.querySelector("[data-ratio]").addEventListener("change", event => cropper && cropper.setAspectRatio(Number(event.target.value)));
  modal.querySelector("[data-quality]").addEventListener("input", event => { event.target.nextElementSibling.value = `${event.target.value}%`; });
  modal.querySelectorAll("[data-action]").forEach(control => control.addEventListener("click", () => {
    if (!cropper) return;
    const action = control.dataset.action;
    if (action === "left") cropper.rotate(-90);
    if (action === "right") cropper.rotate(90);
    if (action === "zoom-in") cropper.zoom(0.1);
    if (action === "zoom-out") cropper.zoom(-0.1);
    if (action === "flip-x") { scaleX *= -1; cropper.scaleX(scaleX); }
    if (action === "flip-y") { scaleY *= -1; cropper.scaleY(scaleY); }
  }));
  modal.querySelector("[data-export]").addEventListener("click", () => {
    if (!cropper) return;
    const width = Number(modal.querySelector("[data-width]").value);
    const format = modal.querySelector("[data-format]").value;
    const quality = Number(modal.querySelector("[data-quality]").value) / 100;
    const extension = format === "image/webp" ? "webp" : format === "image/png" ? "png" : "jpg";
    const canvas = cropper.getCroppedCanvas({ width, imageSmoothingEnabled: true, imageSmoothingQuality: "high", fillColor: format === "image/jpeg" ? "#fff" : "transparent" });
    canvas.toBlob(blob => {
      if (!blob) return;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${sourceName}-${width}.${extension}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      modal.querySelector("[data-status]").textContent = `Готово: ${(blob.size / 1024).toFixed(0)} КБ. Теперь загрузите скачанный файл в медиатеку.`;
    }, format, quality);
  });
}

registerPreview(CMS);
CMS.init();
mountImageStudio();
