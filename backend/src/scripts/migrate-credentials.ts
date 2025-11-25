import { supabaseAdmin } from '../config/supabase';
import { encryptionService } from '../services/encryption.service';

async function migrateCredentials() {
  console.log('Migrating plaintext credentials to encrypted...');
  
  // Migrate email_proxy_pool
  console.log('Migrating email_proxy_pool...');
  const { data: proxies, error: proxyError } = await supabaseAdmin
    .from('email_proxy_pool')
    .select('id, encrypted_credentials');
    
  if (proxyError) {
    console.error('Error fetching proxies:', proxyError);
  } else {
    for (const proxy of proxies || []) {
      // Check if it's already encrypted string or plaintext object
      if (proxy.encrypted_credentials && typeof proxy.encrypted_credentials === 'object') {
        // Plaintext JSON, needs encryption
        console.log(`Encrypting credentials for proxy ${proxy.id}...`);
        const encrypted = encryptionService.encrypt(proxy.encrypted_credentials);
        
        const { error: updateError } = await supabaseAdmin
          .from('email_proxy_pool')
          .update({ encrypted_credentials: encrypted })
          .eq('id', proxy.id);
          
        if (updateError) {
          console.error(`Failed to update proxy ${proxy.id}:`, updateError);
        } else {
          console.log(`Migrated proxy ${proxy.id}`);
        }
      } else if (typeof proxy.encrypted_credentials === 'string' && !encryptionService.isEncrypted(proxy.encrypted_credentials)) {
          // It's a string but doesn't look like our encrypted format (maybe legacy format?)
          // Attempt to parse and encrypt, or skip if unsure
          try {
             const parsed = JSON.parse(proxy.encrypted_credentials);
             console.log(`Encrypting stringified credentials for proxy ${proxy.id}...`);
             const encrypted = encryptionService.encrypt(parsed);
             
             await supabaseAdmin
              .from('email_proxy_pool')
              .update({ encrypted_credentials: encrypted })
              .eq('id', proxy.id);
             console.log(`Migrated proxy ${proxy.id}`);
          } catch (e) {
             console.warn(`Skipping proxy ${proxy.id}: encrypted_credentials is a string but not JSON parsable or valid encryption.`);
          }
      }
    }
  }

  // Migrate marketplace_connections
  console.log('Migrating marketplace_connections...');
  const { data: connections, error: connError } = await supabaseAdmin
    .from('marketplace_connections')
    .select('id, credentials, encrypted_credentials');

  if (connError) {
    console.error('Error fetching connections:', connError);
  } else {
    for (const conn of connections || []) {
      // Check if we need to migrate from credentials column to encrypted_credentials
      // OR if encrypted_credentials has plaintext
      
      let needsMigration = false;
      let dataToEncrypt = null;

      // Case 1: Data in 'credentials' column but not in 'encrypted_credentials'
      if (conn.credentials && !conn.encrypted_credentials) {
         dataToEncrypt = conn.credentials;
         needsMigration = true;
      }
      // Case 2: Data in 'encrypted_credentials' is plaintext object
      else if (conn.encrypted_credentials && typeof conn.encrypted_credentials === 'object') {
         dataToEncrypt = conn.encrypted_credentials;
         needsMigration = true;
      }

      if (needsMigration && dataToEncrypt) {
        console.log(`Encrypting credentials for connection ${conn.id}...`);
        const encrypted = encryptionService.encrypt(dataToEncrypt);
        
        const { error: updateError } = await supabaseAdmin
          .from('marketplace_connections')
          .update({ 
            encrypted_credentials: encrypted,
            // Optionally clear the old plain credentials column if you want to enforce security now
            // credentials: null 
          })
          .eq('id', conn.id);
          
        if (updateError) {
          console.error(`Failed to update connection ${conn.id}:`, updateError);
        } else {
          console.log(`Migrated connection ${conn.id}`);
        }
      }
    }
  }
  
  console.log('Migration complete');
}

migrateCredentials().catch(console.error);