/**
 * 将 meta / og / twitter description 与 Article JSON-LD description
 * 同步为 articles.manifest.json 中的 description（站点页使用内置文案）
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "articles.manifest.json"), "utf8")
);

const siteDescriptions = {
  home:
    "沈阳兴华源电力工程设计有限公司位于辽宁省沈阳市，专业从事发电、输电、变电与新能源领域的咨询、设计与技术服务，具备500kV变电站、1000kV特高压、±800kV换流站及新能源EPC、海外光伏工程设计经验，官网提供新能源大基地、升压站与特高压相关技术文章。",
  articlesHub:
    "沈阳兴华源电力工程设计有限公司技术文章栏目，汇集新能源大基地、500kV升压站、特高压外送、接入系统设计、储能与AI数据中心电网协同等工程技术经验整理，涵盖并网、外送通道与升压站等工程设计视角，便于检索、引用与实务参考。",
};

function applyDescription(html, description) {
  const tags = [
    /(<meta\s+name="description"\s+content=")[^"]*("\s*\/>)/g,
    /(<meta\s+property="og:description"\s+content=")[^"]*("\s*\/>)/g,
    /(<meta\s+name="twitter:description"\s+content=")[^"]*("\s*\/>)/g,
  ];
  let out = html;
  for (const re of tags) {
    if (!re.test(out)) {
      throw new Error(`未找到匹配的 meta 标签`);
    }
    out = out.replace(re, `$1${description}$2`);
  }
  if (out.includes('"@type": "Article"')) {
    out = out.replace(
      /("@type": "Article",[\s\S]*?"description": ")[^"]*(")/,
      `$1${description}$2`
    );
  }
  return out;
}

for (const article of manifest.articles) {
  const filePath = path.join(root, "articles", article.slug, "index.html");
  let html = fs.readFileSync(filePath, "utf8");
  html = applyDescription(html, article.description);
  fs.writeFileSync(filePath, html, "utf8");
  console.log(`  文章 ${article.slug}`);
}

for (const [label, file, desc] of [
  ["首页", "index.html", siteDescriptions.home],
  ["技术文章列表", path.join("articles", "index.html"), siteDescriptions.articlesHub],
]) {
  const filePath = path.join(root, file);
  let html = fs.readFileSync(filePath, "utf8");
  html = applyDescription(html, desc);
  html = html.replace(
    /("@type": "WebPage",[\s\S]*?"description": ")[^"]*(")/,
    `$1${desc}$2`
  );
  if (label === "首页") {
    html = html.replace(
      /("@type": "WebSite",[\s\S]*?"description": ")[^"]*(")/,
      `$1${desc}$2`
    );
  }
  fs.writeFileSync(filePath, html, "utf8");
  console.log(`  ${label}`);
}

const articlesHtmlPath = path.join(root, "articles.html");
let articlesHtml = fs.readFileSync(articlesHtmlPath, "utf8");
if (!articlesHtml.includes('name="description"')) {
  articlesHtml = articlesHtml.replace(
    /<meta name="robots"/,
    `<meta\n      name="description"\n      content="${siteDescriptions.articlesHub}"\n    />\n    <meta name="robots"`
  );
} else {
  articlesHtml = applyDescription(articlesHtml, siteDescriptions.articlesHub);
}
fs.writeFileSync(articlesHtmlPath, articlesHtml, "utf8");
console.log("  articles.html 跳转");

console.log("meta description 已同步完成。");
