// Cognito Authentication Module
// Works with both local development and cloud deployment

class CognitoAuth {
  constructor() {
    this.isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    this.userPoolId = null;
    this.clientId = null;
    this.region = 'us-east-1';
    this.currentUser = null;
    this.idToken = null;
    this.accessToken = null;
    
    // Load config from environment or use defaults
    this.loadConfig();
  }

  loadConfig() {
    // Load Cognito config from config.js (works for both local and cloud)
    this.userPoolId = window.COGNITO_USER_POOL_ID || null;
    this.clientId = window.COGNITO_CLIENT_ID || null;
    this.region = window.COGNITO_REGION || 'us-east-1';
    
    if (this.isLocal) {
      if (this.userPoolId && this.clientId) {
        console.log('Running in local mode with real Cognito authentication');
      } else {
        console.log('Running in local mode - using mock authentication (set COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID in config.js for real auth)');
      }
    } else {
      if (!this.userPoolId || !this.clientId) {
        console.warn('Cognito configuration not found. Make sure config.js is loaded with values from deployment.');
      }
    }
  }

  // Initialize Cognito SDK
  async init() {
    // Re-load config at init time to avoid any script-load timing issues
    this.loadConfig();

    // In cloud mode, config.js should have set these. If not, wait briefly and retry.
    if (!this.isLocal && (!this.userPoolId || !this.clientId)) {
      await this.waitForConfig({ timeoutMs: 2000, pollMs: 50 });
      this.loadConfig();
    }

    // If no Cognito config, use mock auth (local development fallback)
    if (!this.userPoolId || !this.clientId) {
      if (this.isLocal) {
        // Mock authentication for local development when Cognito not configured
        this.currentUser = {
          username: 'local-user',
          email: 'local@example.com'
        };
        this.idToken = 'local-token';
        this.accessToken = 'local-access-token';
        return true;
      } else {
        console.error('Cognito configuration missing');
        return false;
      }
    }

    // Load AWS SDK
    if (typeof AmazonCognitoIdentity === 'undefined') {
      await this.loadAWSSDK();
    }

    // Check for existing session
    await this.checkSession();
    return true;
  }

  async waitForConfig({ timeoutMs = 2000, pollMs = 50 } = {}) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (window.COGNITO_USER_POOL_ID && window.COGNITO_CLIENT_ID) return true;
      await new Promise(resolve => setTimeout(resolve, pollMs));
    }
    return false;
  }

  async loadAWSSDK() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/amazon-cognito-identity-js@6.3.7/dist/amazon-cognito-identity.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Check for existing authenticated session
  async checkSession() {
    // If using mock auth (no Cognito config), check localStorage
    if (!this.userPoolId || !this.clientId) {
      if (this.isLocal) {
        const saved = localStorage.getItem('cognito_auth');
        if (saved) {
          try {
            const auth = JSON.parse(saved);
            this.currentUser = auth.user;
            this.idToken = auth.idToken;
            this.accessToken = auth.accessToken;
            return true;
          } catch (e) {
            localStorage.removeItem('cognito_auth');
            return false;
          }
        }
        return false;
      }
      return false;
    }
    
    // Real Cognito session check (works for both local and cloud)
    // Note: getSession() automatically refreshes expired tokens if within refresh window

    try {
      const poolData = {
        UserPoolId: this.userPoolId,
        ClientId: this.clientId
      };
      const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
      const cognitoUser = userPool.getCurrentUser();

      if (cognitoUser) {
        const tryGetSession = () =>
          new Promise((resolve) => {
            cognitoUser.getSession((err, session) => {
              // If getSession succeeds, session is valid (tokens may have been auto-refreshed)
              // Only fail if there's an error or no session object
              if (err || !session) {
                resolve({ ok: false, err, session: null });
                return;
              }
              // getSession() succeeded - session is valid (even if tokens were just refreshed)
              resolve({ ok: true, session });
            });
          });

        // One retry helps with occasional transient/session-refresh timing issues.
        let result = await tryGetSession();
        if (!result.ok) {
          await new Promise(resolve => setTimeout(resolve, 500));
          result = await tryGetSession();
        }

        if (!result.ok) {
          // Only sign out if getSession() explicitly failed (no session or error)
          // Don't sign out on transient errors - let user retry
          if (result.err && result.err.message && result.err.message.includes('refresh')) {
            // Refresh token expired - need to sign in again
            this.signOut();
          }
          return false;
        }

        // getSession() succeeded - update tokens (they may have been refreshed)
        this.currentUser = cognitoUser;
        this.idToken = result.session.getIdToken().getJwtToken();
        this.accessToken = result.session.getAccessToken().getJwtToken();
        return true;
      }
    } catch (error) {
      console.error('Error checking session:', error);
    }
    return false;
  }

  // Sign up new user
  async signUp(email, password) {
    // If no Cognito config, use mock signup
    if (!this.userPoolId || !this.clientId) {
      if (this.isLocal) {
        // Mock signup for local when Cognito not configured
        this.currentUser = { username: email, email };
        this.idToken = 'local-token';
        this.accessToken = 'local-access-token';
        localStorage.setItem('cognito_auth', JSON.stringify({
          user: this.currentUser,
          idToken: this.idToken,
          accessToken: this.accessToken
        }));
        return { success: true };
      } else {
        throw new Error('Cognito configuration missing');
      }
    }
    
    // Real Cognito signup (works for both local and cloud)

    return new Promise((resolve, reject) => {
      const poolData = {
        UserPoolId: this.userPoolId,
        ClientId: this.clientId
      };
      const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

      const attributeList = [
        new AmazonCognitoIdentity.CognitoUserAttribute({
          Name: 'email',
          Value: email
        })
      ];

      userPool.signUp(email, password, attributeList, null, (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({ success: true, user: result.user });
      });
    });
  }

  // Confirm sign up with verification code
  async confirmSignUp(email, code) {
    // If no Cognito config, skip verification (mock mode)
    if (!this.userPoolId || !this.clientId) {
      if (this.isLocal) {
        return { success: true };
      } else {
        throw new Error('Cognito configuration missing');
      }
    }
    
    // Real Cognito verification (works for both local and cloud)

    return new Promise((resolve, reject) => {
      const poolData = {
        UserPoolId: this.userPoolId,
        ClientId: this.clientId
      };
      const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
      const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
        Username: email,
        Pool: userPool
      });

      cognitoUser.confirmRegistration(code, true, (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({ success: true });
      });
    });
  }

  // Sign in
  async signIn(email, password) {
    // If no Cognito config, use mock signin
    if (!this.userPoolId || !this.clientId) {
      if (this.isLocal) {
        // Mock signin for local when Cognito not configured
        this.currentUser = { username: email, email };
        this.idToken = 'local-token';
        this.accessToken = 'local-access-token';
        localStorage.setItem('cognito_auth', JSON.stringify({
          user: this.currentUser,
          idToken: this.idToken,
          accessToken: this.accessToken
        }));
        return { success: true };
      } else {
        throw new Error('Cognito configuration missing');
      }
    }
    
    // Real Cognito signin (works for both local and cloud)

    return new Promise((resolve, reject) => {
      const poolData = {
        UserPoolId: this.userPoolId,
        ClientId: this.clientId
      };
      const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
      const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({
        Username: email,
        Password: password
      });

      const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
        Username: email,
        Pool: userPool
      });

      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (result) => {
          this.currentUser = cognitoUser;
          this.idToken = result.getIdToken().getJwtToken();
          this.accessToken = result.getAccessToken().getJwtToken();
          resolve({ success: true });
        },
        onFailure: (err) => {
          reject(err);
        }
      });
    });
  }

  // Sign out
  signOut() {
    // Sign out from Cognito if using real auth
    if (this.currentUser && this.userPoolId && this.currentUser.signOut) {
      this.currentUser.signOut();
    }
    
    this.currentUser = null;
    this.idToken = null;
    this.accessToken = null;
    localStorage.removeItem('cognito_auth');
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.idToken;
  }

  // Get authorization header for API calls
  getAuthHeader() {
    if (this.idToken) {
      return `Bearer ${this.idToken}`;
    }
    return null;
  }

  // Get user email
  getUserEmail() {
    // If using mock auth, return stored email
    if (!this.userPoolId && this.currentUser && this.currentUser.email) {
      return Promise.resolve(this.currentUser.email);
    }
    
    // Real Cognito - get from attributes
    if (this.currentUser && this.currentUser.getAttributes) {
      return new Promise((resolve) => {
        this.currentUser.getAttributes((err, attributes) => {
          if (err) {
            resolve(null);
            return;
          }
          const emailAttr = attributes.find(attr => attr.Name === 'email');
          resolve(emailAttr ? emailAttr.Value : null);
        });
      });
    }
    return Promise.resolve(null);
  }
}

// Export singleton instance
window.cognitoAuth = new CognitoAuth();

