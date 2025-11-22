/**
 * ENCRYPT-MANIFEST.JS
 * 🔐 Encrypts ONLY newly uploaded manifest.json files
 * 📌 Uses git diff to detect new/modified manifests
 * ✅ Does NOT touch old encrypted manifests
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// ============================================
// ENCRYPTION SETTINGS
// ============================================

const ENCRYPTION_ALGORITHM = 'aes-256-cbc';
const SECRET_TOKEN = process.env.SECRET_TOKEN || 'XfXqB1d0ud6rZCVPqzpzKxowGVpZ0GBU';

// Derive key from token (32 bytes for AES-256)
function deriveKey(token) {
    return crypto.createHash('sha256').update(token).digest();
}

// ============================================
// ENCRYPTION FUNCTIONS
// ============================================

function encryptText(text, secretKey) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, secretKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Return IV + encrypted data (IV needed for decryption)
    return iv.toString('hex') + ':' + encrypted;
}

function isEncrypted(text) {
    // Check if text matches encrypted pattern (hex:hex)
    return /^[0-9a-f]{32}:[0-9a-f]+$/i.test(text);
}

// ============================================
// GIT DETECTION
// ============================================

function getModifiedManifests() {
    try {
        // Get list of changed files in last commit
        const output = execSync('git diff --name-only HEAD~1 HEAD', { 
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe']
        }).trim();
        
        if (!output) {
            console.log('ℹ️  No changes detected');
            return [];
        }
        
        const changedFiles = output.split('\n');
        
        // Filter only manifest.json files
        const manifestFiles = changedFiles.filter(file => 
            file.endsWith('manifest.json') && 
            !file.startsWith('.') &&
            fs.existsSync(file)
        );
        
        console.log(`📋 Changed files: ${changedFiles.length}`);
        console.log(`📄 Manifest files detected: ${manifestFiles.length}`);
        
        return manifestFiles;
        
    } catch (error) {
        console.warn('⚠️  Could not detect git changes:', error.message);
        console.log('ℹ️  This might be the first commit - skipping encryption');
        return [];
    }
}

// ============================================
// MANIFEST PROCESSING
// ============================================

function encryptManifest(filePath, secretKey) {
    try {
        console.log(`\n🔍 Processing: ${filePath}`);
        
        // Read manifest
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const manifest = JSON.parse(fileContent);
        
        if (!manifest.pages || !Array.isArray(manifest.pages)) {
            console.log(`  ⚠️  No pages array found - skipping`);
            return false;
        }
        
        // Check if already encrypted
        const firstPage = manifest.pages[0] || '';
        if (isEncrypted(firstPage)) {
            console.log(`  ✅ Already encrypted - skipping`);
            return false;
        }
        
        console.log(`  📊 Total pages: ${manifest.pages.length}`);
        console.log(`  🔐 Encrypting...`);
        
        // Encrypt each page URL
        manifest.pages = manifest.pages.map(pageUrl => {
            return encryptText(pageUrl, secretKey);
        });
        
        // Add encryption marker
        manifest.encrypted = true;
        manifest.encryption_version = '1.0';
        
        // Save encrypted manifest
        const jsonString = JSON.stringify(manifest, null, 2);
        fs.writeFileSync(filePath, jsonString, 'utf8');
        
        console.log(`  ✅ Encrypted successfully!`);
        return true;
        
    } catch (error) {
        console.error(`  ❌ Error processing ${filePath}:`, error.message);
        return false;
    }
}

// ============================================
// MAIN
// ============================================

function main() {
    console.log('╔═══════════════════════════════════════╗');
    console.log('║     MANIFEST ENCRYPTION SCRIPT        ║');
    console.log('║   🔐 Encrypts NEW manifests only      ║');
    console.log('╚═══════════════════════════════════════╝\n');
    
    // Derive encryption key
    const secretKey = deriveKey(SECRET_TOKEN);
    console.log(`🔑 Secret token loaded (${SECRET_TOKEN.length} chars)`);
    
    // Detect modified manifests
    const modifiedManifests = getModifiedManifests();
    
    if (modifiedManifests.length === 0) {
        console.log('\n✅ No new manifests to encrypt');
        process.exit(0);
    }
    
    console.log(`\n📋 Found ${modifiedManifests.length} manifest(s) to check:\n`);
    modifiedManifests.forEach(file => console.log(`   - ${file}`));
    
    // Encrypt each manifest
    let encryptedCount = 0;
    
    modifiedManifests.forEach(filePath => {
        if (encryptManifest(filePath, secretKey)) {
            encryptedCount++;
        }
    });
    
    console.log(`\n╔═══════════════════════════════════════╗`);
    console.log(`║  ✅ Encryption completed!             ║`);
    console.log(`║  📊 Encrypted: ${encryptedCount}/${modifiedManifests.length} manifest(s)           ║`);
    console.log(`╚═══════════════════════════════════════╝`);
}

main();