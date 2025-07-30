const cron = require('node-cron');
const Client = require('../models/Client');
const { sendExpiryReminder } = require('./emailService');

// Check for expiries daily at 9:00 AM
cron.schedule('0 9 * * *', async () => {
  console.log('Running daily expiry check...');
  
  try {
    const today = new Date();
    const fiveDaysLater = new Date(today.getTime() + (5 * 24 * 60 * 60 * 1000));
    const threeDaysLater = new Date(today.getTime() + (3 * 24 * 60 * 60 * 1000));

    const clients = await Client.find({
      $or: [
        { 'domains.expiryDate': { $in: [fiveDaysLater, threeDaysLater] } },
        { 'hosting.expiryDate': { $in: [fiveDaysLater, threeDaysLater] } }
      ]
    });

    for (const client of clients) {
      // Check domains
      for (const domain of client.domains) {
        const expiryDate = new Date(domain.expiryDate);
        const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysLeft === 5 || daysLeft === 3) {
          await sendExpiryReminder(
            client.email,
            process.env.ADMIN_EMAIL || 'admin@company.com',
            {
              type: 'domain',
              name: domain.domainName,
              expiryDate: domain.expiryDate,
              clientName: client.companyName,
              daysLeft
            }
          );
        }
      }

      // Check hosting
      for (const hosting of client.hosting) {
        const expiryDate = new Date(hosting.expiryDate);
        const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysLeft === 5 || daysLeft === 3) {
          await sendExpiryReminder(
            client.email,
            process.env.ADMIN_EMAIL || 'admin@company.com',
            {
              type: 'hosting',
              name: hosting.provider,
              expiryDate: hosting.expiryDate,
              clientName: client.companyName,
              daysLeft
            }
          );
        }
      }
    }
  } catch (error) {
    console.error('Cron job error:', error);
  }
});

console.log('Cron jobs initialized');
