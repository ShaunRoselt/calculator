async (page) => {
  const origin = 'http://127.0.0.1:4173';
  const output = 'cs2/theme-surfaces';
  await page.goto(origin + '/app.html');
  const { themes } = await page.evaluate(async () => (await fetch('/assets/themes/data/index.json')).json());
  for (const theme of themes) {
    const mode = origin + '/app.html?page=standard&theme=' + encodeURIComponent(theme.id);
    await page.setViewportSize({ width: 180, height: 359 });
    await page.goto(mode + '&language=en&readonly=1');
    await page.locator('.display-value').waitFor();
    await page.evaluate(() => {
      document.body.dataset.readonlyFrame = 'true';
      return document.fonts.ready;
    });
    await page.locator('.app-shell').screenshot({
      path: output + '/' + theme.id + '-preview.png',
      scale: 'css',
    });

    if (theme.id === 'dark' || theme.id === 'light') continue;
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(mode);
    await page.locator('.app-shell').waitFor();
    const surfaces = await page.evaluate(() => {
      const shell = document.querySelector('.app-shell');
      const display = document.querySelector('.display-panel');
      const css = getComputedStyle(shell);
      return {
        shell: getComputedStyle(shell).backgroundImage !== 'none'
          || getComputedStyle(shell, '::before').backgroundImage !== 'none'
          || css.getPropertyValue('--window-bg').includes('gradient('),
        display: getComputedStyle(display).backgroundImage !== 'none'
          || getComputedStyle(display, '::before').backgroundImage !== 'none'
          || css.getPropertyValue('--theme-display-mascot-image').includes('url('),
      };
    });
    if (surfaces.display) {
      await page.evaluate(() => {
        const display = document.querySelector('.display-panel');
        display.replaceChildren();
        display.style.cssText += ';position:fixed;inset:0 auto auto 0;width:960px;height:236px;margin:0;min-height:0;max-height:none;box-sizing:border-box;border:0;border-radius:0;box-shadow:none;z-index:3';
        const shell = document.querySelector('.app-shell');
        shell.replaceChildren(display);
        shell.style.setProperty('background', 'transparent', 'important');
        document.documentElement.style.setProperty('background', 'transparent', 'important');
        document.body.style.setProperty('background', 'transparent', 'important');
      });
      await page.addStyleTag({ content: '.app-shell::before { display: none !important } .desktop-shell { background: transparent !important }' });
      await page.locator('.display-panel').screenshot({
        path: output + '/' + theme.id + '-display.png',
        omitBackground: true,
        scale: 'css',
      });
    }
    if (surfaces.shell) {
      await page.goto(mode);
      await page.locator('.app-shell').waitFor();
      await page.evaluate(() => document.querySelector('.app-shell').replaceChildren());
      await page.locator('.app-shell').screenshot({
        path: output + '/' + theme.id + '-shell.png',
        scale: 'css',
      });
    }
  }
}
