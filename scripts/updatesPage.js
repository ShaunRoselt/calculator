import { initPublicPage } from './publicPage.js';

function applyUpdatesPageState(context) {
  const eyebrow = document.querySelector('[data-updates-eyebrow]');
  const title = document.querySelector('[data-updates-title]');
  const intro = document.querySelector('[data-updates-intro]');
  const changelogTitle = document.querySelector('[data-changelog-title]');

  if (eyebrow) {
    eyebrow.textContent = context.copy.updatesEyebrow;
  }
  if (title) {
    title.textContent = context.copy.updatesTitle;
  }
  if (intro) {
    intro.textContent = context.copy.updatesIntro;
  }
  if (changelogTitle) {
    changelogTitle.textContent = context.copy.versionHistoryTitle;
  }
}

void initPublicPage({
  buildPageCopy(translate) {
    return {
      updatesEyebrow: translate('updatesPage.hero.eyebrow', 'Changelog'),
      updatesTitle: translate('updatesPage.hero.title', 'Every release, from the first build to today.'),
      updatesIntro: translate(
        'updatesPage.hero.intro',
        'Roselt Calculator went from a standalone web calculator foundation to a fully packaged, multi-platform, multi-language app in a series of focused releases. This page tracks what changed in each version from 1.0.0 through 12.2.0.'
      ),
      versionHistoryTitle: translate('updatesPage.hero.versionHistory', 'Version history')
    };
  },
  applyPageState: applyUpdatesPageState
}).catch((error) => {
  console.error('Unable to initialize the updates page.', error);
});

// --- Changelog Markdown copy helpers ---
function getTextFromNode(node) {
  if (!node) return '';
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const tag = node.tagName.toLowerCase();
  if (tag === 'code') return `\`${(node.textContent || '').trim()}\``;
  if (tag === 'strong') return `**${(node.textContent || '').trim()}**`;
  if (tag === 'em' || tag === 'i') return `*${(node.textContent || '').trim()}*`;
  return Array.from(node.childNodes).map(getTextFromNode).join('');
}

function generateMarkdownForEntry(entry) {
  const version = entry.querySelector('.changelog-version-badge')?.textContent?.trim() || '';
  const date = entry.querySelector('.changelog-date')?.textContent?.trim() || '';
  const title = entry.querySelector('.changelog-body h2')?.textContent?.trim() || '';
  const summaryEl = entry.querySelector('.changelog-summary');
  const summary = summaryEl ? Array.from(summaryEl.childNodes).map(getTextFromNode).join('').trim() : '';

  const lines = [];
  if (version) lines.push(`## ${version}${date ? ` — ${date}` : ''}`);
  if (title) lines.push('', `**${title}**`);
  if (summary) lines.push('', summary);

  const items = entry.querySelectorAll('.changelog-body ul li');
  if (items.length) {
    lines.push('');
    items.forEach((li) => {
      const text = Array.from(li.childNodes).map(getTextFromNode).join('').trim();
      lines.push(`- ${text}`);
    });
  }

  const tags = Array.from(entry.querySelectorAll('.changelog-tags .changelog-tag')).map((t) => t.textContent.trim());
  if (tags.length) lines.push('', `Tags: ${tags.join(', ')}`);

  return lines.join('\n');
}

function copyTextToClipboard(text) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    return navigator.clipboard.writeText(text);
  }

  return new Promise((resolve, reject) => {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      // Move off-screen
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) resolve(); else reject(new Error('Copy command failed'));
    } catch (err) {
      reject(err);
    }
  });
}

function setupChangelogCopyButtons() {
  const entries = document.querySelectorAll('.changelog-entry');
  entries.forEach((entry) => {
    const title = entry.querySelector('.changelog-body h2');
    if (!title) return;

    // avoid duplicating buttons if present in markup
    if (title.querySelector('.changelog-copy-btn')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'changelog-copy-btn';
    btn.setAttribute('aria-label', 'Copy changelog as Markdown');
    btn.title = 'Copy changelog as Markdown';
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>';

    // append inside the title so it appears next to the heading text
    title.appendChild(btn);

    const originalHtml = btn.innerHTML;

    btn.addEventListener('click', async () => {
      try {
        const markdown = generateMarkdownForEntry(entry);
        await copyTextToClipboard(markdown);
        btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg><span style="margin-left:6px">Copied!</span>';
        setTimeout(() => { btn.innerHTML = originalHtml; }, 1500);
      } catch (err) {
        console.error('Copy failed', err);
      }
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupChangelogCopyButtons);
} else {
  setupChangelogCopyButtons();
}
