// dewpoint.js - 無預設值版（所有參數需自行輸入）

(function () {
  function safeDone(obj) {
    try { $done(obj); } catch (e) {}
  }

  try {
    // 解析參數 t=25&rh=70&wall=18&title=露點計算器
    var args = {};
    if ($argument) {
      $argument.split("&").forEach(function (p) {
        var kv = p.split("=");
        var key = kv[0];
        var val = kv.length > 1 ? decodeURIComponent(kv[1]) : "";
        if (key) args[key] = val;
      });
    }

    // 必填：t, rh
    var t = parseFloat(args.t);
    var rh = parseFloat(args.rh);

    // 選填：牆面溫度
    var wall =
      args.wall !== undefined && args.wall !== ""
        ? parseFloat(args.wall)
        : NaN;

    // 選填：標題
    var panelTitle = args.title || "露點計算器";

    // 如果少必要參數 → 顯示錯誤
    if (isNaN(t) || isNaN(rh)) {
      safeDone({
        title: panelTitle,
        content:
          "❗ 參數不足\n\n" +
          "請在 Script argument 填入：\n" +
          "・t=室內溫度（°C）\n" +
          "・rh=相對濕度（%）\n\n" +
          "可選：\n" +
          "・wall=牆面溫度\n" +
          "・title=自訂標題\n\n" +
          "示例：\n" +
          "t=25&rh=70&wall=18&title=露點計算器",
        style: "error"
      });
      return;
    }

    // 相對濕度範圍檢查
    if (rh < 0 || rh > 100) {
      safeDone({
        title: panelTitle,
        content: "❗ 相對濕度 rh 必須介於 0–100 之間。",
        style: "error"
      });
      return;
    }

    // Magnus 公式
    function dewPoint(tempC, rhVal) {
      var a = 17.62;
      var b = 243.12;
      var gamma =
        Math.log(rhVal / 100.0) + (a * tempC) / (b + tempC);
      return (b * gamma) / (a - gamma);
    }

    var dp = dewPoint(t, rh);

    var lines = [];
    lines.push("室內條件：");
    lines.push("・溫度： " + t.toFixed(1) + " °C");
    lines.push("・相對濕度： " + rh.toFixed(1) + " %");
    lines.push("");
    lines.push("露點：約 " + dp.toFixed(2) + " °C");
    lines.push("");

    // 如果有提供 wall → 判斷結露風險
    if (!isNaN(wall)) {
      var diff = wall - dp;

      lines.push("牆面溫度： " + wall.toFixed(1) + " °C");
      lines.push("");

      if (wall <= dp) {
        lines.push("風險判斷：");
        lines.push("・牆面 ≤ 露點");
        lines.push("→ 有結露／發霉風險");
      } else if (diff < 1.0) {
        lines.push("風險判斷：");
        lines.push(
          "・牆面僅略高於露點（差 " + diff.toFixed(2) + " °C）"
        );
        lines.push("→ 風險偏高");
      } else {
        lines.push("風險判斷：");
        lines.push(
          "・牆面溫度高於露點（差 " + diff.toFixed(2) + " °C）"
        );
        lines.push("→ 目前風險低");
      }
    } else {
      lines.push("（未提供 wall，僅顯示露點）");
    }

    safeDone({
      title: panelTitle,
      content: lines.join("\n"),
      style: "info"
    });
  } catch (e) {
    safeDone({
      title: "露點計算器（錯誤）",
      content: "腳本發生例外：\n" + String(e),
      style: "error"
    });
  }
})();
