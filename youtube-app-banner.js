// remove-youtube-app-banner.js
if ($response.body) {
  let body = $response.body.replace(/<meta name="apple-itunes-app"[^>]+>/i, "");
  $done({ body });
} else {
  $done({});
}