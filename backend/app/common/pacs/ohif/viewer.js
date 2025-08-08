import { createViewer } from '@ohif/viewer';
import config from './app-config.js';

createViewer({
  config,
  domRoot: document.getElementById('root'),
});
