const axios = require('axios');

const API_KEY = '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmNiMTNlZmNjLTQ3NzEtNDg4NS1hMDM3LWVjMzNjZGI2NWYzOTo6JGFhY2hfOWFjM2Q2MDktY2E1OS00YzJjLWI0NDktMjE2Zjc2ODlkYzIy';
const BASE_URL = 'https://api.asaas.com/v3';

const headers = {
  'access_token': API_KEY,
  'Content-Type': 'application/json'
};

const targetInvoiceNumbers = [
  '770399625',
  '770399622',
  '770399620',
  '770399617',
  '747931342',
  '746492994',
  '736464682',
  '731528724',
  '729072802'
];

async function cancelAndDeleteUsers() {
  try {
    console.log("Fetching payments to locate customers...");
    
    const customersToDelete = new Set();
    const subscriptionsToCancel = new Set();
    const paymentsToDelete = new Set();
    
    // We will search payments to map the invoice numbers
    for (const invoiceNum of targetInvoiceNumbers) {
      console.log(`Looking up invoice ${invoiceNum}...`);
      // Unfortunately we can't search directly by invoice number in /payments easily unless we use externalReference? 
      // But Asaas has /payments?invoiceNumber=... let's try or just fetch all overdue and find it.
      // Easiest is to search overdue payments since there's only a few.
    }
    
    let offset = 0;
    while(true) {
        const payRes = await axios.get(`${BASE_URL}/payments?status=OVERDUE&offset=${offset}&limit=100`, { headers });
        const payments = payRes.data.data;
        if(payments.length === 0) break;
        
        for (const pay of payments) {
             if (targetInvoiceNumbers.includes(pay.invoiceNumber)) {
                 console.log(`[FOUND] Invoice: ${pay.invoiceNumber} | Customer: ${pay.customer} | Subscription: ${pay.subscription} | Payment ID: ${pay.id}`);
                 if (pay.customer) customersToDelete.add(pay.customer);
                 if (pay.subscription) subscriptionsToCancel.add(pay.subscription);
                 if (pay.id) paymentsToDelete.add(pay.id);
             }
        }
        offset += 100;
        if (!payRes.data.hasMore) break;
    }
    
    // Let's also check PENDING payments just in case some are pending
    offset = 0;
    while(true) {
        const payRes = await axios.get(`${BASE_URL}/payments?status=PENDING&offset=${offset}&limit=100`, { headers });
        const payments = payRes.data.data;
        if(payments.length === 0) break;
        
        for (const pay of payments) {
             if (targetInvoiceNumbers.includes(pay.invoiceNumber)) {
                 console.log(`[FOUND] Invoice: ${pay.invoiceNumber} | Customer: ${pay.customer} | Subscription: ${pay.subscription} | Payment ID: ${pay.id}`);
                 if (pay.customer) customersToDelete.add(pay.customer);
                 if (pay.subscription) subscriptionsToCancel.add(pay.subscription);
                 if (pay.id) paymentsToDelete.add(pay.id);
             }
        }
        offset += 100;
        if (!payRes.data.hasMore) break;
    }

    console.log("\nSubscriptions to cancel:");
    console.log(subscriptionsToCancel);
    console.log("Customers to delete:");
    console.log(customersToDelete);
    console.log("Payments to delete:");
    console.log(paymentsToDelete);

    // 1. Delete/cancel payments first
    console.log("\nDeleting payments:");
    for (const payId of paymentsToDelete) {
        try {
            await axios.delete(`${BASE_URL}/payments/${payId}`, { headers });
            console.log(`Deleted payment ${payId}`);
        } catch(e) {
            console.error(`Failed to delete payment ${payId}:`, e.response?.data || e.message);
        }
    }

    // 2. Cancel subscriptions
    console.log("\nCanceling subscriptions:");
    for (const subId of subscriptionsToCancel) {
        try {
            await axios.delete(`${BASE_URL}/subscriptions/${subId}`, { headers });
            console.log(`Canceled subscription ${subId}`);
        } catch(e) {
            console.error(`Failed to cancel subscription ${subId}:`, e.response?.data || e.message);
        }
    }

    // 3. Delete customers
    console.log("\nDeleting customers:");
    for (const cusId of customersToDelete) {
        try {
            await axios.delete(`${BASE_URL}/customers/${cusId}`, { headers });
            console.log(`Deleted customer ${cusId}`);
        } catch(e) {
            console.error(`Failed to delete customer ${cusId}:`, e.response?.data || e.message);
        }
    }

    console.log("\nDone processing!");
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

cancelAndDeleteUsers();
