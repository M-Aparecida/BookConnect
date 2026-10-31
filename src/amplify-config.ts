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
});