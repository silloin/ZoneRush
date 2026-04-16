/**
 * Secret & Credential Scanner
 * Scans entire project for exposed secrets, API keys, passwords, and tokens
 */

const fs = require('fs');
const path = require('path');

class SecretScanner {
  constructor() {
    this.findings = [];
    this.scannedFiles = 0;
    this.patterns = this.loadPatterns();
  }

  /**
   * Load patterns for detecting secrets
   */
  loadPatterns() {
    return {
      // High confidence patterns
      critical: [
        { 
          name: 'Mapbox API Key',
          pattern: /pk\.eyJ1Ijoi[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/g,
          severity: 'CRITICAL',
          description: 'Mapbox public token exposed'
        },
        { 
          name: 'Hardcoded Database Password',
          pattern: /password:\s*['"]8810['"]/gi,
          severity: 'CRITICAL',
          description: 'Database password hardcoded in code'
        },
        { 
          name: 'Test Password in Code',
          pattern: /password:\s*['"]changeme123['"]/gi,
          severity: 'CRITICAL',
          description: 'Test password found in production code'
        },
        {
          name: 'PGPASSWORD in Scripts',
          pattern: /set\s+PGPASSWORD=[a-zA-Z0-9]+/gi,
          severity: 'CRITICAL',
          description: 'Database password in batch scripts'
        },
        {
          name: 'JWT Secret Weak/Default',
          pattern: /JWT_SECRET.?=.*?(your_super_secret|secret|password)/gi,
          severity: 'CRITICAL',
          description: 'Weak or default JWT secret'
        },
      ],
      
      // Medium confidence patterns
      warning: [
        {
          name: 'API Key Assignment',
          pattern: /(api[_-]?key|apikey)\s*[:=]\s*['"][a-zA-Z0-9]{20,}['"]/gi,
          severity: 'WARNING',
          description: 'API key may be hardcoded'
        },
        {
          name: 'Secret Assignment',
          pattern: /(secret[_-]?key|secret)\s*[:=]\s*['"][a-zA-Z0-9]{16,}['"]/gi,
          severity: 'WARNING',
          description: 'Secret key may be hardcoded'
        },
        {
          name: 'Auth Token',
          pattern: /(auth[_-]?token|access[_-]?token)\s*[:=]\s*['"][a-zA-Z0-9]{20,}['"]/gi,
          severity: 'WARNING',
          description: 'Auth token may be hardcoded'
        },
        {
          name: 'Private Key Pattern',
          pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/g,
          severity: 'WARNING',
          description: 'Private key file detected'
        },
      ],
      
      // Low confidence patterns
      info: [
        {
          name: 'Environment Variable Usage',
          pattern: /process\.env\.[A-Z_]+/g,
          severity: 'INFO',
          description: 'Environment variable usage (verify not logged)'
        },
        {
          name: 'Vite Env Variable',
          pattern: /import\.meta\.env\.VITE_[A-Z_]+/g,
          severity: 'INFO',
          description: 'Vite environment variable (will be bundled)'
        },
      ]
    };
  }

  /**
   * Scan entire project
   */
  scanProject(rootDir) {
    console.log('🔍 Scanning project for exposed secrets...\n');
    console.log('═'.repeat(60));

    this.scanDirectory(rootDir, rootDir);

    this.reportFindings();
  }

  /**
   * Recursively scan directory
   */
  scanDirectory(dir, rootDir) {
    try {
      const files = fs.readdirSync(dir);

      files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        // Skip node_modules, .git, and other non-source directories
        if (stat.isDirectory()) {
          const skipDirs = ['node_modules', '.git', 'dist', 'build', 'coverage'];
          if (skipDirs.includes(file)) return;
          this.scanDirectory(fullPath, rootDir);
        } else {
          // Only scan source files
          const extensions = ['.js', '.jsx', '.ts', '.tsx', '.json', '.env', '.bat', '.sh', '.sql', '.html', '.css'];
          const ext = path.extname(file);
          if (extensions.includes(ext)) {
            this.scanFile(fullPath, rootDir);
          }
        }
      });
    } catch (error) {
      // Skip permission errors
    }
  }

  /**
   * Scan individual file for secrets
   */
  scanFile(filePath, rootDir) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(rootDir, filePath);
      this.scannedFiles++;

      // Skip .gitignore and .env.example (these are templates)
      if (relativePath.includes('.gitignore') || relativePath.includes('.env.example')) {
        return;
      }

      // Check all patterns
      Object.values(this.patterns).flat().forEach(({ name, pattern, severity, description }) => {
        const matches = content.match(pattern);
        if (matches) {
          matches.forEach(match => {
            // Get line number
            const lines = content.split('\n');
            const lineNumber = lines.findIndex(line => line.includes(match.substring(0, 20))) + 1;

            this.findings.push({
              file: relativePath,
              line: lineNumber,
              severity,
              name,
              description,
              match: match.substring(0, 50) + (match.length > 50 ? '...' : '')
            });
          });
        }
      });

      // Special check: .env files in frontend
      if (relativePath.includes('client') && relativePath.includes('.env')) {
        const envLines = content.split('\n');
        envLines.forEach((line, index) => {
          if (line.includes('=') && !line.startsWith('#')) {
            const [key, value] = line.split('=');
            if (value && value.length > 10 && !value.includes('CHANGE_ME')) {
              this.findings.push({
                file: relativePath,
                line: index + 1,
                severity: 'CRITICAL',
                name: 'Frontend .env with Real Values',
                description: `Frontend .env contains real secret: ${key.trim()}`,
                match: `${key.trim()}=${value.substring(0, 30)}...`
              });
            }
          }
        });
      }

    } catch (error) {
      // Skip files that can't be read
    }
  }

  /**
   * Report findings
   */
  reportFindings() {
    console.log(`\n📊 Scan Complete: ${this.scannedFiles} files scanned\n`);

    if (this.findings.length === 0) {
      console.log('✅ No exposed secrets found!');
      return;
    }

    // Group by severity
    const critical = this.findings.filter(f => f.severity === 'CRITICAL');
    const warning = this.findings.filter(f => f.severity === 'WARNING');
    const info = this.findings.filter(f => f.severity === 'INFO');

    console.log('═'.repeat(60));
    console.log(`🚨 CRITICAL: ${critical.length} findings`);
    console.log(`⚠️  WARNING: ${warning.length} findings`);
    console.log(`ℹ️  INFO: ${info.length} findings`);
    console.log('═'.repeat(60));

    if (critical.length > 0) {
      console.log('\n🔴 CRITICAL FINDINGS (Must Fix Immediately):');
      console.log('─'.repeat(60));
      critical.forEach((finding, i) => {
        console.log(`\n${i + 1}. ${finding.name}`);
        console.log(`   File: ${finding.file}:${finding.line}`);
        console.log(`   Issue: ${finding.description}`);
        console.log(`   Found: ${finding.match}`);
      });
    }

    if (warning.length > 0) {
      console.log('\n\n🟡 WARNING FINDINGS (Review Required):');
      console.log('─'.repeat(60));
      warning.forEach((finding, i) => {
        console.log(`\n${i + 1}. ${finding.name}`);
        console.log(`   File: ${finding.file}:${finding.line}`);
        console.log(`   Issue: ${finding.description}`);
        console.log(`   Found: ${finding.match}`);
      });
    }

    if (info.length > 0) {
      console.log('\n\n🔵 INFO FINDINGS (For Awareness):');
      console.log('─'.repeat(60));
      info.slice(0, 10).forEach((finding, i) => {
        console.log(`\n${i + 1}. ${finding.name}`);
        console.log(`   File: ${finding.file}:${finding.line}`);
        console.log(`   Issue: ${finding.description}`);
      });
      if (info.length > 10) {
        console.log(`\n   ... and ${info.length - 10} more`);
      }
    }

    // Generate remediation plan
    this.generateRemediationPlan(critical, warning);
  }

  /**
   * Generate remediation plan
   */
  generateRemediationPlan(critical, warning) {
    console.log('\n\n' + '═'.repeat(60));
    console.log('📋 REMEDIATION PLAN');
    console.log('═'.repeat(60));

    // Check for specific critical issues
    const hasMapboxExposed = critical.find(f => f.name.includes('Mapbox'));
    const hasDbPasswordExposed = critical.find(f => f.name.includes('Database Password') || f.name.includes('PGPASSWORD'));
    const hasFrontendEnv = critical.find(f => f.name.includes('Frontend .env'));

    if (hasMapboxExposed || hasFrontendEnv) {
      console.log('\n1️⃣  FRONTEND SECRETS (CRITICAL):');
      console.log('   ──────────────────────────────────────');
      console.log('   ❌ Mapbox API key exposed in client/.env');
      console.log('   ✅ Solution:');
      console.log('      1. Create client/.env.example with placeholder');
      console.log('      2. Add real key to deployment environment variables');
      console.log('      3. Use VITE_ prefix (already done)');
      console.log('      4. Remove client/.env from local machine after deployment');
      console.log('   ⚠️  Note: Vite bundles VITE_ variables into frontend code');
      console.log('      This is acceptable for PUBLIC keys like Mapbox tokens');
    }

    if (hasDbPasswordExposed) {
      console.log('\n2️⃣  DATABASE PASSWORDS (CRITICAL):');
      console.log('   ──────────────────────────────────────');
      console.log('   ❌ Password "8810" hardcoded in multiple files');
      console.log('   ✅ Solution:');
      console.log('      1. Create scripts/.env for database credentials');
      console.log('      2. Update all .bat scripts to use %PGPASSWORD% from .env');
      console.log('      3. Update all .js scripts to use process.env.DB_PASSWORD');
      console.log('      4. Change database password from "8810" to strong password');
      console.log('      5. Add scripts/.env to .gitignore');
    }

    console.log('\n3️⃣  GENERAL SECURITY:');
    console.log('   ──────────────────────────────────────');
    console.log('   ✅ Verify .gitignore blocks all .env files');
    console.log('   ✅ Create .env.example templates for documentation');
    console.log('   ✅ Use environment variables in deployment (Vercel, Render, etc.)');
    console.log('   ✅ Never commit .env files to repository');
    console.log('   ✅ Rotate all exposed secrets immediately');
    console.log('   ✅ Use strong passwords (16+ chars, mixed case + numbers + symbols)');

    console.log('\n4️⃣  IMMEDIATE ACTIONS:');
    console.log('   ──────────────────────────────────────');
    console.log('   [ ] 1. Change database password from "8810"');
    console.log('   [ ] 2. Rotate Mapbox API key (if exposed in git history)');
    console.log('   [ ] 3. Create client/.env.example template');
    console.log('   [ ] 4. Create scripts/.env for batch scripts');
    console.log('   [ ] 5. Update all hardcoded passwords to use env vars');
    console.log('   [ ] 6. Remove client/.env after setting up deployment');
    console.log('   [ ] 7. Verify .gitignore is working');
    console.log('   [ ] 8. Run: git rm --cached client/.env (if committed)');
  }
}

// Run scanner
if (require.main === module) {
  const scanner = new SecretScanner();
  const projectRoot = path.join(__dirname, '..');
  scanner.scanProject(projectRoot);
}

module.exports = SecretScanner;
