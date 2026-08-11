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
