const axios = require('axios');

// Test webhook events
const testEvents = {
  accountDeleted: {
    type: 'account.deleted',
    data: {
      object: {
        id: 'acct_test123', // Replace with actual test account ID
        object: 'account',
        deleted: true
      }
    }
  },
  accountUpdated: {
    type: 'account.updated',
    data: {
      object: {
        id: 'acct_test123',
        object: 'account',
        requirements: {
          currently_due: [],
          eventually_due: [],
          past_due: [],
          pending_verification: []
        }
      }
    }
  },
  bankAccountDeleted: {
    type: 'account.external_account.deleted',
    data: {
      object: {
        id: 'ba_test123',
        object: 'bank_account',
        account: 'acct_test123',
        deleted: true
      }
    }
  }
};

async function testWebhook(eventType) {
  try {
    const response = await axios.post('http://localhost:3000/auth/test-webhook', testEvents[eventType], {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log(`Test ${eventType} successful:`, response.data);
  } catch (error) {
    console.error(`Test ${eventType} failed:`, error.response?.data || error.message);
  }
}

// Run tests
async function runTests() {
  console.log('Starting webhook tests...');
  
  await testWebhook('accountDeleted');
  await testWebhook('accountUpdated');
  await testWebhook('bankAccountDeleted');
  
  console.log('Tests completed');
}

runTests(); 