export const appRoot = document.querySelector('#app');

if (!appRoot) {
  throw new Error('Expected #app root element to exist before initializing the standalone web app.');
}
