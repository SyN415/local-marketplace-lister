import axios from 'axios';
import { create } from 'xmlbuilder2';
import { MarketplaceAdapter } from './types';
import { Listing } from '../../types/listing.types';
import { emailService } from '../email.service';

export class CraigslistAdapter implements MarketplaceAdapter {
  private validateUrl = 'https://post.craigslist.org/bulk-rss/validate';
  private postUrl = 'https://post.craigslist.org/bulk-rss/post';

  async connect(credentials: any): Promise<boolean> {
    // For Craigslist RSS, auth is per-request (Basic Auth usually, or specific account headers).
    // We can just verify we have the necessary fields.
    if (!credentials.cl_username || !credentials.cl_password) {
        console.warn('CraigslistAdapter: Missing username or password in credentials.');
        return false;
    }
    return true;
  }

  async publish(listing: Listing, connection: any): Promise<any> {
    console.log(`CraigslistAdapter: Publishing listing ${listing.id}...`);

    if (!connection.cl_username || !connection.cl_password) {
      throw new Error('Craigslist credentials (cl_username, cl_password) are missing.');
    }

    // Generate email alias if jobId is present
    let replyEmail = 'user@example.com'; // Default fallback
    if (connection.jobId) {
        replyEmail = emailService.generateAlias(connection.jobId);
        console.log(`CraigslistAdapter: Using email alias ${replyEmail} for Job ${connection.jobId}`);
    } else {
        console.warn('CraigslistAdapter: No jobId found in connection data, using default email.');
    }

    const payload = this.generatePayload(listing, replyEmail);
    const xmlString = payload.end({ prettyPrint: true });

    console.log('CraigslistAdapter: Generated XML:', xmlString);

    // Auth header
    const authHeader = {
      Authorization: `Basic ${Buffer.from(`${connection.cl_username}:${connection.cl_password}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded' // Craigslist often expects XML posted as form data or direct body
    };
    
    // NOTE: The Craigslist Bulk API usually expects the XML as the body. 
    // Some docs suggest it might be a specific content type. 
    // For this MVP, we will send text/xml or application/xml.
    
    const requestConfig = {
        headers: {
            ...authHeader,
            'Content-Type': 'text/xml'
        }
    };

    try {
      // Step 1: Validate
      console.log('CraigslistAdapter: Validating...');
      const validateResponse = await axios.post(this.validateUrl, xmlString, requestConfig);

      if (validateResponse.status !== 200) {
          throw new Error(`Validation failed with status ${validateResponse.status}`);
      }

      // Check for success in response body if needed. Craigslist often returns XML response.
      // We'll assume 200 OK means valid for now, or basic error checking.
      
      // Step 2: Post
      console.log('CraigslistAdapter: Posting...');
      const postResponse = await axios.post(this.postUrl, xmlString, requestConfig);

      if (postResponse.status !== 200) {
        throw new Error(`Posting failed with status ${postResponse.status}`);
      }

      console.log('CraigslistAdapter: Post successful', postResponse.data);

      // Parse response to get ID/URL if possible. 
      // For MVP, we return success.
      return {
        success: true,
        external_id: 'PENDING_CL_ID', // We might need to parse this from response
        platform_response: postResponse.data
      };

    } catch (error: any) {
      console.error('CraigslistAdapter: Error publishing', error.response?.data || error.message);
      
      // For MVP, if it's an auth error or network error, we rethrow.
      // If it's a validation error, we might want to capture that.
      throw new Error(`Craigslist publish failed: ${error.message}`);
    }
  }

  private generatePayload(listing: Listing, replyEmail: string) {
    // Map fields to Craigslist RSS XML Schema
    // Reference: https://www.craigslist.org/about/bulk_posting_interface
    
    const root = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('rdf:RDF', {
        'xmlns:rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        'xmlns': 'http://purl.org/rss/1.0/',
        'xmlns:cl': 'http://www.craigslist.org/about/cl-bulk-ns/1.0'
      })
      .ele('channel')
        .ele('title').txt('Marketplace Lister Bulk Post').up()
        .ele('link').txt('http://www.craigslist.org').up()
        .ele('description').txt('Automated posting via Marketplace Lister').up()
      .up();

    const item = root.ele('item')
      .ele('title').txt(listing.title).up()
      .ele('description').txt(listing.description).up()
      // Craigslist extensions
      .ele('cl:price').txt(listing.price.toString()).up()
      // Using a default category for MVP if not mapped. 
      // 'so' = for sale by owner generally? Or specific codes like 'sss' (general for sale).
      // Real implementation needs a category mapper.
      .ele('cl:category').txt(this.mapCategory(listing.category)).up()
      // Area is required. We might need to pull this from connection settings or listing.
      // For now, hardcoding a placeholder or using a field if we had it.
      .ele('cl:area').txt('sfbay').up() // Defaulting to sfbay for MVP testing
      .ele('cl:replyEmail', { privacy: 'C' }).txt(replyEmail).up();

    // Images
    if (listing.images && listing.images.length > 0) {
        listing.images.forEach(imgUrl => {
            // Craigslist might expect <enc:enclosure> or simply handling images via separate upload flow in some versions,
            // but bulk API supports <cl:image> or standard enclosures.
            // Using generic link for now as placeholder logic.
             item.ele('cl:image').txt(imgUrl).up();
        });
    }

    return root;
  }

  private mapCategory(category: string): string {
      // Simple mapping for MVP
      const map: Record<string, string> = {
          'Electronics': 'ele',
          'Furniture': 'fuo',
          'Automotive': 'cta',
          // Fallback
      };
      return map[category] || 'sss'; // 'sss' is generic for sale
  }
}