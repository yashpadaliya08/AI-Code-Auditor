import { describe, it, expect } from 'vitest';
import { FileFilter } from '../../src/infrastructure/parsers/FileFilter.js';

describe('FileFilter', () => {
  it('should ignore default blacklisted directories', () => {
    const filter = new FileFilter();

    expect(filter.isIgnored('node_modules/express/index.js')).toBe(true);
    expect(filter.isIgnored('.git/config')).toBe(true);
    expect(filter.isIgnored('dist/bundle.js')).toBe(true);
    expect(filter.isIgnored('build/main.js')).toBe(true);
    expect(filter.isIgnored('.venv/bin/activate')).toBe(true);
    expect(filter.isIgnored('coverage/lcov.info')).toBe(true);
  });

  it('should ignore binary, media, and archive extensions', () => {
    const filter = new FileFilter();

    expect(filter.isIgnored('assets/logo.png')).toBe(true);
    expect(filter.isIgnored('assets/photo.jpg')).toBe(true);
    expect(filter.isIgnored('bin/server.exe')).toBe(true);
    expect(filter.isIgnored('data/archive.zip')).toBe(true);
    expect(filter.isIgnored('fonts/inter.woff2')).toBe(true);
    expect(filter.isIgnored('db/app.sqlite')).toBe(true);
  });

  it('should ignore lockfiles and minified files', () => {
    const filter = new FileFilter();

    expect(filter.isIgnored('package-lock.json')).toBe(true);
    expect(filter.isIgnored('yarn.lock')).toBe(true);
    expect(filter.isIgnored('pnpm-lock.yaml')).toBe(true);
    expect(filter.isIgnored('public/vendor.min.js')).toBe(true);
    expect(filter.isIgnored('styles.min.css')).toBe(true);
  });

  it('should ignore sensitive secret files but keep .env.example', () => {
    const filter = new FileFilter();

    expect(filter.isIgnored('.env')).toBe(true);
    expect(filter.isIgnored('.env.local')).toBe(true);
    expect(filter.isIgnored('id_rsa')).toBe(true);
    expect(filter.isIgnored('server.key')).toBe(true);
    // .env.example is safe and desirable for auditing configuration patterns
    expect(filter.isIgnored('.env.example')).toBe(false);
  });

  it('should allow valid source code files', () => {
    const filter = new FileFilter();

    expect(filter.isIgnored('src/index.ts')).toBe(false);
    expect(filter.isIgnored('src/controllers/auth.controller.ts')).toBe(false);
    expect(filter.isIgnored('src/models/user.py')).toBe(false);
    expect(filter.isIgnored('package.json')).toBe(false);
  });

  it('should support custom gitignore lines', () => {
    const filter = new FileFilter();
    filter.addGitignoreContent(`
# Custom ignore
custom-temp/
*.scratch
secret-config.json
    `);

    expect(filter.isIgnored('custom-temp/file.txt')).toBe(true);
    expect(filter.isIgnored('notes.scratch')).toBe(true);
    expect(filter.isIgnored('secret-config.json')).toBe(true);
    expect(filter.isIgnored('src/main.ts')).toBe(false);
  });

  it('should correctly assign file priorities', () => {
    const filter = new FileFilter();

    expect(filter.getFilePriority('package.json')).toBe(1);
    expect(filter.getFilePriority('tsconfig.json')).toBe(1);
    expect(filter.getFilePriority('src/routes/api.ts')).toBe(2);
    expect(filter.getFilePriority('src/auth/jwt.ts')).toBe(2);
    expect(filter.getFilePriority('src/models/User.ts')).toBe(3);
    expect(filter.getFilePriority('src/utils/formatter.ts')).toBe(4);
    expect(filter.getFilePriority('tests/unit/auth.test.ts')).toBe(5);
  });
});
