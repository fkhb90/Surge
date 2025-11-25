<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <!-- 有些環境會看這行，保險起見一起寫上 -->
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
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
    .risk {
      margin-top: 10px;
      font-weight: bold;
    }
    .risk.danger {
      color: #c00;
    }
    .risk.safe {
      color: #008000;
    }
    .error {
      color: #c00;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <h1>露點計算器</h1>
  <p>輸入室內溫度、相對濕度與牆面溫度，計算露點並判斷是否有結露／發霉風險。</p>

  <label>
    室內溫度（°C）：
    <input type="number" id="temp" placeholder="例如：25">
  </label>

  <label>
    相對濕度（%）：
    <input type="number" id="rh" placeholder="例如：70">
  </label>

  <label>
    目前牆面溫度（°C）：
    <input type="number" id="wallTemp" placeholder="例如：18">
  </label>

  <button type="button" onclick="calculateDewPoint()">計算露點與結露風險</button>

  <div class="result" id="result"></div>
  <div class="risk" id="risk"></div>
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
      var wallInput = document.getElementById('wallTemp');

      var resultDiv = document.getElementById('result');
      var riskDiv = document.getElementById('risk');
      var errorDiv = document.getElementById('error');

      // 清除前一次結果
      resultDiv.textContent = '';
      riskDiv.textContent = '';
      riskDiv.className = 'risk';
      errorDiv.textContent = '';

      var temp = parseFloat(tempInput.value);
      var rh = parseFloat(rhInput.value);
      var wallTemp = parseFloat(wallInput.value);

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
      if (isNaN(wallTemp)) {
        errorDiv.textContent = '請輸入有效的牆面溫度（°C）。';
        return;
      }

      var dp = dewPoint(temp, rh);
      resultDiv.textContent = '露點溫度：約 ' + dp.toFixed(2) + ' °C';

      // 牆面溫度 ≤ 露點 → 有結露／發霉風險
      if (wallTemp <= dp) {
        riskDiv.textContent = '牆面溫度 ≤ 露點：有結露／發霉風險';
        riskDiv.className = 'risk danger';
      } else {
        riskDiv.textContent = '牆面溫度高於露點：目前無明顯結露風險（仍需留意長時間高濕度）。';
        riskDiv.className = 'risk safe';
      }
    }
  </script>
</body>
</html>
