module.exports = {
  // Riot API endpoints
  riotAPI: {
    auth: {
      authorization: 'https://auth.riotgames.com/api/v1/authorization',
      userInfo: 'https://auth.riotgames.com/userinfo',
      entitlements: 'https://entitlements.auth.riotgames.com/api/token/v1',
      region: 'https://riot-geo.pas.si.riotgames.com/pas/v1/product/valorant'
    },
    valorant: {
      storefront: (region, puuid) => `https://pd.${region}.a.pvp.net/store/v3/storefront/${puuid}`,
      wallet: (region, puuid) => `https://pd.${region}.a.pvp.net/store/v1/wallet/${puuid}`,
      offers: (region) => `https://pd.${region}.a.pvp.net/store/v1/offers/`
    },
    valorantApi: {
      version: 'https://valorant-api.com/v1/version',
      weapons: 'https://valorant-api.com/v1/weapons?language=all',
      bundles: 'https://valorant-api.com/v1/bundles?language=all',
      tiers: 'https://valorant-api.com/v1/contenttiers/',
      buddies: 'https://valorant-api.com/v1/buddies?language=all',
      cards: 'https://valorant-api.com/v1/playercards?language=all',
      sprays: 'https://valorant-api.com/v1/sprays?language=all',
      titles: 'https://valorant-api.com/v1/playertitles?language=all'
    }
  },
  
  // Cache settings
  cache: {
    expiry: {
      skins: 7 * 24 * 60 * 60 * 1000, // 1 week
      prices: 24 * 60 * 60 * 1000,    // 24 hours
      shop: 24 * 60 * 60 * 1000        // 24 hours
    }
  },
  
  // User settings
  user: {
    tokenExpiry: 60 * 60 * 1000,      // 1 hour
    storePasswords: false,            // Whether to store user passwords (not recommended)
  },
  
  // Default headers for Riot API requests
  riotClientHeaders: {
    'Content-Type': 'application/json',
    'User-Agent': 'RiotClient/43.0.1.4195386.4190634 rso-auth (Windows;10;;Professional, x64)',
    'Accept': 'application/json, text/plain, */*'
  }
};
