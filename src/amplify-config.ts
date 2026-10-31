import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_fXo7D5PqH',
      userPoolClientId: '610ftqpr086c5enu4kftmbu7ae',
      loginWith: {
        email: true,
      },
      signUpVerificationMethod: 'code',
    },
  },
  oauth: {
    domain: 'us-east-1fxo7d5pqh.auth.us-east-1.amazoncognito.com',
    scopes: ['openid', 'email', 'phone'],
    redirectSignIn: ['https://aparecida.dunga.web.ufersa.dev.br'],
    redirectSignOut: ['https://aparecida.dunga.web.ufersa.dev.br'],
    responseType: 'code',
  },
});