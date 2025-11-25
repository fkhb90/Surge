// dewpoint.js - 給 Surge Panel 用的露點 + 牆面結露風險判斷（含錯誤顯示）

(function () {
  function doneSafe(obj) {
    try {
      $done(obj);
    } catch (e) {
      // 萬一 $done 本身出錯，至少不要整個掛掉
    }
  }

  try {
    // 解析 argument，例如：t=25&rh=70&wall=18&title=露點計算器
    var args = {};
    if (typeof $argument === "string" && $argument.length > 0) {
      var parts = $argument.split("&");
      for (var i = 0; i < parts.length; i++) {
        var kv = parts[i].split("=");
        var key = kv[0];
        var val = kv.length > 1 ? decodeURIComponent(kv[1]) : "";
        if (key) args[key] = val;
      }
    }

    var t = parseFloat(args.t || args.temp || "25");   // 室內溫度 °C
    var rh = parseFloat(args.rh || "70");              // 相對濕度 %
    var wall = args.wall !== undefined ? parseFloat(args.wall) : NaN; // 牆面溫度 °C
    var panelTitle = args.title || "露點計算器";

    function dewPoint(tempC, rhVal) {
      var a = 17.62;
      var b = 243.12; // 攝氏
      var gamma = Math.log(rhVal / 100.0) + (a * tempC) / (b + tempC);
      return (b * gamma) / (a - gamma); // °C
    }

    var contentLines = [];

    if (isNaN(t) || isNaN(rh) || rh < 0 || rh > 100) {
      contentLines.push("參數錯誤：");
      contentLines.push("・t：室內溫度（°C）");
      contentLines.push("・rh：相對濕度（0–100）");
      contentLines.push("・wall：牆面溫度（°C，可選）");
      contentLines.push("");
      contentLines.push("請在 Script 的 argument 中設定，例如：");
      contentLines.push("argument=t=25&rh=70&wall=18&title=露點計算器");
    } else {
      var dp = dewPoint(t, rh);

      contentLines.push("室內條件：");
      contentLines.push("・溫度： " + t.toFixed(1) + " °C");
      contentLines.push("・相對濕度： " + rh.toFixed(1) + " %");
      contentLines.push("");

      contentLines.push("計算結果：");
      contentLines.push("・露點：約 " + dp.toFixed(2) + " °C");
      contentLines.push("");

      if (!isNaN(wall)) {
        contentLines.push("牆面條件：");
        contentLines.push("・牆面溫度： " + wall.toFixed(1) + " °C");
        contentLines.push("");

        var diff = wall - dp;

        contentLines.push("風險判斷：");
        if (wall <= dp) {
          contentLines.push("・牆面溫度 ≤ 露點");
          contentLines.push("→ 有結露／發霉風險，建議除濕或提高牆面溫度。");
        } else if (diff < 1.0) {
          contentLines.push("・牆面溫度僅略高於露點（差約 " + diff.toFixed(2) + " °C）");
          contentLines.push("→ 風險偏高，建議加強除濕或暖房。");
        } else {
          contentLines.push("・牆面溫度高於露點（差約 " + diff.toFixed(2) + " °C）");
          contentLines.push("→ 目前無明顯結露風險，仍須留意長時間高濕度。");
        }
      } else {
        contentLines.push("（未提供牆面溫度 wall，僅顯示露點、無法判斷結露風險。）");
      }

      contentLines.push("");
      contentLines.push("說明：");
      contentLines.push("・當牆面或櫃體表面溫度 ≤ 露點時，容易結露並導致發霉。");
      contentLines.push("・實務上常建議牆面溫度高於露點至少 1–2 °C。");
    }

    doneSafe({
      title: panelTitle,
      content: contentLines.join("\n"),
      style: "info"
    });
  } catch (e) {
    doneSafe({
      title: "露點計算器（腳本錯誤）",
      content: "腳本執行發生例外：\n" + String(e),
      style: "error"
    });
  }
})();
