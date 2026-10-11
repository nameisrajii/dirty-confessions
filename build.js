#!/usr/bin/env node
"use strict";

const fs   = require("fs");
const path = require("path");

const ROOT = __dirname;
const OUT  = path.join(ROOT, "docs");

const data = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "stories.json"), "utf8"));
const SITE       = data.site;
const CATEGORIES = data.categories;
const STORIES    = data.stories;

const CAT = Object.fromEntries(CATEGORIES.map(c => [c.slug, c]));

const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const abs = p =>
  SITE.url.replace(/\/+$/, "") + SITE.base.replace(/\/+$/, "") + "/" + p.replace(/^\/+/, "");

const dISO   = d => new Date(d + "T09:00:00Z").toISOString();
const dHuman = d => new Date(d + "T09:00:00Z")
  .toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

const wc      = s => s.parts.reduce((n, p) => n + p.paras.join(" ").split(/\s+/).length, 0);
const readMin = s => Math.max(1, Math.round(wc(s) / 220));

const newest = [...STORIES].sort((a, b) => (a.date < b.date ? 1 : -1));
const inCat  = slug => newest.filter(s => s.category === slug);

function write(rel, html) {
  const full = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, html, "utf8");
}

const GA = SITE.gaId ? `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${SITE.gaId}"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${SITE.gaId}');
</script>` : "";

function head({ title, description, canonical, relRoot, type = "website", jsonld = [] }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${GA}
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="index,follow,max-image-preview:large">
${SITE.googleVerification ? `<meta name="google-site-verification" content="${esc(SITE.googleVerification)}">` : ""}
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="${esc(SITE.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="en_GB">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#09070d">
<link rel="alternate" type="application/rss+xml" title="${esc(SITE.name)}" href="${relRoot}feed.xml">
<link rel="stylesheet" href="${relRoot}assets/style.css">
${jsonld.map(o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join("\n")}
</head>`;
}

const header = r => `<header class="topbar"><div class="topbar-in">
<a class="brand" href="${r}">DRY HUMPS</a>
<nav class="nav" aria-label="Main">
<a href="${r}stories/">Stories</a>
<a href="${r}#categories">Categories</a>
<a class="cta" href="${r}#submit">Confess</a>
</nav></div></header>`;

const footer = r => `<footer>
<a class="brand" href="${r}">DRY HUMPS</a>
<p>Stories without names.</p>
<p><a href="${r}stories/">All stories</a> · <a href="${r}about/">About</a> · <a href="${r}sitemap.xml">Sitemap</a> · <a href="${r}feed.xml">RSS</a></p>
<p style="margin-top:12px;opacity:.7">© ${new Date().getFullYear()} Dry Humps</p>
</footer>`;

function page({ relRoot, title, description, canonical, type, jsonld, main, script = "" }) {
  return `${head({ title, description, canonical, relRoot, type, jsonld })}
<body>
<div class="dh-app">
${header(relRoot)}
<main class="wrap" id="top">${main}</main>
${footer(relRoot)}
</div>
${script}
</body>
</html>`;
}

function card(s, r) {
  const c = CAT[s.category];
  return `<a class="card" href="${r}story/${s.slug}/">
<span class="tag">${esc(c.name)}</span>
<h3>${esc(s.title)}</h3>
<p>${esc(s.teaser)}</p>
<span class="foot"><span class="byline">${esc(s.author)} · ${dHuman(s.date)} · ${readMin(s)} min</span></span>
</a>`;
}

const crumbs = (items, r) => `<nav class="crumbs" aria-label="Breadcrumb">` +
  items.map((it, i) => (i ? `<span>/</span>` : "") +
    (it.href ? `<a href="${it.href}">${esc(it.name)}</a>` : `<span>${esc(it.name)}</span>`)
  ).join("") + `</nav>`;

function buildHome() {
  const feat = STORIES.find(s => s.featured) || newest[0];
  const jsonld = [{
    "@context": "https://schema.org", "@type": "Blog",
    name: SITE.name, description: SITE.description, url: abs(""),
    blogPost: newest.map(s => ({
      "@type": "BlogPosting", headline: s.title,
      url: abs(`story/${s.slug}/`), datePublished: dISO(s.date)
    }))
  }];

  const main = `
<section class="hero">
  <div class="eyebrow">Your secret · Your story</div>
  <h1>Some things are easier to confess <em>in the dark.</em></h1>
  <p class="intro">${esc(SITE.description)}</p>
  <div class="hero-actions">
    <a class="btn" href="stories/">Browse all stories</a>
    <a class="btn ghost" href="#submit">Submit a story</a>
  </div>
  <div class="stats">
    <div class="stat"><b>${STORIES.length}</b><span>Confessions</span></div>
    <div class="stat"><b>${CATEGORIES.length}</b><span>Categories</span></div>
    <div class="stat"><b>100%</b><span>Anonymous</span></div>
  </div>
  <div class="featured">
    <span class="tag-inline">Editor's pick</span>
    <h2>${esc(feat.title)}</h2>
    <p>${esc(feat.teaser)}</p>
    <a class="read-link" href="story/${feat.slug}/">Read the confession →</a>
  </div>
</section>

<section class="section" id="categories">
  <div class="sec-head"><h2>Explore your feelings</h2><p class="muted">Pick a mood. Find a story that speaks to you.</p></div>
  <div class="chips">${CATEGORIES.map(c => `<a class="chip" href="category/${c.slug}/">${esc(c.name)}</a>`).join("")}</div>
</section>

<section class="section" id="stories" style="padding-top:0">
  <div class="sec-head"><h2>Latest confessions</h2><p class="muted">Personal stories, written in the first person.</p></div>
  <div class="toolbar"><label class="search">
    <input id="q" placeholder="Search confessions…" aria-label="Search confessions">
  </label></div>
  <div class="grid" id="grid">${newest.map(s => card(s, "")).join("")}</div>
  <p class="muted" id="noRes" hidden>No confessions match that.</p>
</section>

<section class="section" id="submit">
  <div class="form-card">
    <h2>Submit a story</h2>
    <p class="muted">Fill this in, copy the generated entry, paste it into <code>content/stories.json</code>, then run <code>node build.js</code>. Your story gets its own URL.</p>
    <div class="field"><label for="fTitle">Title</label><input id="fTitle" maxlength="100"></div>
    <div class="row2">
      <div class="field"><label for="fCat">Category</label><select id="fCat">${CATEGORIES.map(c => `<option value="${c.slug}">${esc(c.name)}</option>`).join("")}</select></div>
      <div class="field"><label for="fName">Pen name</label><input id="fName" maxlength="40" value="Anonymous"></div>
    </div>
    <div class="field"><label for="fBody">Story</label><textarea id="fBody" placeholder="Separate paragraphs with a blank line."></textarea></div>
    <button class="btn" id="genBtn" type="button">Generate JSON entry</button>
    <pre id="out" hidden></pre>
  </div>
</section>`;

  const script = `<script>
document.getElementById("q").addEventListener("input", e => {
  const q = e.target.value.toLowerCase().trim();
  let shown = 0;
  document.querySelectorAll("#grid .card").forEach(el => {
    const hit = !q || el.textContent.toLowerCase().includes(q);
    el.hidden = !hit; if (hit) shown++;
  });
  document.getElementById("noRes").hidden = shown > 0;
});
document.getElementById("genBtn").addEventListener("click", () => {
  const t = document.getElementById("fTitle").value.trim();
  const b = document.getElementById("fBody").value.trim();
  if (!t || !b) return;
  const slug = t.toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  const paras = b.split(/\\n\\s*\\n/).map(p => p.replace(/\\n/g," ").trim()).filter(Boolean);
  const first = paras[0].split(/(?<=\\.)\\s/)[0];
  const entry = {
    slug: slug,
    title: t,
    metaDescription: (first.length > 155 ? first.slice(0,152) + "\\u2026" : first),
    sub: first.slice(0,90),
    teaser: first.slice(0,140),
    category: document.getElementById("fCat").value,
    author: document.getElementById("fName").value.trim() || "Anonymous",
    date: new Date().toISOString().slice(0,10),
    parts: [{ label: "The confession", paras: paras }]
  };
  const out = document.getElementById("out");
  out.textContent = JSON.stringify(entry, null, 2);
  out.hidden = false;
  navigator.clipboard && navigator.clipboard.writeText(out.textContent);
});
</script>`;

  const cookieNotice = `<div id="ck" style="position:fixed;bottom:0;left:0;right:0;background:#111;color:#eee;padding:14px;font-size:14px;text-align:center;z-index:99">
We use cookies to improve the site. <a href="/privacy/" style="color:#c9a">Learn more</a>.
<button onclick="document.getElementById('ck').style.display='none';localStorage.setItem('ck','1')" style="margin-left:12px;padding:6px 14px;cursor:pointer">OK</button>
</div>
<script>
if(localStorage.getItem('ck'))document.getElementById('ck').style.display='none';
</script>`;

  write("index.html", page({
    relRoot: "", title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description, canonical: abs(""), jsonld, main, script: `${script}\n${cookieNotice}`
  }));
}

function buildStoryPage(s) {
  const c = CAT[s.category];
  const r = "../../";
  const canonical = abs(`story/${s.slug}/`);
  const related = inCat(s.category).filter(x => x.slug !== s.slug).slice(0, 3);

  const jsonld = [
    {
      "@context": "https://schema.org", "@type": "BlogPosting",
      headline: s.title, description: s.metaDescription,
      datePublished: dISO(s.date), dateModified: dISO(s.date),
      author: { "@type": "Person", name: s.author },
      publisher: { "@type": "Organization", name: SITE.name },
      mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
      articleSection: c.name, wordCount: wc(s), inLanguage: "en"
    },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: abs("") },
        { "@type": "ListItem", position: 2, name: c.name, item: abs(`category/${c.slug}/`) },
        { "@type": "ListItem", position: 3, name: s.title, item: canonical }
      ]
    }
  ];

  const body = s.parts.map(p => `
${p.label ? `<div class="part-label">${esc(p.label)}</div>` : ""}
${p.heading ? `<h2 class="part-h">${esc(p.heading)}</h2>` : ""}
${p.sub ? `<p class="part-sub">${esc(p.sub)}</p>` : ""}
${p.paras.map(t => `<p>${esc(t)}</p>`).join("")}`).join("");

  const main = `
<article class="reader">
${crumbs([
  { name: "Home", href: r },
  { name: c.name, href: `${r}category/${c.slug}/` },
  { name: s.title }
], r)}
<span class="tag">${esc(c.name)} · ${readMin(s)} min read</span>
<h1>${esc(s.title)}</h1>
${s.sub ? `<p class="sub">${esc(s.sub)}</p>` : ""}
<p class="meta">${esc(s.author)} · Personal experience · <time datetime="${dISO(s.date)}">${dHuman(s.date)}</time></p>
<div class="body">${body}</div>
<p class="notice">This is an editorially adapted, first-person style story. Confessions on this page are not automatically verified as real-life experiences.</p>
<p><a class="back" href="${r}">← All stories</a></p>
</article>
${related.length ? `<section class="section">
  <h2 class="next-head serif">More in ${esc(c.name)}</h2>
  <div class="grid">${related.map(x => card(x, r)).join("")}</div>
</section>` : ""}`;

  write(`story/${s.slug}/index.html`, page({
    relRoot: r, title: `${s.title} — ${SITE.name}`,
    description: s.metaDescription, canonical, type: "article", jsonld, main
  }));
}

function buildCategoryPage(c) {
  const list = inCat(c.slug);
  const r = "../../";
  const canonical = abs(`category/${c.slug}/`);
  const jsonld = [{
    "@context": "https://schema.org", "@type": "CollectionPage",
    name: `${c.name} confessions`, description: c.description, url: canonical
  }];

  const main = `
${crumbs([{ name: "Home", href: r }, { name: c.name }], r)}
<div class="sec-head" style="padding-top:24px">
  <h1>${esc(c.name)}</h1>
  <p class="muted">${esc(c.description)}</p>
</div>
<div class="grid">${list.map(s => card(s, r)).join("")}</div>`;

  write(`category/${c.slug}/index.html`, page({
    relRoot: r, title: `${c.name} confessions — ${SITE.name}`,
    description: c.description, canonical, jsonld, main
  }));
}

function buildAllStoriesPage() {
  const r = "../";
  const main = `
${crumbs([{ name: "Home", href: r }, { name: "All stories" }], r)}
<div class="sec-head" style="padding-top:24px">
  <h1>All confessions</h1>
  <p class="muted">${STORIES.length} first-person stories across ${CATEGORIES.length} categories.</p>
</div>
${CATEGORIES.map(c => {
  const list = inCat(c.slug);
  if (!list.length) return "";
  return `<h2 class="next-head serif" style="margin-top:44px">${esc(c.name)}</h2>
  <div class="grid">${list.map(s => card(s, r)).join("")}</div>`;
}).join("")}`;

  write("stories/index.html", page({
    relRoot: r, title: `All confessions — ${SITE.name}`,
    description: `Every confession on ${SITE.name}, sorted by category.`,
    canonical: abs("stories/"), main
  }));
}

function buildAboutPage() {
  const relRoot = "../";
  const main = fs.readFileSync(path.join(ROOT, "src", "about", "index.html"), "utf8");
  write("about/index.html", page({
    relRoot, title: "About — Dry Humps",
    description: "Dry Humps is a home for anonymous first-person confessions.",
    canonical: abs("about/"), main
  }));
}

function buildSitemap() {
  const urls = [
    { loc: abs(""), pri: "1.0", freq: "daily" },
    { loc: abs("stories/"), pri: "0.8", freq: "daily" },
    ...CATEGORIES.map(c => ({ loc: abs(`category/${c.slug}/`), pri: "0.6", freq: "weekly" })),
    ...newest.map(s => ({ loc: abs(`story/${s.slug}/`), pri: "0.7", freq: "monthly", lastmod: dISO(s.date) }))
  ];

  write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}<changefreq>${u.freq}</changefreq><priority>${u.pri}</priority></url>`).join("\n")}
</urlset>`);

  write("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${abs("sitemap.xml")}\n`);
}

function buildFeed() {
  const items = newest.slice(0, 20).map(s => `  <item>
    <title>${esc(s.title)}</title>
    <link>${abs(`story/${s.slug}/`)}</link>
    <guid>${abs(`story/${s.slug}/`)}</guid>
    <pubDate>${new Date(dISO(s.date)).toUTCString()}</pubDate>
    <category>${esc(CAT[s.category].name)}</category>
    <description>${esc(s.metaDescription)}</description>
  </item>`).join("\n");

  write("feed.xml", `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>${esc(SITE.name)}</title>
<link>${abs("")}</link>
<description>${esc(SITE.description)}</description>
<language>en</language>
${items}
</channel></rss>`);
}

function build404() {
  const main = `<div class="sec-head" style="padding:80px 0">
    <h1>Page not found</h1>
    <p class="muted">That confession moved, or never existed.</p>
    <p style="margin-top:24px"><a class="btn" href="${SITE.base}/">Go home</a></p>
  </div>`;
  write("404.html", page({
    relRoot: SITE.base + "/", title: `Page not found — ${SITE.name}`,
    description: "Page not found.", canonical: abs("404.html"), main
  }));
}

console.log("Clearing old docs/ folder…");
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "assets"), { recursive: true });

console.log("Copying stylesheet…");
fs.copyFileSync(path.join(ROOT, "src", "style.css"), path.join(OUT, "assets", "style.css"));
fs.copyFileSync(path.join(ROOT, "ads.txt"), path.join(OUT, "ads.txt"));

console.log("Building pages…");
buildHome();
buildAllStoriesPage();
buildAboutPage();
STORIES.forEach(buildStoryPage);
CATEGORIES.forEach(buildCategoryPage);
buildSitemap();
buildFeed();
build404();

if (SITE.domain) fs.writeFileSync(path.join(OUT, "CNAME"), SITE.domain + "\n");
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");

console.log("");
console.log("✅ Done!");
console.log(`   ${STORIES.length} stories`);
console.log(`   ${CATEGORIES.length} category pages`);
console.log("");
console.log("   Output is in the docs/ folder.");