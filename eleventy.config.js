// Конфигурация Eleventy.
// Здесь настроена сборка сайта: пути, оптимизация изображений, фильтры.
// Менять этот файл нужно только разработчику.

const path = require("path");
const fs = require("fs");
const Image = require("@11ty/eleventy-img");

// Префикс пути нужен для GitHub Pages, когда сайт лежит не в корне домена
// (например, user.github.io/название-репозитория/). Автоматически
// подставляется при сборке в GitHub Actions.
const pathPrefix = process.env.ELEVENTY_PATH_PREFIX || "";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toDiskPath(siteUrl) {
  // "/assets/images/news/x.jpg" -> "src/assets/images/news/x.jpg"
  const clean = siteUrl.replace(/^\/+/, "");
  return path.join("src", clean.split("/").join(path.sep));
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/\n/g, " ");
}

function decodeHtml(value = "") {
  return String(value)
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
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

function renderMediaBlocks(html) {
  return html
    .replace(/<figure class="media-image media-image--(normal|wide|compact)"><img src="([^"]*)" alt="([^"]*)"><figcaption>(.*?)<\/figcaption><\/figure>/g, (_, size, src, alt, caption) => {
      const imageUrl = src.startsWith("/") ? pathPrefix + src : src;
      return `<figure class="media-image media-image--${size}"><img src="${escapeAttribute(imageUrl)}" alt="${escapeAttribute(decodeHtml(alt))}" loading="lazy" decoding="async">${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>`;
    })
    .replace(/<section class="media-gallery" data-title="([^"]*)" data-images="([^"]*)"><\/section>/g, (_, rawTitle, rawImages) => {
      let images;
      try { images = JSON.parse(decodeHtml(rawImages)); } catch (error) { return ""; }
      if (!Array.isArray(images) || !images.length) return "";
      const title = decodeHtml(rawTitle);
      const items = images.map((image) => `<figure><img src="${escapeAttribute(pathPrefix + image.src)}" alt="${escapeAttribute(image.alt || "")}" loading="lazy" decoding="async">${image.caption ? `<figcaption>${escapeHtml(image.caption)}</figcaption>` : ""}</figure>`).join("");
      return `<section class="media-gallery">${title ? `<h3>${escapeHtml(title)}</h3>` : ""}<div class="media-gallery-grid">${items}</div></section>`;
    })
    .replace(/<div class="media-video" data-url="([^"]*)" data-title="([^"]*)" data-caption="([^"]*)"><\/div>/g, (_, rawUrl, rawTitle, rawCaption) => {
      const url = decodeHtml(rawUrl);
      const title = decodeHtml(rawTitle) || "Видео";
      const caption = decodeHtml(rawCaption);
      const source = videoSource(url);
      if (!source) return `<p><a href="${escapeAttribute(url)}">${escapeHtml(title)}</a></p>`;
      const player = source.type === "file"
        ? `<video controls preload="metadata" src="${source.src}"></video>`
        : `<iframe src="${source.src}" title="${escapeAttribute(title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
      return `<figure class="media-video-frame"><div class="embed">${player}</div>${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""}</figure>`;
    })
    .replace(/<aside class="article-callout article-callout--(info|important|idea)" data-title="([^"]*)">([\s\S]*?)<\/aside>/g, (_, type, rawTitle, text) => {
      const title = decodeHtml(rawTitle);
      return `<aside class="article-callout article-callout--${type}">${title ? `<strong>${escapeHtml(title)}</strong>` : ""}<p>${text}</p></aside>`;
    })
    .replace(/<div class="article-table" data-table="([^"]*)"><\/div>/g, (_, rawTable) => {
      let table;
      try { table = JSON.parse(decodeHtml(rawTable)); } catch (error) { return ""; }
      const headers = Array.isArray(table.headers) ? table.headers : [];
      const rows = Array.isArray(table.rows) ? table.rows : [];
      const head = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
      const body = rows.map((row) => `<tr>${(row.cells || []).map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("");
      return `<div class="table-wrap"><table>${table.caption ? `<caption>${escapeHtml(table.caption)}</caption>` : ""}<thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
    });
}

// Оптимизация и ресайз изображений через @11ty/eleventy-img.
// В шаблонах вызывается как: {{ image("/assets/...jpg", "альт", "класс", "sizes") }}
async function imageShortcode(src, alt = "", cls = "", sizes = "100vw") {
  if (!src) return "";
  const disk = toDiskPath(src);
  if (!fs.existsSync(disk)) {
    return `<img src="${escapeHtml(pathPrefix + src)}" alt="${escapeHtml(alt)}" class="${escapeHtml(cls)}" loading="lazy" decoding="async">`;
  }
  try {
    const metadata = await Image(disk, {
      widths: [480, 800, 1280],
      formats: ["webp", "jpeg"],
      outputDir: path.join("_site", "img"),
      urlPath: pathPrefix + "/img/",
      cacheOptions: { duration: "1w" },
    });
    const jpeg = metadata.jpeg || [];
    const webp = metadata.webp || [];
    if (!jpeg.length) return "";
    const fallback = jpeg[jpeg.length - 1];
    const srcset = (formats) => formats.map((f) => `${f.url} ${f.width}w`).join(", ");
    const parts = [];
    if (webp.length) {
      parts.push(`<source type="image/webp" srcset="${srcset(webp)}" sizes="${escapeHtml(sizes)}">`);
    }
    parts.push(
      `<img src="${fallback.url}" width="${fallback.width}" height="${fallback.height}" ` +
        `srcset="${srcset(jpeg)}" sizes="${escapeHtml(sizes)}" alt="${escapeHtml(alt)}" ` +
        `class="${escapeHtml(cls)}" loading="lazy" decoding="async">`
    );
    return `<picture>${parts.join("")}</picture>`;
  } catch (e) {
    return `<img src="${escapeHtml(pathPrefix + src)}" alt="${escapeHtml(alt)}" class="${escapeHtml(cls)}" loading="lazy" decoding="async">`;
  }
}

module.exports = function (eleventyConfig) {
  // Копирование статичных папок в результат сборки
  eleventyConfig.addPassthroughCopy({ "src/assets": "/assets" });
  eleventyConfig.addPassthroughCopy({ "src/css": "/css" });
  eleventyConfig.addPassthroughCopy("admin");

  // Сортировка новостей: от новых к старым
  eleventyConfig.addFilter("sortNews", (arr = []) =>
    [...arr].sort((a, b) => new Date(b.date) - new Date(a.date))
  );

  // Соседние публикации для навигации «предыдущая/следующая»
  eleventyConfig.addFilter("pager", (arr = [], currentSlug) => {
    const idx = arr.findIndex((item) => item.fileSlug === currentSlug);
    return {
      older: idx >= 0 ? arr[idx + 1] : undefined,
      newer: idx > 0 ? arr[idx - 1] : undefined,
    };
  });

  // Ограничение списка (первые N записей)
  eleventyConfig.addFilter("limit", (arr = [], n = 6) => arr.slice(0, n));

  eleventyConfig.addFilter("categoryColor", (items = [], name = "") => {
    const category = items.find((item) => item.name === name);
    return category ? category.color : "#1646d8";
  });

  // Форматирование даты по-русски: 10 августа 2026 г.
  // Используются UTC-части, чтобы дата из front matter не «уезжала»
  // из-за часового пояса.
  const MONTHS = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря",
  ];
  eleventyConfig.addFilter("formatDate", (d) => {
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date)) return String(d);
    return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()} г.`;
  });

  // Дата для атрибута datetime в ISO-виде (ГГГГ-ММ-ДД)
  eleventyConfig.addFilter("dateIso", (d) => {
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date)) return String(d);
    return date.toISOString().slice(0, 10);
  });

  eleventyConfig.addAsyncShortcode("image", (src, alt, cls, sizes) =>
    imageShortcode(src, alt, cls, sizes)
  );

  // Ленивая загрузка изображений внутри текста статьи (markdown-картинки)
  eleventyConfig.amendLibrary("md", (mdLib) => {
    const defaultImage = mdLib.renderer.rules.image || function (tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };
    mdLib.renderer.rules.image = function (tokens, idx, options, env, self) {
      const token = tokens[idx];
      const srcIndex = token.attrIndex("src");
      if (srcIndex >= 0 && token.attrs[srcIndex][1].startsWith("/")) {
        token.attrs[srcIndex][1] = pathPrefix + token.attrs[srcIndex][1];
      }
      token.attrSet("loading", "lazy");
      token.attrSet("decoding", "async");
      return defaultImage(tokens, idx, options, env, self);
    };
    const defaultHtmlBlock = mdLib.renderer.rules.html_block || function (tokens, idx) {
      return tokens[idx].content;
    };
    mdLib.renderer.rules.html_block = function (tokens, idx, options, env, self) {
      return renderMediaBlocks(defaultHtmlBlock(tokens, idx, options, env, self));
    };
    return mdLib;
  });

  return {
    pathPrefix,
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["njk", "md"],
  };
};
