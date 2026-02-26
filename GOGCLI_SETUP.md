# gogcli セットアップガイド

Google Workspace のサービス（Gmail、Google Tasks、Google Drive など）をターミナルから操作するための CLI ツールです。

## 1. gogcli のインストール

### Linux (amd64)
```bash
curl -sL "https://github.com/steipete/gogcli/releases/download/v0.11.0/gogcli_0.11.0_linux_amd64.tar.gz" -o /tmp/gogcli.tar.gz
tar xzf /tmp/gogcli.tar.gz -C /tmp
sudo cp /tmp/gog /usr/local/bin/gog
gog --version
```

### macOS (Homebrew)
```bash
brew install steipete/tap/gogcli
```

## 2. Google Cloud Console で OAuth クレデンシャルを取得

### Step 1: Google Cloud プロジェクトを作成
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 上部の「プロジェクトを選択」→「新しいプロジェクト」をクリック
3. プロジェクト名を入力（例: `gogcli-workspace`）→「作成」

### Step 2: 必要な API を有効化
1. 左メニュー「APIとサービス」→「ライブラリ」に移動
2. 以下の API を検索して有効化:
   - **Gmail API**
   - **Google Tasks API**
   - **Google Drive API**（添付ファイル管理に必要）

### Step 3: OAuth 同意画面を設定
1. 左メニュー「APIとサービス」→「OAuth 同意画面」に移動
2. 「外部」を選択して「作成」
3. アプリ名（例: `gogcli`）、ユーザーサポートメール、デベロッパーの連絡先を入力
4. 「スコープを追加」で以下を追加:
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/tasks`
   - `https://www.googleapis.com/auth/drive.readonly`
5. 「テストユーザー」に自分の Gmail アドレスを追加
6. 「保存して次へ」

### Step 4: OAuth クライアント ID を作成
1. 左メニュー「APIとサービス」→「認証情報」に移動
2. 「＋認証情報を作成」→「OAuth クライアント ID」をクリック
3. アプリケーションの種類: **デスクトップ アプリ**
4. 名前を入力（例: `gogcli-desktop`）→「作成」
5. **JSON をダウンロード** ボタンをクリック → `client_secret_XXXXX.json` を保存

## 3. gogcli に認証情報を登録

```bash
# ダウンロードした JSON ファイルを登録
gog auth credentials ~/Downloads/client_secret_*.json

# Google アカウントで認証（ブラウザが開きます）
gog auth add あなたのメール@gmail.com

# 使うアカウントを環境変数に設定
export GOG_ACCOUNT=あなたのメール@gmail.com
```

認証が成功したか確認:
```bash
gog gmail labels list
```

## 4. 基本的な使い方

### Gmail - メールの確認
```bash
# 未読メールを確認
gog gmail search "is:unread" --max 10

# 最新メールを確認
gog gmail search "newer_than:1d" --max 20

# 特定の送信者からのメール
gog gmail search "from:example@gmail.com"

# 添付ファイル付きメールを検索
gog gmail search "has:attachment newer_than:7d"

# メールの詳細を表示（メッセージIDを指定）
gog gmail get <message-id>

# 添付ファイルをダウンロード
gog gmail attachment download <message-id> <attachment-id>
```

### Tasks - Todo 管理
```bash
# タスクリスト一覧
gog tasks lists

# タスク一覧を表示
gog tasks list

# 新しいタスクを作成
gog tasks create "レポートを完成させる"

# タスクを完了にする
gog tasks complete <task-id>

# タスクを削除
gog tasks delete <task-id>
```

### Drive - 添付ファイル管理
```bash
# ファイル一覧
gog drive list

# ファイルを検索
gog drive search "name contains '請求書'"

# ファイルをダウンロード
gog drive download <file-id>
```

## 5. 便利な設定

### シェルに環境変数を永続化
```bash
# ~/.bashrc または ~/.zshrc に追加
echo 'export GOG_ACCOUNT=あなたのメール@gmail.com' >> ~/.bashrc
source ~/.bashrc
```

### JSON 出力（スクリプト連携向け）
```bash
gog gmail search "is:unread" --json | jq '.[] | {from: .from, subject: .subject}'
```

## 参考リンク
- [gogcli 公式サイト](https://gogcli.sh/)
- [GitHub リポジトリ](https://github.com/steipete/gogcli)
