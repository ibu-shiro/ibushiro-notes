/**
 * ========================================
 * WordPress XML → Markdown コンバーター
 * メインロジック
 * ========================================
 * 
 * 使い方:
 * 1. index.html をブラウザで開く
 * 2. WordPress のエクスポート XML ファイルを選択
 * 3. オプションを設定（ファイル名ルール、フロントマターなど）
 * 4. 「変換を実行」ボタンをクリック
 * 5. カテゴリーごとにフォルダー分けされた Zip ファイルがダウンロードされる
 * 
 * 必要なライブラリ（CDN で読み込み済み）:
 * - JSZip: Zip ファイル生成
 * - Turndown: HTML → Markdown 変換
 */

// DOM要素の取得
const xmlFileInput = document.getElementById('xmlFile');
const fileNameDisplay = document.getElementById('fileName');
const convertBtn = document.getElementById('convertBtn');
const logSection = document.getElementById('logSection');
const logArea = document.getElementById('logArea');

// ファイル選択時の処理
xmlFileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        fileNameDisplay.textContent = file.name;
    } else {
        fileNameDisplay.textContent = '選択されていません';
    }
});

// 変換ボタンのクリックイベント
convertBtn.addEventListener('click', async function() {
    // ファイルが選択されているかチェック
    if (!xmlFileInput.files || xmlFileInput.files.length === 0) {
        alert('⚠️ XML ファイルを選択してください。');
        return;
    }

    const file = xmlFileInput.files[0];
    
    // ボタンを無効化
    convertBtn.disabled = true;
    convertBtn.textContent = '🔄 変換中...';
    
    // ログエリアをクリアして表示
    logSection.style.display = 'block';
    logArea.innerHTML = '';
    addLog('変換を開始します...', 'info');

    try {
        // XMLファイルを読み込み
        const xmlContent = await readFileAsText(file);
        addLog('✓ XML ファイルを読み込みました', 'success');

        // XMLをパース
        const posts = parseWordPressXml(xmlContent);
        addLog(`✓ ${posts.length} 件の記事を抽出しました`, 'success');

        if (posts.length === 0) {
            addLog('⚠️ 変換可能な記事が見つかりませんでした', 'warning');
            return;
        }

        // オプションを取得
        const options = getOptions();

        // 各記事をMarkdownに変換
        const markdownPosts = posts.map(post => convertItemToMarkdown(post, options));
        addLog(`✓ Markdown への変換が完了しました`, 'success');

        // Zipファイルを生成してダウンロード
        await buildZipFromPosts(markdownPosts, options);
        addLog('✓ Zip ファイルのダウンロードを開始しました', 'success');
        addLog('🎉 すべての処理が完了しました！', 'success');

    } catch (error) {
        addLog(`❌ エラーが発生しました: ${error.message}`, 'error');
        console.error(error);
    } finally {
        // ボタンを有効化
        convertBtn.disabled = false;
        convertBtn.textContent = '🚀 変換を実行';
    }
});

/**
 * ファイルをテキストとして読み込む
 * @param {File} file - 読み込むファイル
 * @returns {Promise<string>} ファイルの内容
 */
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('ファイルの読み込みに失敗しました'));
        reader.readAsText(file, 'UTF-8');
    });
}

/**
 * WordPress XML をパースして記事データを抽出
 * @param {string} xmlString - XML文字列
 * @returns {Array} 記事データの配列
 */
function parseWordPressXml(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

    // パースエラーチェック
    const parserError = xmlDoc.getElementsByTagName('parsererror');
    if (parserError && parserError.length > 0) {
        throw new Error('XML のパースに失敗しました。ファイルが正しい WordPress エクスポート XML か確認してください。');
    }

    const items = xmlDoc.getElementsByTagName('item');
    const posts = [];
    const includeDrafts = document.getElementById('includeDrafts').checked;

    let skippedCount = 0;
    let skippedReasons = {};

    Array.from(items).forEach((item, index) => {
        // post_type をチェック
        const postType = getElementText(item, 'wp:post_type') || getElementText(item, 'post_type');
        if (postType !== 'post') {
            skippedCount++;
            skippedReasons[`post_type が post ではない (${postType})`] = 
                (skippedReasons[`post_type が post ではない (${postType})`] || 0) + 1;
            return;
        }

        // status をチェック
        const status = getElementText(item, 'wp:status') || getElementText(item, 'status');
        if (status !== 'publish' && !includeDrafts) {
            skippedCount++;
            skippedReasons[`ステータスが publish ではない (${status})`] = 
                (skippedReasons[`ステータスが publish ではない (${status})`] || 0) + 1;
            return;
        }

        // 記事データを抽出
        const post = {
            title: getElementText(item, 'title') || 'Untitled',
            content: getElementText(item, 'content:encoded') || getElementText(item, 'encoded') || '',
            date: getElementText(item, 'wp:post_date') || getElementText(item, 'post_date') || '',
            slug: getElementText(item, 'wp:post_name') || getElementText(item, 'post_name') || `post-${index}`,
            postId: getElementText(item, 'wp:post_id') || getElementText(item, 'post_id') || index,
            status: status,
            categories: extractCategories(item),
            tags: extractTags(item)
        };

        posts.push(post);
    });

    // スキップされた記事があればログに表示
    if (skippedCount > 0) {
        addLog(`⚠️ ${skippedCount} 件の記事をスキップしました:`, 'warning');
        for (const [reason, count] of Object.entries(skippedReasons)) {
            addLog(`  - ${reason}: ${count} 件`, 'warning');
        }
    }

    return posts;
}

/**
 * XML要素からテキストを取得（名前空間対応）
 * @param {Element} parent - 親要素
 * @param {string} tagName - タグ名
 * @returns {string} テキスト内容
 */
function getElementText(parent, tagName) {
    // getElementsByTagName を使用（名前空間対応）
    let elements = parent.getElementsByTagName(tagName);
    
    // 見つからない場合は名前空間なしで試す
    if (!elements || elements.length === 0) {
        const plainTag = tagName.replace('\\:', ':').split(':').pop();
        elements = parent.getElementsByTagName(plainTag);
    }
    
    // 見つからない場合はさらに wp: プレフィックスを付けて試す
    if (!elements || elements.length === 0) {
        const withPrefix = tagName.includes(':') ? tagName : `wp:${tagName}`;
        elements = parent.getElementsByTagName(withPrefix);
    }
    
    return elements && elements.length > 0 ? elements[0].textContent.trim() : '';
}

/**
 * カテゴリーを抽出
 * @param {Element} item - item要素
 * @returns {Array} カテゴリー名の配列
 */
function extractCategories(item) {
    const categories = [];
    const categoryElements = item.getElementsByTagName('category');
    
    Array.from(categoryElements).forEach(cat => {
        const domain = cat.getAttribute('domain');
        if (domain === 'category') {
            const nicename = cat.getAttribute('nicename');
            const text = cat.textContent.trim();
            categories.push({
                name: text,
                slug: nicename || sanitizeCategoryName(text)
            });
        }
    });
    
    return categories;
}

/**
 * タグを抽出
 * @param {Element} item - item要素
 * @returns {Array} タグ名の配列
 */
function extractTags(item) {
    const tags = [];
    const categoryElements = item.getElementsByTagName('category');
    
    Array.from(categoryElements).forEach(cat => {
        const domain = cat.getAttribute('domain');
        if (domain === 'post_tag') {
            tags.push(cat.textContent.trim());
        }
    });
    
    return tags;
}

/**
 * カテゴリー名をフォルダー名用にサニタイズ
 * @param {string} name - カテゴリー名
 * @returns {string} サニタイズされた名前
 */
function sanitizeCategoryName(name) {
    return name
        .toLowerCase()
        .replace(/\s+/g, '-')           // スペースをハイフンに
        .replace(/　+/g, '-')           // 全角スペースをハイフンに
        .replace(/[^\w\-]+/g, '')       // 英数字とハイフン以外を削除
        .replace(/\-\-+/g, '-')         // 連続するハイフンを1つに
        .replace(/^-+/, '')             // 先頭のハイフンを削除
        .replace(/-+$/, '') || 'uncategorized';  // 末尾のハイフンを削除
}

/**
 * オプション設定を取得
 * @returns {Object} オプション設定
 */
function getOptions() {
    const filenameRule = document.querySelector('input[name="filenameRule"]:checked').value;
    const includeFrontmatter = document.getElementById('includeFrontmatter').checked;
    
    return {
        filenameRule,
        includeFrontmatter
    };
}

/**
 * 記事データをMarkdownに変換
 * @param {Object} post - 記事データ
 * @param {Object} options - オプション設定
 * @returns {Object} Markdown変換後のデータ
 */
function convertItemToMarkdown(post, options) {
    // HTML → Markdown 変換（Turndownを使用）
    const turndownService = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced'
    });
    
    let content = post.content;
    
    // HTMLをMarkdownに変換
    try {
        content = turndownService.turndown(content);
    } catch (e) {
        // 変換失敗時は簡易的な置換を実行
        content = simpleHtmlToMarkdown(content);
    }

    // フロントマター生成
    let markdown = '';
    
    if (options.includeFrontmatter) {
        markdown += '---\n';
        markdown += `title: "${escapeYaml(post.title)}"\n`;
        markdown += `date: "${formatDate(post.date)}"\n`;
        markdown += `slug: "${post.slug}"\n`;
        markdown += `post_id: ${post.postId}\n`;
        
        if (post.status && post.status !== 'publish') {
            markdown += `status: "${post.status}"\n`;
        }
        
        if (post.categories.length > 0) {
            markdown += 'categories:\n';
            post.categories.forEach(cat => {
                markdown += `  - "${escapeYaml(cat.name)}"\n`;
            });
        }
        
        if (post.tags.length > 0) {
            markdown += 'tags:\n';
            post.tags.forEach(tag => {
                markdown += `  - "${escapeYaml(tag)}"\n`;
            });
        }
        
        markdown += '---\n\n';
    }
    
    // 本文を追加
    markdown += content;

    // ファイル名を生成
    const filename = generateFilename(post, options.filenameRule);
    
    // カテゴリーフォルダー名を決定
    const categoryFolder = post.categories.length > 0 
        ? post.categories[0].slug 
        : 'uncategorized';

    return {
        filename,
        categoryFolder,
        content: markdown,
        post
    };
}

/**
 * 簡易的なHTML→Markdown変換
 * @param {string} html - HTML文字列
 * @returns {string} Markdown文字列
 */
function simpleHtmlToMarkdown(html) {
    return html
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n')
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n')
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n')
        .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n#### $1\n')
        .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
        .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
        .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
        .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
        .replace(/<[^>]+>/g, ''); // 残りのタグを削除
}

/**
 * YAML用に文字列をエスケープ
 * @param {string} str - エスケープする文字列
 * @returns {string} エスケープされた文字列
 */
function escapeYaml(str) {
    return str.replace(/"/g, '\\"');
}

/**
 * 日付をフォーマット
 * @param {string} dateStr - 日付文字列
 * @returns {string} YYYY-MM-DD形式の日付
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    
    // "2025-01-15 12:34:56" → "2025-01-15"
    const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        return `${match[1]}-${match[2]}-${match[3]}`;
    }
    
    return dateStr;
}

/**
 * ファイル名を生成
 * @param {Object} post - 記事データ
 * @param {string} rule - ファイル名ルール
 * @returns {string} ファイル名
 */
function generateFilename(post, rule) {
    const slug = post.slug || 'untitled';
    const date = formatDate(post.date);
    const id = post.postId;
    
    switch (rule) {
        case 'date-slug':
            return `${date}-${slug}.md`;
        case 'id-slug':
            return `${id}-${slug}.md`;
        case 'slug':
        default:
            return `${slug}.md`;
    }
}

/**
 * Zipファイルを生成してダウンロード
 * @param {Array} markdownPosts - Markdown変換後の記事データ配列
 * @param {Object} options - オプション設定
 */
async function buildZipFromPosts(markdownPosts, options) {
    const zip = new JSZip();
    
    // カテゴリーごとにフォルダーを作成して記事を追加
    markdownPosts.forEach(({ filename, categoryFolder, content }) => {
        const filePath = `${categoryFolder}/${filename}`;
        zip.file(filePath, content);
    });
    
    // Zipファイルを生成
    addLog('Zip ファイルを生成中...', 'info');
    const blob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
            level: 6
        }
    });
    
    // ダウンロード
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wordpress-export-md.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * ログメッセージを追加
 * @param {string} message - メッセージ
 * @param {string} type - ログタイプ (info, success, warning, error)
 */
function addLog(message, type = 'info') {
    const p = document.createElement('p');
    p.className = `log-${type}`;
    p.textContent = message;
    logArea.appendChild(p);
    
    // 自動スクロール
    logArea.scrollTop = logArea.scrollHeight;
}

