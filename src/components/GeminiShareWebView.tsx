import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

/**
 * Hidden WebView that loads a Gemini share page on-device, lets Google's
 * JavaScript render the conversation, then scrapes the turns. The conversation
 * is NOT in the page's HTML (it's fetched by JS after load), so this is the only
 * way to read a share link — and it is inherently best-effort: it depends on
 * Gemini's DOM and can break if Google changes it. Always keep the paste flow as
 * a fallback.
 *
 * Native only — on web a WebView is an iframe and Google blocks framing.
 */
export type GeminiScrapeResult =
  | { ok: true; messages: { role: 'user' | 'model'; content: string }[]; matched?: { user: string; model: string } }
  | { ok: false; rawText: string; debug?: Record<string, number> };

const TIMEOUT_MS = 30000;

// Runs in the page. Polls until the rendered turns settle, then posts them back.
// Avoids backticks and ${ so it can live inside this template string.
const EXTRACTOR_JS = `
(function () {
  function send(o) { try { window.ReactNativeWebView.postMessage(JSON.stringify(o)); } catch (e) {} }

  // Gemini prefixes each turn with a screen-reader-only label ("Vous avez dit" /
  // "Gemini a dit" / "You said"). Strip it: first by removing the visually-hidden
  // elements' text (locale-independent), then by a known-phrase fallback.
  var LABELS = ['Vous avez dit', 'Gemini a dit', 'You said', 'Gemini said'];
  function text(el) {
    var t = ((el && (el.innerText || el.textContent)) || '').replace(/\\u00a0/g, ' ');
    var hidden = el.querySelectorAll
      ? el.querySelectorAll('.cdk-visually-hidden, .visually-hidden, .sr-only, [class*=\"visually-hidden\"]')
      : [];
    for (var i = 0; i < hidden.length; i++) {
      var lab = (hidden[i].textContent || '').trim();
      if (lab && lab.length < 40) t = t.split(lab).join(' ');
    }
    t = t.trim();
    for (var j = 0; j < LABELS.length; j++) {
      if (t.indexOf(LABELS[j]) === 0) { t = t.slice(LABELS[j].length).trim(); break; }
    }
    return t.trim();
  }

  var USER = ['user-query', '.query-text'];
  var MODEL = ['message-content', '.model-response-text', '.markdown-main-panel'];

  function denest(nodes) {
    return nodes.filter(function (n) {
      return !nodes.some(function (o) { return o !== n && n.contains(o); });
    });
  }

  function extract(userSel, modelSel) {
    var nodes = denest(Array.prototype.slice.call(document.querySelectorAll(userSel + ',' + modelSel)));
    var out = [];
    nodes.forEach(function (n) {
      var role = n.matches(userSel) ? 'user' : 'model';
      var t = text(n);
      if (t && t.length > 1) out.push({ role: role, content: t });
    });
    return out;
  }

  function best() {
    for (var i = 0; i < USER.length; i++) {
      for (var j = 0; j < MODEL.length; j++) {
        var m = extract(USER[i], MODEL[j]);
        var u = 0, d = 0;
        for (var k = 0; k < m.length; k++) { if (m[k].role === 'user') u++; else d++; }
        if (u >= 1 && d >= 1) return { messages: m, matched: { user: USER[i], model: MODEL[j] } };
      }
    }
    return null;
  }

  function histogram() {
    var h = {}, all = document.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      var t = (all[i].innerText || '').trim();
      if (t.length > 40) { var k = all[i].tagName.toLowerCase(); h[k] = (h[k] || 0) + 1; }
    }
    return h;
  }

  var tries = 0, MAX = 50, stable = 0, lastLen = -1;
  var iv = setInterval(function () {
    tries++;
    try { window.scrollTo(0, document.body.scrollHeight); } catch (e) {}
    var r = best();
    var len = r ? r.messages.length : 0;
    stable = (len === lastLen) ? stable + 1 : 0;
    lastLen = len;
    if (r && len >= 2 && stable >= 2) {
      clearInterval(iv);
      send({ ok: true, messages: r.messages, matched: r.matched });
    } else if (tries >= MAX) {
      clearInterval(iv);
      var main = document.querySelector('main') || document.body;
      send({ ok: false, rawText: text(main).slice(0, 20000), debug: histogram() });
    }
  }, 500);
})();
true;
`;

export function GeminiShareWebView({
  url,
  onResult,
  onError
}: {
  url: string;
  onResult: (result: GeminiScrapeResult) => void;
  onError: (message: string) => void;
}) {
  const settled = useRef(false);

  useEffect(() => {
    settled.current = false;
    const timer = setTimeout(() => {
      if (!settled.current) {
        settled.current = true;
        onError('Timed out reading the Gemini page.');
      }
    }, TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [url, onError]);

  const handleMessage = (event: WebViewMessageEvent) => {
    if (settled.current) {
      return;
    }
    settled.current = true;
    try {
      onResult(JSON.parse(event.nativeEvent.data) as GeminiScrapeResult);
    } catch {
      onError('Got an unexpected response while reading the link.');
    }
  };

  return (
    <View style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} pointerEvents="none">
      <WebView
        source={{ uri: url }}
        injectedJavaScript={EXTRACTOR_JS}
        onMessage={handleMessage}
        onError={() => {
          if (!settled.current) {
            settled.current = true;
            onError('Could not load the Gemini page.');
          }
        }}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        setSupportMultipleWindows={false}
      />
    </View>
  );
}
