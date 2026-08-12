(function () {
  "use strict";

  var siteBase = window.location.pathname.replace(/\/admin\/?$/, "");
  var siteUrl = function (path) { return siteBase + path; };

  CMS.registerPreviewStyle(
    "https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700;800&family=Unbounded:wght@500;600;700;800&display=swap&subset=cyrillic"
  );
  CMS.registerPreviewStyle(siteUrl("/css/style.css"));

  function formatDate(value) {
    if (!value) return "Дата публикации";
    var date = new Date(value);
    if (isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC"
    }).format(date);
  }

  function Header() {
    return h("header", { className: "site-header" },
      h("div", { className: "container header-inner" },
        h("a", { className: "brand", href: siteUrl("/"), "aria-label": "Движение либеральных сил — на главную" },
          h("span", { className: "brand-mark", "aria-hidden": "true" }, h("i"), h("i"), h("i")),
          h("span", { className: "brand-text" },
            h("b", null, "ДЛС"),
            h("span", null, "Движение либеральных сил")
          )
        ),
        h("nav", { className: "site-nav", "aria-label": "Основное меню" },
          h("ul", null,
            h("li", null, h("a", { href: siteUrl("/") }, "Главная")),
            h("li", null, h("a", { className: "is-active", href: siteUrl("/news/") }, "Новости")),
            h("li", null, h("a", { href: siteUrl("/#pillars") }, "Принципы")),
            h("li", null, h("a", { href: siteUrl("/#society") }, "Общество")),
            h("li", { className: "nav-cta" },
              h("a", { className: "cta-btn cta-btn--compact", href: "https://t.me/dls_force" }, "В движение ", h("span", { "aria-hidden": "true" }, "↗"))
            )
          )
        )
      )
    );
  }

  function Footer() {
    return h("footer", { className: "site-footer" },
      h("div", { className: "container footer-inner" },
        h("a", { className: "foot-brand", href: siteUrl("/") },
          h("span", { className: "foot-monogram", "aria-hidden": "true" }, "ДЛС"),
          h("span", null, "ДЛС — Движение либеральных сил")
        ),
        h("nav", { className: "foot-links", "aria-label": "Меню в подвале" },
          h("a", { href: siteUrl("/") }, "Главная"),
          h("a", { href: siteUrl("/news/") }, "Новости"),
          h("a", { href: siteUrl("/#pillars") }, "Принципы"),
          h("a", { href: siteUrl("/#society") }, "Общество")
        ),
        h("p", { className: "copy" }, "© 2026 Движение либеральных сил. Идеи. Свобода. Будущее.")
      )
    );
  }

  var NewsPreview = createClass({
    render: function () {
      var entry = this.props.entry;
      var category = entry.getIn(["data", "category"]);
      var author = entry.getIn(["data", "author"]);
      var title = entry.getIn(["data", "title"]) || "Заголовок новости";
      var date = entry.getIn(["data", "date"]);

      return h("div", null,
        h(Header),
        h("main", { id: "main" },
          h("article", { className: "article" },
            h("div", { className: "container container--article" },
              h("a", { href: siteUrl("/news/"), className: "article-back" }, "← Ко всем новостям"),
              h("header", { className: "article-header" },
                category ? h("span", { className: "article-cat" }, category) : null,
                h("h1", { className: "article-title" }, title),
                h("div", { className: "article-meta" },
                  h("time", null, formatDate(date)),
                  author ? h("span", { className: "article-author" }, "Автор: " + author) : null
                )
              ),
              h("div", { className: "article-body" }, this.props.widgetFor("body")),
              h("footer", { className: "article-foot" },
                h("a", { href: siteUrl("/news/"), className: "cta-ghost" }, "← Ко всем новостям"),
                h("a", { href: "https://t.me/dls_force", className: "cta-btn" }, "Подписаться на Telegram")
              )
            )
          )
        ),
        h(Footer)
      );
    }
  });

  CMS.registerPreviewTemplate("news", NewsPreview);
})();
