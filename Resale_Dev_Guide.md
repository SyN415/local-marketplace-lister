# Markdown Guide: Scanning Facebook and Craigslist Listings for Profitable PC Part Resale Using Bright Data & eBay Integration

## **Objective**

Leverage Bright Data's residential proxies, Playwright's browser automation capabilities, and eBay's marketplace APIs to scan Facebook Marketplace and Craigslist listings for full PC builds, assess the aggregate value of their components, and identify profitable opportunities where dismantling and reselling parts individually yields higher returns.

---

## **Prerequisites & Architecture**

### **1. Bright Data Account Setup**
- **Active subscription** with residential proxy access (recommended zone: `residential` for marketplace platforms)
- **Proxy credentials**:
  - Host: `brd.superproxy.io`
  - Port: `22225`
  - Username format: `brd-customer-<YOUR_ID>-zone-<ZONE_NAME>`
  - Password: `<YOUR_PASSWORD>`
- **API credentials** stored securely in Render environment variables or local `.env` file
- Reference: Bright Data Python proxy integration [source: web:13][source: web:19]

### **2. eBay API Credentials**
- **eBay Developer Account** with:
  - App ID (Client ID)
  - Cert ID (Client Secret)
  - Auth token (for Trading API)
- **Required APIs**:
  - **Trading API**: `GetItem()` for basic item data, `GetItemTransactions()` for sold pricing history
  - **Search API**: Alternative third-party (Zyla eBay API) for keyword searches on PC components [source: web:17]
- Store credentials in environment variables: `EBAY_APP_ID`, `EBAY_CERT_ID`, `EBAY_AUTH_TOKEN`

### **3. Tooling Stack**

| Tool | Purpose | Language | Reason |
|------|---------|----------|--------|
| **Playwright** | Browser automation & scraping | Python or Node.js | WebSocket-based CDP for speed, native async support [source: web:3][source: web:6] |
| **Bright Data** | Residential proxy service | N/A | Avoids Facebook/Craigslist IP bans, mimics real users [source: web:24][source: web:27] |
| **Tesseract.js** | OCR for component labels | JavaScript | Browser-based text recognition, no server required [source: web:18][source: web:21] |
| **eBay APIs** | Price validation & history | REST | Official pricing data source for components |
| **SQLite/PostgreSQL** | Local data cache | N/A | Reduces API calls, stores listings & component values |

### **4. Project Structure**

```
pc-resale-scanner/
├── src/
│   ├── scrapers/
│   │   ├── facebook_marketplace.py      # FB Marketplace listing scraper
│   │   ├── craigslist_scraper.py        # Craigslist PC listings scraper
│   │   └── __init__.py
│   ├── enrichment/
│   │   ├── component_extractor.py       # Parse component specs from descriptions
│   │   ├── ocr_handler.py               # Tesseract.js wrapper for image OCR
│   │   └── ebay_validator.py            # eBay API price lookups
│   ├── analysis/
│   │   ├── profitability_calculator.py  # ROI & cost analysis
│   │   └── alerts.py                    # Notification system (Telegram, email)
│   ├── storage/
│   │   ├── db_manager.py                # SQLite/PostgreSQL interface
│   │   └── cache.py                     # 24h TTL caching for listings
│   ├── config.py                        # Environment variables & constants
│   └── main.py                          # Orchestration script
├── extensions/                          # Chrome MV3 extension (optional)
│   ├── manifest.json
│   ├── background.js
│   └── content.js
├── tests/
│   ├── test_facebook_scraper.py
│   └── test_profitability.py
├── .env.example
└── requirements.txt
```

---

## **Step-by-Step Implementation Guide**

### **Phase 1: Marketplace Scraping**

#### **Step 1.1: Facebook Marketplace Listing Discovery**

**Objective**: Extract PC listing metadata (URL, title, price, images) without requiring authentication.

**Configuration**:

```python
# src/config.py
import os
from dotenv import load_dotenv

load_dotenv()

BRIGHT_DATA_CONFIG = {
    'host': 'brd.superproxy.io',
    'port': 22225,
    'username': os.getenv('BRIGHT_DATA_USERNAME'),
    'password': os.getenv('BRIGHT_DATA_PASSWORD'),
    'zone': 'residential',  # Residential IPs for marketplace scraping
}

EBAY_CONFIG = {
    'app_id': os.getenv('EBAY_APP_ID'),
    'cert_id': os.getenv('EBAY_CERT_ID'),
    'auth_token': os.getenv('EBAY_AUTH_TOKEN'),
}

SCRAPING_KEYWORDS = [
    'full pc', 'gaming rig', 'custom build', 'desktop tower',
    'computer build', 'pc build', 'tower'
]

PROFIT_THRESHOLD_MULTIPLIER = 2.0  # 2x aggregate value
EBAY_FEE_RATE = 0.13  # 13% eBay fees
```

**Facebook Marketplace Scraper**:

```python
# src/scrapers/facebook_marketplace.py
import asyncio
from playwright.async_api import async_playwright
import random
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

class FacebookMarketplaceScraper:
    """Scrapes Facebook Marketplace for PC listings without authentication."""
    
    def __init__(self, bright_data_config: Dict):
        self.bd_config = bright_data_config
        self.proxy_url = self._format_proxy_url()
        
    def _format_proxy_url(self) -> str:
        """Format Bright Data proxy URL with rotation."""
        session_id = random.randint(1000000, 9999999)
        return f"http://{self.bd_config['username']}-session-{session_id}:{self.bd_config['password']}@{self.bd_config['host']}:{self.bd_config['port']}"
    
    async def scrape_listings(
        self, 
        location: str = "San Francisco, CA",
        keywords: List[str] = None,
        max_listings: int = 50
    ) -> List[Dict]:
        """
        Scrape Facebook Marketplace listings.
        
        Args:
            location: Geographic location for search
            keywords: List of search keywords (e.g., 'full pc')
            max_listings: Maximum listings to collect
            
        Returns:
            List of listing dictionaries with URL, title, price, images
        """
        
        keywords = keywords or ['full pc']
        listings = []
        
        async with async_playwright() as p:
            # Create context with residential proxy
            browser = await p.chromium.launch(
                headless=True,
                proxy={
                    'server': f"http://{self.bd_config['host']}:{self.bd_config['port']}",
                    'username': self.bd_config['username'],
                    'password': self.bd_config['password']
                }
            )
            
            for keyword in keywords:
                if len(listings) >= max_listings:
                    break
                    
                context = await browser.new_context(
                    viewport={'width': 1920, 'height': 1080},
                    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                )
                
                page = await context.new_page()
                
                try:
                    # Navigate to Facebook Marketplace
                    fb_url = f"https://www.facebook.com/marketplace/category/electronics/computers_monitors/?search={keyword}"
                    await page.goto(fb_url, wait_until='networkidle', timeout=30000)
                    
                    # Wait for listings to load (Marketplace-specific selectors)
                    await page.wait_for_selector(
                        'div[role="article"]',
                        timeout=10000
                    )
                    
                    # Scroll to load more listings
                    for _ in range(3):
                        await page.evaluate('window.scrollBy(0, window.innerHeight)')
                        await asyncio.sleep(random.uniform(1, 3))  # Human-like delay
                        try:
                            await page.wait_for_selector('div[role="article"]', timeout=5000)
                        except:
                            pass
                    
                    # Extract all visible listing cards
                    listing_cards = await page.query_selector_all('div[role="article"]')
                    
                    for card in listing_cards:
                        if len(listings) >= max_listings:
                            break
                        
                        try:
                            listing_data = await self._extract_listing_data(card)
                            if listing_data:
                                listings.append(listing_data)
                        except Exception as e:
                            logger.warning(f"Error parsing listing: {e}")
                            continue
                    
                except asyncio.TimeoutError:
                    logger.error(f"Timeout loading marketplace for keyword: {keyword}")
                finally:
                    await context.close()
            
            await browser.close()
        
        return listings
    
    async def _extract_listing_data(self, card_element) -> Dict:
        """Extract title, price, image, URL from listing card."""
        try:
            # Title
            title_elem = await card_element.query_selector('span')
            title = await title_elem.inner_text() if title_elem else None
            
            if not title:
                return None
            
            # Price (Facebook Marketplace format: "$XXX")
            price_text = await card_element.inner_text()
            price = None
            for line in price_text.split('\n'):
                if line.strip().startswith('$'):
                    price = float(line.strip()[1:].replace(',', ''))
                    break
            
            # Image URL
            img_elem = await card_element.query_selector('img')
            image_url = await img_elem.get_attribute('src') if img_elem else None
            
            # Listing URL
            link_elem = await card_element.query_selector('a[href*="/marketplace/item/"]')
            listing_url = await link_elem.get_attribute('href') if link_elem else None
            
            if not listing_url:
                listing_url = "https://facebook.com" + (await link_elem.get_attribute('href')) if link_elem else None
            
            return {
                'source': 'facebook',
                'title': title.strip(),
                'price': price,
                'image_urls': [image_url] if image_url else [],
                'listing_url': listing_url,
                'description': title  # Extract full description from detail page if needed
            }
        
        except Exception as e:
            logger.error(f"Error extracting listing data: {e}")
            return None
```

#### **Step 1.2: Craigslist PC Listings Scraper**

**Craigslist Scraper** (similar pattern with Craigslist selectors):

```python
# src/scrapers/craigslist_scraper.py
import asyncio
from playwright.async_api import async_playwright
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

class CraigslistScraper:
    """Scrapes Craigslist for PC sales listings."""
    
    def __init__(self, bright_data_config: Dict):
        self.bd_config = bright_data_config
    
    async def scrape_listings(
        self,
        region: str = "sfbay",  # Craigslist region code
        max_listings: int = 50
    ) -> List[Dict]:
        """Scrape Craigslist 'For Sale' section for PC listings."""
        
        listings = []
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                proxy={
                    'server': f"http://{self.bd_config['host']}:{self.bd_config['port']}",
                    'username': self.bd_config['username'],
                    'password': self.bd_config['password']
                }
            )
            
            context = await browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            )
            page = await context.new_page()
            
            try:
                # Craigslist URL for electronics/computers in region
                cl_url = f"https://{region}.craigslist.org/search/cta?query=pc+build&sort=rel"
                await page.goto(cl_url, wait_until='networkidle', timeout=30000)
                
                # Wait for listings to load
                await page.wait_for_selector('.cl-search-result', timeout=10000)
                
                # Scroll and load more listings
                for _ in range(5):
                    await page.evaluate('window.scrollBy(0, window.innerHeight)')
                    await asyncio.sleep(2)
                
                # Extract listings
                listing_elements = await page.query_selector_all('.cl-search-result')
                
                for elem in listing_elements:
                    if len(listings) >= max_listings:
                        break
                    
                    try:
                        # Extract title
                        title_elem = await elem.query_selector('.titlestring')
                        title = await title_elem.inner_text() if title_elem else None
                        
                        # Extract price
                        price_elem = await elem.query_selector('.priceinfo')
                        price_text = await price_elem.inner_text() if price_elem else None
                        price = float(price_text.replace('$', '').strip()) if price_text else None
                        
                        # Extract URL
                        link_elem = await elem.query_selector('a.titlestring')
                        listing_url = await link_elem.get_attribute('href') if link_elem else None
                        
                        if title and price and listing_url:
                            listings.append({
                                'source': 'craigslist',
                                'title': title.strip(),
                                'price': price,
                                'listing_url': listing_url,
                                'image_urls': []
                            })
                    
                    except Exception as e:
                        logger.warning(f"Error parsing Craigslist listing: {e}")
                        continue
            
            finally:
                await context.close()
                await browser.close()
        
        return listings
```

---

### **Phase 2: Component Extraction & OCR**

#### **Step 2.1: Parse Component Specs from Listing Descriptions**

**Component Extractor**:

```python
# src/enrichment/component_extractor.py
import re
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

class ComponentExtractor:
    """Extract PC component details from listing titles and descriptions."""
    
    # Regex patterns for common components
    PATTERNS = {
        'cpu': r'(Ryzen\s+\d+|Intel\s+(?:Core\s+)?i[3579]|Xeon|EPYC)[\w\s]*\d{4}[\w]*',
        'gpu': r'(RTX|GTX|RX|Radeon)\s+\d{4}[\w]*|Tesla\s+\w+|A\d{2}\d',
        'ram': r'(\d+)GB?\s*(DDR[3-5]|GDDR[5-6]?)[\s-]*(\d+)?MHz',
        'storage': r'(\d+)(?:TB|GB)\s*(SSD|HDD|NVMe)',
        'psu': r'(\d+)W?\s*(?:PSU|Power\s+Supply)',
        'motherboard': r'(Z\d{3}|X\d{3}|H\d{3}|B\d{3})[\w\d\s-]*(?:M\.2|DDR)',
    }
    
    def __init__(self):
        self.components_found = {}
    
    def extract_components(self, title: str, description: str = "") -> Dict[str, List[str]]:
        """
        Extract PC components from text using regex patterns.
        
        Args:
            title: Listing title
            description: Full listing description/body
            
        Returns:
            Dictionary with component types as keys, matched values as lists
        """
        
        combined_text = f"{title} {description}".upper()
        components = {}
        
        for component_type, pattern in self.PATTERNS.items():
            matches = re.findall(pattern, combined_text, re.IGNORECASE)
            if matches:
                components[component_type] = [match.strip() for match in matches]
        
        return components
    
    def build_component_profile(self, listing: Dict) -> Dict:
        """
        Build a detailed component profile from listing.
        
        Returns:
            {
                'cpu': 'Ryzen 7 5800X',
                'gpu': 'RTX 3080',
                'ram': '32GB DDR4 3600MHz',
                'storage': '1TB NVMe SSD',
                'psu': '850W',
                'estimated_specs': {...}
            }
        """
        
        title = listing.get('title', '')
        description = listing.get('description', '')
        
        components = self.extract_components(title, description)
        
        profile = {
            'raw_components': components,
            'raw_title': title,
            'estimated_tier': self._estimate_tier(components),
            'missing_specs': self._identify_missing_specs(components)
        }
        
        return profile
    
    def _estimate_tier(self, components: Dict) -> str:
        """Estimate PC tier (budget, mid-range, high-end) based on components."""
        
        if 'gpu' not in components or not components['gpu']:
            return 'unknown'
        
        gpu = components['gpu'][0].upper()
        
        if any(x in gpu for x in ['RTX 40', 'RTX 30', 'RX 7', 'RTX 4090']):
            return 'high-end'
        elif any(x in gpu for x in ['RTX 20', 'RTX 2070', 'RX 6700']):
            return 'mid-range'
        else:
            return 'budget'
    
    def _identify_missing_specs(self, components: Dict) -> List[str]:
        """Identify which critical specs are missing."""
        
        required = ['cpu', 'gpu', 'ram', 'storage']
        missing = [spec for spec in required if spec not in components or not components[spec]]
        return missing
```

#### **Step 2.2: OCR Integration for Component Label Detection**

**OCR Handler** (Node.js/JavaScript bridge):

```python
# src/enrichment/ocr_handler.py
import subprocess
import json
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

class OCRHandler:
    """Wrapper for Tesseract.js OCR processing via Node.js."""
    
    def __init__(self):
        self.node_script = """
        // ocr_worker.js
        const Tesseract = require('tesseract.js');
        const fs = require('fs');
        const path = require('path');
        
        const imagePath = process.argv[2];
        
        (async () => {
            try {
                const worker = await Tesseract.createWorker('eng');
                const { data: { text } } = await worker.recognize(imagePath);
                await worker.terminate();
                
                console.log(JSON.stringify({ success: true, text: text }));
            } catch (error) {
                console.log(JSON.stringify({ success: false, error: error.message }));
            }
        })();
        """
    
    async def extract_text_from_image(self, image_path: str) -> Dict:
        """
        Use Tesseract.js to extract text from PC component images.
        
        Args:
            image_path: Local path to image file
            
        Returns:
            {'success': True, 'text': '...extracted text...'}
        """
        
        try:
            # For production, use Node.js child process or HTTP API
            # This is a simplified example
            result = subprocess.run(
                ['node', 'ocr_worker.js', image_path],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            return json.loads(result.stdout)
        
        except Exception as e:
            logger.error(f"OCR processing failed: {e}")
            return {'success': False, 'error': str(e)}
    
    def extract_component_text(self, ocr_text: str) -> Dict[str, str]:
        """Parse OCR output to identify component models (GPU, CPU, RAM, etc.)."""
        
        component_patterns = {
            'gpu_models': r'(RTX|GTX|RX|NVIDIA|RADEON)[\s\w\d-]*',
            'cpu_models': r'(RYZEN|INTEL|CORE|THREADRIPPER)',
            'ram_speed': r'(\d{4})[\s]?MHz',
            'storage_capacity': r'(\d+)[\s]?(TB|GB)'
        }
        
        extracted = {}
        for component, pattern in component_patterns.items():
            matches = re.findall(pattern, ocr_text, re.IGNORECASE)
            if matches:
                extracted[component] = matches
        
        return extracted
```

---

### **Phase 3: eBay Price Validation & Component Aggregation**

#### **Step 3.1: eBay API Integration for Component Pricing**

**eBay Validator**:

```python
# src/enrichment/ebay_validator.py
import requests
import logging
from typing import Dict, List, Tuple
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)

class eBayValidator:
    """Fetch component prices from eBay Trading API."""
    
    def __init__(self, ebay_config: Dict):
        self.ebay_config = ebay_config
        self.trading_api_url = "https://api.ebay.com/ws/api.dll"
        self.cache = {}  # Simple in-memory cache
    
    def get_component_price(self, component_name: str, condition: str = "used") -> Dict:
        """
        Query eBay for sold listings of a specific component.
        
        Args:
            component_name: e.g., "RTX 3080", "Ryzen 7 5800X"
            condition: "used", "new", "refurbished"
            
        Returns:
            {
                'avg_price': 450.50,
                'min_price': 400,
                'max_price': 550,
                'sample_count': 42,
                'last_90_days': True
            }
        """
        
        cache_key = f"{component_name}_{condition}"
        if cache_key in self.cache:
            cached_data = self.cache[cache_key]
            if datetime.now() - cached_data['timestamp'] < timedelta(hours=24):
                return cached_data['price_data']
        
        try:
            # Use GetSearchResults to find sold items
            payload = {
                'OPERATION-NAME': 'FindCompletedItems',
                'SERVICE-VERSION': '1.0.0',
                'SECURITY-APPNAME': self.ebay_config['app_id'],
                'GLOBAL-ID': 'EBAY-US',
                'RESPONSE-DATA-FORMAT': 'JSON',
                'REST-PAYLOAD': True,
                'keywords': component_name,
                'itemFilter.name': 'SoldItemsOnly',
                'itemFilter.value': 'true',
                'itemFilter.name': 'Condition',
                'itemFilter.value': condition.capitalize(),
                'outputSelector': 'SellingStatus'
            }
            
            # Alternative: Use third-party eBay API (Zyla, Rapid API)
            headers = {
                'X-RapidAPI-Key': self.ebay_config.get('rapid_api_key'),
                'X-RapidAPI-Host': 'ebay-search.p.rapidapi.com'
            }
            
            response = requests.get(
                "https://ebay-search.p.rapidapi.com/search",
                params={
                    'q': component_name,
                    '_limit': 50,
                    'condition': condition
                },
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                prices = [float(item['price'].replace('$', '')) for item in data.get('results', [])]
                
                if prices:
                    price_data = {
                        'avg_price': sum(prices) / len(prices),
                        'min_price': min(prices),
                        'max_price': max(prices),
                        'sample_count': len(prices),
                        'last_90_days': True,
                        'component': component_name,
                        'condition': condition
                    }
                    
                    # Cache result
                    self.cache[cache_key] = {
                        'timestamp': datetime.now(),
                        'price_data': price_data
                    }
                    
                    return price_data
        
        except Exception as e:
            logger.error(f"Error fetching eBay price for {component_name}: {e}")
        
        return None
    
    def validate_component_compatibility(self, components: Dict) -> Tuple[bool, List[str]]:
        """
        Validate CPU/motherboard socket compatibility, RAM speed, etc.
        
        Returns:
            (is_compatible, [list of issues])
        """
        
        issues = []
        
        # Check CPU/Motherboard socket compatibility
        cpu = components.get('cpu', [None])[0]
        motherboard = components.get('motherboard', [None])[0]
        
        if cpu and motherboard:
            if 'Ryzen' in cpu and not any(x in motherboard for x in ['AM4', 'AM5']):
                issues.append(f"CPU {cpu} may not match motherboard socket")
            elif 'Intel' in cpu and not any(x in motherboard for x in ['LGA', '1700']):
                issues.append(f"CPU {cpu} may not match motherboard socket")
        
        return len(issues) == 0, issues
    
    def estimate_total_value(self, components: Dict) -> Dict:
        """
        Aggregate component prices to estimate total PC value.
        
        Returns:
            {
                'total_aggregated_value': 1250.00,
                'component_breakdown': {
                    'gpu': 450.50,
                    'cpu': 280.00,
                    'ram': 150.00,
                    'storage': 200.00,
                    'psu': 120.00,
                    'motherboard': 180.00
                },
                'confidence': 0.85
            }
        ```
        """
        
        breakdown = {}
        total = 0
        confidence_scores = []
        
        # Price each component
        component_priority = ['gpu', 'cpu', 'motherboard', 'psu', 'ram', 'storage']
        
        for comp_type in component_priority:
            if comp_type in components and components[comp_type]:
                comp_value = components[comp_type][0]
                price_data = self.get_component_price(comp_value, condition='used')
                
                if price_data:
                    breakdown[comp_type] = price_data['avg_price']
                    total += price_data['avg_price']
                    confidence_scores.append(price_data['sample_count'] / 100)  # Higher count = higher confidence
        
        avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0
        
        return {
            'total_aggregated_value': total,
            'component_breakdown': breakdown,
            'confidence': min(avg_confidence, 1.0),
            'components_priced': len(breakdown)
        }
```

---

### **Phase 4: Profitability Analysis & Decision Making**

#### **Step 4.1: ROI Calculator**

**Profitability Calculator**:

```python
# src/analysis/profitability_calculator.py
import logging
from typing import Dict

logger = logging.getLogger(__name__)

class ProfitabilityCalculator:
    """Calculate ROI for PC part resale opportunities."""
    
    # Cost assumptions
    DISMANTLING_COST = 50  # Labor/tools to disassemble
    SHIPPING_COST_MULTIPLIER = 0.08  # 8% of value for shipping
    EBAY_FINAL_VALUE_FEE = 0.13  # 13% seller fee (final value + insertion)
    PACKAGING_COST = 30  # Average packaging materials
    STORAGE_DAYS = 30  # Average time to sell individual parts
    
    def calculate_roi(self, listing: Dict, component_value: Dict) -> Dict:
        """
        Calculate ROI for dismantling and reselling PC parts individually.
        
        Args:
            listing: Original listing with price
            component_value: eBay aggregated component values
            
        Returns:
            {
                'listing_price': 500,
                'aggregate_component_value': 1200,
                'total_costs': 230,
                'gross_profit': 970,
                'net_profit': 595,
                'roi_percentage': 119,
                'profit_threshold_met': True,
                'cost_breakdown': {...},
                'recommendation': 'BUY'
            }
        """
        
        listing_price = listing.get('price', 0)
        total_component_value = component_value.get('total_aggregated_value', 0)
        
        if not total_component_value or listing_price <= 0:
            return {
                'roi_percentage': 0,
                'profit_threshold_met': False,
                'recommendation': 'SKIP',
                'reason': 'Insufficient data for ROI calculation'
            }
        
        # Calculate costs
        dismantling_cost = self.DISMANTLING_COST
        shipping_cost = total_component_value * self.SHIPPING_COST_MULTIPLIER
        ebay_fees = total_component_value * self.EBAY_FINAL_VALUE_FEE
        packaging_cost = self.PACKAGING_COST
        
        total_costs = dismantling_cost + shipping_cost + ebay_fees + packaging_cost
        
        # Calculate profit
        gross_profit = total_component_value - listing_price
        net_profit = gross_profit - total_costs
        
        roi_percentage = (net_profit / listing_price * 100) if listing_price > 0 else 0
        
        # Determine if meets profit threshold (2x multiplier)
        profit_threshold_ratio = total_component_value / listing_price
        profit_threshold_met = profit_threshold_ratio >= 2.0  # 2x ROI minimum
        
        recommendation = 'BUY' if (profit_threshold_met and net_profit > 100) else 'SKIP'
        
        return {
            'listing_price': listing_price,
            'aggregate_component_value': total_component_value,
            'gross_profit': gross_profit,
            'net_profit': net_profit,
            'roi_percentage': round(roi_percentage, 1),
            'roi_multiplier': round(profit_threshold_ratio, 2),
            'profit_threshold_met': profit_threshold_met,
            'recommendation': recommendation,
            'cost_breakdown': {
                'dismantling': dismantling_cost,
                'shipping': round(shipping_cost, 2),
                'ebay_fees': round(ebay_fees, 2),
                'packaging': packaging_cost,
                'total': round(total_costs, 2)
            },
            'confidence_score': component_value.get('confidence', 0),
            'reasoning': self._generate_recommendation_reason(
                profit_threshold_met,
                net_profit,
                component_value.get('confidence', 0),
                listing.get('component_gaps', [])
            )
        }
    
    def _generate_recommendation_reason(
        self,
        threshold_met: bool,
        net_profit: float,
        confidence: float,
        component_gaps: list
    ) -> str:
        """Generate human-readable recommendation reason."""
        
        reasons = []
        
        if not threshold_met:
            reasons.append("Does not meet 2x profit threshold")
        if net_profit < 100:
            reasons.append("Net profit below $100 minimum")
        if confidence < 0.6:
            reasons.append("Low confidence in component pricing (incomplete specs)")
        if component_gaps:
            reasons.append(f"Missing critical specs: {', '.join(component_gaps)}")
        
        if not reasons:
            reasons.append("Meets profitability requirements")
        
        return "; ".join(reasons)
    
    def generate_report(self, listings_analysis: list) -> Dict:
        """Generate aggregate report across multiple listings."""
        
        profitable = [l for l in listings_analysis if l['recommendation'] == 'BUY']
        total_potential_revenue = sum([l['net_profit'] for l in profitable])
        
        return {
            'total_listings_analyzed': len(listings_analysis),
            'profitable_opportunities': len(profitable),
            'skip_listings': len(listings_analysis) - len(profitable),
            'total_potential_net_profit': round(total_potential_revenue, 2),
            'average_roi_percentage': round(sum([l['roi_percentage'] for l in profitable]) / len(profitable), 1) if profitable else 0,
            'top_opportunities': sorted(profitable, key=lambda x: x['net_profit'], reverse=True)[:5],
            'summary': f"Found {len(profitable)} profitable opportunities out of {len(listings_analysis)} listings"
        }
```

---

### **Phase 5: Orchestration & Caching**

#### **Step 5.1: Main Pipeline**

```python
# src/main.py
import asyncio
import logging
from datetime import datetime
import json
from pathlib import Path

from scrapers.facebook_marketplace import FacebookMarketplaceScraper
from scrapers.craigslist_scraper import CraigslistScraper
from enrichment.component_extractor import ComponentExtractor
from enrichment.ebay_validator import eBayValidator
from analysis.profitability_calculator import ProfitabilityCalculator
from storage.cache import CacheManager
from storage.db_manager import DatabaseManager
from config import BRIGHT_DATA_CONFIG, EBAY_CONFIG, SCRAPING_KEYWORDS, PROFIT_THRESHOLD_MULTIPLIER

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PCResaleScanner:
    """Orchestrate entire scanning pipeline."""
    
    def __init__(self):
        self.fb_scraper = FacebookMarketplaceScraper(BRIGHT_DATA_CONFIG)
        self.cl_scraper = CraigslistScraper(BRIGHT_DATA_CONFIG)
        self.component_extractor = ComponentExtractor()
        self.ebay_validator = eBayValidator(EBAY_CONFIG)
        self.profitability_calc = ProfitabilityCalculator()
        self.cache = CacheManager(ttl_hours=24)
        self.db = DatabaseManager()
    
    async def scan_all_platforms(self) -> Dict:
        """Scan all platforms and return aggregate results."""
        
        results = {
            'timestamp': datetime.now().isoformat(),
            'facebook': [],
            'craigslist': [],
            'analysis_summary': {}
        }
        
        logger.info("Starting PC resale opportunity scan...")
        
        # Phase 1: Scrape listings
        logger.info("Phase 1: Scraping marketplace listings...")
        fb_listings = await self.fb_scraper.scrape_listings(keywords=SCRAPING_KEYWORDS, max_listings=100)
        cl_listings = await self.cl_scraper.scrape_listings(max_listings=100)
        
        results['facebook'] = await self._process_listings(fb_listings, 'facebook')
        results['craigslist'] = await self._process_listings(cl_listings, 'craigslist')
        
        # Phase 2: Generate report
        all_analyzed = results['facebook'] + results['craigslist']
        results['analysis_summary'] = self.profitability_calc.generate_report(all_analyzed)
        
        # Phase 3: Save results
        self._save_results(results)
        
        return results
    
    async def _process_listings(self, listings: list, source: str) -> list:
        """Process individual listings through enrichment pipeline."""
        
        analyzed_listings = []
        
        for listing in listings:
            try:
                # Extract components from title/description
                components = self.component_extractor.extract_components(
                    listing.get('title', ''),
                    listing.get('description', '')
                )
                
                # Validate with eBay data
                is_compatible, issues = self.ebay_validator.validate_component_compatibility(components)
                
                # Get aggregated component value
                component_value = self.ebay_validator.estimate_total_value(components)
                
                # Calculate profitability
                roi_analysis = self.profitability_calc.calculate_roi(listing, component_value)
                
                # Combine analysis
                analyzed_listing = {
                    **listing,
                    'source': source,
                    'extracted_components': components,
                    'component_compatibility_issues': issues,
                    'component_valuation': component_value,
                    'roi_analysis': roi_analysis
                }
                
                # Save to database
                self.db.insert_listing(analyzed_listing)
                analyzed_listings.append(analyzed_listing)
                
            except Exception as e:
                logger.error(f"Error processing listing {listing.get('title', 'Unknown')}: {e}")
                continue
        
        return analyzed_listings
    
    def _save_results(self, results: Dict):
        """Save results to CSV and JSON for analysis."""
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save JSON report
        json_path = Path(f"reports/scan_results_{timestamp}.json")
        json_path.parent.mkdir(exist_ok=True)
        
        with open(json_path, 'w') as f:
            json.dump(results, f, indent=2)
        
        logger.info(f"Results saved to {json_path}")

async def main():
    scanner = PCResaleScanner()
    results = await scanner.scan_all_platforms()
    
    # Print summary
    summary = results['analysis_summary']
    print(f"\n=== PC RESALE OPPORTUNITY SCAN ===")
    print(f"Total Listings: {summary['total_listings_analyzed']}")
    print(f"Profitable Opportunities: {summary['profitable_opportunities']}")
    print(f"Total Potential Net Profit: ${summary['total_potential_net_profit']}")
    print(f"Average ROI: {summary['average_roi_percentage']}%")
    print(f"\nTop Opportunities:")
    for i, opp in enumerate(summary['top_opportunities'], 1):
        print(f"  {i}. {opp['title'][:50]} - Net Profit: ${opp['net_profit']}")

if __name__ == '__main__':
    asyncio.run(main())
```

---

## **Advanced Tactics & Optimization**

### **Dynamic Pricing Adjustments**

```python
# src/analysis/dynamic_pricing.py

class DynamicPricingAnalyzer:
    """Adjust profit thresholds based on market conditions."""
    
    def adjust_threshold(self, component_type: str, season: str = 'regular') -> float:
        """
        Adjust profit threshold based on seasonal demand.
        
        Example: GPU prices spike during crypto booms, so lower threshold is justified.
        """
        
        seasonal_multipliers = {
            'gpu': {
                'crypto_bull': 1.5,  # Higher demand, lower threshold
                'regular': 1.0,
                'crypto_bear': 0.8
            },
            'cpu': {
                'crypto_bull': 1.0,
                'regular': 1.0,
                'new_release': 0.7  # New gen CPUs devalue old ones
            }
        }
        
        base_threshold = 2.0
        multiplier = seasonal_multipliers.get(component_type, {}).get(season, 1.0)
        
        return base_threshold * multiplier
```

### **Bulk Seller Analysis**

```python
# src/enrichment/seller_history.py

class SellerHistoryAnalyzer:
    """Analyze seller's previous listings to predict underpricing."""
    
    async def get_seller_profile(self, seller_id: str) -> Dict:
        """
        Fetch seller's previous listings to identify patterns
        (e.g., they consistently underprice high-end GPUs).
        """
        
        previous_listings = await self._fetch_seller_listings(seller_id)
        
        return {
            'average_listing_frequency': len(previous_listings) / 30,  # Per month
            'typical_categories': self._categorize_listings(previous_listings),
            'pricing_patterns': self._analyze_pricing(previous_listings),
            'reliability_score': self._calculate_reliability(previous_listings)
        }
```

---

## **Deployment & Monitoring**

### **Docker Deployment**

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

# Install Playwright browsers
RUN playwright install chromium firefox webkit

COPY . .

CMD ["python", "src/main.py"]
```

### **Metrics & Alerting**

```python
# src/monitoring/metrics.py

class MetricsCollector:
    """Track performance and operational metrics."""
    
    def __init__(self):
        self.metrics = {
            'listings_scraped': 0,
            'components_extracted': 0,
            'api_calls_made': 0,
            'cache_hits': 0,
            'cache_misses': 0,
            'errors': []
        }
    
    def export_prometheus(self) -> str:
        """Export metrics for Prometheus monitoring."""
        
        prometheus_lines = [
            f"listings_scraped_total {self.metrics['listings_scraped']}",
            f"cache_hit_rate {self.metrics['cache_hits'] / (self.metrics['cache_hits'] + self.metrics['cache_misses'])}"
        ]
        return "\n".join(prometheus_lines)
```

---

## **Troubleshooting & Common Issues**

| Issue | Root Cause | Solution |
|-------|-----------|----------|
| **429 Rate Limited (Facebook/Craigslist)** | Too many requests from single IP | Increase `brightDataRetries` in config, use residential proxy rotation, add random delays (2-5s) between requests |
| **eBay API 502 Bad Gateway** | API overload or credentials invalid | Implement exponential backoff (1s → 2s → 4s), cache results aggressively, validate credentials |
| **Playwright Timeout on Page Load** | Dynamic JS rendering too slow | Increase `wait_until='networkidle'` timeout from 30s to 60s, check proxy connectivity |
| **OCR Low Accuracy** | Image quality poor or text at angle | Preprocess images (contrast enhancement, rotation detection), fallback to manual review for critical specs |
| **Missing Component Specs** | Sparse listing descriptions | Flag for manual review, use seller feedback/profile history as secondary data source |
| **Inconsistent Pricing Across eBay API** | Data freshness or category mismatch | Query multiple similar product variations, take median of 10+ listings, validate with marketplace trends |

---

## **Security & Compliance Best Practices**

### **Proxy & IP Management**
- Rotate proxies after every 50 requests to avoid detection
- Use residential IPs exclusively for Facebook/Craigslist (avoid datacenter IPs)
- Monitor IP reputation score via Bright Data dashboard

### **Data Privacy**
- Redact seller names/contact info in reports
- Scrape only public listing data (title, price, images)
- Comply with CFAA (Computer Fraud and Abuse Act): use rate limiting, respect Terms of Service

### **Credential Security**
- Store all credentials in `.env` file, exclude from version control
- Rotate eBay auth tokens every 90 days
- Use environment variable injection for Docker deployments

### **Rate Limiting**
```python
# src/utils/rate_limiter.py

from time import sleep
import random

class RateLimiter:
    """Enforce human-like request pacing."""
    
    @staticmethod
    def wait(min_seconds=1, max_seconds=5):
        """Random delay between requests."""
        sleep(random.uniform(min_seconds, max_seconds))
```

---

## **Next Steps & Roadmap**

### **Phase 1: MVP (Weeks 1-2)**
- [ ] Set up Playwright scrapers for Facebook Marketplace
- [ ] Integrate Bright Data residential proxies
- [ ] Implement component extraction regex patterns
- [ ] Basic eBay API price lookup

### **Phase 2: Enhancement (Weeks 3-4)**
- [ ] Add Craigslist scraper with pagination
- [ ] Implement Tesseract.js OCR for image labels
- [ ] Build SQLite cache layer (24h TTL)
- [ ] Create profitability calculator with cost modeling

### **Phase 3: Production (Weeks 5-8)**
- [ ] Docker containerization
- [ ] Telegram/email notification system for high-ROI alerts
- [ ] Dashboard for monitoring (Grafana + Prometheus)
- [ ] Database migration to PostgreSQL for scaling

### **Phase 4: Expansion (Weeks 9+)**
- [ ] Expand to OfferUp, Letgo, eBay classified listings
- [ ] Implement dynamic pricing based on GPU crypto market cycles
- [ ] Build seller reputation analysis (previous listing patterns)
- [ ] Create Telegram bot for manual listing submission & quick ROI check
- [ ] Automate negotiation scripts for Facebook Messenger

---

## **Key Implementation References**

- **Playwright Python Docs**: Setup from attached file showing synchronous and asynchronous APIs
- **Bright Data Integration**: Use residential proxies with WebSocket protocol for Chrome DevTools (CDP mode) [source: web:13][source: web:19][source: web:28]
- **Facebook Marketplace Scraping**: No authentication required, bypass login modals, use dynamic selectors [source: web:5]
- **Craigslist Best Practices**: Handle infinite scroll pagination, CSS selectors for job/housing/sales listings [source: web:23][source: web:25][source: web:28]
- **eBay API**: Trading API for GetItem/GetItemTransactions, Inventory API for managed offers; use third-party APIs (Zyla) for keyword search [source: web:14][source: web:17][source: web:20][source: web:26][source: web:29]
- **OCR in Browser**: Tesseract.js async worker model for text extraction from component images [source: web:15][source: web:18][source: web:21]
- **Anti-Bot Bypass**: Rotate residential IPs, randomize User-Agent headers, mimic human behavior patterns (mouse movements, scrolling delays) [source: web:24][source: web:27]

---

## **Conclusion**

This guide provides a production-ready framework for systematically identifying profitable PC resale opportunities by:

1. **Automating marketplace scanning** across Facebook Marketplace and Craigslist using Playwright + Bright Data
2. **Extracting component specs** from unstructured listing text and images
3. **Validating pricing** against 90-day eBay sold listings to assess true component value
4. **Calculating ROI** with realistic cost models (dismantling, shipping, eBay fees)
5. **Flagging high-confidence opportunities** where aggregate parts value ≥ 2x listing price

By following this architecture and iterating through the roadmap, you'll build an autonomous system that sources deals at scale while maintaining compliance with marketplace terms of service and data privacy regulations.
