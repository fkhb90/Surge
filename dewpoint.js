// dewpoint.js - 給 Surge Panel 用的露點計算腳本（純文字輸出）

(function () {
  // 解析 argument，例如：t=25&rh=70&title=露點計算器
  var args = {};
  if (typeof $argument === "string" && $argument.length > 0) {
    $argument.split("&").forEach(function (pair) {
      var parts = pair.split("=");
      var key = parts[0];
      var value = parts[1] ? decodeURIComponent(parts[1]) : "";
      if (key) args[key] = value;
    });
  }

  // 讀取參數，給預設值以免空值
  var t = parseFloat(args.t || args.temp || 25);   // 室內溫度 °C
  var rh = parseFloat(args.rh || 70);              // 相對濕度 %

  // Magnus 公式計算露點
  function dewPoint(tempC, rhVal) {
    var a = 17.62;
    var b = 243.12; // 攝氏
    var gamma = Math.log(rhVal / 100.0) + (a * tempC) / (b + tempC);
    return (b * gamma) / (a - gamma); // °C
  }

  var title = args.title || "露點計算器";
  var content;

  if (isNaN(t) || isNaN(rh) || rh < 0 || rh > 100) {
    content =
      "參數錯誤：\n" +
      "- t：室內溫度（°C）\n" +
      "- rh：相對濕度（0–100）\n\n" +
      "請在 Script 的 argument 中設定，例如：\n" +
      "argument=t=25&rh=70&title=露點計算器";
  } else {
    var dp = dewPoint(t, rh);

    content =
      "室內條件：\n" +
      "・溫度： " + t.toFixed(1) + " °C\n" +
      "・相對濕度： " + rh.toFixed(1) + " %\n\n" +
      "計算結果：\n" +
      "・露點：約 " + dp.toFixed(2) + " °C\n\n" +
      "說明：\n" +
      "若牆面或櫃體表面溫度 ≤ 露點，\n" +
      "代表有結露／發霉風險。";
  }

  // Info Panel 規格：只能用 title / content / style
  $done({
    title: title,
    content: content,
    style: "info"
  });
})();
