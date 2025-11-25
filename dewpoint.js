// dewpoint.js - 給 Surge Panel 用的露點 + 牆面結露風險判斷

(function () {
  // 解析 argument，例如：t=25&rh=70&wall=18&title=露點計算器
  var args = {};
  if (typeof $argument === "string" && $argument.length > 0) {
    $argument.split("&").forEach(function (pair) {
      var parts = pair.split("=");
      var key = parts[0];
      var value = parts[1] ? decodeURIComponent(parts[1]) : "";
      if (key) args[key] = value;
    });
  }

  // 讀取參數，並給預設值
  var t = parseFloat(args.t || args.temp || 25);   // 室內溫度 °C
  var rh = parseFloat(args.rh || 70);              // 相對濕度 %
  var wall = args.wall !== undefined ? parseFloat(args.wall) : NaN; // 牆面溫度 °C

  // Magnus 公式計算露點
  function dewPoint(tempC, rhVal) {
    var a = 17.62;
    var b = 243.12; // 攝氏
    var gamma = Math.log(rhVal / 100.0) + (a * tempC) / (b + tempC);
    return (b * gamma) / (a - gamma); // °C
  }

  var title = args.title || "露點計算器";
  var content;

  // 基本參數檢查
  if (isNaN(t) || isNaN(rh) || rh < 0 || rh > 100) {
    content =
      "參數錯誤：\n" +
      "・t：室內溫度（°C）\n" +
      "・rh：相對濕度（0–100）\n" +
      "・wall：牆面溫度（°C，可選）\n\n" +
      "使用方式示例：\n" +
      "argument=t=25&rh=70&wall=18&title=露點計算器";
  } else {
    var dp = dewPoint(t, rh);
    var lines = [];

    lines.push("室內條件：");
    lines.push("・溫度： " + t.toFixed(1) + " °C");
    lines.push("・相對濕度： " + rh.toFixed(1) + " %");
    lines.push("");

    lines.push("計算結果：");
    lines.push("・露點：約 " + dp.toFixed(2) + " °C");
    lines.push("");

    // 牆面溫度風險判斷
    if (!isNaN(wall)) {
      lines.push("牆面條件：");
      lines.push("・牆面溫度： " + wall.toFixed(1) + " °C");

      if (wall <= dp) {
        // 牆面已經在露點以下 → 高風險
        lines.push("");
        lines.push("風險判斷：");
        lines.push("・牆面溫度 ≤ 露點");
        lines.push("→ 有結露／發霉風險（需特別注意）。");
      } else {
        // 可再加一點安全緩衝概念
        var diff = wall - dp;
        lines.push("");
        lines.push("風險判斷：");
        if (diff < 1.0) {
          lines.push("・牆面溫度僅略高於露點（差約 " + diff.toFixed(2) + " °C）");
          lines.push("→ 風險偏高，建議加強除濕或提高牆面溫度。");
        } else {
          lines.push("・牆面溫度高於露點（差約 " + diff.toFixed(2) + " °C）");
          lines.push("→ 目前無明顯結露風險，但長期高濕仍可能發霉。");
        }
      }
    } else {
      lines.push("（未提供牆面溫度 wall，僅顯示露點，無法判斷結露風險。）");
    }

    lines.push("");
    lines.push("說明：");
    lines.push("・當牆面或櫃體表面溫度 ≤ 露點時，容易結露並導致發霉。");
    lines.push("・實務上常建議牆面溫度最好高於露點至少 1–2 °C。");

    content = lines.join("\n");
  }

  // Surge Info Panel 規格輸出
  $done({
    title: title,
    content: content,
    style: "info"
  });
})();
