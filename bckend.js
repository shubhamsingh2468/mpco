const functions = require('firebase-functions');
const admin = require('firebase-admin'); 
 
 const { SecretManagerServiceClient } = require('@google-cloud/secretmanager');



admin.initializeApp({
  credential: admin.credential.cert({
    
  }),
  databaseURL: "https://your-project-id.firebaseio.com" // Replace with your project ID
});

exports.validate = functions
  .region('europe-west2')
  .https.onCall(async (data, context) => {
    functions.logger.info('Received data:', data, { structuredData: true });

    // Validate user authentication (consider using context.auth)
    

    
    const purchaseToken = data.purchaseToken;
    const productId = data.productId;

    if (!purchaseToken || !productId) {
      functions.logger.error('Missing required fields: purchaseToken, productId');
      return { error: 'MISSING_REQUIRED_FIELDS' };
    }

    try {
      // Use Google Play Developer API with environment variables or secrets manager
      const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/androidpublisher'],
      });

      // Securely retrieve keyFile content from environment variables or secrets manager
      const keyFileContent = process.env.ANDROID_PUBLISHER_KEY_FILE || await getSecretManagerKeyFile();

      auth.fromJSON(JSON.parse(keyFileContent)); // Parse keyFile content

      const androidPublisher = google.androidpublisher('v3');
      const response = await androidPublisher.purchases.subscriptions.get({
        packageName: 'your-package-name',
        subscriptionId: productId,
        token: purchaseToken,
        auth: auth,
      });

      functions.logger.info('Response:', response.data, { structuredData: true });

      if (response.status === 200 && response.data.paymentState === 1) {
        // User has an active subscription
        return { isActiveSubscription: true };
      } else {
        // Handle inactive subscription or error cases (could indicate expired subscription)
        return { isActiveSubscription: false, error: response.data.error }; // Provide more details if available
      }
    } catch (error) {
      functions.logger.error('Error validating subscription:', error, { structuredData: true });
      return { error: 'VALIDATION_ERROR' }; // Generic error message for security
    }
  });

// Function to retrieve keyFile content securely using secrets manager (optional)


  

 async function getSecretManagerKeyFile() {
  const client = new SecretManagerServiceClient();

  
  const secretName = 'projects/your-project-id/secrets/your-secret-name/versions/latest';

  try {
    const [response] = await client.accessSecretVersion({
      name: secretName,
    });

    return response.payload.data.toString();
  } catch (error) {
    console.error('Error retrieving secret:', error);
    throw error;
  }
}
