// Banner Generator Plugin - CSVからバナーを一括生成
// テンプレートフレーム内のテキストノードをフォントサイズで判定し、
// CSVの行数だけテンプレを複製してテキストを差し替え、グリッド配置する

figma.showUI(__html__, { width: 480, height: 520 });

interface BannerData {
  headline: string;
  description: string;
}

// テキストノードをフォントサイズ降順でソートして取得
function getTextNodesSortedByFontSize(frame: FrameNode): TextNode[] {
  const textNodes: TextNode[] = [];
  frame.findAll((node) => node.type === "TEXT").forEach((node) => {
    textNodes.push(node as TextNode);
  });

  textNodes.sort((a, b) => {
    const sizeA = typeof a.fontSize === "number" ? a.fontSize : 0;
    const sizeB = typeof b.fontSize === "number" ? b.fontSize : 0;
    return sizeB - sizeA;
  });

  return textNodes;
}

// フォントをロードする
async function loadFontsForNode(textNode: TextNode): Promise<void> {
  const fontName = textNode.fontName;
  if (fontName !== figma.mixed) {
    await figma.loadFontAsync(fontName);
  } else {
    // mixed fontsの場合、各文字のフォントをロード
    const len = textNode.characters.length;
    const fontsToLoad = new Set<string>();
    for (let i = 0; i < len; i++) {
      const font = textNode.getRangeFontName(i, i + 1) as FontName;
      fontsToLoad.add(JSON.stringify(font));
    }
    for (const fontStr of fontsToLoad) {
      await figma.loadFontAsync(JSON.parse(fontStr));
    }
  }
}

// バナーを生成
async function generateBanners(
  data: BannerData[],
  columns: number,
  gap: number
): Promise<void> {
  const selection = figma.currentPage.selection;

  if (selection.length === 0 || selection[0].type !== "FRAME") {
    figma.ui.postMessage({
      type: "error",
      message:
        "テンプレートとなるフレームを1つ選択してください。",
    });
    return;
  }

  const template = selection[0] as FrameNode;
  const templateWidth = template.width;
  const templateHeight = template.height;
  const startX = template.x;
  const startY = template.y + templateHeight + gap;

  // テンプレート内のテキストノードをフォントサイズ順で取得
  const textNodes = getTextNodesSortedByFontSize(template);

  if (textNodes.length < 2) {
    figma.ui.postMessage({
      type: "error",
      message:
        "テンプレートにテキストノードが2つ以上必要です（見出し用と説明文用）。",
    });
    return;
  }

  // フォントサイズが一番大きい = 見出し、次に大きい = 説明文
  const headlineNodeId = textNodes[0].id;
  const descriptionNodeId = textNodes[1].id;

  figma.ui.postMessage({
    type: "progress",
    message: `${data.length}件のバナーを生成中...`,
  });

  const generatedFrames: FrameNode[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const clone = template.clone();

    // グリッド配置の計算
    const col = i % columns;
    const rowIndex = Math.floor(i / columns);
    clone.x = startX + col * (templateWidth + gap);
    clone.y = startY + rowIndex * (templateHeight + gap);
    clone.name = `Banner_${i + 1}`;

    // テキストノードを探して差し替え
    const cloneTextNodes = clone.findAll(
      (node) => node.type === "TEXT"
    ) as TextNode[];

    for (const textNode of cloneTextNodes) {
      await loadFontsForNode(textNode);

      // 元のテンプレートのノードIDとの対応で判定
      // クローンされたノードは元のノードの構造を保持するので
      // フォントサイズで再判定する
      const sortedCloneTextNodes =
        getTextNodesSortedByFontSize(clone);

      if (
        sortedCloneTextNodes.length >= 1 &&
        textNode.id === sortedCloneTextNodes[0].id
      ) {
        textNode.characters = row.headline;
      } else if (
        sortedCloneTextNodes.length >= 2 &&
        textNode.id === sortedCloneTextNodes[1].id
      ) {
        textNode.characters = row.description;
      }
    }

    generatedFrames.push(clone);
  }

  // 生成完了
  figma.currentPage.selection = generatedFrames;
  figma.viewport.scrollAndZoomIntoView(generatedFrames);

  figma.ui.postMessage({
    type: "success",
    message: `${data.length}件のバナーを生成しました！`,
  });
}

// UIからのメッセージを受信
figma.ui.onmessage = async (msg) => {
  if (msg.type === "generate") {
    try {
      await generateBanners(msg.data, msg.columns, msg.gap);
    } catch (error) {
      figma.ui.postMessage({
        type: "error",
        message: `エラーが発生しました: ${error}`,
      });
    }
  }

  if (msg.type === "cancel") {
    figma.closePlugin();
  }
};
