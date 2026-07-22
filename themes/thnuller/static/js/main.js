const toggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.main-nav');
toggle?.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!open));
  nav.classList.toggle('open', !open);
});

const appearance = document.querySelector('.vt-switch-appearance');
const syncAppearance = () => {
  const light = document.documentElement.dataset.theme === 'light';
  appearance?.setAttribute('aria-checked', String(light));
  appearance?.setAttribute('aria-label', light ? '切换深色模式' : '切换浅色模式');
};
appearance?.addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('theme', theme);
  syncAppearance();
});
syncAppearance();

const headings = [...document.querySelectorAll('.article-content h2, .article-content h3')];
const links = [...document.querySelectorAll('.toc a')];
const toc = document.querySelector('.toc');
if (headings.length && links.length && toc) {
  let scrollRAF = null;
  const scrollTocTo = (targetTop) => {
    const max = toc.scrollHeight - toc.clientHeight;
    const end = Math.max(0, Math.min(targetTop, max));
    const start = toc.scrollTop;
    const dist = end - start;
    if (Math.abs(dist) < 1) { toc.scrollTop = end; return; }
    const duration = 300;
    let startTime = null;
    const step = (ts) => {
      if (startTime === null) startTime = ts;
      const p = Math.min(1, (ts - startTime) / duration);
      const eased = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
      toc.scrollTop = start + dist * eased;
      if (p < 1) scrollRAF = requestAnimationFrame(step);
    };
    if (scrollRAF) cancelAnimationFrame(scrollRAF);
    scrollRAF = requestAnimationFrame(step);
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = `#${entry.target.id}`;
      links.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === id));
    });
    const active = toc.querySelector('a.active');
    if (active) {
      const activeRect = active.getBoundingClientRect();
      const tocRect = toc.getBoundingClientRect();
      const top = toc.scrollTop + (activeRect.top - tocRect.top) - toc.clientHeight / 2 + activeRect.height / 2;
      scrollTocTo(top);
    }
  }, { rootMargin: '-18% 0px -70%' });
  headings.forEach((heading) => observer.observe(heading));
}

const codeBlocks = [
  ...document.querySelectorAll('.article-content .highlight'),
  ...document.querySelectorAll('.article-content > pre')
];

codeBlocks.forEach((block) => {
  const button = document.createElement('span');
  button.className = 'btn-copy tooltipped tooltipped-sw';
  button.setAttribute('aria-label', 'Copy to clipboard!');
  button.setAttribute('role', 'button');
  button.setAttribute('tabindex', '0');
  button.innerHTML = '<i class="far fa-clone" aria-hidden="true"></i>';

  button.addEventListener('click', async () => {
    const codeElement = block.querySelector('.lntd:last-child code') ?? block.querySelector('code');
    const code = codeElement?.innerText ?? '';
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const area = document.createElement('textarea');
        area.value = code;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        area.remove();
      }
      button.classList.add('copied');
      button.setAttribute('aria-label', 'Copied!');
      setTimeout(() => {
        button.classList.remove('copied');
        button.setAttribute('aria-label', 'Copy to clipboard!');
      }, 1600);
    } catch {
      button.setAttribute('aria-label', 'Copy failed');
    }
  });

  button.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      button.click();
    }
  });

  block.appendChild(button);

  const lineNumbers = [...block.querySelectorAll('.lnt')];
  const codeLines = [...block.querySelectorAll('.lntd:last-child .line')];
  lineNumbers.forEach((lineNumber, index) => {
    const codeLine = codeLines[index];
    if (!codeLine) return;

    lineNumber.setAttribute('role', 'button');
    lineNumber.setAttribute('tabindex', '0');
    lineNumber.setAttribute('aria-label', `复制第 ${index + 1} 行`);

    const copyLine = async () => {
      const text = codeLine.innerText.replace(/\r?\n$/, '');
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const area = document.createElement('textarea');
          area.value = text;
          area.style.position = 'fixed';
          area.style.opacity = '0';
          document.body.appendChild(area);
          area.select();
          document.execCommand('copy');
          area.remove();
        }
        lineNumber.classList.add('copied-line');
        codeLine.classList.add('copied-line');
        setTimeout(() => {
          lineNumber.classList.remove('copied-line');
          codeLine.classList.remove('copied-line');
        }, 900);
      } catch {
        lineNumber.setAttribute('aria-label', `第 ${index + 1} 行复制失败`);
      }
    };

    lineNumber.addEventListener('click', copyLine);
    lineNumber.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        copyLine();
      }
    });
  });
});

const lightbox = document.createElement('div');
lightbox.className = 'lightbox';
lightbox.innerHTML = '<img alt="">';
const lightboxImg = lightbox.querySelector('img');
document.body.appendChild(lightbox);

document.querySelectorAll('.article-content img').forEach((img) => {
  img.addEventListener('click', (e) => {
    e.preventDefault();
    lightboxImg.src = img.currentSrc || img.src;
    lightbox.classList.add('open');
  });
});

lightbox.addEventListener('click', () => lightbox.classList.remove('open'));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') lightbox.classList.remove('open');
});
