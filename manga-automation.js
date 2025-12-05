/**
 * MANGA-AUTOMATION.JS - CLOUDFLARE WORKERS VERSION
 * 
 * Environment Variable:
 * - CLOUDFLARE_WORKER_URL=https://manga-code-validator.YOUR_SUBDOMAIN.workers.dev
 */

const https = require('https');
const crypto = require('crypto');

const CLOUDFLARE_WORKER_URL = process.env.CLOUDFLARE_WORKER_URL || '';

// ============================================
// CLOUDFLARE API FUNCTIONS
// ============================================

async function uploadCodesToCloudflare(repoName, codes) {
    if (!CLOUDFLARE_WORKER_URL) {
        console.log('⚠️  CLOUDFLARE_WORKER_URL not configured');
        console.log('\n📋 Manual codes:');
        codes.forEach(item => {
            console.log(`   ${repoName} | ${item.chapter} | ${item.code}`);
        });
        return false;
    }

    if (codes.length === 0) return true;

    console.log(`📤 Uploading ${codes.length} codes to Cloudflare KV...`);

    const postData = JSON.stringify({
        action: 'uploadCodes',
        repoName: repoName,
        codes: codes
    });

    return new Promise((resolve) => {
        const url = new URL(CLOUDFLARE_WORKER_URL);

        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.success) {
                        console.log(`✅ Uploaded: ${response.uploaded || 0} new, ${response.updated || 0} updated`);
                        resolve(true);
                    } else {
                        console.error('❌ Upload failed:', response.message);
                        resolve(false);
                    }
                } catch (error) {
                    console.error('❌ Parse error:', error.message);
                    resolve(false);
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Request error:', error.message);
            resolve(false);
        });

        req.write(postData);
        req.end();
    });
}

async function deleteCodesFromCloudflare(repoName, chapters) {
    if (!CLOUDFLARE_WORKER_URL || chapters.length === 0) return true;

    console.log(`🗑️  Deleting ${chapters.length} codes from Cloudflare KV...`);

    const postData = JSON.stringify({
        action: 'deleteCodes',
        repoName: repoName,
        chapters: chapters
    });

    return new Promise((resolve) => {
        const url = new URL(CLOUDFLARE_WORKER_URL);

        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.success) {
                        console.log(`✅ Deleted ${response.deleted || 0} codes`);
                        resolve(true);
                    } else {
                        console.error('❌ Delete failed:', response.message);
                        resolve(false);
                    }
                } catch (error) {
                    console.error('❌ Parse error:', error.message);
                    resolve(false);
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Request error:', error.message);
            resolve(false);
        });

        req.write(postData);
        req.end();
    });
}

// ============================================
// GENERATE RANDOM CODE
// ============================================

function generateRandomCode(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    const randomBytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
        code += chars[randomBytes[i] % chars.length];
    }
    return code;
}

// ============================================
// GENERATE CHAPTER CODES
// ============================================

async function generateChapterCodes(config) {
    const type = config.type || 'manga';
    const repoName = config.repoName;

    if (type === 'manga') {
        console.log('📖 Type: manga - skipping code generation');
        return;
    }

    console.log('🔐 Type: webtoon - generating chapter codes...');

    const lockedChapters = config.lockedChapters || [];

    if (lockedChapters.length === 0) {
        console.log('ℹ️  No locked chapters found');
        return;
    }

    // Load existing codes from local tracking
    const existingCodes = loadJSON('chapter-codes-local.json') || {};

    console.log('\n🔑 Processing locked chapters:');

    const newCodesToUpload = [];
    const allCodes = { ...existingCodes };

    lockedChapters.forEach(chapterFolder => {
        if (existingCodes[chapterFolder]) {
            console.log(`  ✓ ${chapterFolder}: code already exists`);
            console.log(`     Plain code: ${existingCodes[chapterFolder]}`);
        } else {
            const plainCode = generateRandomCode(16);
            allCodes[chapterFolder] = plainCode;

            newCodesToUpload.push({
                chapter: chapterFolder,
                code: plainCode
            });

            console.log(`  ✨ ${chapterFolder}: NEW code generated`);
            console.log(`     Plain code: ${plainCode}`);
            console.log(`     📋 Copy this code to Trakteer!`);
        }
    });

    // Upload new codes to Cloudflare
    if (newCodesToUpload.length > 0) {
        const uploadSuccess = await uploadCodesToCloudflare(repoName, newCodesToUpload);

        if (uploadSuccess) {
            console.log('\n✅ Cloudflare KV updated successfully!');
            saveJSON('chapter-codes-local.json', allCodes);
        }
    }

    // Check for removed locked chapters
    const removedChapters = Object.keys(existingCodes).filter(ch => !lockedChapters.includes(ch));
    if (removedChapters.length > 0) {
        console.log(`\n🗑️  Chapters no longer locked: ${removedChapters.join(', ')}`);
        await deleteCodesFromCloudflare(repoName, removedChapters);

        removedChapters.forEach(ch => delete allCodes[ch]);
        saveJSON('chapter-codes-local.json', allCodes);
    }

    console.log(`\n📊 Stats:`);
    console.log(`   New codes: ${newCodesToUpload.length}`);
    console.log(`   Existing: ${Object.keys(existingCodes).length}`);
    console.log(`   Removed: ${removedChapters.length}`);
    console.log(`   Total: ${lockedChapters.length}`);
}

// ============================================
// ... (Keep all other existing functions)
// ============================================

// Copy semua fungsi lainnya dari manga-automation.js yang lama
// (getWIBTimestamp, loadConfig, loadJSON, saveJSON, dll)