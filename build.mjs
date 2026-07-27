#!/usr/bin/env node
/**
 * Build Script - يبني تطبيق الويب ثم ينسخه لـ Electron و Capacitor
 * 
 * الاستخدام:
 *   node build.mjs              → بناء الويب فقط
 *   node build.mjs --electron   → بناء + إعداد Electron
 *   node build.mjs --android    → بناء + إعداد Android (Capacitor)
 *   node build.mjs --all        → بناء + الكل
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, cpSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const FRONTEND_DIR = join(ROOT, 'app', 'frontend');
const ELECTRON_DIR = join(ROOT, 'electron');
const DIST_DIR = join(FRONTEND_DIR, 'dist');
const ELECTRON_WEB_DIR = join(ELECTRON_DIR, 'web');

const args = process.argv.slice(2);
const buildElectron = args.includes('--electron') || args.includes('--all');
const buildAndroid = args.includes('--android') || args.includes('--all');

function run(cmd, cwd = ROOT, label = '') {
  console.log(`\n▶ ${label || cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit', shell: true });
}

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

async function main() {
  console.log('════════════════════════════════════════');
  console.log('  بناء منصة خبراء النكهات');
  console.log('════════════════════════════════════════\n');

  // ── Step 1: Build the web app ──────────────────────────────────────────────
  console.log('【1/4】 بناء تطبيق الويب...');
  run('npx vite build', FRONTEND_DIR, 'vite build');

  if (!existsSync(DIST_DIR)) {
    console.error('❌ فشل البناء - مجلد dist غير موجود!');
    process.exit(1);
  }
  console.log('✅ تم بناء تطبيق الويب بنجاح\n');

  // ── Step 2: Copy to Electron ───────────────────────────────────────────────
  if (buildElectron) {
    console.log('【2/4】 نسخ الملفات إلى Electron...');
    
    if (existsSync(ELECTRON_WEB_DIR)) {
      rmSync(ELECTRON_WEB_DIR, { recursive: true, force: true });
    }
    ensureDir(ELECTRON_WEB_DIR);
    cpSync(DIST_DIR, ELECTRON_WEB_DIR, { recursive: true });

    // Ensure assets folder exists
    ensureDir(join(ELECTRON_DIR, 'assets'));

    console.log('✅ تم نسخ ملفات الويب إلى Electron\n');

    // Install Electron dependencies
    console.log('【3/4】 تثبيت مكتبات Electron...');
    run('npm install', ELECTRON_DIR, 'npm install (electron)');
    console.log('✅ تم تثبيت مكتبات Electron\n');
  }

  // ── Step 3: Sync with Capacitor (Android) ─────────────────────────────────
  if (buildAndroid) {
    console.log('【2/4】 مزامنة مع Capacitor (Android)...');
    
    // Check if Android platform exists
    const androidDir = join(FRONTEND_DIR, 'android');
    if (!existsSync(androidDir)) {
      console.log('  إضافة منصة Android...');
      run('npx cap add android', FRONTEND_DIR, 'capacitor add android');
    }

    // Sync
    run('npx cap sync android', FRONTEND_DIR, 'capacitor sync android');
    console.log('✅ تمت مزامنة Capacitor\n');
  }

  // ── Done ───────────────────────────────────────────────────────────────────
  console.log('════════════════════════════════════════');
  console.log('✅ اكتمل البناء بنجاح!');
  console.log('════════════════════════════════════════\n');

  if (buildElectron) {
    console.log('📦 لبناء تطبيق Windows:');
    console.log('   cd electron && npm run build:win\n');
  }
  if (buildAndroid) {
    console.log('📱 لفتح مشروع Android في Android Studio:');
    console.log('   cd app/frontend && npx cap open android\n');
  }
  if (!buildElectron && !buildAndroid) {
    console.log('💡 نصيحة: استخدم --electron أو --android أو --all لبناء التطبيقات');
    console.log('   مثال: node build.mjs --all\n');
  }
}

main().catch((err) => {
  console.error('❌ خطأ في البناء:', err.message);
  process.exit(1);
});
