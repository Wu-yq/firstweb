/**
 * 从 articles.manifest.json 同步生成：
 * - sitemap.xml（仅 HTML 页面，不含 feed.xml）
 * - feed.xml
 * - llms.txt 文章列表区
 * - articles/index.html 列表卡片与 ItemList（需已放置标记）
 *
 * 用法：node scripts/sync-discovery.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "articles.manifest.json"), "utf8")
);
const site = manifest.site.replace(/\/$/, "");
const articles = [...manifest.articles].sort(
  (a, b) => new Date(b.date) - new Date(a.date)
);

const RFC_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const RFC_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function toRfc822(isoDate) {
  const d = new Date(`${isoDate}T08:00:00+08:00`);
  const pad = (n) => String(n).padStart(2, "0");
  return `${RFC_DAYS[d.getUTCDay()]}, ${pad(d.getUTCDate())} ${RFC_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} +0800`;
}

function toChineseDate(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

function articleUrl(slug) {
  return `${site}/articles/${slug}/`;
}

function latestDate() {
  return articles[0]?.date ?? new Date().toISOString().slice(0, 10);
}

function escapeXml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildSitemap() {
  const last = latestDate();
  const lines = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<!-- 由 scripts/sync-discovery.mjs 根据 articles.manifest.json 生成 -->`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    `  <url>`,
    `    <loc>${site}/</loc>`,
    `    <lastmod>${last}</lastmod>`,
    `    <changefreq>monthly</changefreq>`,
    `    <priority>1.0</priority>`,
    `  </url>`,
    `  <url>`,
    `    <loc>${site}/articles/</loc>`,
    `    <lastmod>${last}</lastmod>`,
    `    <changefreq>weekly</changefreq>`,
    `    <priority>0.75</priority>`,
    `  </url>`,
  ];
  for (const a of articles) {
    lines.push(
      `  <url>`,
      `    <loc>${articleUrl(a.slug)}</loc>`,
      `    <lastmod>${a.date}</lastmod>`,
      `    <changefreq>weekly</changefreq>`,
      `    <priority>0.65</priority>`,
      `  </url>`
    );
  }
  lines.push(`</urlset>`, ``);
  return lines.join("\n");
}

function buildFeed() {
  const last = latestDate();
  const items = articles
    .map(
      (a) => `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${articleUrl(a.slug)}</link>
      <guid isPermaLink="true">${articleUrl(a.slug)}</guid>
      <pubDate>${toRfc822(a.date)}</pubDate>
      <description>${escapeXml(a.description)}</description>
    </item>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- 由 scripts/sync-discovery.mjs 根据 articles.manifest.json 生成 -->
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>技术文章｜沈阳兴华源电力工程设计有限公司</title>
    <link>${site}/articles/</link>
    <atom:link href="${site}/feed.xml" rel="self" type="application/rss+xml" />
    <description>围绕新能源大基地、500kV升压站、特高压外送、接入系统设计、储能与AI数据中心电网协同的工程技术文章。</description>
    <language>zh-CN</language>
    <lastBuildDate>${toRfc822(last)}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}

function buildLlmsArticleLines() {
  return articles.map((a) => `- ${articleUrl(a.slug)}`).join("\n");
}

function buildArticleCard(a) {
  const tags = a.tags.map((t) => `                <li>${escapeXml(t)}</li>`).join("\n");
  return `            <article class="article-card">
              <p class="article-card-time"><time datetime="${a.date}">${toChineseDate(a.date)}</time></p>
              <h2 class="article-card-title">
                <a href="${a.slug}/"
                  >${escapeXml(a.listTitle || a.title)}</a
                >
              </h2>
              <p class="article-card-excerpt">
                ${escapeXml(a.description)}
              </p>
              <ul class="article-tags" aria-label="标签">
${tags}
              </ul>
            </article>`;
}

function escapeJson(str) {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function buildItemListJson() {
  return articles
    .map(
      (a, i) => `              {
                "@type": "ListItem",
                "position": ${i + 1},
                "url": "${articleUrl(a.slug)}",
                "name": "${escapeJson(a.listTitle || a.title)}"
              }`
    )
    .join(",\n");
}

function replaceBetween(content, startMark, endMark, replacement) {
  const start = content.indexOf(startMark);
  const end = content.indexOf(endMark);
  if (start === -1 || end === -1) {
    throw new Error(`标记未找到: ${startMark} 或 ${endMark}`);
  }
  return (
    content.slice(0, start + startMark.length) +
    "\n" +
    replacement +
    "\n" +
    content.slice(end)
  );
}

function syncLlms() {
  const llmsPath = path.join(root, "llms.txt");
  let content = fs.readFileSync(llmsPath, "utf8");
  content = replaceBetween(
    content,
    "<!-- ARTICLES_LIST_START -->",
    "<!-- ARTICLES_LIST_END -->",
    buildLlmsArticleLines()
  );
  fs.writeFileSync(llmsPath, content, "utf8");
}

function syncArticlesIndex() {
  const indexPath = path.join(root, "articles", "index.html");
  let content = fs.readFileSync(indexPath, "utf8");
  const cards = articles.map(buildArticleCard).join("\n");
  content = replaceBetween(
    content,
    "<!-- ARTICLE_CARDS_START -->",
    "<!-- ARTICLE_CARDS_END -->",
    cards
  );
  const itemListRe =
    /"itemListElement": \[\s*[\s\S]*?\n            \](?=\s*\r?\n\s*\},)/;
  if (!itemListRe.test(content)) {
    throw new Error("articles/index.html 中未找到 itemListElement 块");
  }
  content = content.replace(
    itemListRe,
    `"itemListElement": [\n${buildItemListJson()}\n            ]`
  );
  fs.writeFileSync(indexPath, content, "utf8");
}

fs.writeFileSync(path.join(root, "sitemap.xml"), buildSitemap(), "utf8");
fs.writeFileSync(path.join(root, "feed.xml"), buildFeed(), "utf8");
syncLlms();
syncArticlesIndex();

console.log("已同步：sitemap.xml, feed.xml, llms.txt, articles/index.html");
console.log(`共 ${articles.length} 篇文章，最新日期 ${latestDate()}`);
