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
        'Roselt Calculator went from a standalone web calculator foundation to a fully packaged, multi-platform, multi-language app in a series of focused releases. This page tracks what changed in each version from 1.0.0 through 12.0.0.'
      ),
      versionHistoryTitle: translate('updatesPage.hero.versionHistory', 'Version history')
    };
  },
  applyPageState: applyUpdatesPageState
}).catch((error) => {
  console.error('Unable to initialize the updates page.', error);
});
