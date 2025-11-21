#!/bin/bash

# 1. Login
echo "Logging in..."
LOGIN_RES=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "testuser_1763748538@example.com", "password": "password123"}')

TOKEN=$(echo $LOGIN_RES | grep -o '"access_token":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Login failed. Response: $LOGIN_RES"
  exit 1
fi
echo "Token acquired: ${TOKEN:0:10}..."

# 2. Create Listing
echo "Creating listing..."
LISTING_RES=$(curl -s -X POST http://localhost:3000/api/listings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Automated Test Listing",
    "price": 50,
    "category": "Electronics",
    "condition": "good",
    "description": "Testing job queue.",
    "location_lat": 37.7749,
    "location_lng": -122.4194,
    "location_address": "San Francisco, CA"
  }')

LISTING_ID=$(echo $LISTING_RES | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$LISTING_ID" ]; then
  echo "Listing creation failed. Response: $LISTING_RES"
  exit 1
fi
echo "Listing ID: $LISTING_ID"

# 3. Publish to Queue
echo "Publishing to Facebook and Craigslist..."
PUBLISH_RES=$(curl -s -X POST http://localhost:3000/api/postings/publish \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"listingId\": \"$LISTING_ID\", \"platforms\": [\"facebook\", \"craigslist\"]}")

echo "Publish Response: $PUBLISH_RES"

# 4. Wait for Processor
echo "Waiting 12 seconds for processor..."
sleep 12

# 5. Check Status
echo "Checking status..."
curl -s -X GET http://localhost:3000/api/postings/status/$LISTING_ID \
  -H "Authorization: Bearer $TOKEN"