const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const categoriesPath = path.join(root, "src", "_data", "categories.json");
const configPath = path.join(root, "admin", "config.yml");
const categories = JSON.parse(fs.readFileSync(categoriesPath, "utf8")).items;

if (!Array.isArray(categories) || !categories.length) {
  throw new Error("src/_data/categories.json должен содержать непустой массив items");
}

const names = new Set();
categories.forEach((category) => {
  if (!category.name || !category.color) throw new Error("У каждой категории нужны name и color");
  if (names.has(category.name)) throw new Error(`Категория ${category.name} указана дважды`);
  names.add(category.name);
});

const filters = categories
  .map((category) => `      - { label: ${JSON.stringify(category.name)}, field: "category", pattern: ${JSON.stringify(category.name)} }`)
  .join("\n");
const options = categories.map((category) => `          - ${JSON.stringify(category.name)}`).join("\n");

let config = fs.readFileSync(configPath, "utf8");
const block = /    # BEGIN GENERATED CATEGORIES[^]*?        # END GENERATED CATEGORIES/;
if (!block.test(config)) throw new Error("Не найдены маркеры категорий в admin/config.yml");

config = config.replace(block, `    # BEGIN GENERATED CATEGORIES - редактируйте src/_data/categories.json\n    view_filters:\n${filters}\n    # END GENERATED CATEGORY FILTERS\n    description: "Публикации движения. Каждая новость — отдельный markdown-файл. После сохранения сайт пересоберётся автоматически."\n    fields:\n      - { label: "Заголовок", name: "title", widget: "string", hint: "Название новости" }\n      - { label: "Дата публикации", name: "date", widget: "datetime", format: "YYYY-MM-DD", date_format: "YYYY-MM-DD", time_format: false }\n      - label: "Категория"\n        name: "category"\n        widget: "select"\n        options:\n${options}\n        # END GENERATED CATEGORIES`);
fs.writeFileSync(configPath, config);
