# 发新文检查清单（GitHub Pages 静态站）

本站为纯静态 HTML，GitHub Pages **不会**自动生成 sitemap、RSS 或文章列表。发新文请按下列顺序操作。

## 1. 新建文章页面

- 复制已有文章目录，例如 `articles/new-energy-base-access-system-design/index.html`
- 放到 `articles/<slug>/index.html`（`slug` 与 URL 路径一致，小写英文与连字符）
- 更新文内：`title`、`description`、`canonical`、`datePublished` / `dateModified`、正文、FAQ、AI Summary（相关阅读与上下篇由 `npm run sync:articles` 自动生成）

## 2. 登记文章元数据

编辑根目录 **`articles.manifest.json`**，在 `articles` 数组**最前面**增加一条（日期越新越靠前）：

```json
{
  "slug": "your-article-slug",
  "title": "RSS 与页面标题",
  "listTitle": "列表页显示的标题（可与 title 相同）",
  "date": "2026-06-10",
  "description": "摘要，约 150–200 字，用于 RSS 与列表 excerpt",
  "tags": ["标签1", "标签2"]
}
```

## 3. 一键同步发现层文件

在项目根目录执行：

```bash
node scripts/sync-discovery.mjs
```

或：

```bash
npm run sync
```

将自动更新：

| 文件 | 说明 |
|------|------|
| `sitemap.xml` | 仅 HTML 页面（**不含** `feed.xml`） |
| `feed.xml` | RSS 条目顺序与 manifest 一致 |
| `llms.txt` | 技术文章 URL 列表 |
| `articles/index.html` | 列表卡片 + JSON-LD `ItemList` |

## 4. 同步文章页脚（相关阅读 + 上下篇）

```bash
npm run sync:articles
```

或随发现层一并执行：`npm run sync`（含 `sync-discovery` + `sync-article-footers`）。

脚本会按 `articles.manifest.json` 日期顺序自动写入：

- **上一篇 / 下一篇**（7 篇连成一条链；最早一篇仅「下一篇」，最新一篇仅「上一篇」）
- **相关阅读**（链到其余 6 篇）
- `<head>` 中的 `rel="prev"` / `rel="next"`

## 5. 仍需手改的一处

1. **首页** `index.html`：「近期技术文章」链接改为最新 `articles/<slug>/`（核心业务段落内链可在发新文时酌情增补）

## 6. 根目录遗留跳转页

旧 URL（`about.html`、`articles.html` 等）已统一为：`canonical` + `noindex,follow` + 即时跳转至正式地址。

- 若前置 **Nginx / Cloudflare** 等，可使用 `redirects/nginx-301.conf` 配置 **301**（GitHub Pages 本身不支持服务端 301）。
- `robots.txt` 已对上述路径 `Disallow`，降低被当作独立入口收录的概率。

## 7. 提交到 GitHub（与你以前的做法相同）

GitHub Pages 只会**用仓库里的文件覆盖线上同名文件**，不会自动帮你改 sitemap、RSS 或文章列表。因此：**先在本机改完并执行 `npm run sync`，再把「官网」文件夹里的变更上传**，和以前全选上传的效果一样，只是多了一步同步脚本。

### 发新章完整顺序（建议打印或收藏）

| 步骤 | 做什么 |
|------|--------|
| ① | 复制 `articles/某篇旧文/index.html` → 新建 `articles/新slug/index.html`，改标题、正文、canonical、日期、FAQ 等 |
| ② | 打开 `articles.manifest.json`，在 `articles` **数组最上面**加一条新文章信息 |
| ③ | 在「官网」文件夹打开终端，执行 **`npm run sync`**（含 sitemap/列表/页脚/**meta description**；需已安装 [Node.js](https://nodejs.org/)） |
| ④ | 打开 **`index.html`**，把 Hero 里「近期：…」那条链接改成新文章 |
| ⑤ | 本地浏览器打开 `index.html`、`articles/index.html`、新文章页，确认链接正常 |
| ⑥ | 把「官网」里**有改动的文件**提交到 GitHub（见下方三种方式任选一种） |
| ⑦ | 等 1～3 分钟，打开 `https://www.xhy-power.cn/articles/新slug/` 和 `sitemap.xml` 检查是否已更新 |

**`npm run sync` 会自动改动的文件**（上传时要带上）：`sitemap.xml`、`feed.xml`、`llms.txt`、`articles/index.html`，以及**所有** `articles/*/index.html` 的「相关阅读 / 上一篇下一篇」。若没装 Node、无法跑脚本，就需要按 `PUBLISH.md` 前面各节**手工**改这些文件（容易漏，不推荐）。

### 方式 A：GitHub 网页（最贴近你以前「全选添加」）

1. 浏览器打开你的 **GitHub 仓库**（存放官网的那个 repo）。
2. 进入与本地 **`官网` 文件夹对应** 的目录（有的仓库根目录就是官网内容，有的在子文件夹里，以你仓库实际结构为准）。
3. 点击 **Add file → Upload files**（或进入子目录后 Upload files）。
4. 把本机 **`官网` 文件夹里改过的文件/文件夹** 拖进页面（可全选整个 `官网` 再拖，GitHub 会按路径覆盖同名文件）。
5. 在页面下方写一句说明，例如：`新增技术文章：xxx`，点 **Commit changes**。
6. 若仓库已开启 **GitHub Pages** 且源分支正确，几分钟后网站会自动更新。

> 注意：只上传你改过的文件也可以；若不确定改了哪些，**上传整个 `官网` 目录内容** 仍是最省心的做法，与以前一致。

### 方式 B：GitHub Desktop

1. 用 GitHub Desktop 打开该仓库，把本地「官网」目录放在仓库对应位置。
2. 左侧会看到变更列表；写 Summary 后点 **Commit to main**（或你的 Pages 分支）。
3. 点 **Push origin** 推到 GitHub。

### 方式 C：命令行（可选）

在「官网」所在仓库目录执行：

```bash
git add .
git commit -m "新增技术文章：文章标题简述"
git push
```

### 上传后建议检查

- `https://www.xhy-power.cn/articles/新slug/` 能打开
- `https://www.xhy-power.cn/articles/` 列表最上方是新文章
- `https://www.xhy-power.cn/sitemap.xml` 里包含新文章 URL

## 8. 部署与搜索引擎

1. 推送到 GitHub Pages 所用分支（多为 `main`）
2. 部署后浏览器直接打开验证：
   - `https://www.xhy-power.cn/sitemap.xml`
   - `https://www.xhy-power.cn/feed.xml`
3. **Google Search Console**
   - 只提交站点地图：`https://www.xhy-power.cn/sitemap.xml`
   - **不要**把 `/feed.xml` 当作站点地图提交；若已提交请删除
4. 可选：在 GSC 对首页或新文 URL 使用「请求编入索引」

## 9. GitHub Pages 说明

- 根目录已放置 **`.nojekyll`**，避免 Jekyll 忽略 `sitemap.xml` 等文件
- 若使用自定义域名，请在仓库设置或根目录 **`CNAME`** 中配置 `www.xhy-power.cn`（当前仓库未包含 CNAME 时以 GitHub 仓库设置为准）

## 故障排查

| 现象 | 处理 |
|------|------|
| GSC 站点地图「无法抓取」 | 确认线上能打开 `sitemap.xml`；检查 Pages 是否发布成功、域名是否指向正确 |
| 浏览器打开 feed 提示无样式 | 正常，RSS 为 XML |
| 列表与 RSS 不一致 | 重新运行 `npm run sync` |
