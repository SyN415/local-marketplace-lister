import puppeteer, { Browser, Page } from 'puppeteer';
import fs from 'fs';
import path from 'path';
import os from 'os';
import axios from 'axios';
import { MarketplaceAdapter } from './types';
import { Listing } from '../../types/listing.types';

export class FacebookAdapter implements MarketplaceAdapter {
  async connect(credentials: any): Promise<boolean> {
    if (!credentials.cookies || !Array.isArray(credentials.cookies)) {
      console.warn('FacebookAdapter: Missing or invalid cookies in credentials.');
      return false;
    }
    return true;
  }

  async publish(listing: Listing, connection: any): Promise<any> {
    console.log(`FacebookAdapter: Publishing listing ${listing.id}...`);
    
    // Retrieve access token if available, though Puppeteer flow relies on cookies.
    // If we were using API, we'd use connection.credentials.accessToken.
    // The current automation approach uses Puppeteer + Cookies, but ideally
    // we would use the Graph API if it supported Marketplace posting (which it strictly limits).
    // For now, we continue with Puppeteer but check connection validity.
    
    if (!connection.cookies || !Array.isArray(connection.cookies)) {
        // Fallback: if no cookies, but we have OAuth token, we can't really use it
        // for Puppeteer automation directly without a session.
        // In a real scenario, we might use the token to get some data, but
        // for posting, we still rely on browser automation session.
        // So we check for cookies. If missing, we might need to ask user to re-auth extension.
        
        // However, if the requirement is to use the OAuth token to "verify auth",
        // we can do a quick check here.
        if (connection.credentials?.accessToken) {
           console.log('FacebookAdapter: OAuth token present, but Puppeteer requires session cookies for posting.');
        }
        
        throw new Error('Facebook cookies are missing or invalid. Please ensure the extension has captured your session.');
    }

    let browser: Browser | null = null;
    const tempFiles: string[] = [];

    try {
        // Launch Puppeteer
        console.log('FacebookAdapter: Launching browser...');
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-notifications',
                '--window-size=1280,800'
            ]
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        // Set Cookies
        console.log('FacebookAdapter: Setting cookies...');
        await page.setCookie(...connection.cookies);

        // Navigate
        console.log('FacebookAdapter: Navigating to Marketplace create page...');
        await page.goto('https://www.facebook.com/marketplace/create/item', { waitUntil: 'networkidle2' });

        // Check if login failed (redirected to login page)
        if (page.url().includes('login') || page.url().includes('checkpoint')) {
            throw new Error('FacebookAdapter: Session invalid, redirected to login or checkpoint.');
        }

        // Wait for the form to load slightly
        await new Promise(r => setTimeout(r, 3000));

        // 1. Upload Images
        if (listing.images && listing.images.length > 0) {
            console.log('FacebookAdapter: Processing images...');
            
            // Download images to tmp
            for (const imageUrl of listing.images) {
                try {
                    const tempPath = await this.downloadImage(imageUrl);
                    tempFiles.push(tempPath);
                } catch (err) {
                    console.error(`FacebookAdapter: Failed to download image ${imageUrl}`, err);
                }
            }

            if (tempFiles.length > 0) {
                // Find the file input. It's usually hidden but accessible via DOM or label
                // Strategy: look for an input[type="file"]
                const fileInput = await page.$('input[type="file"]');
                if (fileInput) {
                    await fileInput.uploadFile(...tempFiles);
                    // Wait for upload to process
                    console.log('FacebookAdapter: Images uploaded, waiting for processing...');
                    await new Promise(r => setTimeout(r, 5000)); 
                } else {
                    console.warn('FacebookAdapter: Could not find file input for images.');
                }
            }
        }

        // 2. Fill Title
        console.log('FacebookAdapter: Filling Title...');
        await this.fillInput(page, 'Title', listing.title);
        
        // 3. Fill Price
        console.log('FacebookAdapter: Filling Price...');
        await this.fillInput(page, 'Price', listing.price.toString());

        // 4. Fill Category
        // This is often a combobox. We can try to click and type, or just skip if too complex for MVP.
        // Let's try to find it.
        console.log('FacebookAdapter: Attempting Category selection...');
        try {
            const categoryLabel = await this.findLabel(page, 'Category');
            if (categoryLabel) {
                await categoryLabel.click();
                await new Promise(r => setTimeout(r, 1000));
                // Type category name if mapped, else try generic
                // For now, we assume manual category selection might be needed if this fails, 
                // but for automation we'll try to type "Miscellaneous" or the listing category
                await page.keyboard.type(listing.category || 'Miscellaneous');
                await new Promise(r => setTimeout(r, 1000));
                await page.keyboard.press('Enter');
            }
        } catch (err) {
            console.warn('FacebookAdapter: Category selection failed, continuing...', err);
        }

        // 5. Fill Condition
        // Often a dropdown: New, Used - Like New, etc.
        console.log('FacebookAdapter: Attempting Condition selection...');
        try {
            const conditionLabel = await this.findLabel(page, 'Condition');
            if (conditionLabel) {
                await conditionLabel.click();
                await new Promise(r => setTimeout(r, 1000));
                // Simple mapping or default to 'Good'
                // Assuming the list is open, we can try to select the last one (Used - Fair) or first one (New)
                // Let's just try to hit Enter to select whatever is focused or type "Used"
                await page.keyboard.type('Used - Good'); 
                await new Promise(r => setTimeout(r, 1000));
                await page.keyboard.press('Enter');
            }
        } catch (err) {
             console.warn('FacebookAdapter: Condition selection failed', err);
        }

        // 6. Fill Description
        console.log('FacebookAdapter: Filling Description...');
        await this.fillInput(page, 'Description', listing.description, true);

        // 7. Location (Optional, usually autofilled)
        
        // 8. Submit
        console.log('FacebookAdapter: Attempting submission...');
        
        // Click "Next" - often there are multiple "Next" buttons (e.g. for boosting), need to be careful
        // Loop through "Next" clicks until "Publish" appears
        let maxSteps = 3;
        let published = false;

        for (let i = 0; i < maxSteps; i++) {
            // Look for Publish first
            const publishButton = await this.findButton(page, 'Publish');
            if (publishButton) {
                console.log('FacebookAdapter: Clicking Publish...');
                await publishButton.click();
                published = true;
                break;
            }

            // Look for Next
            const nextButton = await this.findButton(page, 'Next');
            if (nextButton) {
                console.log('FacebookAdapter: Clicking Next...');
                await nextButton.click();
                await new Promise(r => setTimeout(r, 2000)); // wait for transition
            } else {
                break; // No next or publish, stuck?
            }
        }

        if (!published) {
             // Try one last check for Publish
             const publishButton = await this.findButton(page, 'Publish');
             if (publishButton) {
                 await publishButton.click();
                 published = true;
             }
        }

        if (published) {
             // Wait for success indication or URL change
             await new Promise(r => setTimeout(r, 5000));
        } else {
            throw new Error('Could not complete publication flow (Publish button not found or not clickable).');
        }

        return {
            success: true,
            external_id: 'PENDING_FB_VERIFICATION', 
            url: page.url(),
            platform_response: { message: 'Automation sequence completed' }
        };

    } catch (error: any) {
        console.error('FacebookAdapter: Fatal Error', error);
        
        if (browser) {
             const pages = await browser.pages();
             if (pages.length > 0) {
                 const screenshotPath = path.join(os.tmpdir(), `fb_error_${listing.id}_${Date.now()}.png`);
                 try {
                    await pages[0].screenshot({ path: screenshotPath });
                    console.log(`FacebookAdapter: Saved error screenshot to ${screenshotPath}`);
                 } catch (e) {
                     console.error('FacebookAdapter: Failed to save screenshot', e);
                 }
             }
        }
        
        throw error;
    } finally {
        // Cleanup
        if (browser) {
            await browser.close();
        }
        // Cleanup temp files
        for (const file of tempFiles) {
             try { fs.unlinkSync(file); } catch (e) {}
        }
    }
  }

  // Helper to find inputs by aria-label or similar
  private async fillInput(page: Page, labelPattern: string, text: string, isTextArea = false) {
      // Try aria-label exact match
      let selector = `label[aria-label="${labelPattern}"] input`;
      if (isTextArea) selector = `label[aria-label="${labelPattern}"] textarea`;
      
      let element = await page.$(selector);
      
      // Try generic fuzzy match via XPath if needed, but CSS is safer for Puppeteer
      if (!element) {
          // Try input directly with aria-label
          selector = `input[aria-label="${labelPattern}"]`;
          if (isTextArea) selector = `textarea[aria-label="${labelPattern}"]`;
          element = await page.$(selector);
      }

      if (element) {
          // Use click and type
          await element.click({ clickCount: 3 });
          await element.type(text);
      } else {
          console.warn(`FacebookAdapter: Input for "${labelPattern}" not found via CSS selectors.`);
          // Fallback: Try to find element by text content of label? Hard with obfuscation.
      }
  }

  private async findLabel(page: Page, labelPattern: string) {
      // aria-label on label element
      let selector = `label[aria-label="${labelPattern}"]`;
      let element = await page.$(selector);
      if (!element) {
          // aria-label on a div acting as combobox
          selector = `div[aria-label="${labelPattern}"]`;
          element = await page.$(selector);
      }
      return element;
  }

  private async findButton(page: Page, text: string) {
      // aria-label often matches text
      let selector = `div[aria-label="${text}"]`;
      let element = await page.$(selector);
      
      if (!element) {
          // Try finding by text content using XPath selector
          // Puppeteer v22+ uses 'xpath/' prefix for XPath selectors
          const xpath = `xpath///div[contains(text(), "${text}")] | //span[contains(text(), "${text}")]`;
          const elements = await page.$$(xpath);
          if (elements.length > 0) {
              // Check if it looks like a button (cursor pointer, etc)?
              // For now just take the first one that is visible
              return elements[0] as any; // ElementHandle
          }
      }
      return element;
  }

  private async downloadImage(url: string): Promise<string> {
      const response = await axios({
          url,
          method: 'GET',
          responseType: 'stream'
      });
      const ext = path.extname(url).split('?')[0] || '.jpg';
      const tempPath = path.join(os.tmpdir(), `fb_upload_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`);
      const writer = fs.createWriteStream(tempPath);
      
      return new Promise((resolve, reject) => {
          response.data.pipe(writer);
          let error: Error | null = null;
          writer.on('error', err => {
              error = err;
              writer.close();
              reject(err);
          });
          writer.on('close', () => {
              if (!error) {
                  resolve(tempPath);
              }
          });
      });
  }
}