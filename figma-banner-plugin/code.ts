// Banner Generator Plugin - CSVからバナーを一括生成
// テンプレートフレーム内のテキストノードをフォントサイズで判定し、
// CSVの行数だけテンプレを複製してテキストを差し替え、グリッド配置する

figma.showUI(__html__, { width: 480, height: 520 });

interface BannerData {
  headline: string;
  description: string;
}

// テンプレートとして使用可能なノードタイプ
const SUPPORTED_TEMPLATE_TYPES = ["FRAME", "COMPONENT", "INSTANCE", "GROUP"];

// 選択ノードがテンプレートとして使えるかチェック
function isValidTemplate(node: SceneNode): node is FrameNode | ComponentNode | InstanceNode | GroupNode {
  return SUPPORTED_TEMPLATE_TYPES.includes(node.type);
}

// テキストノードをフォントサイズ降順でソートして取得
function getTextNodesSortedByFontSize(frame: FrameNode | ComponentNode | InstanceNode | GroupNode): TextNode[] {
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

  if (selection.length === 0 || !isValidTemplate(selection[0])) {
    figma.ui.postMessage({
      type: "error",
      message:
        "テンプレートとなるフレーム、コンポーネント、またはグループを1つ選択してください。",
    });
    return;
  }

  const template = selection[0] as FrameNode | ComponentNode | InstanceNode | GroupNode;
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

    // クローン内のテキストノードをフォントサイズ順でソート
    const sortedCloneTextNodes = getTextNodesSortedByFontSize(clone);

    // 見出し（一番大きいフォントサイズ）を差し替え
    if (sortedCloneTextNodes.length >= 1) {
      await loadFontsForNode(sortedCloneTextNodes[0]);
      sortedCloneTextNodes[0].characters = row.headline;
    }

    // 説明文（二番目に大きいフォントサイズ）を差し替え
    if (sortedCloneTextNodes.length >= 2) {
      await loadFontsForNode(sortedCloneTextNodes[1]);
      sortedCloneTextNodes[1].characters = row.description;
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
