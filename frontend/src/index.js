import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { Amplify } from 'aws-amplify';
import App from './App';
import { store } from './store';
import './index.css';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId:       process.env.REACT_APP_COGNITO_USER_POOL_ID,
      userPoolClientId: process.env.REACT_APP_COGNITO_CLIENT_ID,
      region:           process.env.REACT_APP_AWS_REGION || 'af-south-1',
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
    </Provider>
  </React.StrictMode>
);
