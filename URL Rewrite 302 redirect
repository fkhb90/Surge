// Surge 腳本模式處理 AMP 重定向
$httpClient = {
get: (url, callback) => {
  // 檢測 AMP URL 並重定向
  if (url.includes('google.com/amp/s/')) {
    const originalUrl = url.replace(/.*google\.com\/amp\/s\//, 'https://');
    callback(null, {status: 200}, originalUrl);
  } else if (url.includes('cdn.ampproject.org')) {
    const originalUrl = url.replace(/.*\.cdn\.ampproject\.org\/c\/s?\//, 'https://');
    callback(null, {status: 200}, originalUrl);
  }
}
};
