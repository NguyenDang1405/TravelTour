const { test } = require('node:test');
const assert = require('node:assert');
const https = require('node:https');
require('dotenv').config({ path: '.env.local' });

test('Duffel API Authentication and Offer Request', async (t) => {
  const token = process.env.DUFFEL_API_TOKEN;
  assert.ok(token, 'DUFFEL_API_TOKEN should be present in .env.local');

  // We are using a mock flight route just to test the API response
  const slices = [
    {
      origin: "SGN", // Ho Chi Minh City
      destination: "HAN", // Hanoi
      departure_date: "2026-10-15"
    }
  ];
  const passengers = [{ type: "adult" }];

  const response = await fetch("https://api.duffel.com/air/offer_requests", {
    method: "POST",
    headers: {
      "Accept-Encoding": "gzip",
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Duffel-Version": "v2",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      data: {
        slices,
        passengers,
        max_connections: 1
      }
    })
  });

  const responseBody = await response.json();

  assert.strictEqual(response.status, 201, `Expected status 201 Created but got ${response.status}. Error: ${JSON.stringify(responseBody)}`);
  assert.ok(responseBody.data, 'Response should contain data object');
  assert.ok(responseBody.data.id, 'Response data should contain an offer_request id');
  assert.ok(Array.isArray(responseBody.data.offers), 'Response data should contain an array of offers');

  console.log(`Successfully retrieved ${responseBody.data.offers.length} flight offers from Duffel API!`);
  
  if (responseBody.data.offers.length > 0) {
    const firstOffer = responseBody.data.offers[0];
    assert.ok(firstOffer.total_amount, 'Offer should have a total_amount');
    assert.ok(firstOffer.slices, 'Offer should have slices');
    console.log(`Sample offer price: ${firstOffer.total_amount} ${firstOffer.total_currency}`);
  }
});
