import { common } from './common';
import { shell } from './shell';
import { ui } from './ui';
import { home } from './home';
import { services } from './services';
import { system } from './system';
import { storage } from './storage';
import { activity } from './activity';
import { more } from './more';
import { palette } from './palette';
import { diagnostics } from './diagnostics';

export const it = {
  ...common,
  ...shell,
  ...ui,
  ...home,
  ...services,
  ...system,
  ...storage,
  ...activity,
  ...more,
  ...palette,
  ...diagnostics,
};
