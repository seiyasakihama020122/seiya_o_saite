// Banner Generator Plugin - CSVからバナーを一括生成
// テンプレートフレーム内のテキストノードをフォントサイズで判定し、
// CSVの行数だけテンプレを複製してテキストを差し替え、グリッド配置する
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};

figma.showUI(__html__, { width: 480, height: 520 });

// テキストノードをフォントサイズ降順でソートして取得
function getTextNodesSortedByFontSize(frame) {
    const textNodes = [];
    frame.findAll((node) => node.type === "TEXT").forEach((node) => {
        textNodes.push(node);
    });
    textNodes.sort((a, b) => {
        const sizeA = typeof a.fontSize === "number" ? a.fontSize : 0;
        const sizeB = typeof b.fontSize === "number" ? b.fontSize : 0;
        return sizeB - sizeA;
    });
    return textNodes;
}

// フォントをロードする
function loadFontsForNode(textNode) {
    return __awaiter(this, void 0, void 0, function* () {
        const fontName = textNode.fontName;
        if (fontName !== figma.mixed) {
            yield figma.loadFontAsync(fontName);
        } else {
            const len = textNode.characters.length;
            const fontsToLoad = new Set();
            for (let i = 0; i < len; i++) {
                const font = textNode.getRangeFontName(i, i + 1);
                fontsToLoad.add(JSON.stringify(font));
            }
            for (const fontStr of fontsToLoad) {
                yield figma.loadFontAsync(JSON.parse(fontStr));
            }
        }
    });
}

// バナーを生成
function generateBanners(data, columns, gap) {
    return __awaiter(this, void 0, void 0, function* () {
        const selection = figma.currentPage.selection;
        if (selection.length === 0 || selection[0].type !== "FRAME") {
            figma.ui.postMessage({
                type: "error",
                message: "テンプレートとなるフレームを1つ選択してください。",
            });
            return;
        }
        const template = selection[0];
        const templateWidth = template.width;
        const templateHeight = template.height;
        const startX = template.x;
        const startY = template.y + templateHeight + gap;

        // テンプレート内のテキストノードをフォントサイズ順で取得
        const textNodes = getTextNodesSortedByFontSize(template);
        if (textNodes.length < 2) {
            figma.ui.postMessage({
                type: "error",
                message: "テンプレートにテキストノードが2つ以上必要です（見出し用と説明文用）。",
            });
            return;
        }

        figma.ui.postMessage({
            type: "progress",
            message: `${data.length}件のバナーを生成中...`,
        });

        const generatedFrames = [];

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
                yield loadFontsForNode(sortedCloneTextNodes[0]);
                sortedCloneTextNodes[0].characters = row.headline;
            }

            // 説明文（二番目に大きいフォントサイズ）を差し替え
            if (sortedCloneTextNodes.length >= 2) {
                yield loadFontsForNode(sortedCloneTextNodes[1]);
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
    });
}

// UIからのメッセージを受信
figma.ui.onmessage = (msg) => __awaiter(this, void 0, void 0, function* () {
    if (msg.type === "generate") {
        try {
            yield generateBanners(msg.data, msg.columns, msg.gap);
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
});
