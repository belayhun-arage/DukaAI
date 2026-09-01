#!/bin/bash
# DukaAI Demo Data Seeding Script
# Run this after starting the API server: npm run dev:api

API_URL="${API_URL:-http://localhost:3001/api}"

echo "Creating demo shop..."
SHOP_RESPONSE=$(curl -s -X POST "$API_URL/shops" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Abebe Mini Market",
    "ownerTelegramId": "123456789",
    "ownerName": "Abebe Kebede"
  }')

SHOP_ID=$(echo $SHOP_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$SHOP_ID" ]; then
  echo "Failed to create shop:"
  echo $SHOP_RESPONSE
  exit 1
fi

echo "Shop created: $SHOP_ID"
echo ""

echo "Creating products..."
for product in \
  '{"name":"Teff Flour (25kg)","price":2500,"stockQty":50,"category":"Grains","variants":["White","Red"]}' \
  '{"name":"Sunflower Oil (3L)","price":450,"stockQty":30,"category":"Oils"}' \
  '{"name":"Sugar (50kg)","price":3500,"stockQty":20,"category":"Essentials"}' \
  '{"name":"iPhone Case","price":350,"stockQty":100,"variants":["Black","White","Blue","Red"]}' \
  '{"name":"Screen Protector","price":150,"stockQty":80}' \
  '{"name":"USB Cable","price":200,"stockQty":5,"lowStockThreshold":10}' \
  '{"name":"Power Bank","price":800,"stockQty":3,"lowStockThreshold":5}'
do
  curl -s -X POST "$API_URL/products" \
    -H "Content-Type: application/json" \
    -H "x-shop-id: $SHOP_ID" \
    -d "$product" > /dev/null
  echo -n "."
done
echo " Done!"

echo ""
echo "Creating customers..."
for customer in \
  '{"telegramId":"111111","name":"Tigist Haile","phone":"+251911111111"}' \
  '{"telegramId":"222222","name":"Dawit Assefa","phone":"+251922222222"}' \
  '{"telegramId":"333333","name":"Sara Tesfaye","phone":"+251933333333"}'
do
  curl -s -X POST "$API_URL/customers" \
    -H "Content-Type: application/json" \
    -H "x-shop-id: $SHOP_ID" \
    -d "$customer" > /dev/null
  echo -n "."
done
echo " Done!"

echo ""
echo "========================================"
echo "Demo data created successfully!"
echo "========================================"
echo ""
echo "Shop ID: $SHOP_ID"
echo ""
echo "To use the dashboard, add this shop ID to localStorage:"
echo "  localStorage.setItem('shopId', '$SHOP_ID')"
echo ""
echo "Or update apps/web/.env:"
echo "  VITE_DEMO_SHOP_ID=$SHOP_ID"
echo ""
