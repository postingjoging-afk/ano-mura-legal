/*
 * App Store リンクに流入元の識別子（Apple Campaign Link の ct）を付ける。
 *
 * - 目的: App Store Connect の「キャンペーン」集計で、LP 経由のインストールを流入元ごとに数える
 * - 個人データは集めない。Cookie も外部送信も使わない（sessionStorage にこのタブの間だけ ct を覚えるだけ）
 * - 判定は「広告のクリックID → utm_source → 参照元ドメイン → 直接」の順
 */
(function () {
  var APP = 'https://apps.apple.com/jp/app/id6794392040';
  var PT = '128977613'; // Apple のプロバイダトークン（campaign-links.md と同じ）
  var KEY = 'amct';

  function clean(s, n) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, n);
  }

  function detect() {
    var q = new URLSearchParams(location.search);
    var y = q.get('yclid') || '';
    if (/^YSS/i.test(y)) return 'lyads-search';
    if (/^YJAD/i.test(y)) return 'lyads-disp';
    if (y) return 'lyads';

    var src = clean(q.get('utm_source'), 16);
    if (src) {
      var med = clean(q.get('utm_medium'), 10);
      return 'utm-' + src + (med ? '-' + med : '');
    }

    var ref = '';
    try { ref = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) {}
    if (!ref || ref === location.hostname) return '';
    if (/(^|\.)yahoo\.co\.jp$/.test(ref)) return 'ref-yahoo';
    if (/(^|\.)google\./.test(ref)) return 'ref-google';
    if (/(^|\.)(x\.com|t\.co|twitter\.com)$/.test(ref)) return 'ref-x';
    return 'ref-other';
  }

  try {
    var found = detect();
    var ct;
    try {
      if (found) sessionStorage.setItem(KEY, found);
      ct = found || sessionStorage.getItem(KEY) || 'direct';
    } catch (e) {
      ct = found || 'direct';
    }
    ct = ('lp-' + ct).slice(0, 40);

    var links = document.querySelectorAll('a[href^="' + APP + '"]');
    for (var i = 0; i < links.length; i++) {
      var u = new URL(links[i].href);
      u.searchParams.set('pt', PT);
      u.searchParams.set('ct', ct);
      u.searchParams.set('mt', '8');
      links[i].href = u.toString();
    }
  } catch (e) {
    // 失敗しても元のリンクのまま動く
  }
})();
