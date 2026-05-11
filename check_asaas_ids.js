const axios = require('axios');

const API_KEY = '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmNiMTNlZmNjLTQ3NzEtNDg4NS1hMDM3LWVjMzNjZGI2NWYzOTo6JGFhY2hfOWFjM2Q2MDktY2E1OS00YzJjLWI0NDktMjE2Zjc2ODlkYzIy';
const BASE_URL = 'https://api.asaas.com/v3';

const headers = {
  'access_token': API_KEY,
  'Content-Type': 'application/json'
};

async function search() {
  try {
    // Check if it's a customer external reference
    console.log("Fetching customers...");
    const custRes = await axios.get(`${BASE_URL}/customers?offset=0&limit=100`, { headers });
    let found = false;
    
    // Attempt checking subscriptions
    console.log("Fetching subscriptions...");
    const subRes = await axios.get(`${BASE_URL}/subscriptions?offset=0&limit=100`, { headers });
    
    const targetIDs = ['770399625', '770399622', '770399620'];
    
    // Dump to see structure
    if (subRes.data.data.length > 0) {
      console.log("Sample Subscription:", JSON.stringify(subRes.data.data[0], null, 2));
    }
    
    console.log("\nSearching for target IDs in subscriptions...");
    for (const sub of subRes.data.data) {
       for (const target of targetIDs) {
         if (JSON.stringify(sub).includes(target)) {
           console.log(`Found target ${target} in subscription ${sub.id} belonging to customer ${sub.customer}`);
         }
       }
    }
    
    console.log("Fetching payments...");
    const payRes = await axios.get(`${BASE_URL}/payments?status=OVERDUE&offset=0&limit=100`, { headers });
    if (payRes.data.data.length > 0) {
       console.log("Sample Payment:", JSON.stringify(payRes.data.data[0], null, 2));
    }
    console.log("\nSearching for target IDs in payments...");
    for (const pay of payRes.data.data) {
       for (const target of targetIDs) {
         if (JSON.stringify(pay).includes(target)) {
           console.log(`Found target ${target} in payment ${pay.id} for customer ${pay.customer}`);
           console.log(`Payment details: ${JSON.stringify(pay)}`);
         }
       }
    }

  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

search();
