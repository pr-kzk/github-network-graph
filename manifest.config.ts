import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json' with { type: 'json' };

export default defineManifest({
  manifest_version: 3,
  // 表示名/説明/タイトルは _locales/<locale>/messages.json から取得される。
  // Chrome は default_locale をベースに、ユーザーの UI 言語に応じて切り替える。
  name: '__MSG_ext_name__',
  description: '__MSG_ext_description__',
  default_locale: 'en',
  version: pkg.version,
  action: {
    default_popup: 'src/popup/index.html',
    default_title: '__MSG_action_default_title__',
  },
  options_page: 'src/options/index.html',
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  permissions: ['storage', 'activeTab'],
  host_permissions: ['https://github.com/*', 'https://api.github.com/*'],
  web_accessible_resources: [
    {
      resources: ['src/graph/index.html'],
      matches: ['https://github.com/*'],
    },
  ],
  icons: {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
  },
});
