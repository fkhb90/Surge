/**
 * Surge Panel Script for FP-Shield V10.13
 * * 功能：
 * 1. 顯示當前指紋防護狀態。
 * 2. 點擊面板圖示時，切換狀態 (Persistent Store)。
 */

(function() {
    // 1. 定義狀態變數
    // protect: 防護模式 (預設)
    // shopping: 購物模式 (停止偽裝)
    const KEY = "FP_MODE";
    let mode = $persistentStore.read(KEY);
    
    // 初始化：若無設定則預設為防護模式
    if (!mode) {
        mode = "protect";
        $persistentStore.write(mode, KEY);
    }

    // 2. 處理點擊事件
    if ($trigger === "button") {
        mode = (mode === "protect") ? "shopping" : "protect";
        $persistentStore.write(mode, KEY);
    }

    // 3. 渲染 UI
    // 定義顯示內容
    const isProtect = (mode === "protect");
    const title = isProtect ? "🛡️ 指紋防護: 開啟" : "🛒 購物模式: 活躍";
    const content = isProtect 
        ? "模擬 MacOS 環境 | WebRTC 阻斷中" 
        : "原始 iOS 環境 | 適用於網銀/支付";
    const icon = isProtect ? "lock.shield.fill" : "cart.fill";
    const iconColor = isProtect ? "#34C759" : "#FF9500"; // Green vs Orange

    $done({
        title: title,
        content: content,
        icon: icon,
        "icon-color": iconColor
    });
})();