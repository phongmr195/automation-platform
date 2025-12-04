#!/usr/bin/env node

/**
 * Quick OAuth configuration checker
 */

require('dotenv').config();

console.log('\n🔍 OAuth Configuration Check\n');
console.log('='.repeat(50));

const providers = [
  {
    name: 'Google',
    vars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_CALLBACK_URL']
  },
  {
    name: 'GitHub',
    vars: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'GITHUB_CALLBACK_URL']
  },
  {
    name: 'LinkedIn',
    vars: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET', 'LINKEDIN_CALLBACK_URL']
  }
];

let allConfigured = true;

providers.forEach(provider => {
  console.log(`\n${provider.name}:`);
  provider.vars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      // Mask sensitive values
      const masked = varName.includes('SECRET') 
        ? value.substring(0, 10) + '...' 
        : value;
      console.log(`  ✅ ${varName}: ${masked}`);
    } else {
      console.log(`  ❌ ${varName}: MISSING`);
      allConfigured = false;
    }
  });
});

console.log('\n' + '='.repeat(50));

if (allConfigured) {
  console.log('\n✅ All OAuth providers configured!');
} else {
  console.log('\n❌ Some OAuth configurations are missing.');
  console.log('\nTo fix:');
  console.log('1. Copy .env.example to .env');
  console.log('2. Fill in OAuth credentials from provider consoles:');
  console.log('   - Google: https://console.cloud.google.com/apis/credentials');
  console.log('   - GitHub: https://github.com/settings/developers');
  console.log('   - LinkedIn: https://www.linkedin.com/developers/apps');
}

console.log('\nFrontend URL:', process.env.FRONTEND_URL || 'NOT SET');
console.log('Backend Port:', process.env.PORT || '3000');
console.log('');
