# CoffeeMate

コーヒーの抽出レシピを記録・共有するWebアプリです。豆、ドリッパー、ミル、抽出条件、味の感想を記録できます。公開レシピへのいいね・保存・コメント、フォロー中のタイムラインにも対応しています。

## 技術構成

- Next.js / Vinext / React / TypeScript
- Cloudflare Workers（アプリの実行）
- Cloudflare D1（アカウント・レシピなどのデータ）
- Cloudflare R2（レシピ画像）

## ローカルで動かす

Node.js 22.13以上とnpmが必要です。

    npm ci
    npm run build

ローカルのデータベースに、drizzle/ 内のSQLを番号順に適用します。Windows PowerShellの例：

    Get-ChildItem drizzle -Filter '*.sql' | Sort-Object Name | ForEach-Object {
      node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file $_.FullName
    }

その後、開発サーバーを起動します。

    npm run dev

表示されたローカルURLを開いてください。ローカルのデータは .wrangler/state に保存され、Gitには含まれません。

## 共有・公開時の注意

- このリポジトリには利用者のアカウント情報、レシピ、画像、ローカルのデータベースは含まれません。
- .env ファイルやトークンをコミットしないでください。生成物とローカルデータは .gitignore で除外しています。
- .openai/hosting.json の project_id は元のCoffeeMateサイトを指します。自分のSitesプロジェクトとして公開する場合は、先に新しいプロジェクトIDへ変更してください。
- 管理画面は通常のCoffeeMateアカウントではなく、Sitesの所有者に紐づくChatGPT認証で保護されています。
