/**
 * 按 articles.manifest.json 更新每篇技术文章：
 * - 系列导航（上一篇/下一篇，按发布日期从早到晚）
 * - 相关阅读（链接至其余全部文章）
 * - <head> 中的 link rel=prev / next（若有）
 *
 * 用法：node scripts/sync-article-footers.mjs
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
const chronological = [...manifest.articles].sort(
  (a, b) => new Date(a.date) - new Date(b.date)
);
const newestFirst = [...manifest.articles].sort(
  (a, b) => new Date(b.date) - new Date(a.date)
);

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function articleUrl(slug) {
  return `${site}/articles/${slug}/`;
}

function buildSeriesNav(slug) {
  const idx = chronological.findIndex((a) => a.slug === slug);
  const blocks = [];
  if (idx > 0) {
    const prev = chronological[idx - 1];
    blocks.push(`            <div>
              <span class="article-series-nav-label">上一篇</span>
              <a href="../${prev.slug}/"
                >${escapeHtml(prev.listTitle || prev.title)}</a
              >
            </div>`);
  }
  if (idx < chronological.length - 1) {
    const next = chronological[idx + 1];
    blocks.push(`            <div>
              <span class="article-series-nav-label">下一篇</span>
              <a href="../${next.slug}/"
                >${escapeHtml(next.listTitle || next.title)}</a
              >
            </div>`);
  }
  if (blocks.length === 0) return "";
  return `
          <nav class="article-series-nav" aria-label="系列文章导航">
${blocks.join("\n")}
          </nav>

`;
}

function buildRelatedList(slug) {
  return newestFirst
    .filter((a) => a.slug !== slug)
    .map(
      (a) => `                <li>
                  <a href="../${a.slug}/"
                    >《${escapeHtml(a.listTitle || a.title)}》</a
                  >
                </li>`
    )
    .join("\n");
}

function syncHeadLinks(content, slug) {
  const idx = chronological.findIndex((a) => a.slug === slug);
  content = content.replace(
    /\s*<link rel="prev" href="[^"]*" \/>\n?/g,
    ""
  );
  content = content.replace(
    /\s*<link rel="next" href="[^"]*" \/>\n?/g,
    ""
  );
  const inserts = [];
  if (idx > 0) {
    inserts.push(
      `    <link rel="prev" href="${articleUrl(chronological[idx - 1].slug)}" />`
    );
  }
  if (idx < chronological.length - 1) {
    inserts.push(
      `    <link rel="next" href="${articleUrl(chronological[idx + 1].slug)}" />`
    );
  }
  if (inserts.length === 0) return content;
  return content.replace(
    /(<link\s+rel="canonical"[\s\S]*?\/>)/,
    `$1\n${inserts.join("\n")}`
  );
}

for (const article of manifest.articles) {
  const filePath = path.join(root, "articles", article.slug, "index.html");
  let content = fs.readFileSync(filePath, "utf8");

  content = content.replace(
    /\s*<nav class="article-series-nav"[\s\S]*?<\/nav>\s*\n/g,
    "\n"
  );
  const seriesNav = buildSeriesNav(article.slug);
  content = content.replace(
    /(\s*)<footer class="article-doc-footer">/,
    `${seriesNav}$1<footer class="article-doc-footer">`
  );

  content = content.replace(
    /<ul class="article-related-read-list">[\s\S]*?<\/ul>/,
    `<ul class="article-related-read-list">\n${buildRelatedList(article.slug)}\n              </ul>`
  );

  content = syncHeadLinks(content, article.slug);
  fs.writeFileSync(filePath, content, "utf8");
}

console.log(
  `已更新 ${manifest.articles.length} 篇文章的系列导航、相关阅读与 prev/next 链接`
);
