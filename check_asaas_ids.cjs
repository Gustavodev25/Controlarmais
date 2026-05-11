const axios = require('axios');

const API_KEY = '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmNiMTNlZmNjLTQ3NzEtNDg4NS1hMDM3LWVjMzNjZGI2NWYzOTo6JGFhY2hfOWFjM2Q2MDktY2E1OS00YzJjLWI0NDktMjE2Zjc2ODlkYzIy';
const BASE_URL = 'https://api.asaas.com/v3';

const headers = {
  'access_token': API_KEY,
  'Content-Type': 'application/json'
};

async function search() {
  try {
    const targetIDs = ['770399625', '770399622', '770399620', '770399617', '747931342', '746492994', '736464682', '731528724', '729072802'];

    console.log("Fetching payments...");
    // Overdue payments since we have "Vencida"
    const payRes = await axios.get(`${BASE_URL}/payments?status=OVERDUE&offset=0&limit=100`, { headers });
    
    console.log("\nSearching for target IDs in payments...");
    for (const pay of payRes.data.data) {
       for (const target of targetIDs) {
         if (JSON.stringify(pay).includes(target)) {
           console.log(`Found target ${target} in payment ${pay.id} for customer ${pay.customer}`);
           console.log(`Payment object:`, pay);
         }
       }
    }

  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

search();
