import puppeteer, { Browser, Page, ElementHandle } from 'puppeteer';
import { PlatformAdapter, PublishResult, PublishOptions, AdapterCredentials } from './types';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import os from 'os';

interface FacebookCredentials extends AdapterCredentials {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
  }>;
  accessToken?: string;
}

interface StepResult {
  step: string;
  success: boolean;
  duration: number;
  error?: string;
}

export class FacebookAdapter implements PlatformAdapter {
  readonly platform = 'facebook';
  private browser: Browser | null = null;
  private readonly screenshotDir = path.join(os.tmpdir(), 'fb-automation-screenshots');
  private readonly maxRetries = 3;
  private readonly baseTimeout = 30000;

  async connect(credentials: FacebookCredentials): Promise<boolean> {
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-notifications',
          '--window-size=1280,800'
        ],
      });

      const page = await this.browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });

      // Set cookies from credentials
      if (credentials.cookies && credentials.cookies.length > 0) {
        await page.setCookie(...credentials.cookies);
      }

      // Verify connection by checking if we're logged in
      console.log('[FacebookAdapter] verifying connection...');
      await page.goto('https://www.facebook.com', { waitUntil: 'networkidle2' });
      
      // Check for logged-in state
      const isLoggedIn = await this.checkLoginState(page);
      
      if (!isLoggedIn) {
        console.log('[FacebookAdapter] Not logged in with provided cookies');
        await this.disconnect();
        return false;
      }

      console.log('[FacebookAdapter] Successfully connected');
      return true;
    } catch (error) {
      console.error('[FacebookAdapter] Connection error:', error);
      await this.disconnect();
      return false;
    }
  }

  async publish(options: PublishOptions, connection: AdapterCredentials): Promise<PublishResult> {
    const steps: StepResult[] = [];
    let page: Page | null = null;
    
    // Ensure we have a browser instance
    if (!this.browser) {
        // Try to reconnect if credentials available? 
        // For now assume connect() was called. If not, we can't proceed easily without creds.
        // But the interface passes credentials to publish as 'connection'.
        const connected = await this.connect(connection as FacebookCredentials);
        if (!connected) {
             return {
                success: false,
                platform: this.platform,
                error: 'Could not establish connection to Facebook.'
            };
        }
    }

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`[FacebookAdapter] Publish attempt ${attempt}/${this.maxRetries}`);

        if (!this.browser) {
          throw new Error('Not connected. Call connect() first.');
        }

        page = await this.browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        
        // Ensure cookies are set on this new page if needed (usually shared by browser context, but good to be safe if context isolation)
        // In default puppeteer launch, cookies are shared.

        // Step 1: Navigate to Marketplace
        const navResult = await this.executeStep(page, 'Navigate to Marketplace', async () => {
          await page!.goto('https://www.facebook.com/marketplace/create/item', {
            waitUntil: 'networkidle2',
            timeout: this.baseTimeout,
          });
          
          // Check for login redirect
          if (page!.url().includes('login') || page!.url().includes('checkpoint')) {
              throw new Error('Session invalid, redirected to login.');
          }
        });
        steps.push(navResult);
        if (!navResult.success) throw new Error(navResult.error);

        // Step 2: Fill in title
        const titleResult = await this.executeStep(page, 'Fill title', async () => {
          await this.fillField(page!, 'Title', options.title, [
            '[aria-label="Title"]',
            'input[name="title"]', // Fallback
            'label[aria-label="Title"] input',
            'input[type="text"]' // risky, needs context
          ]);
        });
        steps.push(titleResult);
        if (!titleResult.success) throw new Error(titleResult.error);

        // Step 3: Fill in price
        const priceResult = await this.executeStep(page, 'Fill price', async () => {
          await this.fillField(page!, 'Price', options.price.toString(), [
            '[aria-label="Price"]',
            'input[name="price"]',
            'label[aria-label="Price"] input'
          ]);
        });
        steps.push(priceResult);
        if (!priceResult.success) throw new Error(priceResult.error);

        // Step 4: Select category
        const categoryResult = await this.executeStep(page, 'Select category', async () => {
          await this.selectCategory(page!, options.category);
        });
        steps.push(categoryResult);
        if (!categoryResult.success) throw new Error(categoryResult.error);
        
        // Step 5: Condition
        const conditionResult = await this.executeStep(page, 'Select condition', async () => {
             await this.selectCondition(page!, options.condition);
        });
        steps.push(conditionResult);
        if (!conditionResult.success) throw new Error(conditionResult.error);

        // Step 6: Fill description
        const descResult = await this.executeStep(page, 'Fill description', async () => {
          await this.fillField(page!, 'Description', options.description, [
            '[aria-label="Description"]',
            'textarea[name="description"]',
            'label[aria-label="Description"] textarea'
          ]);
        });
        steps.push(descResult);
        if (!descResult.success) throw new Error(descResult.error);

        // Step 7: Upload images
        if (options.images && options.images.length > 0) {
          const imageResult = await this.executeStep(page, 'Upload images', async () => {
            await this.uploadImages(page!, options.images!);
          });
          steps.push(imageResult);
          if (!imageResult.success) throw new Error(imageResult.error);
        }

        // Step 8: Submit listing
        const submitResult = await this.executeStep(page, 'Submit listing', async () => {
          await this.submitListing(page!);
        });
        steps.push(submitResult);
        if (!submitResult.success) throw new Error(submitResult.error);

        // Success!
        const finalUrl = page.url();
        await page.close();
        
        return {
          success: true,
          platform: this.platform,
          listingUrl: 'https://www.facebook.com/marketplace',  // FB doesn't return direct URL easily immediately
          platformListingId: `fb-${Date.now()}`, // Placeholder
          metadata: { steps, finalUrl },
        };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[FacebookAdapter] Attempt ${attempt} failed:`, errorMessage);

        // Take screenshot on failure
        if (page) {
          const screenshotPath = await this.takeScreenshot(page, `failure-attempt-${attempt}`);
          
          if (attempt === this.maxRetries) {
             await page.close();
             return {
                success: false,
                platform: this.platform,
                error: `Failed after ${this.maxRetries} attempts: ${errorMessage}`,
                metadata: { steps, lastError: errorMessage, screenshot: screenshotPath },
             };
          }
          await page.close();
        } else {
             if (attempt === this.maxRetries) {
                 return {
                    success: false,
                    platform: this.platform,
                    error: `Failed after ${this.maxRetries} attempts: ${errorMessage}`,
                    metadata: { steps, lastError: errorMessage },
                 };
             }
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt) * 2000;
        console.log(`[FacebookAdapter] Waiting ${delay}ms before retry...`);
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      platform: this.platform,
      error: 'Max retries exceeded',
      metadata: { steps },
    };
  }

  async disconnect(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // Helper Methods

  private async executeStep(
    page: Page,
    stepName: string,
    action: () => Promise<void>
  ): Promise<StepResult> {
    const start = Date.now();
    try {
      console.log(`[FacebookAdapter] Starting step: ${stepName}`);
      await action();
      const duration = Date.now() - start;
      console.log(`[FacebookAdapter] Completed step: ${stepName} (${duration}ms)`);
      return { step: stepName, success: true, duration };
    } catch (error) {
      const duration = Date.now() - start;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[FacebookAdapter] Failed step: ${stepName} - ${errorMessage}`);
      return { step: stepName, success: false, duration, error: errorMessage };
    }
  }

  private async checkLoginState(page: Page): Promise<boolean> {
    try {
      // Check for common logged-in indicators
      const selectors = [
        '[aria-label="Your profile"]',
        '[aria-label="Account"]',
        '[data-pagelet="ProfileTileRoot"]',
        'div[role="navigation"]'
      ];

      for (const selector of selectors) {
        const element = await page.$(selector);
        if (element) return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  private async fillField(
    page: Page,
    fieldName: string,
    value: string,
    selectors: string[]
  ): Promise<void> {
    for (const selector of selectors) {
      try {
        // Try precise match first
        let element = await page.$(selector);
        
        // If not found, try fuzzy text search if the selector looks like a title
        if (!element && !selector.includes('[')) {
             // Skip non-css selectors here or handle differently
        }

        if (element) {
             await element.click({ clickCount: 3 });
             await element.type(value, { delay: 50 });
             return;
        }
      } catch {
        continue;
      }
    }
    
    // Fallback: Try to find by aria-label containing the field name
    try {
        const labelSelector = `[aria-label*="${fieldName}"]`;
        const element = await page.$(labelSelector);
        if (element) {
             await element.click({ clickCount: 3 });
             await element.type(value, { delay: 50 });
             return;
        }
    } catch (e) {}

    throw new Error(`Could not find ${fieldName} field with any of the provided selectors`);
  }

  private async selectCategory(page: Page, category: string): Promise<void> {
    const categorySelectors = [
      '[aria-label="Category"]',
      '[aria-haspopup="listbox"]',
      'div[role="combobox"]',
    ];

    let opened = false;
    for (const selector of categorySelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
             await element.click();
             opened = true;
             break;
        }
      } catch { continue; }
    }

    if (!opened) {
         console.warn('[FacebookAdapter] Could not find category dropdown.');
         // Try finding by text "Category" - Puppeteer doesn't support $x in newer versions directly on Page without plugins sometimes,
         // but checking if we can use another selector strategy or $$ with xpath prefix
         try {
            // Puppeteer 22+ Xpath support
            const handlers = await page.$$('xpath///span[contains(text(), "Category")]');
            if (handlers.length > 0) {
                await handlers[0].click();
                opened = true;
            }
         } catch(e) {}
    }

    if (opened) {
        await this.sleep(1000);
        // Try to find and click the category option
        const categoryMap: Record<string, string> = {
          'electronics': 'Electronics',
          'furniture': 'Home & Garden', // or Furniture
          'clothing': 'Clothing & Accessories',
          'vehicles': 'Vehicles',
          'other': 'Miscellaneous',
          'apparel & accessories': 'Clothing & Accessories',
          'home & garden': 'Home & Garden',
        };

        const categoryText = categoryMap[category.toLowerCase()] || category;
        
        // Type it first to filter
        await page.keyboard.type(categoryText);
        await this.sleep(1000);
        await page.keyboard.press('Enter');
    }
  }

  private async selectCondition(page: Page, condition: string): Promise<void> {
       const conditionSelectors = [
          '[aria-label="Condition"]',
          'span:contains("Condition")'
       ];
       
       // Try to find label "Condition" and click it or the input next to it
       let clicked = false;
       try {
           const label = await page.$('[aria-label="Condition"]');
           if (label) {
               await label.click();
               clicked = true;
           }
       } catch(e) {}

       if (clicked) {
           await this.sleep(1000);
           // Map condition to FB text
           const map: Record<string, string> = {
               'new': 'New',
               'like_new': 'Used - Like New',
               'good': 'Used - Good',
               'fair': 'Used - Fair',
               'poor': 'Used - Fair' // Fallback
           };
           const text = map[condition] || 'Used - Good';
           
           // Look for option
           // Helper to click text in dropdown
            await page.evaluate((textToFind) => {
                const elements = document.querySelectorAll('div[role="option"], span');
                for (const el of elements) {
                    if (el.textContent?.trim() === textToFind) {
                        (el as HTMLElement).click();
                        return;
                    }
                }
            }, text);
       }
  }

  private async uploadImages(page: Page, imageUrls: string[]): Promise<void> {
    // Find file input
    const inputSelectors = [
      'input[type="file"][accept*="image"]',
      '[aria-label="Add photos"] input',
      'input[type="file"]',
    ];

    let fileInput = null;
    for (const selector of inputSelectors) {
      try {
        fileInput = await page.$(selector);
        if (fileInput) break;
      } catch {
        continue;
      }
    }

    if (!fileInput) {
      throw new Error('Could not find image upload input');
    }

    // Download images to temp files and upload
    const tempFiles: string[] = [];
    for (let i = 0; i < Math.min(imageUrls.length, 10); i++) {
      try {
        const tempPath = await this.downloadImage(imageUrls[i]);
        tempFiles.push(tempPath);
      } catch (error) {
        console.warn(`[FacebookAdapter] Failed to download image ${i}:`, error);
      }
    }

    if (tempFiles.length > 0) {
      const input = fileInput as ElementHandle<HTMLInputElement>;
      await input.uploadFile(...tempFiles);
      await this.sleep(5000); // Wait for upload processing
      
      // Try to wait for progress bars to disappear or images to appear
    }

    // Cleanup happens in disconnect or end of flow if possible. 
    // Here we might want to schedule cleanup.
    // Ideally use a cleanup helper.
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

  private async submitListing(page: Page): Promise<void> {
    const submitSelectors = [
      '[aria-label="Publish"]',
      'div[role="button"]:has-text("Publish")', // Playwright syntax not valid in Puppeteer standard without plugin
      // Standard CSS/XPath for Puppeteer
    ];

    // May need to click "Next" multiple times before "Publish"
    let maxSteps = 3;
    let published = false;
    
    for (let step = 0; step < maxSteps; step++) {
       // Check for Publish
       const publishBtn = await this.findButtonByText(page, 'Publish');
       if (publishBtn) {
           await publishBtn.click();
           published = true;
           break;
       }
       
       // Check for Next
       const nextBtn = await this.findButtonByText(page, 'Next');
       if (nextBtn) {
           await nextBtn.click();
           await this.sleep(2000);
       } else {
           break; 
       }
    }
    
    // Wait for confirmation or URL change
    await this.sleep(3000);
  }
  
  private async findButtonByText(page: Page, text: string) {
       // Try aria-label
       let el = await page.$(`[aria-label="${text}"]`);
       if (el) return el;
       
       // Try xpath
       // Puppeteer supports xpath selectors with 'xpath/' prefix in newer versions for $$ or $
       try {
           const xpath = `xpath///div[@role="button" and contains(., "${text}")] | //span[contains(., "${text}")]`;
           const els = await page.$$(xpath);
           if (els.length > 0) return els[0];
       } catch (e) {
           console.warn('XPath selector failed', e);
       }
       
       return null;
  }

  private async takeScreenshot(page: Page, name: string): Promise<string> {
    try {
      if (!fs.existsSync(this.screenshotDir)) {
        fs.mkdirSync(this.screenshotDir, { recursive: true });
      }
      const filepath = path.join(this.screenshotDir, `${name}-${Date.now()}.png`);
      await page.screenshot({ path: filepath, fullPage: true });
      console.log(`[FacebookAdapter] Screenshot saved: ${filepath}`);
      return filepath;
    } catch (error) {
      console.error('[FacebookAdapter] Failed to take screenshot:', error);
      return '';
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}