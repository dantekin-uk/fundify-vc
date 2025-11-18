// Generate OAuth2 access token from Firebase service account for Firestore REST API
// This allows Cloudflare Workers to authenticate with Firestore without Firebase Cloud Functions

async function generateAccessToken(serviceAccountJson) {
  try {
    const sa = typeof serviceAccountJson === 'string' ? JSON.parse(serviceAccountJson) : serviceAccountJson;
    
    // Create JWT for OAuth2 token request
    const now = Math.floor(Date.now() / 1000);
    const jwtHeader = {
      alg: 'RS256',
      typ: 'JWT'
    };
    
    const jwtPayload = {
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/datastore',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600, // 1 hour
      iat: now
    };
    
    // Encode JWT header and payload
    const encodeBase64 = (obj) => {
      const json = JSON.stringify(obj);
      return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    };
    
    const headerB64 = encodeBase64(jwtHeader);
    const payloadB64 = encodeBase64(jwtPayload);
    const unsignedJwt = `${headerB64}.${payloadB64}`;
    
    // Sign JWT with private key using Web Crypto API
    const privateKeyPem = sa.private_key
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
      .replace(/\s/g, '');
    
    const privateKeyDer = Uint8Array.from(atob(privateKeyPem), c => c.charCodeAt(0));
    
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      privateKeyDer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256'
      },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      new TextEncoder().encode(unsignedJwt)
    );
    
    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    const jwt = `${unsignedJwt}.${signatureB64}`;
    
    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Failed to get access token: ${tokenResponse.status} ${errorText}`);
    }
    
    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  } catch (error) {
    console.error('Error generating access token:', error);
    throw error;
  }
}

export { generateAccessToken };


