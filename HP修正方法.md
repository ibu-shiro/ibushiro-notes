#### 🏁 ゴールのイメージ
最終的に、いぶしろさんが自分でできるようになる流れはこれです👇
本番サイトをLocalにクローンする（まるごとコピー）
Localサイトの子テーマを Cursor + AI で編集する
その変更を GitHub にバックアップ＆履歴として残す
変更した子テーマのファイルだけを Cyberduck で本番にアップする
本番サイトで最終確認、ダメならGitHubからすぐ戻す
これを、次から自力で同じことができるレベルで解説します。
### 0. 事前に必要なもの（確認）
すでにほぼ揃っていると思いますが、整理しておきます👇
✅ Xserver などの 本番サーバー
✅ そこに入っている WordPress本番サイト（SWELL＋子テーマ）
✅ Local（Local by Flywheel）
✅ Cursor
✅ Cyberduck
✅ GitHubアカウント
✅ Mac（ターミナルが使えると少し楽）
### 1. 本番サーバー側の情報確認
まず、今後の作業で必要になる情報を整理しておきます。
## 1-1. SFTP（Cyberduck）接続情報
Xserverなどの管理画面で、以下を確認：
ホスト名（例：svXXXX.xserver.jp）
ユーザー名（サーバーID）
パスワード
ポート（通常 22）
接続方式：SFTP
これは Cyberduck用 に使います。
## 1-2. データベース情報（DB名など）
サーバーの「phpMyAdmin」へ行くURL
DB名（wp_xxxxxx みたいなもの）
DBユーザー名 / パスワード
これは DBエクスポート／インポート用 に使います。
### 2. Local にクローン用サイトを作る
## 2-1. Localで新規サイトを作成
Localアプリを開く
「Create a new site（新規サイト）」をクリック
Site name：わかりやすい名前にする（例：sorayone-local）
環境設定はデフォルトでOK（PHP / MySQL / Webサーバー）
管理者ユーザー名・パスワードを設定（テキトーでOK）
👉 これで 空のWordPressがLocalに立つ 状態になります。
## 2-2. Localのフォルダパスを確認
Localサイトをクリック → 「Open site folder」
だいたいこんな構造です👇
Local Sites/
  sorayone-local/
    app/
      public/
        wp-content/
          themes/
          plugins/
          uploads/
ここに、本番からコピーした中身を入れていくイメージです。
### 3. 本番からファイルをコピー（Cyberduck）
## 3-1. Cyberduckで本番サーバーに接続
Cyberduckを開く
左上の「＋」から「SFTP（SSH）」を選択
ホスト・ユーザー名・パスワード・ポート22 を入力
接続
## 3-2. WordPressのインストールディレクトリへ移動
多くの場合：
/public_html/
の下にWordPressが入っています。
その中の：
wp-content/
  themes/
  plugins/
  uploads/
が重要です。
## 3-3. 以下の3フォルダをローカルにダウンロード
ローカルの sorayone-local/app/public/wp-content/ に向けて👇
themes
plugins
uploads
を ドラッグ＆ドロップでダウンロード → 上書き します。
⚠ すでにLocal側にあった themes/plugins/uploads は、実質「空サイト用」なので本番のもので上書きしてOKです。
### 4. データベースをコピー（本番 → Local）
## 4-1. 本番のDBをエクスポート
サーバーの管理画面から「phpMyAdmin」に入る
対象のデータベース（本番サイトのDB）を選択
上のタブから「エクスポート」
形式は「SQL」で実行
backup.sql みたいなファイルがPCにダウンロードされる
## 4-2. Local側のDBにインポート
Localで sorayone-local サイトを選択
「Database」→「Open Adminer」または「Open phpMyAdmin」
LocalのDB（例：local-sorayone-local）を選択
必要なら既存テーブルを削除（DROP）
「インポート」タブから、さっきエクスポートした backup.sql を選んで実行
👉 これで 本番と同じ記事・固定ページ・設定がLocalに入る 状態になります。
### 5. URLの書き換え（siteurl / home）
本番のDBには、本番URLが入っています。
例：
https://sorayonehealing.com
Localでは：
http://sorayone-local.local（例）
になっているので、これを修正します。
## 5-1. wp_options テーブルを編集
Local側のDB管理画面で wp_options を開く
option_name が
siteurl
home
の2つの行を探す
option_value を LocalのURL に変更する
https://sorayonehealing.com
↓
http://sorayone-local.local
👉 こうすると Local環境のWordPressが正しいURLで動く ようになります。
### 6. Local クローンサイトの動作確認
ブラウザで：
http://sorayone-local.local
にアクセスして、本番と同じ見た目になっているか確認します。
トップページ
LPページ
ヘッダー・フッター
SWELLの設定
が本番と同じならOKです 🎉
### 7. Cursorで「子テーマ」を開く
## 7-1. 開くフォルダ
Cursorで「Open Folder」から：
Local Sites/sorayone-local/app/public/wp-content/themes/swell_child
を開きます。
✅ 編集するのは 必ず swell_child（子テーマ）だけ
親テーマ swell は触らない。
## 7-2. AIへの前提説明（最初に1回入れておくと楽）
これはWordPressテーマ「SWELL」の子テーマ(swell_child)です。
親テーマ(swell)は参照専用で、編集は必ず子テーマだけで行ってください。

これから、この子テーマを使ってデザインや機能をカスタマイズしたいです。
これを最初に投げておくと、Cursorが構造を意識してくれます。
### 8. Git & GitHub で子テーマをバックアップ管理
## 8-1. GitHubでリポジトリを作成
GitHubにログイン
「New repository」→リポジトリ名：swell-child-theme など
空のリポジトリを作成（README等は無くてもOK）
## 8-2. ローカルの swell_child をGit管理にする
ターミナルを使う場合（わかりやすく流れだけ）：
cd Local\ Sites/sorayone-local/app/public/wp-content/themes/swell_child
git init
git add .
git commit -m "初回コミット"
git remote add origin https://github.com/ユーザー名/swell-child-theme.git
git push -u origin main
❗ ターミナルがしんどければ、
Cursor の Git（Source Control）パネルから
初期化（Initialize Repository）
Commit
Publish to GitHub
という流れでもOKです。
👉 これで：
子テーマの内容がGitHubに保存され、履歴が取れる状態 になります。
### 9. 実際の編集サイクル（超大事）
ここが「今後ずっと繰り返す流れ」です。
## 🔁 9-1. Local + Cursor で編集
functions.php でフックや機能追加
style.css でデザイン調整
js/〜.js で動きの追加
page-lp.php などLP用テンプレートを作成
などなど。
編集が終わったら、Localのサイトで見た目を確認：
http://sorayone-local.local
## 🔁 9-2. Gitで保存（バックアップ）
Cursor の Git パネルで、変更されたファイルを確認
コミットしたいファイルにチェック → ステージ
「Commit」ボタンでコミットメッセージを付けて保存
「Push」ボタンでGitHubに送信
これで：
どのファイルをいつどう変えたか
もし壊れてもどこまで戻せばいいか
が 全部履歴として残る ようになります。
## 🔁 9-3. 本番へ反映（Cyberduck）
どのファイルを変更したかを把握
例：functions.php と style.css だけ など
Cyberduckで本番サーバーに接続
public_html/wp-content/themes/swell_child/ に移動
Local の同じファイルパスから、変更したファイルだけ ドラッグ＆ドロップでアップロード（上書き）
ローカル:
Local Sites/sorayone-local/app/public/wp-content/themes/swell_child/functions.php

→ 本番:
public_html/wp-content/themes/swell_child/functions.php
👉 これで 本番テーマが最新の子テーマに更新されます。
## 🔁 9-4. 本番サイトで確認
ブラウザで本番URLを開く：
https://sorayonehealing.com
追加した機能（ローディング、ボタンなど）が動いているか
レイアウト崩れがないか
PC / スマホ両方で問題ないか
を確認します。
### 10. もし本番でおかしくなったときの戻し方（超重要）
GitHubを使っていると、壊れても怖くない です。
## 10-1. GitHubで一つ前のコミットを開く
GitHubのリポジトリ → 「Commits」
一つ前のコミットをクリック
functions.php や style.css の以前の内容を確認できる
## 10-2. その内容をローカルに戻す
CursorでそのコミットにRevertする
または
以前の内容をコピペで貼り直して保存
## 10-3. 再度 FTPでアップロード
いつもどおり Cyberduck で該当ファイルを本番にアップロード。
👉 これで本番も “元の状態” に戻せます。
#### ✅ まとめ（今後、いぶしろさんがやるべき流れ）
1. 本番サーバーから themes / plugins / uploads と DB を Local にコピー
2. Local で本番クローンサイトを動かす
3. Cursor で子テーマ（swell_child）フォルダを開く
4. 子テーマを Git / GitHub で管理（初回セットアップ）
5. Local + Cursor + AI で子テーマを編集 → Localで確認
6. 編集内容を Git commit → GitHub に push（バックアップ）
7. 変更した子テーマのファイルだけを Cyberduck で本番にアップロード
8. 本番サイトをブラウザで確認
9. 問題があれば GitHub の過去バージョンから戻して再アップロード


