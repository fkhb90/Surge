// dewpoint.js
// Surge 面板：露點計算器（HTML）

;(function () {
  const html = `
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <title>露點計算器</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      max-width: 480px;
      margin: 40px auto;
      line-height: 1.6;
    }
    label {
      display: block;
      margin-top: 10px;
    }
    input {
      width: 100%;
      padding: 6px 8px;
      box-sizing: border-box;
      margin-top: 4px;
    }
    button {
      margin-top: 15px;
      padding: 8px 16px;
      cursor: pointer;
    }
    .result {
      margin-top: 20px;
      font-weight: bold;
    }
    .error {
      color: #c00;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <h1>露點計算器</h1>
  <p>輸入室內溫度與相對濕度，計算露點溫度。</p>

  <label>
    室內溫度（°C）：
    <input type="number" id="temp" placeholder="例如：25">
  </label>

  <label>
    相對濕度（%）：
    <input type="number" id="rh" placeholder="例如：70">
  </label>

  <button onclick="calculateDewPoint()">計算露點</button>

  <div class="result" id="result"></div>
  <div class="error" id="error"></div>

  <script>
    function dewPoint(tempC, rh) {
      // Magnus 公式參數
      var a = 17.62;
      var b = 243.12; // 攝氏

      var gamma = Math.log(rh / 100.0) + (a * tempC) / (b + tempC);
      var dp = (b * gamma) / (a - gamma);
      return dp; // °C
    }

    function calculateDewPoint() {
      var tempInput = document.getElementById('temp');
      var rhInput = document.getElementById('rh');
      var resultDiv = document.getElementById('result');
      var errorDiv = document.getElementById('error');

      resultDiv.textContent = '';
      errorDiv.textContent = '';

      var temp = parseFloat(tempInput.value);
      var rh = parseFloat(rhInput.value);

      // 基本輸入檢查
      if (isNaN(temp)) {
        errorDiv.textContent = '請輸入有效的室內溫度（°C）。';
        return;
      }
      if (isNaN(rh)) {
        errorDiv.textContent = '請輸入有效的相對濕度（%）。';
        return;
      }
      if (rh < 0 || rh > 100) {
        errorDiv.textContent = '相對濕度必須介於 0 到 100 之間。';
        return;
      }

      var dp = dewPoint(temp, rh);
      resultDiv.textContent = '露點溫度：約 ' + dp.toFixed(2) + ' °C';
    }
  </script>
</body>
</html>
`;

  // Surge 面板輸出：使用 HTML
  $done({
    title: "露點計算器",
    html: html
  });
})();
