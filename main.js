// noCap landing page — progressive enhancements. The page works without this file.
(() => {
  const REPO = 'fatihserhatturan/noCap';
  const root = document.documentElement;
  root.classList.add('js');

  // Scroll reveal
  const items = document.querySelectorAll('.reveal');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach((el) => io.observe(el));
  }

  // Copy buttons
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const target = document.querySelector(btn.dataset.copy);
      if (!target) return;
      const text = target.innerText.split('\n').filter((l) => !l.trim().startsWith('#')).join('\n').trim();
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = 'Copied';
      } catch {
        btn.textContent = 'Press ⌘C';
      }
      setTimeout(() => { btn.textContent = 'Copy'; }, 1800);
    });
  });

  const fmtCount = (n) => (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k' : String(n));
  const fmtSize = (bytes) => (bytes >= 1e9 ? (bytes / 1e9).toFixed(1) + ' GB' : Math.round(bytes / 1e6) + ' MB');

  // Star count
  fetch(`https://api.github.com/repos/${REPO}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((repo) => {
      if (!repo || typeof repo.stargazers_count !== 'number') return;
      document.querySelectorAll('[data-stars]').forEach((el) => {
        el.textContent = fmtCount(repo.stargazers_count);
        el.hidden = false;
      });
    })
    .catch(() => {});

  // Latest release: direct .dmg link, version and size
  fetch(`https://api.github.com/repos/${REPO}/releases/latest`)
    .then((r) => (r.ok ? r.json() : null))
    .then((rel) => {
      if (!rel) return;
      const dmgs = (rel.assets || []).filter((a) => a.name.endsWith('.dmg'));
      const arm = dmgs.find((a) => a.name.includes('arm64')) || dmgs[0];
      if (arm) {
        document.querySelectorAll('[data-download]').forEach((a) => { a.href = arm.browser_download_url; });
        document.querySelectorAll('[data-size]').forEach((el) => { el.textContent = ` · ${fmtSize(arm.size)}`; });
      }
      const m = (rel.assets || []).map((a) => a.name.match(/-(\d+\.\d+\.\d+)/)).find(Boolean);
      const version = m ? `v${m[1]}` : (/^v?\d/.test(rel.tag_name || '') ? rel.tag_name : null);
      if (version) document.querySelectorAll('[data-version]').forEach((el) => { el.textContent = version; });
    })
    .catch(() => {});
})();
