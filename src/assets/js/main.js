// ДЛС — клиентские интеракции.
// Мобильное меню, компас на главной, фильтр категорий и поиск в новостях.
// Контент (новости, тексты) в этом файле НЕ хранится.

(function () {
  "use strict";

  /* ---------- мобильное меню ---------- */
  var toggle = document.getElementById("navToggle");
  var nav = document.getElementById("siteNav");

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- состояние шапки и сдержанное появление блоков ---------- */
  var header = document.querySelector(".site-header");
  function updateHeader() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 24);
  }
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  /* ---------- тактильный отклик интерактивных элементов ---------- */
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var pulseTargets = ".cta-btn, .cta-ghost, .cat-chip, .nav-toggle";

  document.addEventListener("pointerdown", function (e) {
    if (reduceMotion.matches || e.button !== 0) return;
    var target = e.target.closest(pulseTargets);
    if (!target) return;

    var rect = target.getBoundingClientRect();
    var pulse = document.createElement("span");
    pulse.className = "interaction-pulse";
    pulse.setAttribute("aria-hidden", "true");
    pulse.style.setProperty("--pulse-x", (e.clientX - rect.left) + "px");
    pulse.style.setProperty("--pulse-y", (e.clientY - rect.top) + "px");
    pulse.style.setProperty("--pulse-size", (Math.max(rect.width, rect.height) * 2.2) + "px");
    target.appendChild(pulse);
    pulse.addEventListener("animationend", function () { pulse.remove(); });
  });

  var revealItems = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && revealItems.length) {
    var revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px" });
    revealItems.forEach(function (item) { revealObserver.observe(item); });
  } else {
    revealItems.forEach(function (item) { item.classList.add("is-revealed"); });
  }

  /* ---------- компас (принципы на главной) ---------- */
  var needles = document.querySelectorAll(".node");
  var panels = document.querySelectorAll(".detail-panel");

  function showPanel(i) {
    needles.forEach(function (n) {
      var isActive = Number(n.dataset.i) === i;
      n.classList.toggle("is-active", isActive);
      n.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
    panels.forEach(function (p) {
      p.classList.toggle("is-active", Number(p.dataset.i) === i);
    });
    var needle = document.getElementById("needle");
    var active = Array.prototype.find.call(needles, function (n) {
      return Number(n.dataset.i) === i;
    });
    if (needle && active) {
      needle.style.transform =
        "translate(-50%,-100%) rotate(" + active.dataset.angle + "deg)";
    }
  }

  if (needles.length && panels.length) {
    showPanel(0);
    needles.forEach(function (n) {
      n.addEventListener("click", function () {
        showPanel(Number(n.dataset.i));
      });
    });
  }

  /* ---------- фильтр категорий и поиск в ленте новостей ---------- */
  var grid = document.getElementById("newsGrid");
  var chipsWrap = document.getElementById("newsCats");
  var search = document.getElementById("newsSearch");
  var empty = document.getElementById("newsEmpty");
  if (!grid || !chipsWrap) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll(".news-card-wrap"));
  var activeCat = "";
  var query = "";

  function applyFilter() {
    var visible = 0;
    var q = query.trim().toLowerCase();
    cards.forEach(function (card) {
      var cat = card.dataset.cat || "";
      var matchesCat = !activeCat || cat === activeCat;
      var matchesQuery =
        !q ||
        card.dataset.title.indexOf(q) !== -1 ||
        card.dataset.text.indexOf(q) !== -1;
      var show = matchesCat && matchesQuery;
      var wasHidden = card.classList.contains("is-hidden");
      card.classList.toggle("is-hidden", !show);
      if (show && wasHidden && !reduceMotion.matches) {
        card.classList.remove("is-filtering-in");
        void card.offsetWidth;
        card.classList.add("is-filtering-in");
      }
      if (show) visible++;
    });
    if (empty) empty.classList.toggle("is-hidden", visible > 0);
  }

  chipsWrap.addEventListener("click", function (e) {
    var chip = e.target.closest(".cat-chip");
    if (!chip) return;
    chipsWrap.querySelectorAll(".cat-chip").forEach(function (c) {
      c.classList.remove("is-active");
      c.setAttribute("aria-selected", "false");
    });
    chip.classList.add("is-active");
    chip.setAttribute("aria-selected", "true");
    activeCat = chip.dataset.cat || "";
    applyFilter();
  });

  if (search) {
    search.addEventListener("input", function () {
      query = search.value;
      applyFilter();
    });
  }

  applyFilter();
})();
