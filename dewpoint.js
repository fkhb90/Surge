;(function () {
  const html = `
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <title>露點計算器</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      max-width: 480px;
      margin: 20px auto;
      line-height: 1.6;
    }
    label { display: block; margin-top: 10px; }
    input {
      width: 100%;
      padding: 6px 8px;
      margin-top: 4px;
      box-sizing: border-box;
    }
    button {
      margin-top: 15px;
      padding: 8px 16px;
      cursor: pointer;
    }
    .result { margin-top: 20px; font-weight: bold; }
    .error { color: #c00; margin-top: 10px; }
  </style>
</head>
<body>
  <h1>露點計算器</h1>
  <p>輸入室內溫度與相對濕度，計算露點。</p>

  <label>
    室內溫度（°C）：
    <input type="number" id="temp" placeholder="如 25">
  </label>

  <label>
    相對濕度（%）：
    <input type="number" id="rh" placeholder="如 70">
  </label>

  <button onclick="calculateDewPoint()">計算露點</button>

  <div class="result" id="result"></div>
  <div class="error" id="error"></div>

  <script>
    function dewPoint(tempC, rh) {
      var a = 17.62, b = 243.12;
      var gamma = Math.log(rh / 100) + (a * tempC) / (b + tempC);
      return (b * gamma) / (a - gamma);
    }

    function calculateDewPoint() {
      var t = parseFloat(document.getElementById('temp').value);
      var rh = parseFloat(document.getElementById('rh').value);

      var result = document.getElementById('result');
      var error = document.getElementById('error');

      result.textContent = "";
      error.textContent = "";

      if (isNaN(t)) { error.textContent = "請輸入有效的溫度。"; return; }
      if (isNaN(rh) || rh < 0 || rh > 100) { error.textContent = "請輸入 0–100 的濕度。"; return; }

      var dp = dewPoint(t, rh).toFixed(2);
      result.textContent = "露點：約 " + dp + " °C";
    }
  </script>
</body>
</html>
`;

  // **加上 title，避免 Untitled Panel**
  $done({
    title: "露點計算器",
    html: html
  });
})();
