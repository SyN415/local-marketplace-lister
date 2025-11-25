import puppeteer, { Browser, Page, ElementHandle } from 'puppeteer';
import fs from 'fs';
import path from 'path';
import os from 'os';
import axios from 'axios';
import { PlatformAdapter, PublishResult, PublishOptions, AdapterCredentials } from './types';

export class OfferUpAdapter implements PlatformAdapter {
  readonly platform = 'offerup';

  async connect(credentials: AdapterCredentials): Promise<boolean> {
    if (!credentials.cookies || !Array.isArray(credentials.cookies)) {
      console.warn('OfferUpAdapter: Missing or invalid cookies in credentials.');
      return false;
    }
    return true;
  }

  async publish(listing: PublishOptions, connection: AdapterCredentials): Promise<PublishResult> {
    console.log(`OfferUpAdapter: Publishing listing ${listing.id}...`);
    
    if (!connection.cookies || !Array.isArray(connection.cookies)) {
         return {
             success: false,
             platform: this.platform,
             error: 'OfferUp cookies are missing or invalid.'
         };
    }

    let browser: Browser | null = null;
    const tempFiles: string[] = [];

    try {
        // Launch Puppeteer with realistic User-Agent to avoid bot detection
        console.log('OfferUpAdapter: Launching browser...');
        browser = await puppeteer.launch({
            headless: true, // Set to false for debugging
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-notifications',
                '--window-size=1280,800',
                '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            ]
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        // Set Cookies
        console.log('OfferUpAdapter: Setting cookies...');
        // Cast cookies to any because Puppeteer types can be strict about cookie properties
        await page.setCookie(...(connection.cookies as any[]));

        // Navigate
        console.log('OfferUpAdapter: Navigating to posting page...');
        await page.goto('https://offerup.com/posting/start', { waitUntil: 'networkidle2' });

        // Check login status
        if (page.url().includes('login') || page.url().includes('auth')) {
            throw new Error('OfferUpAdapter: Session invalid, redirected to login.');
        }

        // Wait for initial load
        await new Promise(r => setTimeout(r, 3000));

        // 1. Upload Images
        if (listing.images && listing.images.length > 0) {
            console.log('OfferUpAdapter: Processing images...');
            
            for (const imageUrl of listing.images) {
                try {
                    const tempPath = await this.downloadImage(imageUrl);
                    tempFiles.push(tempPath);
                } catch (err) {
                    console.error(`OfferUpAdapter: Failed to download image ${imageUrl}`, err);
                }
            }

            if (tempFiles.length > 0) {
                // OfferUp usually has a hidden file input or a button that triggers it
                const fileInput = await page.$('input[type="file"]');
                if (fileInput) {
                    const input = fileInput as ElementHandle<HTMLInputElement>;
                    await input.uploadFile(...tempFiles);
                    console.log('OfferUpAdapter: Images uploaded, waiting for processing...');
                    await new Promise(r => setTimeout(r, 5000)); 
                } else {
                    console.warn('OfferUpAdapter: Could not find file input for images.');
                }
            }
        }

        // 2. Fill Title
        console.log('OfferUpAdapter: Filling Title...');
        // Attempt to find title input
        let titleInput: any = await page.$('input[name="title"]') || await page.$('input[placeholder*="Title"]');
        if (!titleInput) {
             // Fallback: Try by label text
             const titleLabel = await this.findByText(page, 'Title');
             if (titleLabel) {
                 // Assuming input is inside or next to label
                 titleInput = await titleLabel.$('input') || await page.$(`#${await (await titleLabel.getProperty('htmlFor')).jsonValue()}`);
             }
        }

        if (titleInput) {
            await titleInput.click({ clickCount: 3 });
            await titleInput.type(listing.title);
        } else {
            console.warn('OfferUpAdapter: Title input not found.');
        }
        
        // 3. Fill Category
        console.log('OfferUpAdapter: Selecting Category (Best Effort)...');
        // This is likely complex. We might need to click a "Select Category" button.
        try {
            // Look for a button or div that looks like a category selector
            const categorySelector = await this.findByText(page, 'Select category', 'button') || await this.findByText(page, 'Category');
            if (categorySelector) {
                await categorySelector.click();
                await new Promise(r => setTimeout(r, 1000));
                
                // Try to find a matching category in the list
                // This is hard to automate perfectly without a map. 
                // For MVP, we log that manual intervention might be preferred, or pick "General" / "Other" if available.
                // Or just try to type the category name if it's searchable
                if (listing.category) {
                    await page.keyboard.type(listing.category);
                    await new Promise(r => setTimeout(r, 1000));
                    await page.keyboard.press('Enter');
                }
            }
        } catch (e) {
            console.warn('OfferUpAdapter: Category selection failed or skipped.', e);
        }

        // 4. Fill Condition
        console.log('OfferUpAdapter: Selecting Condition...');
        try {
            // Often "New", "Used (normal wear)", etc.
            // Look for text matching "New" or "Used"
            const conditionText = listing.condition === 'new' ? 'New' : 'Used';
            const conditionBtn = await this.findByText(page, conditionText, 'button') || await this.findByText(page, conditionText, 'div'); // sometimes divs act as buttons
            
            if (conditionBtn) {
                await conditionBtn.click();
            }
        } catch (e) {
             console.warn('OfferUpAdapter: Condition selection failed.', e);
        }

        // 5. Fill Description
        console.log('OfferUpAdapter: Filling Description...');
        const descInput = await page.$('textarea[name="description"]') || await page.$('textarea');
        if (descInput) {
            await descInput.click({ clickCount: 3 });
            await descInput.type(listing.description);
        }

        // 6. Fill Price
        console.log('OfferUpAdapter: Filling Price...');
        const priceInput = await page.$('input[name="price"]') || await page.$('input[placeholder*="Price"]');
        if (priceInput) {
            await priceInput.click({ clickCount: 3 });
            await priceInput.type(listing.price.toString());
        }

        // 7. Location (Zip Code)
        console.log('OfferUpAdapter: Checking Location...');
        // OfferUp often auto-detects, but might ask for Zip
        const zipInput = await page.$('input[name="zipcode"]') || await page.$('input[placeholder*="Zip"]');
        if (zipInput) {
            // If empty, fill it. (How to know if empty? evaluate value)
            const val = await page.evaluate(el => (el as HTMLInputElement).value, zipInput);
            if (!val) {
                 // Default or from listing if available (listing doesn't have location yet in type, maybe metadata?)
                 await zipInput.type('90210'); // Placeholder or need to add location to Listing type
            }
        }

        // 8. Submit
        console.log('OfferUpAdapter: Attempting submission...');
        const postButton = await this.findByText(page, 'Post', 'button');
        
        if (postButton) {
             console.log('OfferUpAdapter: Clicking Post...');
             await postButton.click();
             
             // Wait for success
             await new Promise(r => setTimeout(r, 5000));
             
             // Check for success indicator (URL change or "Success" text)
             const success = await page.evaluate(() => {
                 return document.body.innerText.includes('Success') || document.body.innerText.includes('Posted');
             });
             
             if (success || !page.url().includes('posting')) {
                 const finalUrl = page.url();
                 await browser.close();
                 return {
                    success: true,
                    platform: this.platform,
                    listingUrl: finalUrl,
                    platformListingId: `offerup-${Date.now()}`, // Placeholder
                    metadata: { steps: ['completed'] }
                 };
             } else {
                 throw new Error('Post button clicked but success not confirmed.');
             }

        } else {
            throw new Error('Post button not found.');
        }

    } catch (error: any) {
        console.error('OfferUpAdapter: Fatal Error', error);
        
        let screenshotPath = '';
        if (browser) {
             const pages = await browser.pages();
             if (pages.length > 0) {
                 screenshotPath = path.join(os.tmpdir(), `offerup_error_${listing.id}_${Date.now()}.png`);
                 try {
                    await pages[0].screenshot({ path: screenshotPath });
                    console.log(`OfferUpAdapter: Saved error screenshot to ${screenshotPath}`);
                 } catch (e) {
                     console.error('OfferUpAdapter: Failed to save screenshot', e);
                 }
             }
             await browser.close();
        }
        
        // Cleanup temp files
        for (const file of tempFiles) {
             try { fs.unlinkSync(file); } catch (e) {}
        }

        return {
            success: false,
            platform: this.platform,
            error: error.message,
            metadata: { screenshot: screenshotPath }
        };
    }
  }

  // Helper to find elements by text content
  private async findByText(page: Page, text: string, tag = '*') {
      // XPath to find element containing text
      // Puppeteer 22+ Xpath support via xpath/ prefix for querySelector
      try {
          const xpath = `xpath///${tag}[contains(text(), "${text}")]`;
          const elements = await page.$$(xpath);
          if (elements.length > 0) {
              return elements[0];
          }
      } catch (e) {
          console.warn(`XPath search failed for ${text}`, e);
      }
      return null;
  }

  private async downloadImage(url: string): Promise<string> {
      const response = await axios({
          url,
          method: 'GET',
          responseType: 'stream'
      });
      const ext = path.extname(url).split('?')[0] || '.jpg';
      const tempPath = path.join(os.tmpdir(), `offerup_upload_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`);
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